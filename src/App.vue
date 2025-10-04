<script setup lang="ts">
import { computed, reactive, shallowRef, useTemplateRef } from 'vue'
import EnterTeams from './components/EnterTeams.vue'
import { Player } from 'tournament-organizer/components'
import {
  CustomStandingsTournament,
  PLAYOFFS_BEST_OF,
  SWISS_BEST_OF,
  SWISS_TO_WIN,
} from './tournament'
import ReportScoreModal from './components/ReportScoreModal.vue'
import TournamentStage from './components/TournamentStage.vue'

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
    tournament.value!.scoring.bestOf,
    (scores) => {
      if (!scores) return
      if (scores.score1 >= SWISS_TO_WIN || scores.score2 >= SWISS_TO_WIN) {
        tournament.value!.enterResult(matchId, scores.score1, scores.score2)
      }
    },
  )
}

function nextRound() {
  tournament.value?.next()
  if (tournament.value?.status == 'stage-two') {
    tournament.value.scoring.bestOf = PLAYOFFS_BEST_OF
  }
}
</script>

<template>
  <div>
    <ReportScoreModal ref="reportScoreModal" />

    <h1>Squid-Waukee</h1>
    <EnterTeams v-if="tournament === null" @finish="createTournament" />

    <TournamentStage
      v-if="tournament !== null"
      title="Swiss"
      :best-of="SWISS_BEST_OF"
      :stageInfo="{ type: 'swiss', roundCount: swissRoundCount, standings: swissStandings }"
      :team-names="teamNames"
      :matches="tournament.matches.filter((m) => m.round <= swissRoundCount)"
      @match-clicked="reportScore"
      @next-round="nextRound"
    />

    <TournamentStage
      v-if="tournament !== null"
      title="Playoffs"
      :best-of="PLAYOFFS_BEST_OF"
      :stageInfo="{ type: 'playoffs' }"
      :team-names="teamNames"
      :matches="tournament.matches.filter((m) => m.round > swissRoundCount)"
      @match-clicked="reportScore"
    />
  </div>
</template>

<style scoped></style>
