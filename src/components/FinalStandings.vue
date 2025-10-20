<script setup lang="ts">
import type { Match, Player } from 'tournament-organizer/components'
import { isEmpty } from 'lodash'
import { computed } from 'vue'
import { useHighlightedTeam } from '@/composables/highlightedTeam'

const PLACEMENT_EMOJIS = ['🥇', '🥈', '🥉']

const props = defineProps<{
  finalStandings: { [standing: number]: Player[] }
  completedMatchesPerTeam: { [team: string]: Match[] }
  stageRoundCutoffs: number[][]
}>()

const highlightedTeam = useHighlightedTeam()

const stageSections = computed(() =>
  props.stageRoundCutoffs.map(
    ([first, last]) =>
      (match: Match) =>
        match.getRoundNumber() >= first! && match.getRoundNumber() <= last!,
  ),
)
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
            :key="team.getId()"
            :class="{
              'colored-standings-row': rankIndex % 2 === 0,
              'hovered-row': team.getId() === highlightedTeam,
            }"
            @mouseenter="() => (highlightedTeam = team.getId())"
            @mouseleave="() => (highlightedTeam = undefined)"
            @touchstart="() => (highlightedTeam = team.getId())"
            @touchend="() => (highlightedTeam = undefined)"
          >
            <td class="right-aligned">
              {{ teamIndex === 0 ? `${PLACEMENT_EMOJIS[rank - 1] ?? ''}&nbsp;${rank}.` : '' }}
            </td>
            <td>{{ team.getName() }}</td>
            <td class="matches-list-column">
              <template v-for="(predicate, predicateIndex) in stageSections">
                <div
                  v-if="completedMatchesPerTeam[team.getId()]?.some(predicate)"
                  :key="predicateIndex"
                  class="stage"
                >
                  <div
                    v-for="match in completedMatchesPerTeam[team.getId()]?.filter(predicate)"
                    :key="match.getId()"
                    :class="{
                      match: true,
                      bye: match.isBye(),
                      win: !match.isBye() && match.getWinner()?.id === team.getId(),
                      loss: !match.isBye() && match.getWinner()?.id !== team.getId(),
                    }"
                  >
                    {{ match.isBye() ? 'B' : match.getWinner()?.id === team.getId() ? 'W' : 'L' }}
                  </div>
                </div>
              </template>
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

  .stage {
    display: flex;
    gap: 10px;

    + .stage {
      border-left: solid gray 2px;
      padding-left: 10px;
    }
  }

  .match {
    border: solid var(--status-color) 2px;
    border-radius: 5px;
    color: var(--status-color);
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
