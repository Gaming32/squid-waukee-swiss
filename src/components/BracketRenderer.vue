<script setup lang="ts">
import type { ViewerData } from 'brackets-viewer'
import { onMounted, useId, watch } from 'vue'

const rendererId = useId()

const props = defineProps<{
  brackets: ViewerData
}>()

const emit = defineEmits<{
  (e: 'matchClicked', matchId: number | string): void
}>()

function render(data: ViewerData) {
  window.bracketsViewer.render(data, {
    showRankingTable: false, // Not flexible enough; we do our own
    clear: true,
    selector: `#${rendererId}`,
    onMatchClick: (match) => {
      emit('matchClicked', match.id)
    },
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
  padding-left: 20px;

  h1,
  h2 {
    display: none;
  }

  .round {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;

    h3 {
      grid-column-start: 1;
      grid-column-end: 6;
    }
  }
}
</style>
