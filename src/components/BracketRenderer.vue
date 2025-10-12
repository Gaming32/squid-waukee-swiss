<script setup lang="ts">
import type { MatchWithMetadata, ViewerData } from 'brackets-viewer'
import { onMounted, ref, useId, watch } from 'vue'

const rendererId = useId()

const props = defineProps<{
  brackets: ViewerData
  highlightTeam?: string
}>()

const emit = defineEmits<{
  (e: 'matchClicked', matchId: number | string): void
  (e: 'hover', team?: string): void
}>()

const highlightables = ref<{ [team: string]: HTMLElement[] }>({})
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
  highlightables.value = { ...window.bracketsViewer.participantRefs }
  for (const [team, elements] of Object.entries(window.bracketsViewer.participantRefs)) {
    for (const element of elements) {
      element.addEventListener('mouseenter', () => emit('hover', team))
      element.addEventListener('mouseleave', () => emit('hover'))
      element.addEventListener('touchstart', (e) => {
        e.preventDefault()
        emit('hover', team)
      })
      element.addEventListener('touchend', (e) => {
        e.preventDefault()
        emit('hover')
        element.click()
      })
    }
  }
}
watch(() => props.brackets, render)
onMounted(() => render(props.brackets))

const prevHighlighted = ref<string>()
watch(
  () => props.highlightTeam,
  (newValue) => {
    if (prevHighlighted.value) {
      highlightables.value[prevHighlighted.value]?.forEach((e) => e.classList.remove('hover'))
    }
    if (newValue) {
      highlightables.value[newValue]?.forEach((e) => e.classList.add('hover'))
    }
    prevHighlighted.value = newValue
  },
)
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
    --grid-columns: calc(clamp(2, round(down, 50vw / var(--match-width)), 4));

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
