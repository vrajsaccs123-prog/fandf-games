/**
 * Modern Art — Pure game reducer.
 *
 * Given a ModernArtState and an action, returns the next state.
 * Never mutates the input. All state transitions are explicit.
 */

import type { ModernArtState, MAPlayer, ArtistId, LogEntry } from "./types";
import type { ModernArtAction } from "./actions";
import {
  OpenAuctionState,
  OneOfferAuctionState,
  HiddenAuctionState,
  FixedPriceAuctionState,
  openAuctionLockRemainingMs,
} from "./types";
import { ARTIST_ORDER } from "./types";
import { ALL_PAINTINGS, CARDS_PER_ROUND, PAINTINGS_TO_END_ROUND } from "./data";
import { calculateRankings, paintingValue } from "./engine/rankings";
import { createRng, shuffleArray } from "./engine/rng";
import { makeEmptyRoundState } from "./state";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function nextLogId(log: LogEntry[]): string {
  return `log-${log.length}`;
}

function addLog(
  state: ModernArtState,
  eventType: LogEntry["eventType"],
  message: string
): ModernArtState {
  const entry: LogEntry = {
    id: nextLogId(state.log),
    round: state.round,
    eventType,
    message,
    timestamp: Date.now(),
  };
  return { ...state, log: [...state.log, entry] };
}

function getPlayer(state: ModernArtState, id: string): MAPlayer | undefined {
  return state.players.find((p) => p.id === id);
}

function updatePlayer(
  players: MAPlayer[],
  id: string,
  patch: Partial<MAPlayer>
): MAPlayer[] {
  return players.map((p) => (p.id === id ? { ...p, ...patch } : p));
}

function getPainting(state: ModernArtState, cardId: string) {
  // Look in all player hands, deck, discard pile
  for (const p of state.players) {
    const card = p.hand.find((c) => c.id === cardId);
    if (card) return card;
  }
  const deckCard = state.deck.find((c) => c.id === cardId);
  if (deckCard) return deckCard;
  return ALL_PAINTINGS.find((c) => c.id === cardId);
}

/**
 * Build the clockwise turn order for auctions:
 * starts with the player to the LEFT of the auctioneer,
 * ends with the auctioneer.
 */
function buildClockwiseTurnOrder(
  players: MAPlayer[],
  auctioneerId: string
): string[] {
  const idx = players.findIndex((p) => p.id === auctioneerId);
  const order: string[] = [];
  for (let i = 1; i <= players.length; i++) {
    order.push(players[(idx + i) % players.length].id);
  }
  return order; // auctioneer is last
}

/**
 * Advance to the next player clockwise from the given player index.
 * Skips any players who are out of cards (they can still bid, but
 * can't be the auctioneer).
 * Returns the new currentPlayerIndex.
 */
function nextAuctioneerIndex(
  players: MAPlayer[],
  currentIndex: number
): number {
  const n = players.length;
  for (let i = 1; i <= n; i++) {
    const idx = (currentIndex + i) % n;
    if (players[idx].hand.length > 0) return idx;
  }
  // Everyone is out of cards — return next in circular order anyway
  return (currentIndex + 1) % n;
}

/**
 * Determine the next starting player for the next round:
 * player to the LEFT of the player who played the last painting this round.
 */
function getNextRoundStartingIndex(
  players: MAPlayer[],
  lastAuctioneerId: string
): number {
  const idx = players.findIndex((p) => p.id === lastAuctioneerId);
  return (idx + 1) % players.length;
}

/**
 * Check whether playing a painting would end the round.
 * Returns true if this is the 5th painting of its artist.
 */
function wouldEndRound(
  state: ModernArtState,
  artistId: ArtistId
): boolean {
  const current = state.currentRound.offerCounts[artistId] ?? 0;
  return current + 1 >= PAINTINGS_TO_END_ROUND;
}

// ─── End-round logic ──────────────────────────────────────────────────────────

