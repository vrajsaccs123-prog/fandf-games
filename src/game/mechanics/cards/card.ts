/**
 * Shared card primitives — used by every card game.
 *
 * A Card is pure data. No rendering, no React, no DOM.
 */

// ─── Suits ────────────────────────────────────────────────────────────────────

export type Suit = "hearts" | "diamonds" | "clubs" | "spades";

export const SUITS: Suit[] = ["hearts", "diamonds", "clubs", "spades"];

export const SUIT_SYMBOL: Record<Suit, string> = {
  hearts:   "♥",
  diamonds: "♦",
  clubs:    "♣",
  spades:   "♠",
};

export const SUIT_COLOR: Record<Suit, "red" | "black"> = {
  hearts:   "red",
  diamonds: "red",
  clubs:    "black",
  spades:   "black",
};

// ─── Ranks ────────────────────────────────────────────────────────────────────

export type Rank =
  | "A"
  | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10"
  | "J" | "Q" | "K";

export const RANKS: Rank[] = [
  "A",
  "2", "3", "4", "5", "6", "7", "8", "9", "10",
  "J", "Q", "K",
];

export const RANK_LABEL: Record<Rank, string> = {
  A:  "Ace",
  "2": "Two",   "3": "Three", "4": "Four",  "5": "Five",
  "6": "Six",   "7": "Seven", "8": "Eight", "9": "Nine", "10": "Ten",
  J:  "Jack",   Q:  "Queen",  K:  "King",
};

// ─── Card ─────────────────────────────────────────────────────────────────────

/**
 * A single playing card.
 *
 * `id` is stable and unique within a deck so UI animations can key on it.
 * e.g. "hearts-A-0" for the Ace of Hearts in deck 0.
 */
export interface Card {
  id: string;
  suit: Suit;
  rank: Rank;
  /** Whether this card is face-up (visible) */
  faceUp: boolean;
}

/** Create a card with a given suit and rank. `deckIndex` differentiates multi-deck setups. */
export function createCard(
  suit: Suit,
  rank: Rank,
  faceUp = true,
  deckIndex = 0
): Card {
  return {
    id: `${suit}-${rank}-${deckIndex}`,
    suit,
    rank,
    faceUp,
  };
}

/** Flip a card (returns a new card object — never mutate) */
export function flipCard(card: Card, faceUp?: boolean): Card {
  return { ...card, faceUp: faceUp ?? !card.faceUp };
}

// ─── Display Helpers ──────────────────────────────────────────────────────────

/** Short display label e.g. "A♥" */
export function cardLabel(card: Card): string {
  return `${card.rank}${SUIT_SYMBOL[card.suit]}`;
}

/** Accessible name e.g. "Ace of Hearts" */
export function cardAccessibleName(card: Card): string {
  return `${RANK_LABEL[card.rank]} of ${card.suit}`;
}
