/**
 * Tests for Blackjack scoring / hand value calculation.
 */

import { describe, it, expect } from "vitest";
import { handValue, isBust, isBlackjack, dealerShouldHit, resolveOutcome } from "../scoring";
import { createCard } from "@/game/mechanics/cards";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const card = (rank: Parameters<typeof createCard>[1]) =>
  createCard("spades", rank, true);

// ─── handValue ────────────────────────────────────────────────────────────────

describe("handValue", () => {
  it("sums number cards correctly", () => {
    expect(handValue([card("7"), card("8")])).toBe(15);
  });

  it("treats J/Q/K as 10", () => {
    expect(handValue([card("J"), card("Q"), card("K")])).toBe(30);
  });

  it("counts Ace as 11 when it doesn't bust", () => {
    expect(handValue([card("A"), card("9")])).toBe(20);
  });

  it("counts Ace as 1 when 11 would bust", () => {
    expect(handValue([card("A"), card("9"), card("5")])).toBe(15);
  });

  it("handles multiple aces correctly", () => {
    // A + A = 12 (one as 11, one as 1)
    expect(handValue([card("A"), card("A")])).toBe(12);
  });

  it("handles A+A+9 correctly", () => {
    // 11+1+9 = 21 (not 11+11+9=31)
    expect(handValue([card("A"), card("A"), card("9")])).toBe(21);
  });

  it("natural blackjack = 21", () => {
    expect(handValue([card("A"), card("K")])).toBe(21);
  });
});

// ─── isBust ───────────────────────────────────────────────────────────────────

describe("isBust", () => {
  it("returns false for 21", () => {
    expect(isBust([card("A"), card("K")])).toBe(false);
  });

  it("returns true for 22+", () => {
    expect(isBust([card("10"), card("8"), card("5")])).toBe(true);
  });

  it("returns false when Ace saves the hand", () => {
    expect(isBust([card("A"), card("9"), card("5")])).toBe(false);
  });
});

// ─── isBlackjack ─────────────────────────────────────────────────────────────

describe("isBlackjack", () => {
  it("Ace + King = blackjack", () => {
    expect(isBlackjack([card("A"), card("K")])).toBe(true);
  });

  it("Ace + 10 = blackjack", () => {
    expect(isBlackjack([card("A"), card("10")])).toBe(true);
  });

  it("three cards totalling 21 is NOT blackjack", () => {
    expect(isBlackjack([card("7"), card("7"), card("7")])).toBe(false);
  });

  it("two cards NOT totalling 21 is not blackjack", () => {
    expect(isBlackjack([card("9"), card("9")])).toBe(false);
  });
});

// ─── dealerShouldHit ─────────────────────────────────────────────────────────

describe("dealerShouldHit", () => {
  it("hits on 16", () => {
    expect(dealerShouldHit([card("10"), card("6")])).toBe(true);
  });

  it("stands on 17", () => {
    expect(dealerShouldHit([card("10"), card("7")])).toBe(false);
  });

  it("stands on soft 17 (A+6)", () => {
    expect(dealerShouldHit([card("A"), card("6")])).toBe(false);
  });

  it("hits on soft 16 (A+5)", () => {
    expect(dealerShouldHit([card("A"), card("5")])).toBe(true);
  });
});

// ─── resolveOutcome ───────────────────────────────────────────────────────────

describe("resolveOutcome", () => {
  it("player wins with higher total", () => {
    const { outcome, payout } = resolveOutcome(
      [card("10"), card("9")],  // 19
      [card("10"), card("8")],  // 18
      100
    );
    expect(outcome).toBe("win");
    expect(payout).toBe(100);
  });

  it("player loses with lower total", () => {
    const { outcome, payout } = resolveOutcome(
      [card("10"), card("7")],  // 17
      [card("10"), card("9")],  // 19
      100
    );
    expect(outcome).toBe("lose");
    expect(payout).toBe(-100);
  });

  it("push on equal totals", () => {
    const { outcome, payout } = resolveOutcome(
      [card("10"), card("8")],  // 18
      [card("10"), card("8")],  // 18
      100
    );
    expect(outcome).toBe("push");
    expect(payout).toBe(0);
  });

  it("player blackjack pays 3:2", () => {
    const { outcome, payout } = resolveOutcome(
      [card("A"), card("K")],   // BJ
      [card("10"), card("8")],  // 18
      100
    );
    expect(outcome).toBe("blackjack");
    expect(payout).toBe(150);
  });

  it("both blackjack = push", () => {
    const { outcome, payout } = resolveOutcome(
      [card("A"), card("K")],
      [card("A"), card("J")],
      100
    );
    expect(outcome).toBe("push");
    expect(payout).toBe(0);
  });

  it("dealer blackjack beats non-blackjack player", () => {
    const { outcome } = resolveOutcome(
      [card("10"), card("9")],  // 19
      [card("A"), card("K")],   // BJ
      100
    );
    expect(outcome).toBe("lose");
  });

  it("dealer bust = player wins", () => {
    const { outcome, payout } = resolveOutcome(
      [card("10"), card("8")],          // 18
      [card("10"), card("7"), card("8")], // 25 — bust
      100
    );
    expect(outcome).toBe("win");
    expect(payout).toBe(100);
  });

  it("player bust = player loses regardless of dealer", () => {
    const { outcome, payout } = resolveOutcome(
      [card("10"), card("7"), card("8")], // 25 — bust
      [card("10"), card("7"), card("8")], // 25 — also bust
      100
    );
    expect(outcome).toBe("lose");
    expect(payout).toBe(-100);
  });
});
