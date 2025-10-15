import type { Match, GroupType, MatchGame } from 'brackets-model'
import type { Side } from './types'
import { t } from './lang'

/**
 * Splits an array of objects based on their values at a given key.
 *
 * @param objects The array to split.
 * @param key The key of T.
 */
export function splitBy<
  T extends Record<string, unknown>,
  K extends keyof T,
  U extends Record<K, string | number>,
>(objects: U[], key: K): U[][] {
  const map = {} as Record<string | number, U[]>

  for (const obj of objects) {
    const commonValue = obj[key]

    if (!map[commonValue]) map[commonValue] = []

    map[commonValue].push(obj)
  }

  return Object.values(map)
}

/**
 * Splits an array of objects based on their values at a given key.
 * Objects without a value at the given key will be set under a `-1` index.
 *
 * @param objects The array to split.
 * @param key The key of T.
 */
export function splitByWithLeftovers<
  T extends Record<string, unknown>,
  K extends keyof T,
  U extends Record<K, string | number>,
>(objects: U[], key: K): U[][] {
  const map = {} as Record<string | number, U[]>

  for (const obj of objects) {
    const commonValue = obj[key] ?? '-1' // Object keys are converted to a string.

    if (!map[commonValue]) map[commonValue] = []

    map[commonValue].push(obj)
  }

  const withoutLeftovers = Object.entries(map)
    .filter(([key]) => key !== '-1')
    .map(([, value]) => value)

  const result = [...withoutLeftovers]
  result[-1] = map[-1]!
  return result
}

/**
 * Sorts the objects in the given array by a given key.
 *
 * @param array The array to sort.
 * @param key The key of T.
 */
export function sortBy<
  T extends Record<string, unknown>,
  K extends keyof T,
  U extends Record<K, number>,
>(array: U[], key: K): U[] {
  return [...array].sort((a, b) => a[key] - b[key])
}

/**
 * Finds the root element
 *
 * @param selector An optional selector to select the root element.
 */
export function findRoot(selector?: string): HTMLElement {
  const queryResult = document.querySelectorAll(selector || '.brackets-viewer')

  if (queryResult.length === 0)
    throw Error('Root not found. You must have at least one root element.')

  if (queryResult.length > 1)
    throw Error(
      'Multiple possible roots were found. Please use `config.selector` to choose a specific root.',
    )

  const root = queryResult[0] as HTMLElement

  if (!root.classList.contains('brackets-viewer'))
    throw Error('The selected root must have a `.brackets-viewer` class.')

  return root
}

/**
 * Returns the abbreviation for a participant origin.
 *
 * @param matchLocation Location of the match.
 * @param skipFirstRound Whether to skip the first round.
 * @param roundNumber Number of the round.
 * @param side Side of the participant.
 */
export function getOriginAbbreviation(
  matchLocation: GroupType,
  skipFirstRound: boolean,
  roundNumber?: number,
  side?: Side,
): string | null {
  roundNumber = roundNumber || -1

  if (skipFirstRound && matchLocation === 'loser_bracket' && roundNumber === 1)
    return t('abbreviations.seed')

  if (
    matchLocation === 'single_bracket' ||
    (matchLocation === 'winner_bracket' && roundNumber === 1)
  )
    return t('abbreviations.seed')

  if (matchLocation === 'loser_bracket' && roundNumber % 2 === 0 && side === 'opponent1')
    return t('abbreviations.position')

  return null
}

/**
 * Indicates whether a round is major.
 *
 * @param roundNumber Number of the round.
 */
export function isMajorRound(roundNumber: number): boolean {
  return roundNumber === 1 || roundNumber % 2 === 0
}

/**
 * Indicates whether the input is a match.
 *
 * @param input A match or a match game.
 */
export function isMatch(input: Match | MatchGame): input is Match {
  return 'child_count' in input
}

/**
 * Indicates whether the input is a match game.
 *
 * @param input A match or a match game.
 */
export function isMatchGame(input: Match | MatchGame): input is MatchGame {
  return !isMatch(input)
}
