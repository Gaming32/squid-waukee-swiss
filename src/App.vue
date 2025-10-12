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
import type { LoadableTournamentValues } from 'tournament-organizer/interfaces'
import { computed, reactive, ref, shallowRef, useTemplateRef } from 'vue'
import ReportScoreModal from './components/ReportScoreModal.vue'
import SetupTourney from './components/SetupTourney.vue'
import TournamentStage from './components/TournamentStage.vue'
import {
  CustomStandingsTournament,
  PLAYOFFS_BEST_OF,
  SWISS_BEST_OF,
  type AdditionalStandingsValues,
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
      const MAP_DATA_KEY = 'map-data'
      const SWISS_STANDINGS_KEY = 'swiss-standings'
      const storedTournament = localStorage.getItem(TOURNAMENT_KEY)
      if (storedTournament) {
        const tournamentData: LoadableTournamentValues & (MapData | object) =
          JSON.parse(storedTournament)
        assignTournament(
          new CustomStandingsTournament(tournamentManager.reloadTournament(tournamentData)),
        )

        const storedMapData = localStorage.getItem(MAP_DATA_KEY)
        if (storedMapData) {
          mapData.value = JSON.parse(storedMapData)
        }

        const storedSwissStandings = localStorage.getItem(SWISS_STANDINGS_KEY)
        if (storedSwissStandings) {
          lockedSwissStandings.value = JSON.parse(storedSwissStandings)
        }
      }
      return {
        saveTournament: () => {
          if (tournament.value === null) {
            localStorage.removeItem(TOURNAMENT_KEY)
            localStorage.removeItem(MAP_DATA_KEY)
          } else {
            localStorage.setItem(TOURNAMENT_KEY, JSON.stringify(tournament.value))
            localStorage.setItem(MAP_DATA_KEY, JSON.stringify(mapData.value))
          }
        },
        saveSwissStandings: () => {
          if (lockedSwissStandings.value === null) {
            localStorage.removeItem(SWISS_STANDINGS_KEY)
          } else {
            localStorage.setItem(SWISS_STANDINGS_KEY, JSON.stringify(lockedSwissStandings.value))
          }
        },
      }
    })()
  : { saveTournament: () => {}, saveSwissStandings: () => {} }

function createTournament(mapPool: MapPool, teams: string[]) {
  const newTournament = new CustomStandingsTournament(
    tournamentManager.createTournament('Squid Waukee', {
      players: teams.map((team, index) => {
        const player = new Player(index.toString(), team)
        player.meta.dropped = false
        return player
      }),
      sorting: 'none',
      scoring: {
        bestOf: SWISS_BEST_OF,
      },
      stageOne: {
        format: 'swiss',
      },
      stageTwo: {
        format: 'single-elimination',
        advance: {
          value: 4,
          method: 'rank',
        },
      },
    }),
  )
  newTournament.start()

  assignTournament(newTournament)
  mapData.value = {
    mapPool,
    rounds: generateRounds(
      new Array(newTournament.stageOne.rounds)
        .fill(undefined)
        .map((_, index) => ({
          name: `Swiss R${index + 1}`,
          playStyle: 'bestOf' as PlayStyle,
          games: new Array(SWISS_BEST_OF).fill('counterpick'),
        }))
        .concat([
          {
            name: 'Semifinals',
            playStyle: 'bestOf' as PlayStyle,
            games: new Array(PLAYOFFS_BEST_OF).fill('counterpick'),
          },
          {
            name: 'Finals',
            playStyle: 'bestOf' as PlayStyle,
            games: new Array(PLAYOFFS_BEST_OF).fill('counterpick'),
          },
        ]),
      mapPool,
      'Replace All',
      Object.keys(mapPool).filter((m) => mapPool[m as keyof MapPool].length) as Mode[],
      [],
      [],
    ),
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
    tournament.value.scoring.bestOf = PLAYOFFS_BEST_OF
  }
  saveTournament()
}
</script>

<template>
  <div>
    <ReportScoreModal ref="reportScoreModal" />

    <h1 class="low-margin-title">Squid-Waukee</h1>

    <SetupTourney
      v-if="tournament === null"
      :initial-map-pool="mapData.mapPool"
      :initial-teams="Object.values(teamNames)"
      @finish="createTournament"
    />
    <template v-else>
      <button class="wa-size-s wa-danger padded-button" @click="resetAndEdit">
        Reset and edit teams
      </button>

      <div v-if="tournament">
        <TournamentStage
          class="stages-align"
          title="Swiss"
          :best-of="SWISS_BEST_OF"
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
          class="stages-align"
          title="Playoffs"
          :best-of="PLAYOFFS_BEST_OF"
          :stage-active="tournament.status === 'stage-two'"
          :stageInfo="{ type: 'playoffs' }"
          :ordered-teams="swissStandings.map((s) => s.player.id)"
          :team-names="teamNames"
          :matches="tournamentMatches.filter((m) => m.round > swissRoundCount)"
          :highlighted-team="highlightedTeam"
          @match-clicked="reportScore"
          @hover="hover"
        />

        <div v-if="currentRound" class="stages-align">
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
  float: left;
}
</style>
