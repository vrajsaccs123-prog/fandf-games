/**
 * Shared deck primitives — build, shuffle, draw, and manage card decks.
 *
 * Pure functions only. No React, no DOM.
 *
 * All mutation-like operations return new arrays/objects (immutable).
 */

import { createCard, SUITS, RANKS } from "@/game/mechanics/cards";
import type { Card, Suit, Rank } from "@/game/mechanics/cards";
import type { Rng } from "@/game/core/random";

// ─── Deck Creation ────────────────────────────────────────────────────────────

/**
 * Create a standard 52-card deck.
 * Cards are face-up by default; pass `faceUp: false` for a closed deck.
 *
 * @param deckIndex - Use when combining multiple decks (ensures unique IDs)
 */
export function createStandardDeck(
  faceUp = false,
  deckIndex = 0
): Card[] {
  const cards: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      cards.push(createCard(suit, rank, faceUp, deckIndex));
    }
  }
  return cards;
}

/**
 * Create multiple standard decks combined (common in casino blackjack).
 */
export function createMultiDeck(numDecks: number, faceUp = false): Card[] {
  const cards: Card[] = [];
  for (let i = 0; i < numDecks; i++) {
    cards.push(...createStandardDeck(faceUp, i));
  }
  return cards;
}

// ─── Shuffle ──────────────────────────────────────────────────────────────────

/**
 * Shuffle a deck using the shared RNG (Fisher-Yates via rng.shuffle).
 * Returns a new array — does not mutate the input.
 */
export function shuffleDeck(deck: Card[], rng: Rng): Card[] {
  return rng.shuffle(deck);
}

// ─── Drawing ─────────────────────────────────────────────────────────────────

export interface DrawResult {
  card: Card;
  remainingDeck: Card[];
}

/**
 * Draw a card from the top (index 0) of the deck.
 * Returns the drawn card and the remaining deck (immutable).
 *
 * @throws if the deck is empty
 */
export function drawCard(deck: Card[]): DrawResult {
  if (deck.length === 0) {
    throw new Error("Cannot draw from an empty deck");
  }
  const [card, ...remainingDeck] = deck;
  return { card, remainingDeck };
}

/**
 * Draw `count` cards from the top of the deck.
 * Returns drawn cards and the remaining deck.
 */
export function drawCards(
  deck: Card[],
  count: number
): { cards: Card[]; remainingDeck: Card[] } {
  if (deck.length < count) {
    throw new Error(
      `Cannot draw ${count} cards from a deck with ${deck.length} cards`
    );
  }
  return {
    cards: deck.slice(0, count),
    remainingDeck: deck.slice(count),
  };
}

/**
 * Draw a card face-up.
 */
export function drawFaceUp(deck: Card[]): DrawResult {
  const { card, remainingDeck } = drawCard(deck);
  return { card: { ...card, faceUp: true }, remainingDeck };
}

/**
 * Draw a card face-down.
 */
export function drawFaceDown(deck: Card[]): DrawResult {
  const { card, remainingDeck } = drawCard(deck);
  return { card: { ...card, faceUp: false }, remainingDeck };
}

// ─── Deck Queries ─────────────────────────────────────────────────────────────

export function isDeckEmpty(deck: Card[]): boolean {
  return deck.length === 0;
}

export function deckSize(deck: Card[]): number {
  return deck.length;
}

/** Find a specific card in a hand/pile by suit+rank */
export function findCard(
  cards: Card[],
  suit: Suit,
  rank: Rank
): Card | undefined {
  return cards.find((c) => c.suit === suit && c.rank === rank);
}
