import { Match, Tournament } from 'tournament-organizer/components'
import type { StandingsValues } from 'tournament-organizer/interfaces'

export const PLACEMENT_EMOJIS = ['🥇', '🥈', '🥉']

export interface AdditionalStandingsValues extends StandingsValues {
  lossesAgainstTiedScore: number
}

/**
 * Reverse comparator. I.e. better scores < worse scores, such that sorting with this function sorts from best to worst
 */
export function compareStandingsValues(a: AdditionalStandingsValues, b: AdditionalStandingsValues) {
  if (a.player.meta.dropped !== b.player.meta.dropped) {
    return a.player.meta.dropped - b.player.meta.dropped
  }

  if (a.matchPoints !== b.matchPoints) {
    return b.matchPoints - a.matchPoints
  }

  if (a.lossesAgainstTiedScore !== b.lossesAgainstTiedScore) {
    return a.lossesAgainstTiedScore - b.lossesAgainstTiedScore
  }

  if (a.tiebreaks.oppMatchWinPct !== b.tiebreaks.oppMatchWinPct) {
    return b.tiebreaks.oppMatchWinPct - a.tiebreaks.oppMatchWinPct
  }

  if (a.gamePoints !== b.gamePoints) {
    return b.gamePoints - a.gamePoints
  }

  const aGameLosses = a.games - a.gamePoints
  const bGameLosses = b.games - b.gamePoints
  if (aGameLosses !== bGameLosses) {
    return aGameLosses - bGameLosses
  }

  if (a.tiebreaks.oppGameWinPct !== b.tiebreaks.oppGameWinPct) {
    return b.tiebreaks.oppGameWinPct - a.tiebreaks.oppGameWinPct
  }

  return 0
}

export class CustomStandingsTournament extends Tournament {
  constructor(other: Tournament) {
    super(other.id, other.name)
    Object.assign(this, other)
  }

  standings(activeOnly: boolean = true): AdditionalStandingsValues[] {
    const standings: AdditionalStandingsValues[] = super.standings(activeOnly).map((x) => {
      return {
        ...x,
        lossesAgainstTiedScore: 0,
      }
    })

    for (const player of standings) {
      let lossesAgainstTiedScore = 0
      for (const otherPlayer of standings) {
        if (otherPlayer.matchPoints !== player.matchPoints) {
          continue
        }
        lossesAgainstTiedScore += player.player.matches.reduce((losses, match) => {
          if (match.opponent !== otherPlayer.player.id) {
            return losses
          }
          if (match.win >= match.loss) {
            return losses
          }
          return losses + 1
        }, 0)
      }
      player.lossesAgainstTiedScore = lossesAgainstTiedScore
    }

    standings.sort(compareStandingsValues)

    return standings
  }

  winnerLoserOf(match: Match | undefined) {
    if (!match || match.player1.id === null || match.player2.id === null || match.active) {
      return null
    }
    const winner = match.player1.win > match.player2.win ? match.player1 : match.player2
    const loser = match.player1.win > match.player2.win ? match.player2 : match.player1
    return [
      this.players.find((p) => p.id === winner.id)!,
      this.players.find((p) => p.id === loser.id)!,
    ]
  }
}

export function isPlayerWinning(match: Match, player: string) {
  const isPlayer1 = match.player1.id === player
  if (!isPlayer1 && match.player2.id !== player) {
    return undefined
  }
  if (isPlayer1) {
    return match.player1.win > match.player2.win
  } else {
    return match.player2.win > match.player1.win
  }
}
