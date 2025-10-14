<script setup lang="ts">
import { useDark } from '@vueuse/core'
import { generateRounds } from 'maps.iplabs.ink/src/helpers/MapGeneration'
import { maps as allMaps } from 'maps.iplabs.ink/src/helpers/MapMode'
import type {
  AppContext as MapData,
  MapPool,
} from 'maps.iplabs.ink/src/types-interfaces/Interfaces'
import type { Mode } from 'maps.iplabs.ink/src/types-interfaces/Types'
import storageAvailable from 'storage-available'
import { Manager, Match, Player } from 'tournament-organizer/components'
import { computed, reactive, ref, shallowRef, useTemplateRef } from 'vue'
import ReportScoreModal from './components/ReportScoreModal.vue'
import SetupTourney from './components/SetupTourney.vue'
import TournamentStage from './components/TournamentStage.vue'
import { CustomStandingsTournament, type AdditionalStandingsValues } from './tournament'
import { appendOrAdd } from './utils'
import { groupBy } from 'lodash'
import FinalStandings from './components/FinalStandings.vue'
import {
  computeFinalStandings,
  createInitialTournamentOrganizerFormatSettings,
  createRounds,
  DEFAULT_TOURNAMENT_FORMAT,
  type TournamentFormat,
} from './format'

useDark({
  valueDark: 'wa-dark',
})

const reportScoreModal = useTemplateRef('reportScoreModal')

const tournamentManager = new Manager()

const tournament = shallowRef<CustomStandingsTournament | null>(null)
const tournamentMatches = ref<Match[]>([])
const teamNames = ref<{ [id: string]: string }>({})
const swissRoundCount = computed(() => tournament.value?.stageOne.rounds ?? 0)

const tournamentFormat = ref(DEFAULT_TOURNAMENT_FORMAT)

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
const currentRoundNumber = computed(() => {
  const roundsNotReady = Object.entries(groupBy(tournamentMatches.value, 'round'))
    .filter(([, ms]) => ms.some((m) => !m.bye && (m.player1.id === null || m.player2.id === null)))
    .map(([r]) => Number.parseInt(r))
  if (roundsNotReady.length) {
    return Math.min(...roundsNotReady) - 1
  }
  const finalRound = tournamentMatches.value[tournamentMatches.value.length - 1]
  if (finalRound && !finalRound.player1.win && !finalRound.player2.win) {
    return finalRound.round
  }
  return null
})
const currentRound = computed(() => {
  const roundNumber = currentRoundNumber.value
  if (roundNumber === null) {
    return null
  }
  return mapData.value.rounds[roundNumber - 1]
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

const finalStandings = computed(() => {
  if (!tournamentMatches.value.length || tournament.value === null) {
    return {}
  }
  return computeFinalStandings(tournamentFormat.value.type, tournament.value, swissStandings.value)
})
const completedMatchesPerTeam = computed(() => {
  if (!tournament.value) {
    return {}
  }
  const result: { [team: string]: Match[] } = {}
  for (const match of tournamentMatches.value) {
    if (match.active || (!match.bye && (match.player1.id === null || match.player2.id === null))) {
      continue
    }
    if (match.player1.id) {
      appendOrAdd(result, match.player1.id, match)
    }
    if (match.player2.id) {
      appendOrAdd(result, match.player2.id, match)
    }
  }
  return result
})

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
            tournament.value!.players.length,
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

function generateRoundsWithFormat(players: number, format: TournamentFormat, mapPool: MapPool) {
  return generateRounds(
    createRounds(players, format),
    mapPool,
    'Replace All',
    Object.keys(mapPool).filter((m) => mapPool[m as keyof MapPool].length) as Mode[],
    [],
    [],
  )
}

function createTournament(format: TournamentFormat, mapPool: MapPool, teams: string[]) {
  const newTournament = new CustomStandingsTournament(
    tournamentManager.createTournament('Squid-Waukee', {
      players: teams.map((team, index) => {
        const player = new Player(index.toString(), team)
        player.meta.dropped = false
        return player
      }),
      sorting: 'none',
      ...createInitialTournamentOrganizerFormatSettings(format),
    }),
  )
  newTournament.start()

  for (const match of newTournament.matches) {
    match.meta.bestOf = newTournament.scoring.bestOf
  }
  if (format.type === 'single_elimination') {
    for (const match of newTournament.matches) {
      if (match.round >= newTournament.stageOne.rounds - 1) {
        match.meta.bestOf = format.finalsBestOf
      }
    }
  }

  assignTournament(newTournament)
  tournamentFormat.value = format
  mapData.value = {
    mapPool,
    rounds: generateRoundsWithFormat(teams.length, format, mapPool),
  }
  saveTournament()
}

function resetAndEdit() {
  if (
    tournament.value?.matches.every((m) => !m.player1.win && !m.player2.win) ||
    confirm(
      'This will clear all tournament progress and return to the tournament creation screen. Are you sure?',
    )
  ) {
    tournament.value = null
    tournamentMatches.value = []
    lockedSwissStandings.value = null
    saveTournament()
    saveSwissStandings()
  }
}

function reportScore(matchId: string) {
  const match = tournament.value?.matches.find((m) => m.id === matchId)
  if (!match || !match.player1.id || !match.player2.id || !match.active) {
    return
  }
  if (currentRoundNumber.value !== null && match.round > currentRoundNumber.value) {
    return
  }

  const bestOf = match.meta.bestOf
  const team1 = tournament.value!.players.find((p) => p.id === match.player1.id)!
  const team2 = tournament.value!.players.find((p) => p.id === match.player2.id)!

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

      const tourney = tournament.value!
      const oldBestOf = tourney.scoring.bestOf
      tourney.scoring.bestOf = bestOf
      tourney.enterResult(matchId, scores.score1, scores.score2)
      tourney.scoring.bestOf = oldBestOf

      const isSingleElim =
        (tourney.status === 'stage-one' && tourney.stageOne.format === 'single-elimination') ||
        (tourney.status === 'stage-two' && tourney.stageTwo.format === 'single-elimination')
      if (isSingleElim) {
        nextRound()
      }
      saveTournament()
    },
  )
}

