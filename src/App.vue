<script setup lang="ts">
import { useDark } from '@vueuse/core'
import { generateRounds } from 'maps.iplabs.ink/src/helpers/MapGeneration'
import { maps as allMaps } from 'maps.iplabs.ink/src/helpers/MapMode'
import type { MapPool } from 'maps.iplabs.ink/src/types-interfaces/Interfaces'
import type { Mode } from 'maps.iplabs.ink/src/types-interfaces/Types'
import storageAvailable from 'storage-available'
import { Manager, Match } from 'tournament-organizer/components'
import { computed, ref, useTemplateRef, watch, type WatchSource } from 'vue'
import ReportScoreModal from './components/ReportScoreModal.vue'
import SetupTourney from './components/SetupTourney.vue'
import TournamentStage from './components/TournamentStage.vue'
import { appendOrAdd } from './utils'
import { last } from 'lodash'
import FinalStandings from './components/FinalStandings.vue'
import {
  computeCounterpickRoundIndices,
  computeFinalStandings,
  computeLosersRoundCount,
  computeSimpleRoundCount,
  createInitialTournamentOrganizerFormatSettings,
  createRounds,
  DEFAULT_TOURNAMENT_FORMAT,
  type TournamentFormat,
} from './format'
import type { Tournament } from 'tournament-organizer/components'
import type { MapData, TournamentSetupData } from './tournament'
import RepoFooter from './components/RepoFooter.vue'

useDark({
  valueDark: 'wa-dark',
})

const reportScoreModal = useTemplateRef('reportScoreModal')

const tournamentManager = new Manager()

const tournament = ref<Tournament | null>(null)
const tournamentMatches = computed(() => tournament.value?.getMatches() ?? [])
const teamNames = computed<{ [id: string]: string }>(() => {
  const players = tournament.value?.getPlayers()?.map((p) => [p.getId(), p.getName()])
  return players ? Object.fromEntries(players) : {}
})
const swissRoundCount = computed(() => tournament.value?.getStageOne().rounds ?? 0)

const initialTeams = ref<string[]>([])

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
  counterpickRoundCount: 0,
})
const currentRoundNumbers = computed(() => {
  const tourney = tournament.value
  if (tourney === null || tourney.getStatus() === 'complete') {
    return []
  }
  return [
    ...new Set(
      tourney
        .getMatches()
        .filter((m) => m.isPaired() && !m.isBye() && !m.hasEnded())
        .map((m) => m.getRoundNumber()),
    ),
  ]
})
const currentRoundsMapData = computed(() =>
  currentRoundNumbers.value.map((round) => mapData.value.rounds[round - 1]!),
)

const swissStandings = computed(() => {
  if (!tournament.value || tournament.value.getStageOne().format !== 'swiss') {
    return []
  }
  const standings = tournament.value.getStageOneStandings()
  return standings
    .filter((s) => !s.player.getMeta().dropped)
    .concat(standings.filter((s) => s.player.getMeta().dropped))
})

const finalStandings = computed(() => {
  if (tournament.value === null) {
    return {}
  }
  return computeFinalStandings(
    tournament.value as Tournament,
    swissStandings.value,
    tournamentFormat.value.type === 'swiss' ? tournament.value.getStageOne().rounds + 1 : 1,
  )
})
const completedMatchesPerTeam = computed(() => {
  const result: { [team: string]: Match[] } = {}
  for (const match of tournamentMatches.value) {
    if (!match.isBye() && !match.hasEnded()) {
      continue
    }
    if (match.getPlayer1().id) {
      appendOrAdd(result, match.getPlayer1().id!, match)
    }
    if (match.getPlayer2().id) {
      appendOrAdd(result, match.getPlayer2().id!, match)
    }
  }
  return result
})
const stageRoundCutoffs = computed(() => {
  const tourney = tournament.value
  if (!tourney) {
    return []
  }
  switch (tournamentFormat.value.type) {
    case 'swiss':
      return [
        [1, tourney.getStageOne().rounds],
        [tourney.getStageOne().rounds + 1, Infinity],
      ]
    case 'single_elimination':
      return [[1, tourney.getStageOne().rounds]]
    case 'double_elimination': {
      const winnersRoundCount = computeSimpleRoundCount(tourney.getPlayers().length)
      return [
        [1, winnersRoundCount],
        [winnersRoundCount + 2, Infinity],
        [winnersRoundCount + 1, winnersRoundCount + 1],
      ]
    }
  }
})

