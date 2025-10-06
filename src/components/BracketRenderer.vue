<script setup lang="ts">
import type { MatchWithMetadata, ViewerData } from 'brackets-viewer'
import { onMounted, useId, watch } from 'vue'

const rendererId = useId()

const props = defineProps<{
  brackets: ViewerData
}>()

const emit = defineEmits<{
  (e: 'matchClicked', matchId: number | string): void
}>()

function render(data: ViewerData) {
  const clickCallback = (match: MatchWithMetadata) => emit('matchClicked', match.id)
  window.bracketsViewer.render(data, {
    selector: `#${rendererId}`,
    showPopoverOnMatchLabelClick: false,
    showRankingTable: false, // Not flexible enough; we do our own
    clear: true,
    onMatchClick: clickCallback,
    onMatchLabelClick: clickCallback,
    customRoundName: ({ roundNumber, roundCount }) =>
      roundNumber === roundCount
        ? 'Finals'
        : roundNumber === roundCount - 1
          ? 'Semis'
          : `Round ${roundNumber}`,
  })
}
watch(() => props.brackets, render)
onMounted(() => render(props.brackets))
</script>

<template>
  <div class="brackets-viewer" :id="rendererId"></div>
</template>

<style>
.brackets-viewer {
  padding-inline: 20px;

  h1,
  h2 {
    display: none;
  }

  .round-robin .round {
    --grid-columns: calc(clamp(2, round(down, 100vw / var(--match-width)), 4));

    display: grid;
    grid-template-columns: repeat(var(--grid-columns), var(--match-width));
    gap: 10px;

    h3 {
      grid-column-start: 1;
      grid-column-end: calc(var(--grid-columns) + 1);
    }
  }
}
</style>
