<script setup lang="ts">
import { SWISS_BEST_OF, SWISS_TO_WIN, type AdditionalStandingsValues } from '@/tournament'
import type { Match } from 'tournament-organizer/components'
import { Status } from 'brackets-model'
import BracketRenderer from './BracketRenderer.vue'
import { computed } from 'vue'
import { type ViewerData } from 'brackets-viewer'

const props = defineProps<{
  teamNames: { [id: string]: string }
  matches: Match[]
  swissRoundCount: number
  swissStandings: AdditionalStandingsValues[]
}>()

const emit = defineEmits<{
  (e: 'matchClicked', matchId: string): void
  (e: 'nextRound'): void
}>()

const bracketRendererParticipants = computed(() =>
  Object.entries(props.teamNames).map((team) => {
    return {
      id: team[0],
      tournament_id: '',
      name: team[1],
    }
  }),
)
const bracketRendererMatches = computed(() =>
  props.matches.map((match) => {
    return {
      id: match.id,
      stage_id: 0,
      group_id: 0,
      round_id: match.round,
      number: match.match,
      child_count: SWISS_BEST_OF,
      status:
        !match.player1.id || !match.player2.id
          ? Status.Ready
          : match.bye || match.player1.win + match.player2.win == SWISS_BEST_OF
            ? Status.Completed
            : Status.Running,
      opponent1: match.player1.id ? { id: match.player1.id, score: match.player1.win } : null,
      opponent2: match.player2.id ? { id: match.player2.id, score: match.player2.win } : null,
    }
  }),
)
const bracketRendererBrackets = computed<ViewerData>(() => {
  return {
    stages: [
      {
        id: 0,
        tournament_id: '',
        name: '',
        type: 'round_robin', // Close enough
        settings: {},
        number: 0,
      },
    ],
    matches: bracketRendererMatches.value,
    matchGames: [],
    participants: bracketRendererParticipants.value,
  }
})
</script>

<template>
  <div>
    <h2>Swiss</h2>

    <BracketRenderer
      :brackets="bracketRendererBrackets"
      @match-clicked="(matchId) => emit('matchClicked', matchId.toString())"
    />

    <p>
      <button
        v-if="Math.max(...matches.map((m) => m.round)) < swissRoundCount"
        :disabled="
          matches.some(
            (m) => !m.bye && m.player1.win < SWISS_TO_WIN && m.player2.win < SWISS_TO_WIN,
          )
        "
        @click="() => emit('nextRound')"
      >
        Next round!
      </button>
    </p>

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
          <td>{{ (team.tiebreaks.oppMatchWinPct * 100).toFixed(2) }}</td>
          <td>{{ team.gamePoints }}/{{ team.games - team.gamePoints }}</td>
          <td>{{ (team.tiebreaks.oppGameWinPct * 100).toFixed(2) }}</td>
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
