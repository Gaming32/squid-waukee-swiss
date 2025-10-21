<script setup lang="ts">
import type { MatchWithMetadata, OriginHint } from '@/brackets-viewer/types'
import type { GroupType, Participant } from 'brackets-model'
import { computed } from 'vue'
import SingleMatch from './SingleMatch.vue'

const props = defineProps<{
  participants: Participant[]
  matchesById: { [id: string]: MatchWithMetadata }
  matchesByRound: MatchWithMetadata[][]
  getRoundName: (roundNumber: number, roundCount: number) => string
  bracketType: GroupType
  connectFinal: boolean
}>()

const emit = defineEmits<{
  (e: 'matchClicked', match: MatchWithMetadata): void
}>()

const bracketName = computed(() => {
  switch (props.bracketType) {
    case 'winner_bracket':
      return 'Winner Bracket'
    case 'loser_bracket':
      return 'Loser Bracket'
    default:
      return undefined
  }
})

function getMatchLabel(
  matchNumber: number,
  roundNumber?: number,
  roundCount?: number,
  matchLocation?: GroupType,
) {
  if (roundNumber === undefined || roundCount === undefined || matchLocation === undefined)
    return `Match ${matchNumber}`

  const inSemiFinalRound = roundNumber === roundCount - 1
  const inFinalRound = roundNumber === roundCount

  if (matchLocation === 'single_bracket') {
    if (inSemiFinalRound) return `Semi ${matchNumber}`
    if (inFinalRound) return 'Final'
  } else if (matchLocation === 'winner_bracket') {
    if (inSemiFinalRound) return `WB Semi ${matchNumber}`
    if (inFinalRound) return 'WB Final'
  } else if (matchLocation === 'loser_bracket') {
    if (inSemiFinalRound) return `LB Semi`
    if (inFinalRound) return 'LB Final'
  }

  const matchPrefix =
    matchLocation === 'winner_bracket' ? 'WB ' : matchLocation === 'loser_bracket' ? 'LB ' : 'M'
  return `${matchPrefix}${roundNumber}.${matchNumber}`
}

function getOriginHint(matchLocation: GroupType, origins: MatchWithMetadata[]): OriginHint {
  return (position) => {
    const origin = origins[position] ?? origins[0]!
    const youAreA = origin.metadata.matchLocation === matchLocation ? 'Winner' : 'Loser'
    const originLabel = getMatchLabel(
      origin.number,
      origin.metadata.roundNumber,
      origin.metadata.roundCount,
      origin.metadata.matchLocation,
    )
    return `${youAreA} of ${originLabel}`
  }
}

function computeMetadata(match: MatchWithMetadata, roundNumber: number): MatchWithMetadata {
  const roundCount = props.matchesByRound.length
  const winDestination = props.matchesById[match.winDestination ?? '']
  const matchLocation = props.bracketType
  const connectFinal = props.connectFinal
  return {
    ...match,
    metadata: {
      ...match.metadata,
      childOriginMatches: winDestination?.metadata?.origins?.length ?? 0,
      childSiblingOriginMatches:
        props.matchesById[winDestination?.metadata?.sibling ?? '']?.metadata?.origins?.length ??
        null,
      matchLocation,
      connectFinal,
      connection: {
        connectPrevious: getSingleConnection(match),
        connectNext:
          roundNumber === roundCount && connectFinal
            ? 'straight'
            : getSingleConnection(winDestination),
      },
      label: getMatchLabel(match.number, roundNumber, roundCount, matchLocation),
      originHint: getOriginHint(matchLocation, match.metadata.origins!),
    },
  }
}

function getSingleConnection(match?: MatchWithMetadata) {
  if (!match) {
    return
  }
  const origins =
    match.metadata.origins?.filter(
      (o) => o.metadata.matchLocation === match.metadata.matchLocation,
    ) ?? []
  if (origins.length > 1) {
    return 'square'
  }
  if (origins.length === 1) {
    return 'straight'
  }
  return false
}
</script>

<template>
  <div class="bracket">
    <h2 v-if="bracketName">{{ bracketName }}</h2>
    <div class="rounds">
      <div v-for="(round, roundIndex) in matchesByRound" :key="round[0]!.round_id" class="round">
        <h3>
          {{ getRoundName(roundIndex + 1, matchesByRound.length) }}
        </h3>
        <template v-for="match in round" :key="match.id">
          <SingleMatch
            :participants="participants"
            :match="computeMetadata(match, roundIndex + 1)"
            @match-clicked="(m) => emit('matchClicked', m)"
          />
        </template>
      </div>
      <slot></slot>
    </div>
  </div>
</template>

<style scoped>
.hidden-match {
  visibility: hidden;
}
</style>
