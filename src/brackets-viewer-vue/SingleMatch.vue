<script setup lang="ts">
import type { MatchWithMetadata } from '@/brackets-viewer/types'
import { computed } from 'vue'
import MatchParticipant from './MatchParticipant.vue'
import MaybeClassWrapper from './MaybeClassWrapper.vue'
import type { Participant } from 'brackets-model'

const props = defineProps<{
  participants: Participant[]
  highlightTeam?: string
  match: MatchWithMetadata
}>()

const emit = defineEmits<{
  (e: 'matchClicked', match: MatchWithMetadata): void
  (e: 'hover', team?: string): void
}>()

const matchWrapperClasses = computed(() => {
  const matchMetadata = props.match.metadata
  if (!matchMetadata.connection || matchMetadata.childOriginMatches !== 1) {
    return {}
  }
  return {
    'bye-match-wrapper': true,
    'tall-wrapper': !!matchMetadata.childSiblingOriginMatches,
    'short-wrapper': !matchMetadata.childSiblingOriginMatches,
  }
})
const matchConnectionClasses = computed(() => {
  const connection = props.match.metadata.connection
  return {
    match: true,
    'connect-next': !!connection?.connectNext,
    straight: connection?.connectNext === 'straight',
  }
})
const participantConnectionClasses = computed(() => {
  const connection = props.match.metadata.connection
  return {
    opponents: true,
    'connect-previous': !!connection?.connectPrevious,
    straight: connection?.connectPrevious === 'straight',
  }
})
</script>

<template>
  <MaybeClassWrapper :classes="matchWrapperClasses">
    <div :class="matchConnectionClasses" :data-match-id="match.id">
      <div :class="participantConnectionClasses" @click="emit('matchClicked', match)">
        <MatchParticipant
          :participants="participants"
          :highlight-team="highlightTeam"
          :participant="match.opponent1"
          :bye="match.bye"
          side="opponent1"
          :origin-hint="match.metadata.originHint"
          :match-location="match.metadata.matchLocation"
          :round-number="match.metadata.roundNumber"
          @match-clicked="(m) => emit('matchClicked', m)"
          @hover="(team) => emit('hover', team)"
        />
        <MatchParticipant
          :participants="participants"
          :highlight-team="highlightTeam"
          :participant="match.opponent2"
          :bye="match.bye"
          side="opponent2"
          :origin-hint="match.metadata.originHint"
          :match-location="match.metadata.matchLocation"
          :round-number="match.metadata.roundNumber"
          @match-clicked="(m) => emit('matchClicked', m)"
          @hover="(team) => emit('hover', team)"
        />
        <span v-if="match.child_count > 0" @click="emit('matchClicked', match)">{{
          match.metadata.label
            ? `${match.metadata.label}, Bo${match.child_count}`
            : `Bo${match.child_count}`
        }}</span>
      </div>
    </div>
  </MaybeClassWrapper>
</template>
