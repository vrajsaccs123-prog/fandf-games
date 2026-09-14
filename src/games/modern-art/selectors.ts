/**
 * Modern Art — Selectors (player-facing views).
 */

import type { ModernArtState, MAPlayer, HiddenAuctionState } from "./types";
import type { GamePhaseStatus, GameResult } from "@/game/core/types";
import { paintingValue } from "./engine/rankings";

/**
 * Returns a copy of `state` that is safe to show/send to `playerId`:
 *  • Other players' money is masked to -1
 *  • Hidden-auction bids from opponents are masked to 0 before reveal
 *    (0 = "submitted but amount unknown"; null = "not yet submitted")
 */
export function getMaskedStateForPlayer(
  state: ModernArtState,
  playerId: string
): ModernArtState {
  // Mask other players' money
  const players = state.players.map((p) =>
    p.id === playerId ? p : { ...p, money: -1 }
  );

  // Mask hidden auction bids before reveal
  let auction = state.auction;
  if (
    auction !== null &&
    auction.type === "hidden" &&
    !(auction as HiddenAuctionState).revealed
  ) {
    const hiddenAuction = auction as HiddenAuctionState;
    const maskedBids: Record<string, number | null> = {};
    for (const [pid, bid] of Object.entries(hiddenAuction.bids)) {
      // Show the viewer their own bid; show only "submitted" (0) vs "not submitted" (null) for others
      maskedBids[pid] = pid === playerId ? bid : bid !== null ? 0 : null;
    }
    auction = { ...hiddenAuction, bids: maskedBids };
  }

  return { ...state, players, auction };
}

/** What a player can see about their own position */
export interface ModernArtPlayerView {
  myPlayerId: string;
  myPlayer: MAPlayer | undefined;
  /** Other players — money hidden */
  otherPlayers: Array<Omit<MAPlayer, "money"> & { moneyHidden: true }>;
  phase: ModernArtState["phase"];
  round: number;
  auction: ModernArtState["auction"];
  doubleAuctionSetup: ModernArtState["doubleAuctionSetup"];
  currentPlayerIndex: number;
  artistMarket: ModernArtState["artistMarket"];
  currentRound: ModernArtState["currentRound"];
  mysteryEnabled: boolean;
  mysteryCardCount: number;
  mysteryRevealedCount: number;
  log: ModernArtState["log"];
  lastAuctionResult: ModernArtState["lastAuctionResult"];
  /** Paintings by value if round-end rankings are set */
  paintingValues: Record<string, number> | null;
}

export function getPlayerView(
  state: ModernArtState,
  playerId: string
): ModernArtPlayerView {
  const myPlayer = state.players.find((p) => p.id === playerId);

  const otherPlayers = state.players
    .filter((p) => p.id !== playerId)
    .map(({ money: _m, ...rest }) => ({ ...rest, moneyHidden: true as const }));

  // Only compute painting values if rankings are available
  let paintingValues: Record<string, number> | null = null;
  if (state.currentRound.rankings) {
    paintingValues = {};
    for (const player of state.players) {
      for (const card of player.purchasedThisRound) {
        paintingValues[card.id] = paintingValue(card.artistId, state.currentRound.rankings);
      }
    }
  }

  return {
    myPlayerId: playerId,
    myPlayer,
    otherPlayers,
    phase: state.phase,
    round: state.round,
    auction: state.auction,
    doubleAuctionSetup: state.doubleAuctionSetup,
    currentPlayerIndex: state.currentPlayerIndex,
    artistMarket: state.artistMarket,
    currentRound: state.currentRound,
    mysteryEnabled: state.mysteryEnabled,
    mysteryCardCount: state.mystery?.hand.length ?? 0,
    mysteryRevealedCount: state.mystery?.revealedThisRound.length ?? 0,
    log: state.log,
    lastAuctionResult: state.lastAuctionResult,
    paintingValues,
  };
}

export function getStatus(state: ModernArtState): {
  phase: GamePhaseStatus;
  result?: GameResult;
  currentPlayerId?: string;
  round?: number;
} {
  if (state.phase === "lobby") {
    return { phase: "waiting" };
  }

  if (state.phase === "game-over") {
    // Sort players by money descending
    const sorted = [...state.players].sort((a, b) => b.money - a.money);
    const maxMoney = sorted[0]?.money ?? 0;
    const winners = sorted.filter((p) => p.money === maxMoney).map((p) => p.id);
    const scores: Record<string, number> = {};
    for (const p of state.players) scores[p.id] = p.money;

    return {
      phase: "finished",
      result: {
        winners,
        scores,
        summary: `${sorted[0]?.name ?? "Nobody"} wins with $${maxMoney}!`,
      },
      round: state.round,
    };
  }

  const currentPlayer = state.players[state.currentPlayerIndex];
  return {
    phase: "playing",
    currentPlayerId: currentPlayer?.id,
    round: state.round,
  };
}
