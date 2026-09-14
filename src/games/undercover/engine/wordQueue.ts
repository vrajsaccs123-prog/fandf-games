/**
 * Undercover — word queue management.
 *
 * Ensures word pairs are not repeated within a match until the full pool is
 * exhausted, following the difficulty fallback rules from the spec.
 */

import { createRng } from "@/game/core/random";
import { WORD_PAIRS } from "../words";
import type { WordDeck, WordDifficulty, WordPair } from "../types";

// ─── Difficulty fallback order ────────────────────────────────────────────────

const FALLBACK_ORDER: Record<WordDifficulty, WordDifficulty[]> = {
  easy:      ["easy",      "medium",   "difficult"],
  medium:    ["medium",    "easy",     "difficult"],
  difficult: ["difficult", "medium",   "easy"],
};

// ─── Initialise deck ──────────────────────────────────────────────────────────

/**
 * Create a fresh word deck for a match, shuffled with the given seed.
 */
export function createWordDeck(seed: string): WordDeck {
  const rng = createRng(seed + "-deck");
  const shuffled = rng.shuffle(WORD_PAIRS) as WordPair[];
  return {
    available: shuffled,
    used: [],
    reshuffled: false,
  };
}

// ─── Pick next word pair ──────────────────────────────────────────────────────

export interface PickWordResult {
  pair: WordPair;
  deck: WordDeck;
  reshuffled: boolean; // true if the deck was rebuilt due to exhaustion
  usedFallback: boolean;
  actualDifficulty: WordDifficulty;
}

/**
 * Pick the next word pair for a round, honouring difficulty fallback rules.
 *
 * Mutates nothing — returns a new WordDeck.
 */
export function pickWordPair(
  deck: WordDeck,
  preferredDifficulty: WordDifficulty,
  seed: string
): PickWordResult {
  const fallbacks = FALLBACK_ORDER[preferredDifficulty];

  // Try each fallback in order
  for (const difficulty of fallbacks) {
    const available = deck.available.filter((p) => p.difficulty === difficulty);
    if (available.length > 0) {
      const rng = createRng(seed + "-pick-" + difficulty + deck.used.length);
      const picked = rng.pick(available) as WordPair;

      const newDeck: WordDeck = {
        ...deck,
        available: deck.available.filter((p) => p.id !== picked.id),
        used: [...deck.used, picked],
        reshuffled: false,
      };

      return {
        pair: picked,
        deck: newDeck,
        reshuffled: false,
        usedFallback: difficulty !== preferredDifficulty,
        actualDifficulty: difficulty,
      };
    }
  }

  // All difficulties exhausted — rebuild the deck
  const rng = createRng(seed + "-reshuffle-" + deck.used.length);
  const reshuffled = rng.shuffle(WORD_PAIRS) as WordPair[];

  const newDeck: WordDeck = {
    available: reshuffled,
    used: [],
    reshuffled: true,
  };

  // Now pick from the freshly built deck
  const available = newDeck.available.filter(
    (p) => p.difficulty === preferredDifficulty
  );
  const picked =
    available.length > 0
      ? (createRng(seed + "-reshuffle-pick").pick(available) as WordPair)
      : newDeck.available[0];

  return {
    pair: picked,
    deck: {
      ...newDeck,
      available: newDeck.available.filter((p) => p.id !== picked.id),
      used: [picked],
    },
    reshuffled: true,
    usedFallback: picked.difficulty !== preferredDifficulty,
    actualDifficulty: picked.difficulty,
  };
}

// ─── Randomize direction ───────────────────────────────────────────────────────

/**
 * Randomly decide which word in the pair is Civilian and which is Undercover.
 * Must be called fresh each round.
 */
export function randomizeWordDirection(
  pair: WordPair,
  seed: string,
  round: number
): { civilianWord: string; undercoverWord: string } {
  const rng = createRng(seed + "-dir-" + round);
  const civilianIsA = rng.next() < 0.5;
  return {
    civilianWord: civilianIsA ? pair.wordA : pair.wordB,
    undercoverWord: civilianIsA ? pair.wordB : pair.wordA,
  };
}
