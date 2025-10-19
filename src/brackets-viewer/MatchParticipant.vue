<script setup lang="ts">
import type { OriginHint, Side } from '@/brackets-viewer/types'
import { useHighlightedTeam } from '@/composables/highlightedTeam'
import type { GroupType, Participant, ParticipantResult } from 'brackets-model'
import { computed, useTemplateRef } from 'vue'

const props = defineProps<{
  participants: Participant[]
  participant: ParticipantResult | null
  bye?: boolean
  side?: Side
  originHint?: OriginHint
  matchLocation?: GroupType
  roundNumber?: number
}>()

const highlightedTeam = useHighlightedTeam()

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
    mouseenter: () => (highlightedTeam.value = participantId),
    mouseleave: () => (highlightedTeam.value = undefined),
    touchstart: (e: TouchEvent) => {
      e.preventDefault()
      highlightedTeam.value = participantId
    },
    touchend: (e: TouchEvent) => {
      e.preventDefault()
      highlightedTeam.value = undefined
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

const originHint = computed(() => props.originHint?.(props.side === 'opponent1' ? 0 : 1))
</script>

<template>
  <div
    ref="rootElement"
    :class="{
      participant: true,
      hover: participant && highlightedTeam === participant.id,
      win: participant?.result === 'win',
      loss: participant?.result === 'loss',
    }"
    v-on="eventHandlers"
  >
    <template v-if="participant">
      <div v-if="realParticipant" class="name" :title="realParticipant.name">
        <span v-if="originAbbreviation">{{ originAbbreviation }}</span>
        {{ realParticipant.name }}
      </div>
      <div v-else class="name hint" :title="originHint">{{ originHint }}</div>
      <div class="result">
        {{ participant.score === undefined ? '-' : participant.score }}
      </div>
    </template>
    <template v-else>
      <div v-if="bye" class="name bye">BYE</div>
      <div v-else class="name hint" :title="originHint">
        {{ originHint }}
      </div>
      <div class="result"></div>
    </template>
  </div>
</template>