function performRoundEnd(
  state: ModernArtState,
  roundEndCardId: string,
  roundEndAuctioneerId: string
): ModernArtState {
  const roundEndCard = getPainting(state, roundEndCardId)!;
  const newOfferCounts = {
    ...state.currentRound.offerCounts,
    [roundEndCard.artistId]:
      (state.currentRound.offerCounts[roundEndCard.artistId] ?? 0) + 1,
  } as Record<ArtistId, number>;

  // Calculate who next round starts with
  const nextStartIdx = getNextRoundStartingIndex(state.players, roundEndAuctioneerId);

  const nextState: ModernArtState = {
    ...state,
    phase: "round-end",
    auction: null,
    doubleAuctionSetup: null,
    currentRound: {
      ...state.currentRound,
      offerCounts: newOfferCounts,
      roundEndCard,
    },
    startingPlayerIndex: nextStartIdx,
  };

  return addLog(nextState, "round-ended", `Round ${state.round} ended — 5th painting of ${roundEndCard.artistId}`);
}

// ─── Market calculation ───────────────────────────────────────────────────────

function performMarketCalculation(state: ModernArtState): ModernArtState {
  const rankings = calculateRankings(
    state.currentRound.offerCounts,
    state.artistMarket,
    state.round
  );

  // Update artist market with new round values
  const newRoundValues = [...state.artistMarket.roundValues];
  const roundEntry: Partial<Record<ArtistId, number>> = {};
  for (const r of rankings) {
    if (r.rank !== null) {
      roundEntry[r.artistId] = r.valueThisRound;
    }
  }
  newRoundValues[state.round - 1] = roundEntry;

  return {
    ...state,
    phase: "selling",
    artistMarket: { roundValues: newRoundValues },
    currentRound: { ...state.currentRound, rankings },
    readyPlayerIds: [],
  };
}

// ─── Selling logic ────────────────────────────────────────────────────────────

function performSelling(state: ModernArtState): ModernArtState {
  const rankings = state.currentRound.rankings!;

  const players = state.players.map((player) => {
    let earnings = 0;
    for (const card of player.purchasedThisRound) {
      earnings += paintingValue(card.artistId, rankings);
    }
    return {
      ...player,
      money: player.money + earnings,
      purchasedThisRound: [],
    };
  });

  // Discard all purchased paintings
  const discardedCards = state.players.flatMap((p) => p.purchasedThisRound);

  return {
    ...state,
    players,
    discardPile: [...state.discardPile, ...discardedCards],
  };
}

// ─── Dealing for next round ───────────────────────────────────────────────────

function dealNextRound(state: ModernArtState): ModernArtState {
  const playerCount = state.players.length;
  const nextRound = (state.round + 1) as 1 | 2 | 3 | 4;
  const cardsToGive = CARDS_PER_ROUND[playerCount][nextRound] ?? 0;

  const deck = [...state.deck];
  const players = [...state.players];

  if (cardsToGive > 0) {
    for (let i = 0; i < players.length; i++) {
      const newCards = deck.splice(0, cardsToGive);
      players[i] = { ...players[i], hand: [...players[i].hand, ...newCards] };
    }

    // Deal to mystery hand if enabled
    if (state.mysteryEnabled && state.mystery) {
      const mysteryNewCards = deck.splice(0, cardsToGive);
      const mystery = {
        ...state.mystery,
        hand: [...state.mystery.hand, ...mysteryNewCards],
        revealedThisRound: [],
      };
      return {
        ...state,
        round: nextRound,
        phase: "select-painting",
        players,
        deck,
        currentRound: makeEmptyRoundState(),
        currentPlayerIndex: state.startingPlayerIndex,
        auction: null,
        doubleAuctionSetup: null,
        mystery,
        lastAuctionResult: null,
        readyPlayerIds: [],
      };
    }
  }

  return {
    ...state,
    round: nextRound,
    phase: "select-painting",
    players,
    deck,
    currentRound: makeEmptyRoundState(),
    currentPlayerIndex: state.startingPlayerIndex,
    auction: null,
    doubleAuctionSetup: null,
    mystery: state.mystery
      ? { ...state.mystery, revealedThisRound: [] }
      : null,
    lastAuctionResult: null,
    readyPlayerIds: [],
  };
}

