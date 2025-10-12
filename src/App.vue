<script setup lang="ts">
import { useDark } from '@vueuse/core'
import { generateRounds } from 'maps.iplabs.ink/src/helpers/MapGeneration'
import { maps as allMaps } from 'maps.iplabs.ink/src/helpers/MapMode'
import type {
  AppContext as MapData,
  MapPool,
} from 'maps.iplabs.ink/src/types-interfaces/Interfaces'
import type { Mode, PlayStyle } from 'maps.iplabs.ink/src/types-interfaces/Types'
import storageAvailable from 'storage-available'
import { Manager, Match, Player } from 'tournament-organizer/components'
import { computed, reactive, ref, shallowRef, useTemplateRef } from 'vue'
import ReportScoreModal from './components/ReportScoreModal.vue'
import SetupTourney from './components/SetupTourney.vue'
import TournamentStage from './components/TournamentStage.vue'
import {
  CustomStandingsTournament,
  type AdditionalStandingsValues,
  type TournamentFormat,
} from './tournament'

useDark({
  valueDark: 'wa-dark',
})

const reportScoreModal = useTemplateRef('reportScoreModal')

const tournamentManager = new Manager()

const tournament = shallowRef<CustomStandingsTournament | null>(null)
const tournamentMatches = ref<Match[]>([])
const teamNames = ref<{ [id: string]: string }>({})
const swissRoundCount = computed(() => tournament.value?.stageOne.rounds ?? 0)

const tournamentFormat = ref<TournamentFormat>({
  type: 'swiss',
  swissBestOf: 3,
  advancementCutoff: 4,
  playoffsBestOf: 5,
})

const mapData = ref<MapData>({
  mapPool: {
    tw: [],
    sz: [...allMaps],
    tc: [...allMaps],
    rm: [...allMaps],
    cb: [...allMaps],
  },
  rounds: [],
})
const currentRound = computed(() => {
  const firstIncompleteRound = Math.min(
    ...tournamentMatches.value.filter((m) => m.active).map((m) => m.round),
  )
  return mapData.value.rounds[firstIncompleteRound - 1]
})
const currentRoundMapList = computed(() =>
  currentRound.value?.games.map((mapMode) =>
    mapMode === 'counterpick' ? 'Counterpick' : `${mapMode.mode.toUpperCase()} ${mapMode.map}`,
  ),
)

const lockedSwissStandings = ref<AdditionalStandingsValues[] | null>(null)
const swissStandings = computed(
  () => lockedSwissStandings.value ?? tournament.value?.standings(false) ?? [],
)

const highlightedTeam = ref<string>()

function assignTournament(newTournament: CustomStandingsTournament) {
  tournamentMatches.value = newTournament.matches = reactive(newTournament.matches)
  teamNames.value = Object.fromEntries(newTournament.players.map((p) => [p.id, p.name]))
  tournament.value = newTournament
}

const { saveTournament, saveSwissStandings } = storageAvailable('localStorage')
  ? (() => {
      const TOURNAMENT_KEY = 'tournament'
      const TOURNAMENT_FORMAT_KEY = 'tournament-format'
      const MAP_DATA_KEY = 'map-data'
      const SWISS_STANDINGS_KEY = 'swiss-standings'
      const storedTournament = localStorage.getItem(TOURNAMENT_KEY)
      if (storedTournament) {
        assignTournament(
          new CustomStandingsTournament(
            tournamentManager.reloadTournament(JSON.parse(storedTournament)),
          ),
        )

        const storedTournamentFormat = localStorage.getItem(TOURNAMENT_FORMAT_KEY)
        if (storedTournamentFormat) {
          tournamentFormat.value = JSON.parse(storedTournamentFormat)
        }

        const storedMapData = localStorage.getItem(MAP_DATA_KEY)
        if (storedMapData) {
          mapData.value = JSON.parse(storedMapData)
        } else {
          mapData.value.rounds = generateRoundsWithFormat(
            tournamentFormat.value,
            mapData.value.mapPool,
          )
        }

        const storedSwissStandings = localStorage.getItem(SWISS_STANDINGS_KEY)
        if (storedSwissStandings) {
          lockedSwissStandings.value = JSON.parse(storedSwissStandings)
        }
      }
      return {
        saveTournament: () => {
          if (tournament.value !== null) {
            localStorage.setItem(TOURNAMENT_KEY, JSON.stringify(tournament.value))
            localStorage.setItem(TOURNAMENT_FORMAT_KEY, JSON.stringify(tournamentFormat.value))
            localStorage.setItem(MAP_DATA_KEY, JSON.stringify(mapData.value))
          } else {
            localStorage.removeItem(TOURNAMENT_KEY)
            localStorage.removeItem(TOURNAMENT_FORMAT_KEY)
            localStorage.removeItem(MAP_DATA_KEY)
          }
        },
        saveSwissStandings: () => {
          if (lockedSwissStandings.value !== null) {
            localStorage.setItem(SWISS_STANDINGS_KEY, JSON.stringify(lockedSwissStandings.value))
          } else {
            localStorage.removeItem(SWISS_STANDINGS_KEY)
          }
        },
      }
    })()
  : { saveTournament: () => {}, saveSwissStandings: () => {} }

