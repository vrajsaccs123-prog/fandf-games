/**
 * Blackjack — Selectors: getPlayerView, getStatus, and derived queries.
 *
 * getPlayerView hides the dealer's hole card until it is revealed.
 */

import type { BlackjackState, BlackjackPlayer, DealerState } from "./state";
import type { GamePhaseStatus, GameResult } from "@/game/core/types";
import { handValue, visibleHandValue } from "./scoring";

// ─── Player View ─────────────────────────────────────────────────────────────

export interface BlackjackPlayerView {
  myPlayer: BlackjackPlayer;
  otherPlayers: Omit<BlackjackPlayer, "hand">[];  // Full hand hidden
  dealer: {
    hand: DealerState["hand"];    // Hole card is faceDown until revealed
    visibleValue: number;
    holeCardRevealed: boolean;
    status: DealerState["status"];
  };
  phase: BlackjackState["phase"];
  currentPlayerId: string | null;
  round: number;
}

export function getPlayerView(
  state: BlackjackState,
  playerId: string
): BlackjackPlayerView {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) throw new Error(`Player ${playerId} not found`);

  // Dealer hand: hide hole card if not yet revealed
  const dealerHand = state.dealer.holeCardRevealed
    ? state.dealer.hand
    : state.dealer.hand.map((card, i) =>
        i === 1 ? { ...card, faceUp: false } : card
      );

  const currentPlayer =
    state.phase === "playing"
      ? state.players[state.currentPlayerIndex]
      : null;

  return {
    myPlayer: player,
    otherPlayers: state.players
      .filter((p) => p.id !== playerId)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .map(({ hand: _hand, ...rest }) => rest),
    dealer: {
      hand: dealerHand,
      visibleValue: visibleHandValue(dealerHand),
      holeCardRevealed: state.dealer.holeCardRevealed,
      status: state.dealer.status,
    },
    phase: state.phase,
    currentPlayerId: currentPlayer?.id ?? null,
    round: state.round,
  };
}

// ─── Game Status ──────────────────────────────────────────────────────────────

export function getStatus(state: BlackjackState): {
  phase: GamePhaseStatus;
  result?: GameResult;
  currentPlayerId?: string;
  round?: number;
} {
  const allEliminated = state.players.every((p) => p.status === "eliminated");

  if (allEliminated) {
    return {
      phase: "finished",
      result: {
        winners: [],
        summary: "All players have been eliminated.",
      },
      round: state.round,
    };
  }

  const platformPhase: GamePhaseStatus =
    state.phase === "round-over" && allEliminated
      ? "finished"
      : state.phase === "betting"
      ? "playing"
      : "playing";

  const currentPlayer =
    state.phase === "playing"
      ? state.players[state.currentPlayerIndex]
      : undefined;

  return {
    phase: platformPhase,
    currentPlayerId: currentPlayer?.id,
    round: state.round,
  };
}

// ─── Derived Queries ──────────────────────────────────────────────────────────

export function getHandValue(player: BlackjackPlayer): number {
  return handValue(player.hand);
}

export function getCurrentPlayer(state: BlackjackState): BlackjackPlayer | undefined {
  return state.phase === "playing"
    ? state.players[state.currentPlayerIndex]
    : undefined;
}

export function getActivePlayers(state: BlackjackState): BlackjackPlayer[] {
  return state.players.filter((p) => p.status !== "eliminated");
}

export function allBetsPlaced(state: BlackjackState): boolean {
  return getActivePlayers(state).every((p) => p.bet > 0 || p.status === "waiting");
}
