<script setup lang="ts">
import type { AdditionalStandingsValues } from '@/tournament'
import type { Match } from 'tournament-organizer/components'
import SwissRoundDisplay from './RoundDisplay.vue'

defineProps<{
  teamNames: { [id: string]: string }
  matches: Match[]
  swissRoundCount: number
  swissStandings: AdditionalStandingsValues[]
}>()
</script>

<template>
  <div>
    <h2>Swiss</h2>

    <template v-for="round in swissRoundCount" :key="round">
      <h3>Round {{ round }}</h3>
      <div class="round-div">
        <swiss-round-display
          v-for="match in matches.filter((m) => m.round == round && m.player1.id && m.player2.id)"
          :key="match.id"
          :team1="teamNames[match.player1.id!]!"
          :team2="teamNames[match.player2.id!]!"
          :score1="match.player1.win"
          :score2="match.player2.win"
        />
      </div>
    </template>

    <h3>Standings</h3>
    <table>
      <thead>
        <tr>
          <th>Rank</th>
          <th>Team</th>
          <th>W/L</th>
          <th>TB</th>
          <th>OW%</th>
          <th>W/L (M)</th>
          <th>OW% (M)</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(team, rank) in swissStandings" :key="team.player.id">
          <td class="right-aligned-number">{{ rank + 1 }}.</td>
          <td>{{ team.player.name }}</td>
          <td>{{ team.matchPoints }}/{{ team.matches - team.matchPoints }}</td>
          <td>{{ -team.lossesAgainstTiedScore }}</td>
          <td>{{ team.tiebreaks.oppMatchWinPct }}</td>
          <td>{{ team.gamePoints }}/{{ team.games - team.gamePoints }}</td>
          <td>{{ team.tiebreaks.oppGameWinPct }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style>
.round-div {
  display: inline-block;
}

.right-aligned-number {
  text-align: right;
}
</style>
