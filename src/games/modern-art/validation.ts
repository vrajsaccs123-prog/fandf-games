/**
 * Modern Art — Action validation.
 *
 * Returns { valid: true } or { valid: false, reason: string }.
 * Must not mutate state.
 */

import type { ModernArtState } from "./types";
import type { ModernArtAction } from "./actions";
import type { ValidationResult } from "@/game/core/types";
import {
  OpenAuctionState,
  OneOfferAuctionState,
  HiddenAuctionState,
  FixedPriceAuctionState,
  openAuctionLockRemainingMs,
} from "./types";

function ok(): ValidationResult { return { valid: true }; }
function fail(reason: string): ValidationResult { return { valid: false, reason }; }

function getPlayer(state: ModernArtState, id: string) {
  return state.players.find((p) => p.id === id);
}

export function validateAction(
  state: ModernArtState,
  action: ModernArtAction
): ValidationResult {
  switch (action.type) {
    case "OFFER_PAINTING": {
      if (state.phase !== "select-painting")
        return fail("It is not the painting selection phase.");
      if (state.players[state.currentPlayerIndex].id !== action.playerId)
        return fail("It is not your turn to offer a painting.");
      const player = getPlayer(state, action.playerId);
      if (!player) return fail("Player not found.");
      if (player.hand.length === 0)
        return fail("You have no paintings left to auction.");
      const card = player.hand.find((c) => c.id === action.cardId);
      if (!card) return fail("You do not have that painting.");
      return ok();
    }

    case "SUPPLY_DOUBLE_SECOND": {
      if (state.phase !== "double-second-select")
        return fail("Not in double auction setup phase.");
      const setup = state.doubleAuctionSetup!;
      if (setup.currentAskingPlayerId !== action.playerId)
        return fail("It is not your turn to supply a second card.");
      const player = getPlayer(state, action.playerId);
      if (!player) return fail("Player not found.");
      const card = player.hand.find((c) => c.id === action.cardId);
      if (!card) return fail("You do not have that painting.");
      if (card.artistId !== setup.artistId)
        return fail(`The second card must be by ${setup.artistId}.`);
      if (card.auctionType === "double")
        return fail("The second card cannot itself be a Double Auction card.");
      return ok();
    }

    case "DECLINE_DOUBLE_SECOND": {
      if (state.phase !== "double-second-select")
        return fail("Not in double auction setup phase.");
      const setup = state.doubleAuctionSetup!;
      if (setup.currentAskingPlayerId !== action.playerId)
        return fail("It is not your turn.");
      return ok();
    }

    case "OPEN_BID": {
      if (state.phase !== "auction-open")
        return fail("Not in an open auction.");
      const auction = state.auction as OpenAuctionState;
      const player = getPlayer(state, action.playerId);
      if (!player) return fail("Player not found.");
      if (action.amount <= 0) return fail("Bid must be at least $1.");
      if (action.amount <= auction.currentHighestBid)
        return fail(`Your bid must be higher than $${auction.currentHighestBid}.`);
      if (action.amount > player.money)
        return fail("You don't have enough money.");
      return ok();
    }

    case "CLOSE_OPEN_AUCTION": {
      if (state.phase !== "auction-open")
        return fail("Not in an open auction.");
      const auction = state.auction as OpenAuctionState;
      if (action.playerId !== auction.auctioneerId)
        return fail("Only the Auctioneer can close the auction.");
      const lockMs = openAuctionLockRemainingMs(auction.openedAt);
      if (lockMs > 0)
        return fail("The auction must stay open for at least 10 seconds.");
      return ok();
    }

    case "ONE_OFFER_BID": {
      if (state.phase !== "auction-one-offer")
        return fail("Not in a one-offer auction.");
      const auction = state.auction as OneOfferAuctionState;
      const expected = auction.turnOrder[auction.currentTurnIndex];
      if (action.playerId !== expected)
        return fail("It is not your turn to bid.");
      const player = getPlayer(state, action.playerId);
      if (!player) return fail("Player not found.");
      if (action.amount <= 0) return fail("Bid must be at least $1.");
      if (action.amount <= auction.currentHighestBid)
        return fail(`Your bid must be higher than $${auction.currentHighestBid}.`);
      if (action.amount > player.money)
        return fail("You don't have enough money.");
      return ok();
    }

    case "ONE_OFFER_PASS": {
      if (state.phase !== "auction-one-offer")
        return fail("Not in a one-offer auction.");
      const auction = state.auction as OneOfferAuctionState;
      const expected = auction.turnOrder[auction.currentTurnIndex];
      if (action.playerId !== expected)
        return fail("It is not your turn.");
      return ok();
    }

    case "HIDDEN_SUBMIT_BID": {
      if (state.phase !== "auction-hidden")
        return fail("Not in a hidden auction.");
      const auction = state.auction as HiddenAuctionState;
      if (auction.bids[action.playerId] !== null && auction.bids[action.playerId] !== undefined)
        return fail("You have already submitted your bid.");
      const player = getPlayer(state, action.playerId);
      if (!player) return fail("Player not found.");
      if (action.amount < 0) return fail("Bid cannot be negative.");
      if (action.amount > player.money)
        return fail("You don't have enough money.");
      return ok();
    }

    case "HIDDEN_REVEAL": {
      if (state.phase !== "auction-hidden")
        return fail("Not in a hidden auction.");
      const auction = state.auction as HiddenAuctionState;
      if (!auction.allSubmitted)
        return fail("Not all players have submitted their bids yet.");
      if (action.playerId !== auction.auctioneerId)
        return fail("Only the Auctioneer can reveal bids.");
      return ok();
    }

    case "FIXED_PRICE_SET": {
      if (state.phase !== "auction-fixed-price")
        return fail("Not in a fixed price auction.");
      const auction = state.auction as FixedPriceAuctionState;
      if (action.playerId !== auction.auctioneerId)
        return fail("Only the Auctioneer can set the price.");
      if (auction.price !== null)
        return fail("Price has already been set.");
      const player = getPlayer(state, action.playerId);
      if (!player) return fail("Player not found.");
      if (action.price <= 0) return fail("Price must be at least $1.");
      if (action.price > player.money)
        return fail("You cannot set a price higher than your current cash.");
      return ok();
    }

    case "FIXED_PRICE_BUY": {
      if (state.phase !== "auction-fixed-price")
        return fail("Not in a fixed price auction.");
      const auction = state.auction as FixedPriceAuctionState;
      if (auction.price === null)
        return fail("The price has not been set yet.");
      const expected = auction.turnOrder[auction.currentTurnIndex];
      if (action.playerId !== expected)
        return fail("It is not your turn.");
      const player = getPlayer(state, action.playerId);
      if (!player) return fail("Player not found.");
      if (player.money < auction.price)
        return fail("You don't have enough money.");
      return ok();
    }

    case "FIXED_PRICE_PASS": {
      if (state.phase !== "auction-fixed-price")
        return fail("Not in a fixed price auction.");
      const auction = state.auction as FixedPriceAuctionState;
      if (auction.price === null)
        return fail("The price has not been set yet.");
      const expected = auction.turnOrder[auction.currentTurnIndex];
      if (action.playerId !== expected)
        return fail("It is not your turn.");
      return ok();
    }

    case "MYSTERY_REVEAL": {
      if (state.phase !== "mystery-optional")
        return fail("Not in mystery optional phase.");
      if (!state.mystery || state.mystery.hand.length === 0)
        return fail("No mystery cards remaining.");
      if (state.players[state.currentPlayerIndex].id !== action.playerId)
        return fail("It is not your turn.");
      return ok();
    }

    case "MYSTERY_SKIP": {
      if (state.phase !== "mystery-optional")
        return fail("Not in mystery optional phase.");
      if (state.players[state.currentPlayerIndex].id !== action.playerId)
        return fail("It is not your turn.");
      return ok();
    }

    case "ACKNOWLEDGE_ROUND_END":
      if (state.phase !== "round-end") return fail("Not at round end.");
      return ok();

    case "ACKNOWLEDGE_RANKINGS":
    case "ACKNOWLEDGE_SELLING":
      if (state.phase !== "selling") return fail("Not at selling phase.");
      if (state.readyPlayerIds.includes(action.playerId))
        return fail("You have already confirmed.");
      return ok();

    case "REMATCH":
    case "EXIT":
      return ok();

    default:
      return fail("Unknown action.");
  }
}

