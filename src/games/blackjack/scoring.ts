/**
 * Blackjack — Hand value calculation and outcome determination.
 *
 * Pure functions only. No state mutation.
 */

import type { Card, Rank } from "@/game/mechanics/cards";

// ─── Card Values ──────────────────────────────────────────────────────────────

const RANK_VALUE: Record<Rank, number> = {
  A:   11, // Ace starts as 11; downgraded to 1 if bust
  "2": 2,  "3": 3,  "4": 4,  "5": 5,
  "6": 6,  "7": 7,  "8": 8,  "9": 9, "10": 10,
  J:   10, Q: 10, K: 10,
};

// ─── Hand Total ───────────────────────────────────────────────────────────────

/**
 * Calculate the best (highest without busting) value for a hand.
 *
 * Aces count as 11 unless that would bust the hand, in which case they count as 1.
 */
export function handValue(cards: Card[]): number {
  // Only count face-up cards for player views; always count all for internal use
  let total = 0;
  let aces = 0;

  for (const card of cards) {
    if (card.rank === "A") {
      aces++;
      total += 11;
    } else {
      total += RANK_VALUE[card.rank];
    }
  }

  // Downgrade aces from 11 to 1 while busting
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }

  return total;
}

/** Calculate hand value counting only face-up cards (for player view of dealer hand) */
export function visibleHandValue(cards: Card[]): number {
  return handValue(cards.filter((c) => c.faceUp));
}

// ─── Hand State Checks ────────────────────────────────────────────────────────

export function isBust(cards: Card[]): boolean {
  return handValue(cards) > 21;
}

export function isBlackjack(cards: Card[]): boolean {
  return cards.length === 2 && handValue(cards) === 21;
}

export function isSoft(cards: Card[]): boolean {
  // A hand is "soft" when an Ace is counted as 11
  let total = 0;
  let aces = 0;
  for (const card of cards) {
    if (card.rank === "A") {
      aces++;
      total += 11;
    } else {
      total += RANK_VALUE[card.rank];
    }
  }
  // If we have aces and total ≤ 21 with at least one counted as 11, it's soft
  return aces > 0 && total <= 21;
}

// ─── Dealer Logic ─────────────────────────────────────────────────────────────

/**
 * Should the dealer take another card?
 * Rule: hit on 16 or less; stand on 17 or more (including soft 17).
 */
export function dealerShouldHit(hand: Card[]): boolean {
  return handValue(hand) <= 16;
}

// ─── Payout ───────────────────────────────────────────────────────────────────

export type Outcome = "blackjack" | "win" | "push" | "lose";

/**
 * Determine the outcome for one player against the dealer.
 *
 * Returns the outcome type and the net chip change (positive = gain).
 */
export function resolveOutcome(
  playerHand: Card[],
  dealerHand: Card[],
  bet: number
): { outcome: Outcome; payout: number } {
  const playerBJ = isBlackjack(playerHand);
  const dealerBJ = isBlackjack(dealerHand);
  const playerBust = isBust(playerHand);
  const dealerBust = isBust(dealerHand);
  const playerTotal = handValue(playerHand);
  const dealerTotal = handValue(dealerHand);

  if (playerBust) return { outcome: "lose", payout: -bet };

  if (playerBJ && dealerBJ) return { outcome: "push", payout: 0 };
  if (playerBJ) return { outcome: "blackjack", payout: Math.floor(bet * 1.5) };
  if (dealerBJ) return { outcome: "lose", payout: -bet };

  if (dealerBust) return { outcome: "win", payout: bet };

  if (playerTotal > dealerTotal) return { outcome: "win", payout: bet };
  if (playerTotal < dealerTotal) return { outcome: "lose", payout: -bet };
  return { outcome: "push", payout: 0 };
}
