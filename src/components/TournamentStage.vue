<script setup lang="ts">
import type { AdditionalStandingsValues } from '@/tournament'
import type { Match } from 'tournament-organizer/components'
import { Status } from 'brackets-model'
import BracketRenderer from './BracketRenderer.vue'
import { computed } from 'vue'
import type { ViewerData } from 'brackets-viewer'

export type StageInfo =
  | {
      type: 'swiss'
      roundCount: number
      standings: AdditionalStandingsValues[]
    }
  | {
      type: 'playoffs'
    }

const props = defineProps<{
  title: string
  bestOf: number
  stageActive: boolean
  stageInfo: StageInfo

  teamNames: { [id: string]: string }
  matches: Match[]
}>()

const emit = defineEmits<{
  (e: 'matchClicked', matchId: string, bestOf: number): void
  (e: 'dropTeam', teamId: string): void
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
  props.matches.map((match) => ({
    id: match.id,
    stage_id: 0,
    group_id: 0,
    round_id: match.round,
    number: match.match,
    child_count: props.bestOf,
    status:
      !match.player1.id || !match.player2.id
        ? Status.Ready
        : match.active
          ? Status.Running
          : Status.Completed,
    opponent1: match.player1.id ? { id: match.player1.id, score: match.player1.win } : null,
    opponent2: match.player2.id ? { id: match.player2.id, score: match.player2.win } : null,
  })),
)
const bracketRendererBrackets = computed<ViewerData>(() => {
  return {
    stages: [
      {
        id: 0,
        tournament_id: '',
        name: '',
        type: props.stageInfo.type === 'swiss' ? 'round_robin' : 'single_elimination',
        settings: {},
        number: 0,
      },
    ],
    matches: bracketRendererMatches.value,
    matchGames: [],
    participants: bracketRendererParticipants.value,
  }
})
const hasDrops = computed(
  () =>
    props.stageInfo.type === 'swiss' &&
    props.stageInfo.standings.some((team) => team.player.meta.dropped),
)
</script>

<template>
  <div>
    <h2>{{ title }}</h2>

    <BracketRenderer
      v-if="bracketRendererMatches.length"
      :brackets="bracketRendererBrackets"
      @match-clicked="(matchId) => emit('matchClicked', matchId.toString(), props.bestOf)"
    />

    <template v-if="stageInfo.type === 'swiss'">
      <p>
        <button
          v-if="stageActive && Math.max(...matches.map((m) => m.round)) < stageInfo.roundCount"
          :disabled="matches.some((m) => m.active)"
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
            <th v-if="stageActive || hasDrops">Drop</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(team, rank) in stageInfo.standings" :key="team.player.id">
            <td class="right-aligned-number">{{ rank + 1 }}.</td>
            <td>{{ team.player.name }}</td>
            <td>{{ team.matchPoints }}/{{ team.matches - team.matchPoints }}</td>
            <td>{{ -team.lossesAgainstTiedScore }}</td>
            <td>{{ (team.tiebreaks.oppMatchWinPct * 100).toFixed(2) }}</td>
            <td>{{ team.gamePoints }}/{{ team.games - team.gamePoints }}</td>
            <td>{{ (team.tiebreaks.oppGameWinPct * 100).toFixed(2) }}</td>
            <td v-if="team.player.meta.dropped">Dropped</td>
            <td v-else-if="stageActive">
              <button class="icon-button" @click="() => emit('dropTeam', team.player.id)">
                ❌
              </button>
            </td>
            <td v-else-if="hasDrops"></td>
          </tr>
        </tbody>
      </table>

      <p>
        <button
          v-if="stageActive && Math.max(...matches.map((m) => m.round)) === stageInfo.roundCount"
          :disabled="matches.some((m) => m.active)"
          @click="() => emit('nextRound')"
        >
          Onto playoffs!
        </button>
      </p>
    </template>
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
