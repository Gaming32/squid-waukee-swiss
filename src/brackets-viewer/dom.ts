/*
 * MIT License
 *
 * Copyright (c) 2020 Corentin Girard
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import type { FinalType, GroupType } from 'brackets-model'
import type { Connection } from './types'

/**
 * Returns the connection for a given round in a bracket.
 *
 * @param alwaysConnectFirstRound Whether to always connect the first round with the second round.
 * @param roundNumber Number of the round.
 * @param roundCount Count of rounds.
 * @param match The match to connect to other matches.
 * @param matchLocation Location of the match.
 * @param connectFinal Whether to connect to the final.
 */
export function getBracketConnection(
  roundNumber: number,
  roundCount: number,
  originMatches: number,
  childOriginMatches: number | null,
  matchLocation?: GroupType,
  connectFinal?: boolean,
): Connection {
  const connection: Connection = {
    connectPrevious: false,
    connectNext: false,
  }

  if (matchLocation === 'loser_bracket') {
    connection.connectPrevious = roundNumber > 1 && (roundNumber % 2 === 1 ? 'square' : 'straight')
    connection.connectNext =
      roundNumber < roundCount && (roundNumber % 2 === 0 ? 'square' : 'straight')
  } else {
    connection.connectPrevious = (originMatches && 'square') || false
    connection.connectNext =
      childOriginMatches === 1
        ? 'straight'
        : roundNumber < roundCount
          ? 'square'
          : connectFinal
            ? 'straight'
            : false
  }

  return connection
}

/**
 * Returns the connection for a given round in the final.
 *
 * @param finalType Type of final.
 * @param roundNumber Number of the round.
 * @param matchCount The count of matches.
 */
export function getFinalConnection(
  finalType: FinalType,
  roundNumber: number,
  matchCount: number,
): Connection {
  return {
    connectPrevious: finalType === 'grand_final' && roundNumber === 1 && 'straight',
    connectNext: matchCount === 2 && roundNumber === 1 && 'straight',
  }
}
