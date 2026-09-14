/**
 * Modern Art — Artist ranking logic.
 */

import type { ArtistId, ArtistRanking, ArtistMarket } from "../types";
import { ARTIST_ORDER } from "../types";
import {
  ROUND_FIRST_VALUE,
  ROUND_SECOND_VALUE,
  ROUND_THIRD_VALUE,
} from "../data";

/**
 * Calculate artist rankings for a round based on offer counts.
 *
 * Tie-breaking: the artist further LEFT on the board (earlier in ARTIST_ORDER)
 * ranks higher. E.g. Manuel beats Ramon in a tie.
 *
 * Returns all 5 artists with their rank (null if outside top 3) and values.
 */
export function calculateRankings(
  offerCounts: Record<ArtistId, number>,
  market: ArtistMarket,
  currentRound: number
): ArtistRanking[] {
  // Build a sorted list: primary = offer count (desc), secondary = board position (asc = beats)
  const withCounts = ARTIST_ORDER.map((artistId, boardIndex) => ({
    artistId,
    offerCount: offerCounts[artistId] ?? 0,
    boardIndex,
  }));

  // Sort: more paintings = higher rank; tie = earlier board position wins
  const sorted = [...withCounts].sort((a, b) => {
    if (b.offerCount !== a.offerCount) return b.offerCount - a.offerCount;
    return a.boardIndex - b.boardIndex; // lower boardIndex = higher ranking
  });

  // Assign values
  const rankValues: Array<30 | 20 | 10 | 0> = [
    ROUND_FIRST_VALUE,
    ROUND_SECOND_VALUE,
    ROUND_THIRD_VALUE,
    0,
    0,
  ];

  // Compute cumulative historical values (add current round's contribution)
  const rankings: ArtistRanking[] = sorted.map((entry, sortedIndex) => {
    const rank = (sortedIndex + 1) as 1 | 2 | 3;
    const rankValue = rankValues[sortedIndex] as 30 | 20 | 10 | 0;
    const isRanked = sortedIndex < 3 && entry.offerCount > 0;

    // Historical values from previous rounds
    const historical = computeHistoricalValue(market, entry.artistId, currentRound - 1);
    const cumulativeValue = isRanked ? historical + rankValue : historical;

    return {
      artistId: entry.artistId,
      offerCount: entry.offerCount,
      rank: isRanked ? rank : null,
      valueThisRound: isRanked ? rankValue : 0,
      cumulativeValue,
    };
  });

  return rankings;
}

/**
 * Sum all value tiles for an artist up through (but not including) the given round.
 * roundIndex is 0-based (so round 1 = index 0).
 */
export function computeHistoricalValue(
  market: ArtistMarket,
  artistId: ArtistId,
  throughRoundIndex: number
): number {
  let total = 0;
  for (let i = 0; i < throughRoundIndex && i < market.roundValues.length; i++) {
    total += market.roundValues[i][artistId] ?? 0;
  }
  return total;
}

/**
 * Compute current painting sale value for an artist:
 * If artist is Top 3 this round → sum of ALL historical tiles including this round.
 * Otherwise → 0.
 */
export function paintingValue(
  artistId: ArtistId,
  rankings: ArtistRanking[]
): number {
  const r = rankings.find((r) => r.artistId === artistId);
  if (!r || r.rank === null) return 0;
  return r.cumulativeValue;
}