// ─── Resolve auction ──────────────────────────────────────────────────────────

/**
 * Resolve the current auction and return the state after resolution.
 * Handles: money transfer, card transfer, advancing turn.
 */
function resolveAuction(
  state: ModernArtState,
  winnerId: string | null,
  amount: number,
  isFree: boolean
): ModernArtState {
  const auction = state.auction!;
  const paintingIds = auction.paintingIds;
  const auctioneerId = auction.auctioneerId;
  const paintings = paintingIds.map((id) => getPainting(state, id)!);

  let players = [...state.players];

  const wasFree = isFree || winnerId === null;
  const actualWinnerId = wasFree ? auctioneerId : winnerId!;
  const isAuctioneersWin =
    wasFree || (winnerId !== null && winnerId === auctioneerId);

  if (!wasFree && amount > 0) {
    if (isAuctioneersWin) {
      // Auctioneer wins → pays bank
      players = updatePlayer(players, auctioneerId, {
        money: getPlayer({ ...state, players }, auctioneerId)!.money - amount,
      });
    } else {
      // Another player wins → pays auctioneer
      players = updatePlayer(players, actualWinnerId, {
        money: getPlayer({ ...state, players }, actualWinnerId)!.money - amount,
      });
      players = updatePlayer(players, auctioneerId, {
        money: getPlayer({ ...state, players }, auctioneerId)!.money + amount,
      });
    }
  } else if (wasFree && paintings.length > 0 && amount === 0) {
    // Free — auctioneer gets painting(s) for free, no money moves
  }

  // Transfer paintings to winner (remove from wherever they are)
  const winner = players.find((p) => p.id === actualWinnerId)!;
  const updatedWinner = {
    ...winner,
    purchasedThisRound: [...winner.purchasedThisRound, ...paintings],
  };
  players = players.map((p) => (p.id === actualWinnerId ? updatedWinner : p));

  // Build next state
  const lastAuctionResult = {
    paintingIds,
    winnerId: actualWinnerId,
    amount,
    wasAuctioneersWin: isAuctioneersWin,
    wasFree,
  };

  // Advance to next auctioneer (use double auction's new auctioneer if applicable)
  // The next player is to the left of whoever was the active auctioneer
  const activePaintingAuctioneerId = auctioneerId;
  const newCurrentIndex = nextAuctioneerIndex(
    players,
    players.findIndex((p) => p.id === activePaintingAuctioneerId)
  );

  let nextState: ModernArtState = {
    ...state,
    players,
    auction: null,
    doubleAuctionSetup: null,
    currentPlayerIndex: newCurrentIndex,
    lastAuctionResult,
  };

  const auctioneerName =
    state.players.find((p) => p.id === auctioneerId)?.name ?? auctioneerId;
  const winnerName =
    state.players.find((p) => p.id === actualWinnerId)?.name ?? actualWinnerId;
  const firstPainting = paintings[0];
  const logMsg = wasFree
    ? `${firstPainting?.artworkName ?? "Painting"} — free to ${winnerName}`
    : `${firstPainting?.artworkName ?? "Painting"} — sold to ${winnerName} for $${amount}`;

  nextState = addLog(nextState, "auction-won", logMsg);

  // Check if this was the mystery phase — go back to select or mystery-optional
  if (state.mysteryEnabled && state.mystery) {
    nextState = { ...nextState, phase: "mystery-optional" };
  } else {
    nextState = { ...nextState, phase: "select-painting" };
  }

  return nextState;
}

