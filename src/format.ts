import type { Round } from 'maps.iplabs.ink/src/types-interfaces/Interfaces'
import { appendOrAdd, filledArray } from './utils'
import type { SettableTournamentValues } from 'tournament-organizer/interfaces'
import {
  compareStandingsValues,
  type AdditionalStandingsValues,
  type CustomStandingsTournament,
} from './tournament'
import type { Player } from 'tournament-organizer/components'
import { groupBy } from 'lodash'

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

function computeSingleElimFinalStandings(
  tournament: CustomStandingsTournament,
  firstRound: number = 0,
) {
  const standings: { [standing: number]: Player[] } = {}

  const maxRound = Math.max(...tournament.matches.map((m) => m.round))
  const matches = groupBy(tournament.matches, 'round')

  const overallWinner = tournament.winnerLoserOf(matches[maxRound]?.[0])?.[0]
  if (overallWinner) {
    standings[1] = [overallWinner]
  }

  let currentRound = maxRound
  let standing = 2
  while (currentRound >= firstRound) {
    const matchesInRound = matches[currentRound] ?? []
    const losersInRound = matchesInRound
      .map((m) => tournament.winnerLoserOf(m)?.[1])
      .filter((x) => x !== undefined)
    if (losersInRound.length) {
      standings[standing] = losersInRound
    }
    standing += standing - 1 - matchesInRound.filter((m) => m.bye).length
    currentRound--
  }

  return standings
}

export function computeFinalStandings(
  format: TournamentFormat['type'],
  tournament: CustomStandingsTournament,
  swissStandings: AdditionalStandingsValues[],
) {
  switch (format) {
    case 'swiss': {
      if (tournament.status === 'stage-one') {
        return {}
      }
      const topCutCount = tournament.stageTwo.advance.value
      const standings = computeSingleElimFinalStandings(tournament, tournament.stageOne.rounds + 1)
      let standing = topCutCount
      let previousStandingValues: AdditionalStandingsValues | null = null
      for (const standingValues of swissStandings.slice(topCutCount)) {
        if (
          previousStandingValues === null ||
          compareStandingsValues(previousStandingValues, standingValues) > 0
        ) {
          standing++
        }
        appendOrAdd(standings, standing, standingValues.player)
        previousStandingValues = standingValues
      }
      return standings
    }
    case 'single_elimination':
      return computeSingleElimFinalStandings(tournament)
  }
}
