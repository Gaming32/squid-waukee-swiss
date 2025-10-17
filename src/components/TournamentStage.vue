<script setup lang="ts">
import type { Match } from 'tournament-organizer/components'
import { Status } from 'brackets-model'
import { computed } from 'vue'
import type { ViewerData } from '@/brackets-viewer/types'
import BracketViewer from '@/brackets-viewer/BracketViewer.vue'
import type { StandingsValues } from 'tournament-organizer/interfaces'
import { computeSimpleRoundCount } from '@/format'

export type StageInfo =
  | {
      type: 'swiss'
      roundCount: number
      standings: StandingsValues[]
    }
  | {
      type: 'single_elimination'
    }
  | {
      type: 'double_elimination'
    }

const props = defineProps<{
  title?: string
  stageActive?: boolean
  stageInfo: StageInfo

  orderedTeams: string[]
  teamNames: { [id: string]: string }
  matches: Match[]

  highlightedTeam?: string
}>()

const emit = defineEmits<{
  (e: 'matchClicked', matchId: string): void
  (e: 'hover', team?: string): void
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
  return props.matches.map<ViewerData['matches'][0]>((match) => {
    function getOpponent(team: Match['player1']): ViewerData['matches'][0]['opponent1'] {
      if (!team.id) {
        return null
      }
      const teamIndex = props.orderedTeams.findIndex((t) => t === team.id)
      return {
        id: team.id,
        score: match.hasEnded() ? team.win : undefined,
        position: teamIndex >= 0 ? teamIndex + 1 : undefined,
        result: !match.hasEnded() ? undefined : team.win > team.loss ? 'win' : 'loss',
      }
    }
    let groupId = 0
    let number = match.getMatchNumber()
    if (props.stageInfo.type === 'double_elimination') {
      const winnersRoundCount = computeSimpleRoundCount(Object.values(props.teamNames).length)
      if (match.getRoundNumber() > winnersRoundCount) {
        if (match.getRoundNumber() === winnersRoundCount + 1) {
          groupId = 2
          number = 1
        } else {
          groupId = 1
        }
      }
    }
    return {
      id: match.getId(),
      stage_id: 0,
      group_id: groupId,
      round_id: match.getRoundNumber(),
      number,
      child_count: match.getMeta().bestOf,
      status: Status.Locked, // Unused
      opponent1: getOpponent(match.getPlayer1()),
      opponent2: getOpponent(match.getPlayer2()),
      winDestination: match.getPath().win,
      loseDestination: match.getPath().loss,
      bye: match.isBye(),
    }
  })
})
const bracketRendererBrackets = computed<ViewerData>(() => {
  return {
    stage: {
      id: 0,
      tournament_id: '',
      name: '',
      type: props.stageInfo.type === 'swiss' ? 'round_robin' : props.stageInfo.type,
      settings: {},
      number: 0,
    },
    matches: bracketRendererMatches.value,
    matchGames: [],
    participants: bracketRendererParticipants.value,
  }
})

const anyMatchesActive = computed(() => props.matches.some((m) => m.isActive()))
const finalSwissRound = computed(
  () =>
    props.stageInfo.type === 'swiss' &&
    Math.max(...props.matches.map((m) => m.getRoundNumber())) === props.stageInfo.roundCount,
)
const hasDrops = computed(
  () =>
    props.stageInfo.type === 'swiss' &&
    props.stageInfo.standings.some((team) => team.player.getMeta().dropped),
)
</script>

<template>
  <div class="stage-root">
    <h2 v-if="title" class="low-margin-title">{{ title }}</h2>

    <BracketViewer
      v-if="bracketRendererMatches.length"
      :data="bracketRendererBrackets"
      :highlight-team="highlightedTeam"
      @match-clicked="(match) => emit('matchClicked', match.id.toString())"
      @hover="(team) => emit('hover', team)"
    />

    <template v-if="stageInfo.type === 'swiss'">
      <p v-if="stageActive && !finalSwissRound && !anyMatchesActive">
        <button class="wa-brand" @click="() => emit('nextRound')">Next round!</button>
      </p>

      <div class="swiss-table">
        <table class="wa-hover-rows wa-zebra-rows">
          <thead>
            <tr>
              <th class="right-aligned">Rank</th>
              <th>Team</th>
              <th>W/L</th>
              <th>H2H</th>
              <th>OW%</th>
              <th>W/L (M)</th>
              <th>OW% (M)</th>
              <th v-if="stageActive || hasDrops">Drop</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(team, rank) in stageInfo.standings"
              :key="team.player.getId()"
              :class="{ 'hovered-row': team.player.getId() === highlightedTeam }"
              @mouseenter="() => emit('hover', team.player.getId())"
              @mouseleave="() => emit('hover')"
              @touchstart="() => emit('hover', team.player.getId())"
              @touchend="() => emit('hover')"
            >
              <td class="right-aligned">{{ rank + 1 }}.</td>
              <td>{{ team.player.getName() }}</td>
              <td>{{ team.matchPoints }}/{{ team.matches - team.matchPoints }}</td>
              <td>{{ team.tiebreaks.neighboringPoints }}</td>
              <td>{{ (team.tiebreaks.oppMatchWinPct * 100).toFixed(2) }}</td>
              <td>{{ team.gamePoints }}/{{ team.games - team.gamePoints }}</td>
              <td>{{ (team.tiebreaks.oppGameWinPct * 100).toFixed(2) }}</td>
              <td v-if="team.player.getMeta().dropped">Dropped</td>
              <td v-else-if="stageActive">
                <a class="icon-button" @click="() => emit('dropTeam', team.player.getId())"> ❌ </a>
              </td>
              <td v-else-if="hasDrops"></td>
            </tr>
          </tbody>
        </table>
      </div>

      <p v-if="stageActive && finalSwissRound && !anyMatchesActive">
        <button class="wa-success" @click="() => emit('nextRound')">Onto playoffs!</button>
      </p>
    </template>
  </div>
</template>

<style scoped>
.stage-root {
  max-width: 100%;
}

.low-margin-title {
  margin-bottom: 0.2em;
}

.swiss-table {
  overflow-x: auto;
  margin-bottom: 1em;
}
</style>
