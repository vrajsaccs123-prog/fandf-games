/**
 * Blackjack — Pure reducer.
 *
 * Given a state and an action, returns the next state.
 * Never mutates the input. All changes produce new objects.
 */

import type { BlackjackState, BlackjackPlayer } from "./state";
import type { BlackjackAction } from "./actions";
import { LOW_DECK_THRESHOLD } from "./state";
import {
  isBust,
  isBlackjack,
  dealerShouldHit,
  resolveOutcome,
} from "./scoring";
import { createRng } from "@/game/core/random";
import {
  createStandardDeck,
  shuffleDeck,
  drawFaceUp,
  drawFaceDown,
} from "@/game/mechanics/deck";
import { flipCard } from "@/game/mechanics/cards";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function updatePlayer(
  players: BlackjackPlayer[],
  id: string,
  patch: Partial<BlackjackPlayer>
): BlackjackPlayer[] {
  return players.map((p) => (p.id === id ? { ...p, ...patch } : p));
}

function activePlayers(players: BlackjackPlayer[]): BlackjackPlayer[] {
  return players.filter((p) => p.status !== "eliminated");
}

/** Advance to the next player's turn; if no more, go to dealer-turn */
function advanceTurn(state: BlackjackState): BlackjackState {
  let next = state.currentPlayerIndex + 1;
  // Find the next player who is still "waiting" (i.e. hasn't played yet)
  while (next < state.players.length) {
    const p = state.players[next];
    if (p.status === "waiting") {
      return {
        ...state,
        currentPlayerIndex: next,
        players: updatePlayer(state.players, p.id, { status: "playing" }),
      };
    }
    next++;
  }

  // No more players — move to dealer turn
  return runDealerTurn(state);
}

/** Run the dealer's entire turn automatically */
function runDealerTurn(state: BlackjackState): BlackjackState {
  // Reveal the hole card
  let dealerHand = state.dealer.hand.map((c) => flipCard(c, true));
  let deck = state.deck;

  // Dealer hits until 17+
  while (dealerShouldHit(dealerHand)) {
    // Reshuffle if low
    if (deck.length < LOW_DECK_THRESHOLD) {
      deck = shuffleDeck(createStandardDeck(false), createRng(state.seed));
    }
    const { card, remainingDeck } = drawFaceUp(deck);
    deck = remainingDeck;
    dealerHand = [...dealerHand, card];
  }

  const dealerBust = isBust(dealerHand);
  const dealerStatus = dealerBust ? "bust" : "stand";

  const stateAfterDealer: BlackjackState = {
    ...state,
    deck,
    dealer: {
      ...state.dealer,
      hand: dealerHand,
      holeCardRevealed: true,
      status: dealerStatus,
    },
    phase: "resolving",
  };

  return resolveRound(stateAfterDealer);
}

/** Calculate payouts for all players and finalize the round */
function resolveRound(state: BlackjackState): BlackjackState {
  const players = state.players.map((player) => {
    if (player.status === "eliminated" || player.status === "betting") {
      return player; // Didn't play this round
    }

    const { outcome, payout } = resolveOutcome(
      player.hand,
      state.dealer.hand,
      player.bet
    );

    const newChips = player.chips + payout;
    const isNowEliminated = newChips <= 0;

    return {
      ...player,
      chips: Math.max(0, newChips),
      outcome: outcome as BlackjackPlayer["outcome"],
      payout,
      status: isNowEliminated ? ("eliminated" as const) : player.status,
    };
  });

  return {
    ...state,
    phase: "round-over",
    players,
  };
}

// ─── Reducer ──────────────────────────────────────────────────────────────────

