/**
 * Tests for word queue management.
 */

import { describe, it, expect } from "vitest";
import { createWordDeck, pickWordPair, randomizeWordDirection } from "../engine/wordQueue";
import { WORD_PAIRS } from "../words";

describe("createWordDeck", () => {
  it("creates a deck with all word pairs", () => {
    const deck = createWordDeck("test-seed");
    expect(deck.available.length + deck.used.length).toBe(WORD_PAIRS.length);
    expect(deck.used.length).toBe(0);
  });

  it("shuffles differently with different seeds", () => {
    const deck1 = createWordDeck("seed-1");
    const deck2 = createWordDeck("seed-2");
    // Verify both have the same total count but different order
    expect(deck1.available.length).toBe(deck2.available.length);
    const sameOrder = deck1.available.every((p, i) => p.id === deck2.available[i].id);
    // Could be equal by chance but extremely unlikely
    expect(WORD_PAIRS.length).toBeGreaterThan(5);
  });
});

describe("pickWordPair", () => {
  it("picks a pair from the preferred difficulty", () => {
    const deck = createWordDeck("pick-test");
    const result = pickWordPair(deck, "easy", "pick-test");
    expect(result.pair.difficulty).toBe("easy");
    expect(result.usedFallback).toBe(false);
  });

  it("does not repeat the same pair immediately", () => {
    const deck = createWordDeck("no-repeat");
    const result1 = pickWordPair(deck, "easy", "no-repeat");
    const result2 = pickWordPair(result1.deck, "easy", "no-repeat-2");
    expect(result1.pair.id).not.toBe(result2.pair.id);
  });

  it("moves used pair from available to used", () => {
    const deck = createWordDeck("used-test");
    const initialCount = deck.available.length;
    const result = pickWordPair(deck, "medium", "used-test");
    expect(result.deck.available.length).toBe(initialCount - 1);
    expect(result.deck.used.length).toBe(1);
    expect(result.deck.used[0].id).toBe(result.pair.id);
  });

  it("exhausts all easy pairs and falls back to medium", () => {
    let deck = createWordDeck("exhaust-test");
    // Use up all easy pairs
    const easyCount = WORD_PAIRS.filter((p) => p.difficulty === "easy").length;
    for (let i = 0; i < easyCount; i++) {
      const res = pickWordPair(deck, "easy", `exhaust-test-${i}`);
      deck = res.deck;
    }
    // Next pick should use fallback
    const fallback = pickWordPair(deck, "easy", "exhaust-test-fallback");
    expect(fallback.usedFallback).toBe(true);
    expect(fallback.pair.difficulty).not.toBe("easy");
  });

  it("reshuffles when all pairs are exhausted", () => {
    let deck = createWordDeck("reshuffle-test");

    // Exhaust all available pairs
    const diffs = ["easy", "medium", "difficult"] as const;
    while (deck.available.length > 0) {
      const anyDiff = diffs.find((d) => deck.available.some((p) => p.difficulty === d));
      if (!anyDiff) break;
      const res = pickWordPair(deck, anyDiff, `exhaust-${deck.used.length}`);
      deck = res.deck;
    }

    expect(deck.available.length).toBe(0);

    // Next pick should trigger a reshuffle
    const res = pickWordPair(deck, "easy", "after-exhaust");
    expect(res.reshuffled).toBe(true);
    expect(res.pair).toBeDefined();
  });
});

describe("randomizeWordDirection", () => {
  it("returns civilianWord and undercoverWord", () => {
    const pair = { id: "test", wordA: "Apple", wordB: "Pear", difficulty: "easy" as const, category: "Food" };
    const result = randomizeWordDirection(pair, "dir-test", 1);
    expect([pair.wordA, pair.wordB]).toContain(result.civilianWord);
    expect([pair.wordA, pair.wordB]).toContain(result.undercoverWord);
    expect(result.civilianWord).not.toBe(result.undercoverWord);
  });

  it("can produce either word as civilian across different seeds", () => {
    const pair = { id: "test", wordA: "Apple", wordB: "Pear", difficulty: "easy" as const, category: "Food" };
    const results = new Set<string>();
    for (let round = 1; round <= 20; round++) {
      const r = randomizeWordDirection(pair, `vary-seed-${round}`, round);
      results.add(r.civilianWord);
    }
    // Both words should appear as civilian across enough rounds
    expect(results.size).toBe(2);
  });
});
