import type { Round } from 'maps.iplabs.ink/src/types-interfaces/Interfaces'
import { appendOrAdd, filledArray } from './utils'
import type { SettableTournamentValues, StandingsValues } from 'tournament-organizer/interfaces'
import type { Player, Tournament } from 'tournament-organizer/components'
import { findLast, last } from 'lodash'

export type SwissFormatSettings = {
  swissBestOf: number
  advancementCutoff: number
  playoffsBestOf: number
}

export type SingleEliminationFormatSettings = {
  bestOf: number
  finalsBestOf: number
}

export type DoubleEliminationFormatSettings = {
  bestOf: number
  finalsBestOf: number
  grandFinalBestOf: number
}

export type TournamentFormat =
  | ({ type: 'swiss' } & SwissFormatSettings)
  | ({ type: 'single_elimination' } & SingleEliminationFormatSettings)
  | ({ type: 'double_elimination' } & DoubleEliminationFormatSettings)

export const DEFAULT_SWISS_SETTINGS: SwissFormatSettings = {
  swissBestOf: 3,
  advancementCutoff: 4,
  playoffsBestOf: 5,
}

export const DEFAULT_SINGLE_ELIMINATION_SETTINGS: SingleEliminationFormatSettings = {
  bestOf: 3,
  finalsBestOf: 5,
}

export const DEFAULT_DOUBLE_ELIMINATION_SETTINGS: DoubleEliminationFormatSettings = {
  bestOf: 3,
  finalsBestOf: 5,
  grandFinalBestOf: 5,
}

export const DEFAULT_TOURNAMENT_FORMAT: TournamentFormat = {
  type: 'swiss',
  ...DEFAULT_SWISS_SETTINGS,
}

export function computeSimpleRoundCount(players: number) {
  return Math.ceil(Math.log2(players))
}

export function computeLosersRoundCount(winnersRoundCount: number) {
  return 2 * (winnersRoundCount - 1)
}

function createRound(name: string, bestOf: number): Round {
  return {
    name,
    playStyle: 'bestOf',
    games: filledArray(bestOf, 'counterpick'),
  }
}

function createMultiRounds(
  roundCount: number,
  bestOf: number,
  nameFunction: (round: number) => string,
) {
  return filledArray(roundCount).map((_, index) => createRound(nameFunction(index + 1), bestOf))
}

function createElimRounds(
  roundCount: number,
  bestOf: number,
  semisBestOf: number,
  finalsBestOf: number,
  nameFunction: (round: number) => string = (round) => `Round ${round}`,
  semisName: string = 'Semifinals',
  finalsName: string = 'Finals',
) {
  const rounds = createMultiRounds(Math.max(0, roundCount - 2), bestOf, nameFunction)
  if (roundCount > 1) {
    rounds.push(createRound(semisName, semisBestOf))
  }
  rounds.push(createRound(finalsName, finalsBestOf))
  return rounds
}

export function createRounds(players: number, format: TournamentFormat) {
  switch (format.type) {
    case 'swiss': {
      const swissRounds = createMultiRounds(
        computeSimpleRoundCount(players),
        format.swissBestOf,
        (r) => `Swiss R${r}`,
      )
      const playoffRounds = createElimRounds(
        computeSimpleRoundCount(format.advancementCutoff),
        format.playoffsBestOf,
        format.playoffsBestOf,
        format.playoffsBestOf,
        (r) => `Playoffs R${r}`,
      )
      return swissRounds.concat(playoffRounds)
    }
    case 'single_elimination':
      return createElimRounds(players, format.bestOf, format.finalsBestOf, format.finalsBestOf)
    case 'double_elimination': {
      const winnersRoundCount = computeSimpleRoundCount(players)
      const winnersRounds = createElimRounds(
        winnersRoundCount,
        format.bestOf,
        format.bestOf,
        format.finalsBestOf,
        (r) => `Winners R${r}`,
        'Winners Semis',
        'Winners Finals',
      )
      const losersRounds = createElimRounds(
        computeLosersRoundCount(winnersRoundCount),
        format.bestOf,
        format.bestOf,
        format.finalsBestOf,
        (r) => `Losers R${r}`,
        'Losers Semis',
        'Losers Finals',
      )
      return winnersRounds
        .concat([createRound('Grand Final', format.grandFinalBestOf)])
        .concat(losersRounds)
    }
  }
}

export function createInitialTournamentOrganizerFormatSettings(
  format: TournamentFormat,
): SettableTournamentValues {
  switch (format.type) {
    case 'swiss':
      return {
        scoring: {
          bestOf: format.swissBestOf,
          draw: 0,
          tiebreaks: [
            'neighboring record',
            'opponent match win percentage',
            'earned game wins',
            'earned game losses',
            'opponent game win percentage',
          ],
        },
        stageOne: {
          format: 'swiss',
        },
        stageTwo: {
          format: 'single-elimination',
          advance: {
            value: format.advancementCutoff,
            method: 'rank',
          },
        },
      }
    case 'single_elimination':
      return {
        scoring: {
          bestOf: format.bestOf,
        },
        stageOne: {
          format: 'single-elimination',
        },
      }
    case 'double_elimination':
      return {
        scoring: {
          bestOf: format.bestOf,
        },
        stageOne: {
          format: 'double-elimination',
        },
      }
  }
}

export function computeFinalStandings(
  tournament: Tournament,
  swissStandings: StandingsValues[],
  firstEliminationRound: number,
) {
  const format =
    tournament.getCurrentFormat() ??
    tournament.getStageTwo().format ??
    tournament.getStageOne().format
  if (format === 'swiss') {
    return {}
  }
  const result: { [placement: number]: Player[] } = {}

  const final = last(
    format !== 'double-elimination'
      ? tournament.getMatches()
      : tournament.getMatchesByRound(
          firstEliminationRound + computeSimpleRoundCount(tournament.getPlayers().length),
        ),
  )!
  if (final.hasEnded()) {
    result[1] = [tournament.getPlayer(final.getWinner()!.id!)]
    result[2] = [tournament.getPlayer(final.getLoser()!.id!)]
  }

  const firstLoserRound =
    format !== 'double-elimination' ? firstEliminationRound : final.getRoundNumber() + 1
  const lastLoserRound =
    format !== 'double-elimination'
      ? final.getRoundNumber() - 1
      : findLast(
          tournament.getMatches(),
          (m) => m.getRoundNumber() !== final.getRoundNumber(),
        )!.getRoundNumber()
  let currentRank = 3
  for (let round = lastLoserRound; round >= firstLoserRound; round--) {
    const matches = tournament.getMatchesByRound(round)
    const resultsAtRank: Player[] = []
    for (const match of matches) {
      const loser = match.getLoser()
      if (loser) {
        resultsAtRank.push(tournament.getPlayer(loser.id!))
      }
    }
    if (resultsAtRank.length) {
      result[currentRank] = resultsAtRank
    }
    currentRank += matches.length
  }

  let previousStanding: StandingsValues | null = null
  for (const standing of swissStandings.slice(currentRank - 1)) {
    if (
      previousStanding !== null &&
      tournament['sortForStandings'](standing, previousStanding, firstEliminationRound - 1) > 0
    ) {
      currentRank++
    }
    previousStanding = standing
    appendOrAdd(result, currentRank, standing.player)
  }

  return result
}
