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

  orderedTeams: string[]
  teamNames: { [id: string]: string }
  matches: Match[]
}>()

const emit = defineEmits<{
  (e: 'matchClicked', matchId: string, bestOf: number): void
  (e: 'dropTeam', teamId: string): void
  (e: 'nextRound'): void
}>()

const bracketRendererParticipants = computed<ViewerData['participants']>(() =>
  Object.entries(props.teamNames).map((team) => {
    return {
      id: team[0],
      tournament_id: '',
      name: team[1],
    }
  }),
)
const bracketRendererMatches = computed<ViewerData['matches']>(() => {
  const firstMatch = props.matches.map((m) => m.round).sort()[0]
  return props.matches.map((match) => {
    function getOpponent(team: Match['player1']): ViewerData['matches'][0]['opponent1'] {
      if (!team.id) {
        return null
      }
      const teamIndex =
        match.round === firstMatch ? props.orderedTeams.findIndex((t) => t == team.id) : -1
      return {
        id: team.id,
        score: status === Status.Completed ? team.win : undefined,
        position: teamIndex >= 0 ? teamIndex + 1 : undefined,
        result: status !== Status.Completed ? undefined : team.win > team.loss ? 'win' : 'loss',
      }
    }
    const status =
      !match.player1.id || !match.player2.id
        ? Status.Ready
        : match.active
          ? Status.Running
          : Status.Completed
    return {
      id: match.id,
      stage_id: 0,
      group_id: 0,
      round_id: match.round,
      number: match.match,
      child_count: props.bestOf,
      status,
      opponent1: getOpponent(match.player1),
      opponent2: getOpponent(match.player2),
    }
  })
})
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
  <div class="stage-root">
    <h2 class="low-margin-title">{{ title }}</h2>

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

      <p class="overflow-scroll">
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
      </p>

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

<style scoped>
.stage-root {
  max-width: 100%;
  margin-right: 30px;
}

.overflow-scroll {
  overflow-x: auto;
}

.low-margin-title {
  margin-bottom: 0.2em;
}

.right-aligned-number {
  text-align: right;
}
</style>
