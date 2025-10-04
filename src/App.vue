<script setup lang="ts">
import { computed, reactive, shallowRef, useTemplateRef } from 'vue'
import EnterTeams from './components/EnterTeams.vue'
import { Player } from 'tournament-organizer/components'
import { CustomStandingsTournament, SWISS_BEST_OF, SWISS_TO_WIN } from './tournament'
import SwissStage from './components/SwissStage.vue'
import ReportScoreModal from './components/ReportScoreModal.vue'

const reportScoreModal = useTemplateRef('reportScoreModal')

const tournament = shallowRef<CustomStandingsTournament | null>(null)
const teamNames = computed(() =>
  Object.fromEntries(tournament.value?.players.map((p) => [p.id, p.name]) ?? []),
)
const swissRoundCount = computed(() => tournament.value?.stageOne.rounds ?? 0)
const swissStandings = computed(() => tournament.value?.standings(false) ?? [])

function createTournament(teams: string[]) {
  const newTournament = new CustomStandingsTournament('squid-waukee', 'Squid Waukee')
  newTournament.settings = {
    players: teams.map((team, index) => new Player(index.toString(), team)),
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
  }
  newTournament.start()

  newTournament.matches = reactive(newTournament.matches)
  newTournament.players = reactive(newTournament.players)
  tournament.value = newTournament
}

function reportScore(matchId: string) {
  const match = tournament.value?.matches.find((m) => m.id == matchId)
  if (!match || !match.player1.id || !match.player2.id) {
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
    (scores) => {
      if (!scores) return
      if (scores.score1 >= SWISS_TO_WIN || scores.score2 >= SWISS_TO_WIN) {
        tournament.value!.enterResult(matchId, scores.score1, scores.score2)
      } else {
        // Only update for display
        match.player1.win = scores.score1
        match.player2.win = scores.score2
      }
    },
  )
}

function nextRound() {
  tournament.value?.next()
}
</script>

<template>
  <div>
    <ReportScoreModal ref="reportScoreModal" />

    <h1>Squid-Waukee</h1>
    <EnterTeams v-if="tournament === null" @finish="createTournament" />
    <SwissStage
      v-if="tournament !== null"
      :team-names="teamNames"
      :matches="tournament.matches"
      :swiss-round-count="swissRoundCount"
      :swiss-standings="swissStandings"
      @match-clicked="reportScore"
      @next-round="nextRound"
    />
  </div>
</template>

<style scoped></style>
