<script setup lang="ts">
import { computed, reactive, ref, shallowRef, useTemplateRef } from 'vue'
import EnterTeams from './components/EnterTeams.vue'
import { Match, Player } from 'tournament-organizer/components'
import {
  CustomStandingsTournament,
  PLAYOFFS_BEST_OF,
  SWISS_BEST_OF,
  type AdditionalStandingsValues,
} from './tournament'
import ReportScoreModal from './components/ReportScoreModal.vue'
import TournamentStage from './components/TournamentStage.vue'

const reportScoreModal = useTemplateRef('reportScoreModal')

const tournament = shallowRef<CustomStandingsTournament | null>(null)
const tournamentMatches = ref<Match[]>([])
const teamNames = ref<{ [id: string]: string }>({})
const swissRoundCount = computed(() => tournament.value?.stageOne.rounds ?? 0)

const lockedSwissStandings = ref<AdditionalStandingsValues[] | null>(null)
const swissStandings = computed(
  () => lockedSwissStandings.value ?? tournament.value?.standings(false) ?? [],
)

function createTournament(teams: string[]) {
  const newTournament = new CustomStandingsTournament('squid-waukee', 'Squid Waukee')
  newTournament.settings = {
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
  }
  newTournament.start()

  tournamentMatches.value = newTournament.matches = reactive(newTournament.matches)
  teamNames.value = Object.fromEntries(newTournament.players.map((p) => [p.id, p.name]))
  tournament.value = newTournament
}

function resetAndEdit() {
  if (
    confirm(
      'This will reset all tournament progress and return to the Enter Teams screen. Are you sure?',
    )
  ) {
    tournament.value = null
    tournamentMatches.value = []
    lockedSwissStandings.value = null
  }
}

function dropTeam(teamId: string) {
  const team = tournament.value?.players.find((p) => p.id == teamId)
  if (!team) return
  team.meta.dropped = true
  tournament.value?.removePlayer(teamId)
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
    },
  )
}

function nextRound() {
  const oldStandings = swissStandings.value
  tournament.value!.next()
  tournamentMatches.value = tournament.value!.matches = reactive(tournament.value!.matches)
  if (tournament.value?.status == 'stage-two') {
    lockedSwissStandings.value = oldStandings
    tournament.value.scoring.bestOf = PLAYOFFS_BEST_OF
  }
}
</script>

<template>
  <div>
    <ReportScoreModal ref="reportScoreModal" />

    <h1 class="low-margin-title">Squid-Waukee</h1>

    <EnterTeams
      v-if="tournament === null"
      :initial-teams="Object.values(teamNames)"
      @finish="createTournament"
    />
    <template v-else>
      <button @click="resetAndEdit">Reset and edit teams</button>

      <div v-if="tournament !== null">
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
          :team-names="teamNames"
          :matches="tournamentMatches.filter((m) => m.round <= swissRoundCount)"
          @match-clicked="reportScore"
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
          :team-names="teamNames"
          :matches="tournamentMatches.filter((m) => m.round > swissRoundCount)"
          @match-clicked="reportScore"
        />
      </div>
    </template>
  </div>
</template>

<style scoped>
.low-margin-title {
  margin-bottom: 0.17em;
}

.stages-align {
  float: left;
}
</style>
