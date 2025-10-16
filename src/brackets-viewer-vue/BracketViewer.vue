<script setup lang="ts">
import { sortBy, splitByWithLeftovers, splitBy } from '@/brackets-viewer/helpers'
import type { MatchWithMetadata, RoundNameGetter, ViewerData } from '@/brackets-viewer/types'
import { computed } from 'vue'
import RoundRobinGroupMatches from './RoundRobinGroupMatches.vue'
import SingleBracket from './SingleBracket.vue'
import SingleMatch from './SingleMatch.vue'
import { getFinalConnection } from '@/brackets-viewer/dom'
import type { GroupType } from 'brackets-model'

const props = defineProps<{
  data: ViewerData
  highlightTeam?: string
  customRoundName?: RoundNameGetter
}>()

const emit = defineEmits<{
  (e: 'matchClicked', match: MatchWithMetadata): void
  (e: 'hover', team?: string): void
}>()

const matches = computed(() => {
  const matchesWithMetadata = props.data.matches.map<MatchWithMetadata>((match) => ({
    ...match,
    metadata: {
      stageType: props.data.stage.type,
      games: props.data.matchGames.filter((game) => game.parent_id === match.id),
      origins: [],
      sibling: null,
    },
  }))
  const matchesById = Object.fromEntries(matchesWithMetadata.map((m) => [m.id, m]))
  const matchesByGroup = splitByWithLeftovers(matchesWithMetadata, 'group_id')
  matchesByGroup.forEach((group, groupIndex) => {
    const matchesByRound = splitBy(group, 'round_id').map((matches) => sortBy(matches, 'number'))
    matchesByRound.forEach((round, roundIndex) => {
      let previousMatch: MatchWithMetadata | null = null
      for (const match of round) {
        match.metadata.roundNumber = roundIndex + 1
        match.metadata.roundCount = matchesByRound.length
        if (props.data.stage.type === 'single_elimination') {
          match.metadata.matchLocation = 'single_bracket'
        } else {
          const groupTypes: GroupType[] = ['winner_bracket', 'loser_bracket', 'final_group']
          match.metadata.matchLocation = groupTypes[groupIndex]!
        }
        if (match.winDestination) {
          matchesById[match.winDestination]!.metadata.origins!.push(match)
        }
        if (match.loseDestination) {
          matchesById[match.loseDestination]!.metadata.origins!.push(match)
        }
        if (previousMatch) {
          previousMatch.metadata.sibling = match.id
        }
        previousMatch = match
      }
    })
  })
  return { matchesById, matchesByGroup }
})
</script>

<template>
  <div class="brackets-viewer">
    <div v-if="data.stage.type === 'round_robin'" class="round-robin">
      <RoundRobinGroupMatches
        v-for="groupMatches in matches.matchesByGroup"
        :key="groupMatches[0]!.group_id"
        :participants="data.participants"
        :highlight-team="highlightTeam"
        :group-matches="groupMatches"
        @match-clicked="(m) => emit('matchClicked', m)"
        @hover="(team) => emit('hover', team)"
      />
    </div>
    <div
      v-else-if="
        data.stage.type === 'single_elimination' || data.stage.type === 'double_elimination'
      "
      class="elimination"
    >
      <template v-if="data.stage.type === 'single_elimination'">
        <SingleBracket
          :participants="data.participants"
          :highlight-team="highlightTeam"
          :matches-by-id="matches.matchesById"
          :matches-by-round="
            splitBy(matches.matchesByGroup[0]!, 'round_id').map((matches) =>
              sortBy(matches, 'number'),
            )
          "
          :get-round-name="
            (roundNumber, roundCount) =>
              roundNumber === roundCount
                ? 'Finals'
                : roundNumber === roundCount - 1
                  ? 'Semis'
                  : `Round ${roundNumber}`
          "
          bracket-type="single_bracket"
          :connect-final="false"
          @match-clicked="(m) => emit('matchClicked', m)"
          @hover="(team) => emit('hover', team)"
        />
      </template>
      <template v-else>
        <SingleBracket
          :participants="data.participants"
          :highlight-team="highlightTeam"
          :matches-by-id="matches.matchesById"
          :matches-by-round="
            splitBy(matches.matchesByGroup[0]!, 'round_id').map((matches) =>
              sortBy(matches, 'number'),
            )
          "
          :get-round-name="
            (roundNumber, roundCount) =>
              roundNumber === roundCount
                ? 'Winners Finals'
                : roundNumber === roundCount - 1
                  ? 'Winners Semis'
                  : `Winners Round ${roundNumber}`
          "
          bracket-type="winner_bracket"
          :connect-final="true"
          @match-clicked="(m) => emit('matchClicked', m)"
          @hover="(team) => emit('hover', team)"
        >
          <div
            v-for="(match, matchIndex) in matches.matchesByGroup[2]!"
            :key="match.id"
            class="round"
          >
            <h3>{{ matchIndex === 0 ? 'Grand Final' : 'Bracket Reset' }}</h3>
            <SingleMatch
              :participants="data.participants"
              :highlight-team="highlightTeam"
              :match="{
                ...match,
                metadata: {
                  ...match.metadata,
                  roundNumber: matchIndex + 1,
                  roundCount: matches.matchesByGroup[2]!.length,
                  connection: getFinalConnection(
                    'grand_final',
                    matchIndex + 1,
                    matches.matchesByGroup[2]!.length,
                  ),
                  label:
                    matches.matchesByGroup[2]!.length > 1
                      ? `Grand Final ${matchIndex + 1}`
                      : 'Grand Final',
                  originHint: (position) => ['Winner of WB Final', 'Winner of LB Final'][position]!,
                },
              }"
              @match-clicked="(m) => emit('matchClicked', m)"
              @hover="(team) => emit('hover', team)"
            />
          </div>
        </SingleBracket>
        <SingleBracket
          :participants="data.participants"
          :highlight-team="highlightTeam"
          :matches-by-id="matches.matchesById"
          :matches-by-round="
            splitBy(matches.matchesByGroup[1]!, 'round_id').map((matches) =>
              sortBy(matches, 'number'),
            )
          "
          :get-round-name="
            (roundNumber, roundCount) =>
              roundNumber === roundCount
                ? 'Losers Finals'
                : roundNumber === roundCount - 1
                  ? 'Losers Semis'
                  : `Losers Round ${roundNumber}`
          "
          bracket-type="loser_bracket"
          :connect-final="false"
          @match-clicked="(m) => emit('matchClicked', m)"
          @hover="(team) => emit('hover', team)"
        />
      </template>
    </div>
  </div>
</template>
