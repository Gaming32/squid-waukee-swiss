<script setup lang="ts">
import { sortBy, splitByWithLeftovers, splitBy } from '@/brackets-viewer/helpers'
import type { MatchWithMetadata, RoundNameGetter, ViewerData } from '@/brackets-viewer/types'
import { computed } from 'vue'
import RoundRobinGroupMatches from './RoundRobinGroupMatches.vue'
import SingleBracket from './SingleBracket.vue'

const props = defineProps<{
  data: ViewerData
  highlightTeam?: string
  customRoundName?: RoundNameGetter
}>()

const emit = defineEmits<{
  (e: 'matchClicked', match: MatchWithMetadata): void
  (e: 'hover', team?: string): void
}>()

const matchesWithMetadata = computed(() =>
  props.data.matches.map((match) => ({
    ...match,
    metadata: {
      stageType: props.data.stage.type,
      games: props.data.matchGames.filter((game) => game.parent_id === match.id),
    },
  })),
)
const matchesByGroup = computed(() => splitByWithLeftovers(matchesWithMetadata.value, 'group_id'))

const finalInfoSingleElim = computed(() => {
  const hasFinal = matchesByGroup.value[1] !== undefined
  const finalMatches = sortBy(matchesByGroup.value[1] ?? [], 'number')
  const connectFinal = false

  return { hasFinal, connectFinal, finalMatches }
})
</script>

<template>
  <div class="brackets-viewer">
    <div
      v-if="data.stage.type === 'round_robin'"
      class="round-robin"
      :data-stage-id="data.stage.id"
    >
      <RoundRobinGroupMatches
        v-for="groupMatches in matchesByGroup"
        :key="groupMatches[0]!.group_id"
        :participants="data.participants"
        :highlight-team="highlightTeam"
        :group-matches="groupMatches"
        @match-clicked="(m) => emit('matchClicked', m)"
        @hover="(team) => emit('hover', team)"
      />
    </div>
    <div
      v-else-if="
        data.stage.type === 'single_elimination' || data.stage.type === 'double_elimination'
      "
      class="elimination"
      :data-stage-id="data.stage.id"
    >
      <template v-if="data.stage.type === 'single_elimination'">
        <SingleBracket
          :participants="data.participants"
          :highlight-team="highlightTeam"
          :matches-by-round="
            splitBy(matchesByGroup[0]!, 'round_id').map((matches) => sortBy(matches, 'number'))
          "
          :get-round-name="
            (roundNumber, roundCount) =>
              roundNumber === roundCount
                ? 'Finals'
                : roundNumber === roundCount - 1
                  ? 'Semis'
                  : `Round ${roundNumber}`
          "
          bracket-type="single_bracket"
          :connect-final="finalInfoSingleElim.connectFinal"
          @match-clicked="(m) => emit('matchClicked', m)"
          @hover="(team) => emit('hover', team)"
        />
        <!-- TODO: renderFinal -->
      </template>
      <template v-else><!-- TODO: renderDoubleElimination --></template>
    </div>
  </div>
</template>
