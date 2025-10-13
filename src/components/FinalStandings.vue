<script setup lang="ts">
import type { Match, Player } from 'tournament-organizer/components'
import { PLACEMENT_EMOJIS, isPlayerWinning } from '@/tournament'
import { isEmpty } from 'lodash'

defineProps<{
  finalStandings: { [standing: number]: Player[] }
  completedMatchesPerTeam: { [team: string]: Match[] }

  highlightedTeam?: string
}>()

const emit = defineEmits<{
  (e: 'hover', team?: string): void
}>()
</script>

<template>
  <div v-if="!isEmpty(finalStandings)" class="final-standings-area">
    <h2>Final standings</h2>
    <table class="final-standings-table wa-hover-rows">
      <thead>
        <tr>
          <th class="right-aligned">Rank</th>
          <th>Team</th>
          <th>Matches</th>
        </tr>
      </thead>
      <tbody>
        <template v-for="(teams, rank, rankIndex) in finalStandings" :key="rank">
          <tr
            v-for="(team, teamIndex) in teams"
            :key="team.id"
            :class="{
              'colored-standings-row': rankIndex % 2 === 0,
              'hovered-row': team.id === highlightedTeam,
            }"
            @mouseenter="() => emit('hover', team.id)"
            @mouseleave="() => emit('hover')"
            @touchstart="() => emit('hover', team.id)"
            @touchend="() => emit('hover')"
          >
            <td class="right-aligned">
              {{ teamIndex === 0 ? `${PLACEMENT_EMOJIS[rank - 1] ?? ''}&nbsp;${rank}.` : '' }}
            </td>
            <td>{{ team.name }}</td>
            <td class="matches-list-column">
              <div
                v-for="match in completedMatchesPerTeam[team.id]"
                :key="match.id"
                :class="{
                  match: true,
                  bye: match.bye,
                  win: !match.bye && isPlayerWinning(match, team.id),
                  loss: !match.bye && !isPlayerWinning(match, team.id),
                }"
              >
                {{ match.bye ? 'B' : isPlayerWinning(match, team.id) ? 'W' : 'L' }}
              </div>
            </td>
          </tr>
        </template>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.final-standings-area {
  overflow-x: auto;
}

@media print {
  .final-standings-area {
    break-before: page;
  }
}

.final-standings-table {
  width: fit-content;
}

.colored-standings-row:not(.hovered-row) {
  /* Copied from webawesome's wa-zebra-rows for consistency */
  background-color: color-mix(in oklab, var(--wa-color-fill-quiet) 60%, transparent);
}

.matches-list-column {
  display: flex;
  gap: 10px;

  .match {
    border-style: solid;
    border-width: 2px;
    border-radius: 5px;
    color: var(--status-color);
    border-color: var(--status-color);
    width: 1lh;
    text-align: center;
  }

  .win {
    --status-color: #50b649;
  }

  .loss {
    --status-color: #e61a1a;
  }

  .bye {
    --status-color: gray;
  }
}
</style>
