import { ref } from 'vue'

const highlightedTeam = ref<string>()

export function useHighlightedTeam() {
  return highlightedTeam
}
