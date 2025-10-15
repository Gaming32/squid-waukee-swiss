<script setup lang="ts">
import type { MatchWithMetadata, OriginHint } from '@/brackets-viewer/types'
import type { GroupType, Participant } from 'brackets-model'
import { computed } from 'vue'
import MatchParticipant from './MatchParticipant.vue'
import SingleMatch from './SingleMatch.vue'
import { getBracketConnection } from '@/brackets-viewer/dom'
import { isMajorRound } from '@/brackets-viewer/helpers'

const props = defineProps<{
  participants: Participant[]
  highlightTeam?: string
  matchesByRound: MatchWithMetadata[][]
  getRoundName: (roundNumber: number, roundCount: number) => string
  bracketType: GroupType
  connectFinal: boolean
}>()

const emit = defineEmits<{
  (e: 'matchClicked', match: MatchWithMetadata): void
  (e: 'hover', team?: string): void
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

type ExtraMatchData = { origins: MatchWithMetadata[]; sibling: string | null }
const extraMatchData = computed(() => {
  const extraData: { [match: string]: ExtraMatchData } = {}
  for (const round of props.matchesByRound.slice().reverse()) {
    let previousMatchData = null
    for (const match of round) {
      const matchData: ExtraMatchData = { origins: [], sibling: null }
      extraData[match.id] = matchData
      if (match.winDestination) {
        extraData[match.winDestination]!.origins.push(match)
      }
      if (previousMatchData) {
        previousMatchData.sibling = match.id
      }
      previousMatchData = matchData
    }
  }
  return extraData
})

function getMatchLabel(
  matchNumber: number,
  roundNumber?: number,
  roundCount?: number,
  matchLocation?: GroupType,
) {
  if (roundNumber === undefined || roundCount === undefined || matchLocation === undefined)
    return `Match ${matchNumber}`

  const matchPrefix =
    matchLocation === 'winner_bracket' ? 'WB ' : matchLocation === 'loser_bracket' ? 'LB ' : 'M'

  const inSemiFinalRound = roundNumber === roundCount - 1
  const inFinalRound = roundNumber === roundCount

  if (matchLocation === 'single_bracket') {
    if (inSemiFinalRound) return `Semi ${matchNumber}`

    if (inFinalRound) return 'Final'
  }

  if (inSemiFinalRound) return `${matchPrefix}Semi ${matchNumber}`

  if (inFinalRound) return `${matchPrefix}Final`

  return `${matchPrefix}${roundNumber}.${matchNumber}`
}

function findRoundNumber(match: MatchWithMetadata) {
  return props.matchesByRound.findIndex((round) => round[0]?.round_id === match.round_id) + 1
}

function getOriginHint(
  roundNumber: number,
  roundCount: number,
  matchLocation: GroupType,
  origins: MatchWithMetadata[],
): OriginHint {
  const isFromWinners = isMajorRound(roundNumber) && matchLocation === 'loser_bracket'
  const lossLocation = isFromWinners ? 'winner_bracket' : matchLocation
  const youAreA = isFromWinners ? 'Loser' : 'Winner'
  if (origins.length === 0) {
    return (position) => `Seed ${position}`
  } else if (origins.length === 1) {
    const origin = origins[0]!
    const originLabel = getMatchLabel(
      origin.number,
      findRoundNumber(origin),
      roundCount,
      lossLocation,
    )
    return (position) => (position > 0 ? `Seed ${position}` : `${youAreA} of ${originLabel}`)
  } else {
    return (position) => {
      const origin = origins[position + 2]!
      return `${youAreA} of ${getMatchLabel(origin.number, findRoundNumber(origin), roundCount, lossLocation)}`
    }
  }
}

function computeMetadata(match: MatchWithMetadata, roundNumber: number): MatchWithMetadata {
  const roundCount = props.matchesByRound.length
  const matchData = extraMatchData.value[match.id]!
  const winDestinationData = extraMatchData.value[match.winDestination ?? '']
  const childOriginMatches = winDestinationData?.origins?.length ?? null
  const matchLocation = props.bracketType
  const connectFinal = props.connectFinal
  return {
    ...match,
    metadata: {
      ...match.metadata,
      roundNumber,
      roundCount,
      childOriginMatches,
      childSiblingOriginMatches:
        extraMatchData.value[winDestinationData?.sibling ?? '']?.origins?.length ?? null,
      matchLocation,
      connectFinal,
      connection: getBracketConnection(
        roundNumber,
        roundCount,
        matchData.origins.length,
        childOriginMatches,
        matchLocation,
        connectFinal,
      ),
      label: getMatchLabel(match.number, roundNumber, roundCount, matchLocation),
      originHint: getOriginHint(roundNumber, roundCount, matchLocation, matchData.origins),
    },
  }
}
</script>

<template>
  <div class="bracket" :data-group-id="matchesByRound[0]![0]!.group_id">
    <h2 v-if="bracketName">{{ bracketName }}</h2>
    <div class="rounds">
      <div
        v-for="(round, roundIndex) in matchesByRound"
        :key="round[0]!.round_id"
        class="round"
        :data-round-id="round[0]!.round_id"
      >
        <h3>
          {{ getRoundName(roundIndex + 1, matchesByRound.length) }}
        </h3>
        <template v-for="match in round" :key="match.id">
          <SingleMatch
            v-if="match"
            :participants="participants"
            :highlight-team="highlightTeam"
            :match="computeMetadata(match, roundIndex + 1)"
            @match-clicked="(m) => emit('matchClicked', m)"
            @hover="(team) => emit('hover', team)"
          />
          <div v-else class="match hidden-match">
            <div class="opponents">
              <MatchParticipant :participants="participants" :participant="null" />
              <MatchParticipant :participants="participants" :participant="null" />
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.hidden-match {
  visibility: hidden;
}
</style>