export function reduce(
  state: BlackjackState,
  action: BlackjackAction
): BlackjackState {
  switch (action.type) {
    // ── PLACE_BET ──────────────────────────────────────────────────────────
    case "PLACE_BET": {
      if (state.phase !== "betting") return state;

      return {
        ...state,
        players: updatePlayer(state.players, action.playerId, {
          bet: action.amount,
          status: "waiting",
        }),
      };
    }

    // ── START_ROUND ────────────────────────────────────────────────────────
    case "START_ROUND": {
      if (state.phase !== "betting") return state;

      // Reshuffle if deck is running low
      let deck = state.deck;
      if (deck.length < LOW_DECK_THRESHOLD) {
        deck = shuffleDeck(createStandardDeck(false), createRng(state.seed));
      }

      // Deal 2 cards to each active player + 2 to dealer
      let players = [...state.players];

      // First pass: one card each
      for (let i = 0; i < players.length; i++) {
        if (players[i].status === "waiting") {
          const { card, remainingDeck } = drawFaceUp(deck);
          deck = remainingDeck;
          players[i] = { ...players[i], hand: [card] };
        }
      }
      // Dealer first card face-up
      const d1 = drawFaceUp(deck);
      deck = d1.remainingDeck;
      let dealerHand = [d1.card];

      // Second pass: one card each
      for (let i = 0; i < players.length; i++) {
        if (players[i].status === "waiting") {
          const { card, remainingDeck } = drawFaceUp(deck);
          deck = remainingDeck;
          players[i] = { ...players[i], hand: [...players[i].hand, card] };
        }
      }
      // Dealer second card face-down (hole card)
      const d2 = drawFaceDown(deck);
      deck = d2.remainingDeck;
      dealerHand = [...dealerHand, d2.card];

      // Check for natural blackjacks
      players = players.map((p) => {
        if (p.status !== "waiting") return p;
        if (isBlackjack(p.hand)) {
          return { ...p, status: "blackjack" as const };
        }
        return p;
      });

      // Set the first non-blackjack active player to "playing"
      let firstPlayingIndex = -1;
      for (let i = 0; i < players.length; i++) {
        if (players[i].status === "waiting") {
          players[i] = { ...players[i], status: "playing" };
          firstPlayingIndex = i;
          break;
        }
      }

      // If no one is "playing" (all blackjacks or eliminated), go straight to dealer
      const anyPlaying = players.some((p) => p.status === "playing");
      const nextPhase = anyPlaying ? ("playing" as const) : ("dealer-turn" as const);

      const nextState: BlackjackState = {
        ...state,
        phase: nextPhase,
        players,
        deck,
        dealer: {
          hand: dealerHand,
          holeCardRevealed: false,
          status: "waiting",
        },
        currentPlayerIndex: Math.max(0, firstPlayingIndex),
      };

      if (!anyPlaying) {
        return runDealerTurn(nextState);
      }

      return nextState;
    }

    // ── HIT ────────────────────────────────────────────────────────────────
    case "HIT": {
      if (state.phase !== "playing") return state;
      const player = state.players.find((p) => p.id === action.playerId);
      if (!player || player.status !== "playing") return state;

      let deck = state.deck;
      if (deck.length < LOW_DECK_THRESHOLD) {
        deck = shuffleDeck(createStandardDeck(false), createRng(state.seed));
      }
      const { card, remainingDeck } = drawFaceUp(deck);
      deck = remainingDeck;

      const newHand = [...player.hand, card];
      const bust = isBust(newHand);

      const updatedState: BlackjackState = {
        ...state,
        deck,
        players: updatePlayer(state.players, action.playerId, {
          hand: newHand,
          status: bust ? "bust" : "playing",
        }),
      };

      // If bust, automatically advance turn
      if (bust) {
        return advanceTurn(updatedState);
      }

      return updatedState;
    }

    // ── STAND ──────────────────────────────────────────────────────────────
    case "STAND": {
      if (state.phase !== "playing") return state;
      const player = state.players.find((p) => p.id === action.playerId);
      if (!player || player.status !== "playing") return state;

      const updatedState: BlackjackState = {
        ...state,
        players: updatePlayer(state.players, action.playerId, {
          status: "stand",
        }),
      };

      return advanceTurn(updatedState);
    }

    // ── DOUBLE_DOWN ────────────────────────────────────────────────────────
    case "DOUBLE_DOWN": {
      if (state.phase !== "playing") return state;
      const player = state.players.find((p) => p.id === action.playerId);
      if (!player || player.status !== "playing") return state;
      // Only on 2-card hand
      if (player.hand.length !== 2) return state;
      // Must have enough chips
      if (player.chips < player.bet * 2) return state;

      let deck = state.deck;
      if (deck.length < LOW_DECK_THRESHOLD) {
        deck = shuffleDeck(createStandardDeck(false), createRng(state.seed));
      }
      const { card, remainingDeck } = drawFaceUp(deck);
      deck = remainingDeck;

      const newHand = [...player.hand, card];
      const bust = isBust(newHand);

      const updatedState: BlackjackState = {
        ...state,
        deck,
        players: updatePlayer(state.players, action.playerId, {
          hand: newHand,
          bet: player.bet * 2,
          status: bust ? "bust" : "doubled",
        }),
      };

      return advanceTurn(updatedState);
    }

    // ── NEXT_ROUND ─────────────────────────────────────────────────────────
    case "NEXT_ROUND": {
      if (state.phase !== "round-over") return state;

      // Reset all non-eliminated players for the next betting phase
      const players = state.players.map((p) => {
        if (p.status === "eliminated") return p;
        return {
          ...p,
          bet: 0,
          hand: [],
          status: "betting" as const,
          outcome: undefined,
          payout: undefined,
        };
      });

      return {
        ...state,
        phase: "betting",
        players,
        dealer: {
          hand: [],
          holeCardRevealed: false,
          status: "waiting",
        },
        currentPlayerIndex: 0,
        round: state.round + 1,
      };
    }

    default:
      return state;
  }
}
