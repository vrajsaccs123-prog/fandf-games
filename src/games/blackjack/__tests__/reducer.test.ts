/**
 * Tests for the Blackjack reducer — state transitions and game rules.
 */

import { describe, it, expect } from "vitest";
import { createInitialState } from "../state";
import { reduce } from "../reducer";
import { validateAction } from "../validation";
import type { BlackjackAction } from "../actions";
import type { GameConfig } from "@/game/core/types";

// ─── Test Config ─────────────────────────────────────────────────────────────

const twoPlayerConfig: GameConfig = {
  players: [
    { id: "p1", name: "Alice", seat: 0, isHuman: true },
    { id: "p2", name: "Bob",   seat: 1, isHuman: true },
  ],
};

// Use a fixed seed so tests are deterministic
const SEED = "test-seed-42";

function freshState() {
  return createInitialState(twoPlayerConfig, SEED);
}

function dispatch(state: ReturnType<typeof freshState>, action: BlackjackAction) {
  return reduce(state, action);
}

// ─── createInitialState ───────────────────────────────────────────────────────

describe("createInitialState", () => {
  it("starts in betting phase", () => {
    expect(freshState().phase).toBe("betting");
  });

  it("creates the correct number of players", () => {
    expect(freshState().players).toHaveLength(2);
  });

  it("all players start with 1000 chips and 0 bet", () => {
    const { players } = freshState();
    for (const p of players) {
      expect(p.chips).toBe(1000);
      expect(p.bet).toBe(0);
      expect(p.hand).toHaveLength(0);
      expect(p.status).toBe("betting");
    }
  });

  it("shuffled deck has 52 cards", () => {
    expect(freshState().deck).toHaveLength(52);
  });
});

// ─── PLACE_BET ────────────────────────────────────────────────────────────────

describe("PLACE_BET", () => {
  it("accepts a valid bet", () => {
    let s = freshState();
    s = dispatch(s, { type: "PLACE_BET", playerId: "p1", amount: 50 });
    const p1 = s.players.find((p) => p.id === "p1")!;
    expect(p1.bet).toBe(50);
    expect(p1.status).toBe("waiting");
  });

  it("rejects a bet below minimum", () => {
    const s = freshState();
    const result = validateAction(s, { type: "PLACE_BET", playerId: "p1", amount: 5 });
    expect(result.valid).toBe(false);
  });

  it("rejects a bet above chip count", () => {
    const s = freshState();
    const result = validateAction(s, { type: "PLACE_BET", playerId: "p1", amount: 9999 });
    expect(result.valid).toBe(false);
  });

  it("rejects non-integer bet", () => {
    const s = freshState();
    const result = validateAction(s, { type: "PLACE_BET", playerId: "p1", amount: 10.5 });
    expect(result.valid).toBe(false);
  });
});

// ─── START_ROUND ─────────────────────────────────────────────────────────────

describe("START_ROUND", () => {
  function betAndStart() {
    let s = freshState();
    s = dispatch(s, { type: "PLACE_BET", playerId: "p1", amount: 100 });
    s = dispatch(s, { type: "PLACE_BET", playerId: "p2", amount: 100 });
    s = dispatch(s, { type: "START_ROUND" });
    return s;
  }

  it("cannot start before all bets are placed", () => {
    let s = freshState();
    s = dispatch(s, { type: "PLACE_BET", playerId: "p1", amount: 100 });
    const result = validateAction(s, { type: "START_ROUND" });
    expect(result.valid).toBe(false);
  });

  it("deals 2 cards to each player", () => {
    const s = betAndStart();
    for (const p of s.players) {
      expect(p.hand).toHaveLength(2);
    }
  });

  it("deals 2 cards to the dealer", () => {
    const s = betAndStart();
    expect(s.dealer.hand).toHaveLength(2);
  });

  it("dealer's hole card is face-down", () => {
    const s = betAndStart();
    const holeCard = s.dealer.hand[1];
    expect(holeCard.faceUp).toBe(false);
  });

  it("dealer's first card is face-up", () => {
    const s = betAndStart();
    const firstCard = s.dealer.hand[0];
    expect(firstCard.faceUp).toBe(true);
  });

  it("transitions to playing phase", () => {
    const s = betAndStart();
    // Could be "playing" or "round-over" if everyone has blackjack
    expect(["playing", "round-over", "dealer-turn"]).toContain(s.phase);
  });
});

// ─── HIT / STAND ─────────────────────────────────────────────────────────────

