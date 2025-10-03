<script setup lang="ts">
import { computed, reactive, shallowRef } from 'vue'
import EnterTeams from './components/EnterTeams.vue'
import { Player } from 'tournament-organizer/components'
import ActiveTournament from './components/ActiveTournament.vue'
import { CustomStandingsTournament } from './tournament'

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
      bestOf: 3,
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
</script>

<template>
  <div>
    <h1>Squid-Waukee</h1>
    <EnterTeams v-if="tournament === null" @finish="createTournament" />
    <ActiveTournament
      v-if="tournament !== null"
      :team-names="teamNames"
      :matches="tournament.matches"
      :swiss-round-count="swissRoundCount"
      :swiss-standings="swissStandings"
    />
  </div>
</template>

<style scoped></style>