// ─── Reducer ──────────────────────────────────────────────────────────────────

export function reduce(
  state: ModernArtState,
  action: ModernArtAction
): ModernArtState {
  switch (action.type) {
    // ── OFFER_PAINTING ─────────────────────────────────────────────────────
    case "OFFER_PAINTING": {
      if (state.phase !== "select-painting") return state;

      const player = getPlayer(state, action.playerId);
      if (!player) return state;
      if (state.players[state.currentPlayerIndex].id !== action.playerId) return state;

      const card = player.hand.find((c) => c.id === action.cardId);
      if (!card) return state;

      // Remove card from player hand
      const newHand = player.hand.filter((c) => c.id !== action.cardId);
      const players = updatePlayer(state.players, action.playerId, { hand: newHand });

      // Check if this is the 5th painting of this artist
      if (wouldEndRound(state, card.artistId)) {
        return performRoundEnd(
          { ...state, players },
          card.id,
          action.playerId
        );
      }

      // Increment offer count
      const newOfferCounts = {
        ...state.currentRound.offerCounts,
        [card.artistId]:
          (state.currentRound.offerCounts[card.artistId] ?? 0) + 1,
      } as Record<ArtistId, number>;

      let nextState: ModernArtState = {
        ...state,
        players,
        currentRound: {
          ...state.currentRound,
          offerCounts: newOfferCounts,
        },
      };

      nextState = addLog(nextState, "auction-start", `${player.name} offers ${card.artworkName} (${card.auctionType})`);

      // Handle auction type
      if (card.auctionType === "double") {
        // Start double auction setup
        return {
          ...nextState,
          phase: "double-second-select",
          doubleAuctionSetup: {
            originalPaintingId: card.id,
            originalAuctioneerId: action.playerId,
            artistId: card.artistId,
            declinedPlayerIds: [],
            currentAskingPlayerId: action.playerId,
          },
        };
      }

      // Start regular auction
      return startAuction(nextState, [card.id], action.playerId, card.auctionType);
    }

    // ── SUPPLY_DOUBLE_SECOND ───────────────────────────────────────────────
    case "SUPPLY_DOUBLE_SECOND": {
      if (state.phase !== "double-second-select") return state;
      const setup = state.doubleAuctionSetup!;
      if (setup.currentAskingPlayerId !== action.playerId) return state;

      const player = getPlayer(state, action.playerId);
      if (!player) return state;

      const card = player.hand.find((c) => c.id === action.cardId);
      if (!card) return state;
      if (card.artistId !== setup.artistId) return state;
      if (card.auctionType === "double") return state; // cannot use another double

      // Remove card from player's hand
      const newHand = player.hand.filter((c) => c.id !== action.cardId);
      const players = updatePlayer(state.players, action.playerId, { hand: newHand });

      // Check if this second card is the 5th painting
      const currentCount = state.currentRound.offerCounts[card.artistId] ?? 0;
      // The original card already incremented count by 1 in OFFER_PAINTING
      // So now we check if this second card would make it the 5th
      if (currentCount + 1 >= PAINTINGS_TO_END_ROUND) {
        // Both cards are not auctioned, round ends
        return performRoundEnd(
          { ...state, players },
          card.id,
          action.playerId
        );
      }

      // Increment offer count for second card
      const newOfferCounts = {
        ...state.currentRound.offerCounts,
        [card.artistId]: currentCount + 1,
      } as Record<ArtistId, number>;

      const nextState: ModernArtState = {
        ...state,
        players,
        currentRound: {
          ...state.currentRound,
          offerCounts: newOfferCounts,
        },
        doubleAuctionSetup: null,
      };

      // The new auctioneer is action.playerId (the one who supplied the second card)
      // But if it's the original auctioneer, they remain auctioneer
      const newAuctioneerId = action.playerId;

      // The auction type is determined by the second card
      const paintingIds = [setup.originalPaintingId, card.id];
      return startAuction(nextState, paintingIds, newAuctioneerId, card.auctionType);
    }

    // ── DECLINE_DOUBLE_SECOND ──────────────────────────────────────────────
    case "DECLINE_DOUBLE_SECOND": {
      if (state.phase !== "double-second-select") return state;
      const setup = state.doubleAuctionSetup!;
      if (setup.currentAskingPlayerId !== action.playerId) return state;

      const newDeclined = [...setup.declinedPlayerIds, action.playerId];

      // Find the next player to ask (clockwise from original auctioneer)
      const originalIdx = state.players.findIndex(
        (p) => p.id === setup.originalAuctioneerId
      );
      const askOrder: string[] = [];
      for (let i = 0; i < state.players.length; i++) {
        askOrder.push(state.players[(originalIdx + i) % state.players.length].id);
      }

      const nextToAsk = askOrder.find(
        (id) => !newDeclined.includes(id) && id !== setup.currentAskingPlayerId
      );

      if (!nextToAsk) {
        // Nobody will supply a second card — original auctioneer gets painting free
        // Remove original card from state (already removed from hand in OFFER_PAINTING)
        const originalCard = getPainting(state, setup.originalPaintingId)!;
        const originalAuctioneer = getPlayer(state, setup.originalAuctioneerId)!;

        const players = updatePlayer(state.players, setup.originalAuctioneerId, {
          purchasedThisRound: [
            ...originalAuctioneer.purchasedThisRound,
            originalCard,
          ],
        });

        const newCurrentIndex = nextAuctioneerIndex(
          players,
          players.findIndex((p) => p.id === setup.originalAuctioneerId)
        );

        const nextState: ModernArtState = {
          ...state,
          phase: state.mysteryEnabled ? "mystery-optional" : "select-painting",
          players,
          doubleAuctionSetup: null,
          currentPlayerIndex: newCurrentIndex,
          lastAuctionResult: {
            paintingIds: [setup.originalPaintingId],
            winnerId: setup.originalAuctioneerId,
            amount: 0,
            wasAuctioneersWin: true,
            wasFree: true,
          },
        };
        return addLog(
          nextState,
          "auction-free",
          `Double auction: no second card — ${originalAuctioneer.name} gets painting free`
        );
      }

      return {
        ...state,
        doubleAuctionSetup: {
          ...setup,
          declinedPlayerIds: newDeclined,
          currentAskingPlayerId: nextToAsk,
        },
      };
    }

    // ── OPEN_BID ───────────────────────────────────────────────────────────
    case "OPEN_BID": {
      if (state.phase !== "auction-open") return state;
      const auction = state.auction as OpenAuctionState;
      if (!auction || auction.type !== "open") return state;

      const player = getPlayer(state, action.playerId);
      if (!player) return state;
      if (action.amount <= auction.currentHighestBid) return state;
      if (action.amount > player.money) return state;

      return {
        ...state,
        auction: {
          ...auction,
          currentHighestBid: action.amount,
          currentHighestBidderId: action.playerId,
        },
      };
    }

    // ── CLOSE_OPEN_AUCTION ─────────────────────────────────────────────────
    case "CLOSE_OPEN_AUCTION": {
      if (state.phase !== "auction-open") return state;
      const auction = state.auction as OpenAuctionState;
      if (!auction || auction.type !== "open") return state;
      if (action.playerId !== auction.auctioneerId) return state;
      if (openAuctionLockRemainingMs(auction.openedAt) > 0) return state;

      const winnerId = auction.currentHighestBidderId;
      const amount = auction.currentHighestBid;
      const isFree = winnerId === null;

      return resolveAuction(state, winnerId, isFree ? 0 : amount, isFree);
    }

    // ── ONE_OFFER_BID ──────────────────────────────────────────────────────
    case "ONE_OFFER_BID": {
      if (state.phase !== "auction-one-offer") return state;
      const auction = state.auction as OneOfferAuctionState;
      if (!auction || auction.type !== "one-offer") return state;

      const expectedId = auction.turnOrder[auction.currentTurnIndex];
      if (action.playerId !== expectedId) return state;

      const player = getPlayer(state, action.playerId);
      if (!player) return state;
      if (action.amount <= auction.currentHighestBid) return state;
      if (action.amount > player.money) return state;

      const isLast = auction.currentTurnIndex >= auction.turnOrder.length - 1;
      if (isLast) {
        // Auctioneer bid — resolve immediately
        return resolveAuction(
          { ...state, auction: { ...auction, currentHighestBid: action.amount, currentHighestBidderId: action.playerId } },
          action.playerId,
          action.amount,
          false
        );
      }

      return {
        ...state,
        auction: {
          ...auction,
          currentHighestBid: action.amount,
          currentHighestBidderId: action.playerId,
          currentTurnIndex: auction.currentTurnIndex + 1,
        },
      };
    }

    // ── ONE_OFFER_PASS ─────────────────────────────────────────────────────
    case "ONE_OFFER_PASS": {
      if (state.phase !== "auction-one-offer") return state;
      const auction = state.auction as OneOfferAuctionState;
      if (!auction || auction.type !== "one-offer") return state;

      const expectedId = auction.turnOrder[auction.currentTurnIndex];
      if (action.playerId !== expectedId) return state;

      const isLast = auction.currentTurnIndex >= auction.turnOrder.length - 1;
      if (isLast) {
        // Last player (auctioneer) passed — resolve with best bid so far
        const winnerId = auction.currentHighestBidderId;
        const isFree = winnerId === null;
        return resolveAuction(state, winnerId, isFree ? 0 : auction.currentHighestBid, isFree);
      }

      return {
        ...state,
        auction: {
          ...auction,
          currentTurnIndex: auction.currentTurnIndex + 1,
        },
      };
    }

    // ── HIDDEN_SUBMIT_BID ──────────────────────────────────────────────────
    case "HIDDEN_SUBMIT_BID": {
      if (state.phase !== "auction-hidden") return state;
      const auction = state.auction as HiddenAuctionState;
      if (!auction || auction.type !== "hidden") return state;

      const player = getPlayer(state, action.playerId);
      if (!player) return state;
      if (auction.bids[action.playerId] !== null && auction.bids[action.playerId] !== undefined) return state; // already submitted

      // Validate: 0 = pass; positive = bid (cannot exceed money)
      if (action.amount < 0) return state;
      if (action.amount > player.money) return state;

      const newBids = { ...auction.bids, [action.playerId]: action.amount };
      const allSubmitted = Object.values(newBids).every((b) => b !== null && b !== undefined);

      return {
        ...state,
        auction: {
          ...auction,
          bids: newBids,
          allSubmitted,
        },
      };
    }

    // ── HIDDEN_REVEAL ──────────────────────────────────────────────────────
    case "HIDDEN_REVEAL": {
      if (state.phase !== "auction-hidden") return state;
      const auction = state.auction as HiddenAuctionState;
      if (!auction || auction.type !== "hidden") return state;
      if (!auction.allSubmitted) return state;

      // Find the winner: highest bid; ties go to player closest to auctioneer clockwise
      // (auctioneer wins ties)
      const bids = auction.bids;
      const auctioneerId = auction.auctioneerId;

      // Build clockwise order starting from the auctioneer
      const aucIdx = state.players.findIndex((p) => p.id === auctioneerId);
      const clockwiseOrder = [
        ...state.players.slice(aucIdx),
        ...state.players.slice(0, aucIdx),
      ].map((p) => p.id);

      let maxBid = 0;
      let winnerId: string | null = null;

      for (const playerId of clockwiseOrder) {
        const bid = bids[playerId] ?? 0;
        if (bid > maxBid) {
          maxBid = bid;
          winnerId = playerId;
        }
      }

      const isFree = maxBid === 0 || winnerId === null;
      return resolveAuction(
        { ...state, auction: { ...auction, revealed: true } },
        winnerId,
        isFree ? 0 : maxBid,
        isFree
      );
    }

    // ── FIXED_PRICE_SET ────────────────────────────────────────────────────
    case "FIXED_PRICE_SET": {
      if (state.phase !== "auction-fixed-price") return state;
      const auction = state.auction as FixedPriceAuctionState;
      if (!auction || auction.type !== "fixed-price") return state;
      if (action.playerId !== auction.auctioneerId) return state;
      if (auction.price !== null) return state; // already set

      const player = getPlayer(state, action.playerId);
      if (!player) return state;
      if (action.price <= 0) return state;
      if (action.price > player.money) return state;

      return {
        ...state,
        auction: { ...auction, price: action.price },
      };
    }

    // ── FIXED_PRICE_BUY ────────────────────────────────────────────────────
    case "FIXED_PRICE_BUY": {
      if (state.phase !== "auction-fixed-price") return state;
      const auction = state.auction as FixedPriceAuctionState;
      if (!auction || auction.type !== "fixed-price") return state;
      if (auction.price === null) return state;

      const expectedId = auction.turnOrder[auction.currentTurnIndex];
      if (action.playerId !== expectedId) return state;

      const player = getPlayer(state, action.playerId);
      if (!player) return state;
      if (player.money < auction.price) return state;

      // This player buys — resolve
      const isAuctioneersWin = action.playerId === auction.auctioneerId;
      return resolveAuction(state, action.playerId, auction.price, false);
    }

    // ── FIXED_PRICE_PASS ───────────────────────────────────────────────────
    case "FIXED_PRICE_PASS": {
      if (state.phase !== "auction-fixed-price") return state;
      const auction = state.auction as FixedPriceAuctionState;
      if (!auction || auction.type !== "fixed-price") return state;
      if (auction.price === null) return state;

      const expectedId = auction.turnOrder[auction.currentTurnIndex];
      if (action.playerId !== expectedId) return state;

      const isLast = auction.currentTurnIndex >= auction.turnOrder.length - 1;
      if (isLast) {
        // Auctioneer must buy — pays bank
        return resolveAuction(state, auction.auctioneerId, auction.price!, false);
      }

      return {
        ...state,
        auction: {
          ...auction,
          currentTurnIndex: auction.currentTurnIndex + 1,
        },
      };
    }

    // ── MYSTERY_REVEAL ─────────────────────────────────────────────────────
    case "MYSTERY_REVEAL": {
      if (state.phase !== "mystery-optional") return state;
      if (!state.mystery || state.mystery.hand.length === 0) return state;
      if (state.players[state.currentPlayerIndex].id !== action.playerId) return state;

      const rng = createRng(`${state.seed}-mystery-${state.log.length}`);
      const idx = Math.floor(rng() * state.mystery.hand.length);
      const revealed = state.mystery.hand[idx];
      const newMysteryHand = state.mystery.hand.filter((_, i) => i !== idx);

      // Check if this card ends the round
      if (wouldEndRound(state, revealed.artistId)) {
        const newOfferCounts = {
          ...state.currentRound.offerCounts,
          [revealed.artistId]:
            (state.currentRound.offerCounts[revealed.artistId] ?? 0) + 1,
        } as Record<ArtistId, number>;

        return {
          ...state,
          phase: "round-end",
          mystery: {
            ...state.mystery,
            hand: newMysteryHand,
            revealedThisRound: [...state.mystery.revealedThisRound, revealed],
          },
          currentRound: {
            ...state.currentRound,
            offerCounts: newOfferCounts,
            roundEndCard: revealed,
          },
        };
      }

      // Card counts toward ranking but is not auctioned
      const newOfferCounts = {
        ...state.currentRound.offerCounts,
        [revealed.artistId]:
          (state.currentRound.offerCounts[revealed.artistId] ?? 0) + 1,
      } as Record<ArtistId, number>;

      return {
        ...state,
        phase: "select-painting",
        mystery: {
          ...state.mystery,
          hand: newMysteryHand,
          revealedThisRound: [...state.mystery.revealedThisRound, revealed],
        },
        currentRound: {
          ...state.currentRound,
          offerCounts: newOfferCounts,
        },
      };
    }

    // ── MYSTERY_SKIP ───────────────────────────────────────────────────────
    case "MYSTERY_SKIP": {
      if (state.phase !== "mystery-optional") return state;
      if (state.players[state.currentPlayerIndex].id !== action.playerId) return state;
      return { ...state, phase: "select-painting" };
    }

    // ── ACKNOWLEDGE_ROUND_END ──────────────────────────────────────────────
    case "ACKNOWLEDGE_ROUND_END": {
      if (state.phase !== "round-end") return state;
      // Transition to market calculation / ranking display
      return performMarketCalculation(state);
    }

    // ── ACKNOWLEDGE_RANKINGS / ACKNOWLEDGE_SELLING ─────────────────────────
    // Every player must confirm before the next round (or game-over) starts.
    case "ACKNOWLEDGE_RANKINGS":
    case "ACKNOWLEDGE_SELLING": {
      if (state.phase !== "selling") return state;
      if (!state.players.some((p) => p.id === action.playerId)) return state;
      if (state.readyPlayerIds.includes(action.playerId)) return state;

      const readyPlayerIds = [...state.readyPlayerIds, action.playerId];
      if (readyPlayerIds.length < state.players.length) {
        return { ...state, readyPlayerIds };
      }

      const afterSelling = performSelling({ ...state, readyPlayerIds: [] });

      if (state.round === 4) {
        return { ...afterSelling, phase: "game-over", readyPlayerIds: [] };
      }

      return { ...dealNextRound(afterSelling), readyPlayerIds: [] };
    }

    // ── REMATCH ────────────────────────────────────────────────────────────
    case "REMATCH": {
      // Will be handled by the UI to create a new game
      return state;
    }

    default:
      return state;
  }
}