function generateRoundsWithFormat(format: TournamentFormat, mapPool: MapPool) {
  switch (format.type) {
    case 'swiss': {
      const swissRounds = new Array(tournament.value?.stageOne.rounds)
        .fill(undefined)
        .map((_, index) => ({
          name: `Swiss R${index + 1}`,
          playStyle: 'bestOf' as PlayStyle,
          games: new Array(format.swissBestOf).fill('counterpick'),
        }))

      const playoffRounds = new Array(Math.ceil(Math.log2(format.advancementCutoff)))
        .fill(undefined)
        .map((_, index) => ({
          name: `Playoffs R${index + 1}`,
          playStyle: 'bestOf' as PlayStyle,
          games: new Array(format.playoffsBestOf).fill('counterpick'),
        }))
      if (playoffRounds.length > 1) {
        playoffRounds[playoffRounds.length - 2]!.name = 'Semifinals'
      }
      playoffRounds[playoffRounds.length - 1]!.name = 'Finals'

      return generateRounds(
        swissRounds.concat(playoffRounds),
        mapPool,
        'Replace All',
        Object.keys(mapPool).filter((m) => mapPool[m as keyof MapPool].length) as Mode[],
        [],
        [],
      )
    }
  }
}

function createTournament(format: TournamentFormat, mapPool: MapPool, teams: string[]) {
  const newTournament = new CustomStandingsTournament(
    tournamentManager.createTournament('Squid Waukee', {
      players: teams.map((team, index) => {
        const player = new Player(index.toString(), team)
        player.meta.dropped = false
        return player
      }),
      sorting: 'none',
      scoring: {
        bestOf: format.swissBestOf,
      },
      stageOne: {
        format: 'swiss',
      },
      stageTwo: {
        format: 'single-elimination',
        advance: {
          value: format.advancementCutoff,
          method: 'rank',
        },
      },
    }),
  )
  newTournament.start()

  assignTournament(newTournament)
  tournamentFormat.value = format
  mapData.value = {
    mapPool,
    rounds: generateRoundsWithFormat(format, mapPool),
  }
  saveTournament()
}

function resetAndEdit() {
  if (
    (tournament.value?.matches.every((m) => m.active) && tournament.value?.round === 1) ||
    confirm(
      'This will reset all tournament progress and return to the Enter Teams screen. Are you sure?',
    )
  ) {
    tournament.value = null
    tournamentMatches.value = []
    lockedSwissStandings.value = null
    saveTournament()
    saveSwissStandings()
  }
}

function reportScore(matchId: string, bestOf: number) {
  const match = tournament.value?.matches.find((m) => m.id == matchId)
  if (!match || !match.player1.id || !match.player2.id || !match.active) {
    return
  }

  const team1 = tournament.value!.players.find((p) => p.id == match.player1.id)!
  const team2 = tournament.value!.players.find((p) => p.id == match.player2.id)!

  reportScoreModal.value?.open(
    {
      team1: team1.name,
      score1: match.player1.win,
      team2: team2.name,
      score2: match.player2.win,
    },
    bestOf,
    (scores) => {
      if (!scores) return
      tournament.value!.enterResult(matchId, scores.score1, scores.score2)
      saveTournament()
    },
  )
}

function hover(team?: string) {
  highlightedTeam.value = team
}

function dropTeam(teamId: string) {
  const team = tournament.value?.players.find((p) => p.id == teamId)
  if (!team) return
  team.meta.dropped = true
  tournament.value?.removePlayer(teamId)
  saveTournament()
}

function nextRound() {
  const oldStandings = swissStandings.value
  tournament.value!.next()
  tournamentMatches.value = tournament.value!.matches = reactive(tournament.value!.matches)
  if (tournament.value?.status == 'stage-two') {
    lockedSwissStandings.value = oldStandings
    saveSwissStandings()
    tournament.value.scoring.bestOf = tournamentFormat.value.playoffsBestOf
  }
  saveTournament()
}
</script>

<template>
  <div>
    <ReportScoreModal ref="reportScoreModal" />

    <h1 :class="tournament !== null ? 'low-margin-title' : ''">Squid-Waukee</h1>

    <SetupTourney
      v-if="tournament === null"
      :initial-format="tournamentFormat"
      :initial-map-pool="mapData.mapPool"
      :initial-teams="Object.values(teamNames)"
      @finish="createTournament"
    />
    <template v-else>
      <button class="wa-size-s wa-danger padded-button" @click="resetAndEdit">
        Reset and edit teams
      </button>

      <div v-if="tournament" class="stages-align">
        <template v-if="tournamentFormat.type === 'swiss'">
          <TournamentStage
            title="Swiss"
            :best-of="tournamentFormat.swissBestOf"
            :stage-active="tournament.status === 'stage-one'"
            :stageInfo="{
              type: 'swiss',
              roundCount: swissRoundCount,
              standings: swissStandings,
            }"
            :ordered-teams="[]"
            :team-names="teamNames"
            :matches="tournamentMatches.filter((m) => m.round <= swissRoundCount)"
            :highlighted-team="highlightedTeam"
            @match-clicked="reportScore"
            @hover="hover"
            @drop-team="dropTeam"
            @next-round="nextRound"
          />

          <TournamentStage
            v-if="tournament.status === 'stage-two'"
            title="Playoffs"
            :best-of="tournamentFormat.playoffsBestOf"
            :stage-active="tournament.status === 'stage-two'"
            :stageInfo="{ type: 'playoffs' }"
            :ordered-teams="swissStandings.map((s) => s.player.id)"
            :team-names="teamNames"
            :matches="tournamentMatches.filter((m) => m.round > swissRoundCount)"
            :highlighted-team="highlightedTeam"
            @match-clicked="reportScore"
            @hover="hover"
          />
        </template>

        <div v-if="currentRound">
          <h3>{{ currentRound.name }} Map Pool</h3>
          <ul>
            <li v-for="mapMode in currentRoundMapList" :key="mapMode">
              {{ mapMode }}
            </li>
          </ul>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.low-margin-title {
  margin-bottom: 0.17em;
}

.padded-button {
  margin-bottom: 1em;
}

.stages-align {
  display: flex;
  flex-wrap: wrap;
}
</style>
