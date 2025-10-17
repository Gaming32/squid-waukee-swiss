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

import type { Stage, Match, MatchGame, Participant, GroupType, StageType } from 'brackets-model'

export interface MatchWithExtras extends Match {
  id: string
  winDestination: string | null
  loseDestination: string | null
  bye: boolean
}

/**
 * A match with metadata constructed by the viewer.
 */
export interface MatchWithMetadata extends MatchWithExtras {
  metadata: {
    // Information known since the beginning

    /** Type of the stage this match is in. */
    stageType: StageType
    /** The list of child games of this match. */
    games: MatchGame[]

    // Positional information

    /** Label as shown in the UI */
    label?: string
    /** Number of the round this match is in. */
    roundNumber?: number
    originMatches?: number
    childOriginMatches?: number | null
    childSiblingOriginMatches?: number | null
    /** Count of rounds in the group this match is in. */
    roundCount?: number
    /** Group type this match is in. */
    matchLocation?: GroupType

    origins?: MatchWithMetadata[]
    sibling?: string | null

    // Other information

    /** Whether to connect this match to the final if it happens to be the last one of the bracket. */
    connectFinal?: boolean
    /** Whether to connect this match with previous or next matches. */
    connection?: Connection
    /** Function returning an origin hint based on a participant's position for this match. */
    originHint?: OriginHint
  }
}

/**
 * The data to display with `brackets-viewer.js`
 */
export interface ViewerData {
  /** The stages to display. */
  stage: Stage

  /** The matches of the stage to display. */
  matches: MatchWithExtras[]

  /** The games of the matches to display. */
  matchGames: MatchGame[]

  /** The participants who play in the stage to display. */
  participants: Participant[]
}

/**
 * The possible sides of a participant.
 */
export type Side = 'opponent1' | 'opponent2'

/**
 * The possible types of connection between matches.
 */
export type ConnectionType = 'square' | 'straight' | false

/**
 * A function returning an origin hint based on a participant's position.
 */
export type OriginHint = (position: number) => string

/**
 * Contains the information about the connections of a match.
 */
export interface Connection {
  connectPrevious?: ConnectionType
  connectNext?: ConnectionType
}
