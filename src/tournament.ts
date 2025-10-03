import { Tournament } from 'tournament-organizer/components'
import type { StandingsValues } from 'tournament-organizer/interfaces'

export interface AdditionalStandingsValues extends StandingsValues {
  lossesAgainstTiedScore: number
}

export class CustomStandingsTournament extends Tournament {
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

    standings.sort((a, b) => {
      if (a.player.active !== b.player.active) {
        return +b.player.active - +a.player.active
      }

      if (a.matchPoints !== b.matchPoints) {
        return b.matchPoints - a.matchPoints
      }

      if (a.lossesAgainstTiedScore !== b.lossesAgainstTiedScore) {
        return a.lossesAgainstTiedScore - b.lossesAgainstTiedScore
      }

      if (a.tiebreaks.oppMatchWinPct != b.tiebreaks.oppMatchWinPct) {
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

      return +a.player.id - +b.player.id
    })

    return standings
  }
}