export function getAvailableActions(
  state: ModernArtState,
  playerId: string
): ModernArtAction[] {
  const actions: ModernArtAction[] = [];
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return actions;

  switch (state.phase) {
    case "select-painting": {
      if (state.players[state.currentPlayerIndex].id === playerId) {
        for (const card of player.hand) {
          actions.push({ type: "OFFER_PAINTING", playerId, cardId: card.id });
        }
      }
      break;
    }

    case "double-second-select": {
      const setup = state.doubleAuctionSetup!;
      if (setup.currentAskingPlayerId === playerId) {
        for (const card of player.hand) {
          if (
            card.artistId === setup.artistId &&
            card.auctionType !== "double"
          ) {
            actions.push({ type: "SUPPLY_DOUBLE_SECOND", playerId, cardId: card.id });
          }
        }
        actions.push({ type: "DECLINE_DOUBLE_SECOND", playerId });
      }
      break;
    }

    case "auction-open": {
      const auction = state.auction as OpenAuctionState;
      if (player.money > auction.currentHighestBid) {
        const minBid = auction.currentHighestBid + 1;
        for (let amount = minBid; amount <= Math.min(minBid + 50, player.money); amount += Math.max(1, Math.floor(minBid / 10))) {
          actions.push({ type: "OPEN_BID", playerId, amount });
        }
      }
      if (
        auction.auctioneerId === playerId &&
        openAuctionLockRemainingMs(auction.openedAt) <= 0
      ) {
        actions.push({ type: "CLOSE_OPEN_AUCTION", playerId });
      }
      break;
    }

    case "auction-one-offer": {
      const auction = state.auction as OneOfferAuctionState;
      if (auction.turnOrder[auction.currentTurnIndex] === playerId) {
        actions.push({ type: "ONE_OFFER_PASS", playerId });
        if (player.money > auction.currentHighestBid) {
          actions.push({ type: "ONE_OFFER_BID", playerId, amount: auction.currentHighestBid + 1 });
        }
      }
      break;
    }

    case "auction-hidden": {
      const auction = state.auction as HiddenAuctionState;
      if (auction.bids[playerId] === null || auction.bids[playerId] === undefined) {
        actions.push({ type: "HIDDEN_SUBMIT_BID", playerId, amount: 0 });
        for (let a = 1; a <= player.money; a += Math.max(1, Math.floor(player.money / 20))) {
          actions.push({ type: "HIDDEN_SUBMIT_BID", playerId, amount: a });
        }
      }
      if (auction.allSubmitted && auction.auctioneerId === playerId) {
        actions.push({ type: "HIDDEN_REVEAL", playerId });
      }
      break;
    }

    case "auction-fixed-price": {
      const auction = state.auction as FixedPriceAuctionState;
      if (auction.price === null && auction.auctioneerId === playerId) {
        for (let p = 1; p <= player.money; p += Math.max(1, Math.floor(player.money / 20))) {
          actions.push({ type: "FIXED_PRICE_SET", playerId, price: p });
        }
      } else if (auction.price !== null && auction.turnOrder[auction.currentTurnIndex] === playerId) {
        actions.push({ type: "FIXED_PRICE_PASS", playerId });
        if (player.money >= auction.price) {
          actions.push({ type: "FIXED_PRICE_BUY", playerId });
        }
      }
      break;
    }

    case "mystery-optional": {
      if (state.players[state.currentPlayerIndex].id === playerId) {
        if (state.mystery && state.mystery.hand.length > 0) {
          actions.push({ type: "MYSTERY_REVEAL", playerId });
        }
        actions.push({ type: "MYSTERY_SKIP", playerId });
      }
      break;
    }

    case "round-end":
      actions.push({ type: "ACKNOWLEDGE_ROUND_END", playerId });
      break;

    case "selling":
      if (!state.readyPlayerIds.includes(playerId)) {
        actions.push({ type: "ACKNOWLEDGE_SELLING", playerId });
      }
      break;

    case "game-over":
      actions.push({ type: "REMATCH" });
      break;
  }

  return actions;
}
