/**
 * Blackjack — State types and createInitialState.
 */

import type { Card } from "@/game/mechanics/cards";
import type { GameConfig } from "@/game/core/types";
import { createRng } from "@/game/core/random";
import { createStandardDeck, shuffleDeck } from "@/game/mechanics/deck";

// ─── Constants ────────────────────────────────────────────────────────────────

export const STARTING_CHIPS = 1000;
export const MINIMUM_BET = 10;
export const LOW_DECK_THRESHOLD = 15; // Re-shuffle when fewer cards remain

// ─── Player ───────────────────────────────────────────────────────────────────

export type PlayerStatus =
  | "betting"    // Waiting to place a bet
  | "waiting"    // Bet placed, waiting for round to start / for their turn
  | "playing"    // It is this player's turn
  | "stand"      // Player stood
  | "bust"       // Player exceeded 21
  | "blackjack"  // Natural blackjack on first two cards
  | "doubled"    // Doubled down (auto-stand after one card)
  | "eliminated"; // No chips remaining

export type PlayerOutcome = "win" | "lose" | "push" | "blackjack";

export interface BlackjackPlayer {
  id: string;
  name: string;
  chips: number;
  bet: number;
  hand: Card[];
  status: PlayerStatus;
  outcome?: PlayerOutcome;
  /** Net chip change this round (positive = win, negative = loss) */
  payout?: number;
}

// ─── Dealer ───────────────────────────────────────────────────────────────────

export type DealerStatus = "waiting" | "playing" | "stand" | "bust";

export interface DealerState {
  hand: Card[];
  holeCardRevealed: boolean;
  status: DealerStatus;
}

// ─── Game Phase ───────────────────────────────────────────────────────────────

export type BlackjackPhase =
  | "betting"      // All players placing bets
  | "playing"      // Players taking turns
  | "dealer-turn"  // Dealer plays automatically
  | "resolving"    // Outcomes calculated
  | "round-over";  // Results displayed; waiting for next round

// ─── Full State ───────────────────────────────────────────────────────────────

export interface BlackjackState {
  phase: BlackjackPhase;
  players: BlackjackPlayer[];
  dealer: DealerState;
  deck: Card[];
  /** Index into players[] whose turn it currently is (during "playing" phase) */
  currentPlayerIndex: number;
  round: number;
  /** Seed carried across the session for progressive RNG */
  seed: string;
}

// ─── Factory ─────────────────────────────────────────────────────────────────

export function createInitialState(
  config: GameConfig,
  seed?: string
): BlackjackState {
  const resolvedSeed = seed ?? `blackjack-${Date.now()}`;
  const rng = createRng(resolvedSeed);

  const deck = shuffleDeck(createStandardDeck(false), rng);

  const players: BlackjackPlayer[] = config.players.map((p) => ({
    id: p.id,
    name: p.name,
    chips: STARTING_CHIPS,
    bet: 0,
    hand: [],
    status: "betting",
  }));

  return {
    phase: "betting",
    players,
    dealer: {
      hand: [],
      holeCardRevealed: false,
      status: "waiting",
    },
    deck,
    currentPlayerIndex: 0,
    round: 1,
    seed: resolvedSeed,
  };
}