if (storageAvailable('localStorage')) {
  const TOURNAMENT_KEY = 'tournament'
  const TOURNAMENT_FORMAT_KEY = 'tournament-format'
  const MAP_DATA_KEY = 'map-data'
  const storedTournament = localStorage.getItem(TOURNAMENT_KEY)
  if (storedTournament) {
    tournament.value = tournamentManager.loadTournament(JSON.parse(storedTournament))

    const storedTournamentFormat = localStorage.getItem(TOURNAMENT_FORMAT_KEY)
    if (storedTournamentFormat) {
      tournamentFormat.value = JSON.parse(storedTournamentFormat)
    }

    const storedMapData = localStorage.getItem(MAP_DATA_KEY)
    if (storedMapData) {
      mapData.value = JSON.parse(storedMapData)
    } else {
      mapData.value.rounds = generateRoundsWithFormat(
        tournament.value!.getPlayers().length,
        tournamentFormat.value,
        mapData.value.mapPool,
        0,
      )
    }
  }
  function watchAndStore<T>(
    key: string,
    source: WatchSource<T | null>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    serializer: (value: T) => any = (x) => x,
  ) {
    watch(
      source,
      (value) => {
        if (value) {
          localStorage.setItem(key, JSON.stringify(serializer(value)))
        } else {
          localStorage.removeItem(key)
        }
      },
      { deep: true },
    )
  }
  watchAndStore(TOURNAMENT_KEY, tournament, (t) => t.getValues())
  watchAndStore(TOURNAMENT_FORMAT_KEY, tournamentFormat)
  watchAndStore(MAP_DATA_KEY, mapData)
}

function generateRoundsWithFormat(
  players: number,
  format: TournamentFormat,
  mapPool: MapPool,
  counterpickRounds: number,
) {
  return generateRounds(
    createRounds(players, format),
    mapPool,
    'Replace All',
    Object.keys(mapPool).filter((m) => mapPool[m as keyof MapPool].length) as Mode[],
    [],
    computeCounterpickRoundIndices(counterpickRounds, players, format),
  )
}

function createTournament(setupData: TournamentSetupData) {
  const newTournament = tournamentManager.createTournament('Squid-Waukee', {
    sorting: 'none',
    ...createInitialTournamentOrganizerFormatSettings(setupData.format),
  })
  setupData.teams.forEach((team, index) => {
    const player = newTournament.createPlayer(team, index.toString())
    player.getMeta().dropped = false
  })
  newTournament.startTournament()

  for (const match of newTournament.getMatches()) {
    match.getMeta().bestOf = newTournament.getScoring().bestOf
  }
  if (setupData.format.type === 'single_elimination') {
    const semiFinalsRound = newTournament.getStageOne().rounds - 1
    for (const match of newTournament.getMatches()) {
      if (match.getRoundNumber() >= semiFinalsRound) {
        match.getMeta().bestOf = setupData.format.finalsBestOf
      }
    }
  } else if (setupData.format.type === 'double_elimination') {
    const winnersFinalsRound = computeSimpleRoundCount(setupData.teams.length)
    const grandFinalRound = winnersFinalsRound + 1
    const losersFinalsRound = grandFinalRound + computeLosersRoundCount(setupData.teams.length)
    for (const match of newTournament.getMatches()) {
      if (
        match.getRoundNumber() === winnersFinalsRound ||
        match.getRoundNumber() === losersFinalsRound
      ) {
        match.getMeta().bestOf = setupData.format.finalsBestOf
      } else if (match.getRoundNumber() === grandFinalRound) {
        match.getMeta().bestOf = setupData.format.grandFinalBestOf
      }
    }
  }

  tournament.value = newTournament
  tournamentFormat.value = setupData.format
  mapData.value = {
    mapPool: setupData.mapPool,
    rounds: generateRoundsWithFormat(
      setupData.teams.length,
      setupData.format,
      setupData.mapPool,
      setupData.counterpickRoundCount,
    ),
    counterpickRoundCount: setupData.counterpickRoundCount,
  }
}

function resetAndEdit() {
  if (
    !tournament.value?.getMatches().some((m) => m.hasEnded()) ||
    confirm(
      'This will clear all tournament progress and return to the tournament creation screen. Are you sure?',
    )
  ) {
    initialTeams.value = Object.values(teamNames.value)
    tournament.value = null
  }
}

function reportScore(matchId: string) {
  const match = tournament.value?.getMatch(matchId)
  if (!match || !match.getPlayer1().id || !match.getPlayer2().id || !match.isActive()) {
    return
  }

  const bestOf: number = match.getMeta().bestOf
  const team1 = tournament.value!.getPlayer(match.getPlayer1().id!)
  const team2 = tournament.value!.getPlayer(match.getPlayer2().id!)

  reportScoreModal.value?.open(
    {
      team1: team1.getName(),
      score1: match.getPlayer1().win,
      team2: team2.getName(),
      score2: match.getPlayer2().win,
    },
    bestOf,
    (scores) => {
      if (!scores) return

      const tourney = tournament.value!
      const oldBestOf = tourney.getScoring().bestOf
      tourney.getScoring().bestOf = bestOf
      tourney.enterResult(matchId, scores.score1, scores.score2)
      tourney.getScoring().bestOf = oldBestOf

      if (tourney.getCurrentFormat() !== 'swiss') {
        nextRound()
      }
    },
  )
}

