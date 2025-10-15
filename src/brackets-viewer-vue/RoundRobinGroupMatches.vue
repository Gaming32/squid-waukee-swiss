<script setup lang="ts">
import { sortBy, splitBy } from '@/brackets-viewer/helpers'
import type { MatchWithMetadata } from '@/brackets-viewer/types'
import { computed } from 'vue'
import SingleMatch from './SingleMatch.vue'
import type { Participant } from 'brackets-model'

const props = defineProps<{
  participants: Participant[]
  highlightTeam?: string
  groupMatches: MatchWithMetadata[]
}>()

const emit = defineEmits<{
  (e: 'matchClicked', match: MatchWithMetadata): void
  (e: 'hover', team?: string): void
}>()

const matchesByRound = computed(() =>
  splitBy(props.groupMatches, 'round_id').map((matches) => sortBy(matches, 'number')),
)
</script>

<template>
  <div class="group" :data-group-id="groupMatches[0]!.group_id">
    <div
      v-for="(roundMatches, roundIndex) in matchesByRound"
      :key="roundMatches[0]!.round_id"
      class="round-wrapper"
    >
      <h3>Round {{ roundIndex + 1 }}</h3>
      <div class="round" :data-round-id="roundMatches[0]!.round_id">
        <SingleMatch
          v-for="match in roundMatches"
          :key="match.id"
          :participants="participants"
          :highlight-team="highlightTeam"
          :match="match"
          @match-clicked="(m) => emit('matchClicked', m)"
          @hover="(team) => emit('hover', team)"
        />
      </div>
    </div>
  </div>
</template>
