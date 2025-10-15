<script setup lang="ts">
import type { MatchWithMetadata, OriginHint, Side } from '@/brackets-viewer/types'
import type { GroupType, Participant, ParticipantResult } from 'brackets-model'
import { computed, useTemplateRef } from 'vue'

const props = defineProps<{
  participants: Participant[]
  highlightTeam?: string
  participant: ParticipantResult | null
  bye?: boolean
  side?: Side
  originHint?: OriginHint
  matchLocation?: GroupType
  roundNumber?: number
}>()

const emit = defineEmits<{
  (e: 'matchClicked', match: MatchWithMetadata): void
  (e: 'hover', team?: string): void
}>()

const rootElement = useTemplateRef('rootElement')

const realParticipant = computed(() =>
  props.participants.find((item) => item.id === props.participant?.id),
)

const eventHandlers = computed(() => {
  if (!props.participant || !props.participant.id) {
    return {}
  }
  const participantId = props.participant.id.toString()
  return {
    mouseenter: () => emit('hover', participantId),
    mouseleave: () => emit('hover'),
    touchstart: (e: TouchEvent) => {
      e.preventDefault()
      emit('hover', participantId)
    },
    touchend: (e: TouchEvent) => {
      e.preventDefault()
      emit('hover')
      rootElement.value!.click()
    },
  }
})

const originAbbreviation = computed(() => {
  if (props.participant?.position === undefined || props.matchLocation === undefined) {
    return null
  }

  const roundNumber = props.roundNumber ?? -1

  let prefix: string
  if (
    props.matchLocation === 'single_bracket' ||
    (props.matchLocation === 'winner_bracket' && roundNumber === 1)
  ) {
    prefix = '#'
  } else if (
    props.matchLocation === 'loser_bracket' &&
    roundNumber % 2 === 0 &&
    props.side === 'opponent1'
  ) {
    prefix = 'P'
  } else {
    return null
  }

  return `${prefix}${props.participant.position}`
})
</script>

<template>
  <div
    ref="rootElement"
    :class="{
      participant: true,
      hover: participant && highlightTeam === participant.id,
      win: participant?.result === 'win',
      loss: participant?.result === 'loss',
    }"
    :data-participant-id="participant?.id"
    v-on="eventHandlers"
  >
    <template v-if="participant">
      <div class="name" v-if="realParticipant" :title="realParticipant.name">
        <span v-if="originAbbreviation">{{ originAbbreviation }}</span>
        {{ realParticipant.name }}
      </div>
      <div class="name hint" v-else>{{ originHint?.(side === 'opponent1' ? -2 : -1) }}</div>
      <div class="result">
        {{ participant.score === undefined ? '-' : participant.score }}
      </div>
    </template>
    <template v-else>
      <div v-if="bye" class="name bye">BYE</div>
      <div v-else class="name hint">
        {{ originHint?.(side === 'opponent1' ? -2 : -1) }}
      </div>
      <div class="result"></div>
    </template>
  </div>
</template>
