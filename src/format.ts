import type { Round } from 'maps.iplabs.ink/src/types-interfaces/Interfaces'
import { appendOrAdd, filledArray } from './utils'
import type { SettableTournamentValues, StandingsValues } from 'tournament-organizer/interfaces'
import type { Player, Tournament } from 'tournament-organizer/components'

export type SwissFormatSettings = {
  swissBestOf: number
  advancementCutoff: number
  playoffsBestOf: number
}

export type SingleEliminationFormatSettings = {
  bestOf: number
  finalsBestOf: number
}

export type TournamentFormat =
  | ({ type: 'swiss' } & SwissFormatSettings)
  | ({ type: 'single_elimination' } & SingleEliminationFormatSettings)

export const DEFAULT_SWISS_SETTINGS: SwissFormatSettings = {
  swissBestOf: 3,
  advancementCutoff: 4,
  playoffsBestOf: 5,
}

export const DEFAULT_SINGLE_ELIMINATION_SETTINGS: SingleEliminationFormatSettings = {
  bestOf: 3,
  finalsBestOf: 5,
}

export const DEFAULT_TOURNAMENT_FORMAT: TournamentFormat = {
  type: 'swiss',
  ...DEFAULT_SWISS_SETTINGS,
}

export function computeSimpleRoundCount(players: number) {
  return Math.ceil(Math.log2(players))
}

function createSingleElimRounds(
  players: number,
  settings: SingleEliminationFormatSettings,
  nameFunction: (round: number) => string = (round) => `Round ${round}`,
) {
  const roundCount = computeSimpleRoundCount(players)
  const rounds = filledArray(Math.max(0, roundCount - 2)).map<Round>((_, index) => ({
    name: nameFunction(index + 1),
    playStyle: 'bestOf',
    games: filledArray(settings.bestOf, 'counterpick'),
  }))

  if (roundCount > 1) {
    rounds.push({
      name: 'Semifinals',
      playStyle: 'bestOf',
      games: filledArray(settings.finalsBestOf, 'counterpick'),
    })
  }
  rounds.push({
    name: 'Finals',
    playStyle: 'bestOf',
    games: filledArray(settings.finalsBestOf, 'counterpick'),
  })

  return rounds
}

export function createRounds(players: number, format: TournamentFormat) {
  switch (format.type) {
    case 'swiss': {
      const swissRounds = filledArray(computeSimpleRoundCount(players)).map<Round>((_, index) => ({
        name: `Swiss R${index + 1}`,
        playStyle: 'bestOf',
        games: filledArray(format.swissBestOf, 'counterpick'),
      }))

      const playoffRounds = createSingleElimRounds(
        format.advancementCutoff,
        {
          bestOf: format.playoffsBestOf,
          finalsBestOf: format.playoffsBestOf,
        },
        (round) => `Playoffs R${round}`,
      )

      return swissRounds.concat(playoffRounds)
    }
    case 'single_elimination':
      return createSingleElimRounds(players, format)
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
            'neighboring points', // FIXME This is wins against tied, not losses against tied
            'opponent match win percentage',
            'cumulative',
            // 'game losses', // FIXME
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
  }
}

export function computeFinalStandings(
  tournament: Tournament,
  swissStandings: StandingsValues[],
  firstEliminationRound: number,
) {
  const format = tournament.getCurrentFormat()
  if (format === 'swiss') {
    return {}
  }
  const result: { [placement: number]: Player[] } = []

  const final = tournament.getMatches()[tournament.getMatches().length - 1]!
  if (final.hasEnded()) {
    result[1] = [tournament.getPlayer(final.getWinner()!.id!)]
    result[2] = [tournament.getPlayer(final.getLoser()!.id!)]
  }

  const firstLoserRound = tournament
    .getMatches()
    .find((m) => m.getRoundNumber() >= firstEliminationRound && m.getPath().loss === null)!
    .getRoundNumber()
  let currentRank = 3
  for (let round = final.getRoundNumber() - 1; round >= firstLoserRound; round--) {
    const matches = tournament.getMatchesByRound(round)
    const resultsAtRank: Player[] = []
    for (const match of matches) {
      const loser = match.getLoser()
      if (loser) {
        resultsAtRank.push(tournament.getPlayer(loser.id!))
      }
    }
    result[currentRank] = resultsAtRank
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