// ─── Start auction helper ─────────────────────────────────────────────────────

function startAuction(
  state: ModernArtState,
  paintingIds: string[],
  auctioneerId: string,
  auctionType: "open" | "one-offer" | "hidden" | "fixed-price"
): ModernArtState {
  const turnOrder = buildClockwiseTurnOrder(state.players, auctioneerId);

  switch (auctionType) {
    case "open":
      return {
        ...state,
        phase: "auction-open",
        auction: {
          type: "open",
          paintingIds,
          auctioneerId,
          currentHighestBid: 0,
          currentHighestBidderId: null,
          openedAt: Date.now(),
        },
      };

    case "one-offer":
      return {
        ...state,
        phase: "auction-one-offer",
        auction: {
          type: "one-offer",
          paintingIds,
          auctioneerId,
          currentHighestBid: 0,
          currentHighestBidderId: null,
          turnOrder,
          currentTurnIndex: 0,
        },
      };

    case "hidden": {
      const bids: Record<string, number | null> = {};
      for (const p of state.players) {
        bids[p.id] = null;
      }
      return {
        ...state,
        phase: "auction-hidden",
        auction: {
          type: "hidden",
          paintingIds,
          auctioneerId,
          bids,
          allSubmitted: false,
          revealed: false,
        },
      };
    }

    case "fixed-price":
      return {
        ...state,
        phase: "auction-fixed-price",
        auction: {
          type: "fixed-price",
          paintingIds,
          auctioneerId,
          price: null,
          turnOrder,
          currentTurnIndex: 0,
          winnerId: null,
        },
      };

    default:
      return state;
  }
}