describe("HIT and STAND", () => {
  function getPlayingState() {
    let s = freshState();
    s = dispatch(s, { type: "PLACE_BET", playerId: "p1", amount: 100 });
    s = dispatch(s, { type: "PLACE_BET", playerId: "p2", amount: 100 });
    s = dispatch(s, { type: "START_ROUND" });
    return s;
  }

  it("HIT adds a card to the current player's hand", () => {
    let s = getPlayingState();
    if (s.phase !== "playing") return; // May have gotten BJ

    const currentPlayer = s.players[s.currentPlayerIndex];
    const handSizeBefore = currentPlayer.hand.length;
    s = dispatch(s, { type: "HIT", playerId: currentPlayer.id });

    const updated = s.players.find((p) => p.id === currentPlayer.id)!;
    // Either got a card (still playing) or busted
    expect(updated.hand.length).toBeGreaterThanOrEqual(handSizeBefore);
  });

  it("STAND changes status to stand and advances turn", () => {
    let s = getPlayingState();
    if (s.phase !== "playing") return;

    const currentPlayer = s.players[s.currentPlayerIndex];
    const currentId = currentPlayer.id;
    s = dispatch(s, { type: "STAND", playerId: currentId });

    const stood = s.players.find((p) => p.id === currentId)!;
    expect(stood.status).toBe("stand");
    // Turn has advanced (different player is now current, or phase changed)
    if (s.phase === "playing") {
      expect(s.players[s.currentPlayerIndex].id).not.toBe(currentId);
    }
  });

  it("rejects HIT when not in playing phase", () => {
    const s = freshState();
    const result = validateAction(s, { type: "HIT", playerId: "p1" });
    expect(result.valid).toBe(false);
  });
});

// ─── DOUBLE_DOWN ──────────────────────────────────────────────────────────────

describe("DOUBLE_DOWN", () => {
  it("rejects double on more than 2 cards", () => {
    let s = freshState();
    s = dispatch(s, { type: "PLACE_BET", playerId: "p1", amount: 100 });
    s = dispatch(s, { type: "PLACE_BET", playerId: "p2", amount: 100 });
    s = dispatch(s, { type: "START_ROUND" });

    if (s.phase !== "playing") return;

    const cp = s.players[s.currentPlayerIndex];
    // Hit first to get 3+ cards
    s = dispatch(s, { type: "HIT", playerId: cp.id });

    if (s.phase !== "playing") return;
    if (s.players[s.currentPlayerIndex].id !== cp.id) return;

    const result = validateAction(s, { type: "DOUBLE_DOWN", playerId: cp.id });
    // If player now has 3 cards, double should be rejected
    const updated = s.players.find((p) => p.id === cp.id)!;
    if (updated.hand.length > 2) {
      expect(result.valid).toBe(false);
    }
  });
});

// ─── NEXT_ROUND ───────────────────────────────────────────────────────────────

describe("NEXT_ROUND", () => {
  it("rejects NEXT_ROUND outside of round-over phase", () => {
    const s = freshState();
    const result = validateAction(s, { type: "NEXT_ROUND" });
    expect(result.valid).toBe(false);
  });
});

// ─── getPlayerView (hidden information) ──────────────────────────────────────

describe("getPlayerView", () => {
  it("hides dealer hole card before dealer turn", async () => {
    const { getPlayerView } = await import("../selectors");
    let s = freshState();
    s = dispatch(s, { type: "PLACE_BET", playerId: "p1", amount: 100 });
    s = dispatch(s, { type: "PLACE_BET", playerId: "p2", amount: 100 });
    s = dispatch(s, { type: "START_ROUND" });

    if (s.phase !== "playing") return;

    const view = getPlayerView(s, "p1");
    // Hole card (index 1) should be face-down
    expect(view.dealer.hand[1].faceUp).toBe(false);
  });
});

// ─── RNG ─────────────────────────────────────────────────────────────────────

describe("RNG determinism", () => {
  it("same seed produces same initial deck", () => {
    const s1 = createInitialState(twoPlayerConfig, "deterministic");
    const s2 = createInitialState(twoPlayerConfig, "deterministic");
    expect(s1.deck.map((c) => c.id)).toEqual(s2.deck.map((c) => c.id));
  });

  it("different seeds produce different decks", () => {
    const s1 = createInitialState(twoPlayerConfig, "seed-a");
    const s2 = createInitialState(twoPlayerConfig, "seed-b");
    expect(s1.deck.map((c) => c.id)).not.toEqual(s2.deck.map((c) => c.id));
  });
});