function hover(team?: string) {
  highlightedTeam.value = team
}

function dropTeam(teamId: string) {
  const team = tournament.value?.players.find((p) => p.id === teamId)
  if (!team) return
  team.meta.dropped = true
  tournament.value?.removePlayer(teamId)
  saveTournament()
}

function nextRound() {
  const tourney = tournament.value!
  if (tournamentFormat.value.type === 'swiss' && tourney.status === 'stage-one') {
    const oldStandings = swissStandings.value
    tourney.next()
    tournamentMatches.value = tourney.matches = reactive(tourney.matches)
    let bestOf = tournamentFormat.value.swissBestOf
    //@ts-expect-error next() may have changed this value
    if (tourney.status === 'stage-two') {
      bestOf = tournamentFormat.value.playoffsBestOf
      lockedSwissStandings.value = oldStandings
      saveSwissStandings()
    }
    for (const match of tournamentMatches.value) {
      if (match.round >= tourney.round) {
        match.meta.bestOf = bestOf
      }
    }
    saveTournament()
  }
  if (!currentRoundNumber.value) {
    tourney.end()
    saveTournament()
  }
}
</script>

<template>
  <div>
    <ReportScoreModal ref="reportScoreModal" />

    <h1 :class="{ 'low-margin-title': tournament !== null }">Squid-Waukee</h1>

    <SetupTourney
      v-if="tournament === null"
      :initial-format="tournamentFormat"
      :initial-map-pool="mapData.mapPool"
      :initial-teams="Object.values(teamNames)"
      @finish="createTournament"
    />
    <template v-else>
      <button class="wa-size-s wa-danger padded-button" @click="resetAndEdit">
        Clear all and edit tournament
      </button>

      <div v-if="tournament" class="stages-align">
        <template v-if="tournamentFormat.type === 'swiss'">
          <TournamentStage
            title="Swiss"
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
            :stageInfo="{ type: 'playoffs' }"
            :ordered-teams="swissStandings.map((s) => s.player.id)"
            :team-names="teamNames"
            :matches="tournamentMatches.filter((m) => m.round > swissRoundCount)"
            :highlighted-team="highlightedTeam"
            @match-clicked="reportScore"
            @hover="hover"
          />
        </template>
        <template v-else-if="tournamentFormat.type === 'single_elimination'">
          <TournamentStage
            :stageInfo="{ type: 'playoffs' /* TODO: rename */ }"
            :ordered-teams="[]"
            :team-names="teamNames"
            :matches="tournamentMatches"
            :highlighted-team="highlightedTeam"
            @match-clicked="reportScore"
            @hover="hover"
          />
        </template>

        <div v-if="currentRound" class="print-hide">
          <h3>{{ currentRound.name }} Map Pool</h3>
          <ul>
            <li v-for="mapMode in currentRoundMapList" :key="mapMode">
              {{ mapMode }}
            </li>
          </ul>
        </div>
        <FinalStandings
          :final-standings="finalStandings"
          :completed-matches-per-team="completedMatchesPerTeam"
          :stage-round-cutoff="tournament.stageOne.rounds + 1"
          :highlighted-team="highlightedTeam"
          @hover="hover"
        />
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
  margin-right: 0.5em;
}

.stages-align {
  display: flex;
  gap: 30px;
  flex-wrap: wrap;
}
</style>