function dropTeam(teamId: string) {
  const team = tournament.value?.getPlayer(teamId)
  if (!team) return
  team.getMeta().dropped = true
  tournament.value!.removePlayer(teamId)
}

function nextRound() {
  const tourney = tournament.value!
  if (tournamentFormat.value.type === 'swiss' && tourney.getStatus() === 'stage-one') {
    tourney.nextRound()
    let bestOf = tournamentFormat.value.swissBestOf
    //@ts-expect-error nextRound() may have changed this value
    if (tourney.status === 'stage-two') {
      bestOf = tournamentFormat.value.playoffsBestOf
    }
    for (const match of tournamentMatches.value) {
      if (match.getRoundNumber() >= tourney.getRoundNumber()) {
        match.getMeta().bestOf = bestOf
      }
    }
  } else if (tournamentFormat.value.type === 'double_elimination') {
    const grandFinalRound = computeSimpleRoundCount(tourney.getPlayers().length) + 1
    const lastMatch = last(tourney.getMatches())!
    if (lastMatch.getRoundNumber() === grandFinalRound) {
      lastMatch.getMeta().bestOf = tournamentFormat.value.grandFinalBestOf
    }
  }
  if (tournamentMatches.value.every((m) => m.isBye() || m.hasEnded())) {
    tournamentManager.removeTournament(tourney.getId())
  }
}
</script>

<template>
  <div class="app-root">
    <ReportScoreModal ref="reportScoreModal" />

    <div>
      <h1 :class="{ 'low-margin-title': tournament !== null }">Squid-Waukee</h1>

      <SetupTourney
        v-if="tournament === null"
        :initial-setup-data="{
          format: tournamentFormat,
          counterpickRoundCount: mapData.counterpickRoundCount,
          mapPool: mapData.mapPool,
          teams: initialTeams,
        }"
        @finish="createTournament"
      />
      <template v-else>
        <button class="wa-size-s wa-danger padded-button" @click="resetAndEdit">
          Clear all and edit tournament
        </button>

        <div class="stages-align">
          <template v-if="tournamentFormat.type === 'swiss'">
            <TournamentStage
              title="Swiss"
              :stage-active="tournament.getStatus() === 'stage-one'"
              :stage-info="{
                type: 'swiss',
                roundCount: swissRoundCount,
                standings: swissStandings,
              }"
              :ordered-teams="[]"
              :team-names="teamNames"
              :matches="tournamentMatches.filter((m) => m.getRoundNumber() <= swissRoundCount)"
              @match-clicked="reportScore"
              @drop-team="dropTeam"
              @next-round="nextRound"
            />

            <TournamentStage
              v-if="tournament.getStatus() === 'stage-two' || tournament.getStatus() == 'complete'"
              title="Playoffs"
              :stage-info="{ type: 'single_elimination' }"
              :ordered-teams="swissStandings.map((s) => s.player.getId())"
              :team-names="teamNames"
              :matches="tournamentMatches.filter((m) => m.getRoundNumber() > swissRoundCount)"
              @match-clicked="reportScore"
            />
          </template>
          <TournamentStage
            v-else-if="
              tournamentFormat.type === 'single_elimination' ||
              tournamentFormat.type === 'double_elimination'
            "
            :stage-info="{ type: tournamentFormat.type }"
            :ordered-teams="[]"
            :team-names="teamNames"
            :matches="tournamentMatches"
            @match-clicked="reportScore"
          />

          <div v-if="currentRoundsMapData.length" class="print-hide">
            <template v-for="data in currentRoundsMapData" :key="data.name">
              <h3>{{ data.name }} Map List</h3>
              <ol>
                <li v-for="mapMode in data.games" :key="Object.values(mapMode).toString()">
                  {{
                    mapMode === 'counterpick'
                      ? 'Counterpick'
                      : `${mapMode.mode.toUpperCase()} ${mapMode.map}`
                  }}
                </li>
              </ol>
            </template>
          </div>
          <FinalStandings
            :final-standings="finalStandings"
            :completed-matches-per-team="completedMatchesPerTeam"
            :stage-round-cutoffs="stageRoundCutoffs"
          />
        </div>
      </template>
    </div>
    <RepoFooter />
  </div>
</template>

<style scoped>
.app-root {
  min-width: 100%;
  min-height: 100%;
  display: grid;
  grid-template-rows: 1fr auto;
}

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
