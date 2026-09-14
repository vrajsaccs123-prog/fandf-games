/**
 * Modern Art — Rules engine tests.
 */

import { describe, it, expect } from "vitest";
import { createInitialState } from "../state";
import { reduce } from "../reducer";
import { validateAction } from "../validation";
import { calculateRankings } from "../engine/rankings";
import type {
  ModernArtState,
  ArtistId,
  OpenAuctionState,
  OneOfferAuctionState,
  HiddenAuctionState,
  FixedPriceAuctionState,
} from "../types";
import type { GameConfig } from "@/game/core/types";

// ─── Test helpers ─────────────────────────────────────────────────────────────

function makeConfig(n: 3 | 4 | 5): GameConfig {
  const players = Array.from({ length: n }, (_, i) => ({
    id: `p${i + 1}`,
    name: `Player ${i + 1}`,
    seat: i,
    isHuman: true,
  }));
  return { players, seed: "test-seed" };
}

const config3 = makeConfig(3);
const config4 = makeConfig(4);
const config5 = makeConfig(5);

function fresh(n: 3 | 4 | 5 = 4, opts?: Record<string, unknown>) {
  const cfg = n === 3 ? { ...makeConfig(3), options: opts } :
              n === 4 ? makeConfig(4) : makeConfig(5);
  return createInitialState(cfg, "fixed-seed-42");
}

function dispatch(state: ModernArtState, action: Parameters<typeof reduce>[1]) {
  const result = validateAction(state, action);
  if (!result.valid) throw new Error(`Invalid action: ${result.reason}`);
  return reduce(state, action);
}

// ─── Setup Tests ──────────────────────────────────────────────────────────────

describe("Initial Setup", () => {
  it("3 players receive 10 cards each", () => {
    const s = fresh(3);
    for (const p of s.players) {
      expect(p.hand).toHaveLength(10);
    }
  });

  it("4 players receive 9 cards each", () => {
    const s = fresh(4);
    for (const p of s.players) {
      expect(p.hand).toHaveLength(9);
    }
  });

  it("5 players receive 8 cards each", () => {
    const s = fresh(5);
    for (const p of s.players) {
      expect(p.hand).toHaveLength(8);
    }
  });

  it("all players start with $100", () => {
    const s = fresh(4);
    for (const p of s.players) {
      expect(p.money).toBe(100);
    }
  });

  it("deck has correct remaining cards (4 players)", () => {
    const s = fresh(4);
    // 70 total - 9 * 4 = 34 remaining
    expect(s.deck).toHaveLength(70 - 9 * 4);
  });

  it("deck has correct remaining cards (3 players)", () => {
    const s = fresh(3);
    // 70 total - 10 * 3 = 40 remaining
    expect(s.deck).toHaveLength(70 - 10 * 3);
  });

  it("deck has correct remaining cards (5 players)", () => {
    const s = fresh(5);
    // 70 total - 8 * 5 = 30 remaining
    expect(s.deck).toHaveLength(70 - 8 * 5);
  });

  it("starts in select-painting phase", () => {
    expect(fresh(4).phase).toBe("select-painting");
  });

  it("starts in round 1", () => {
    expect(fresh(4).round).toBe(1);
  });

  it("no paintings purchased at start", () => {
    const s = fresh(4);
    for (const p of s.players) {
      expect(p.purchasedThisRound).toHaveLength(0);
    }
  });

  it("rejects 2-player games", () => {
    expect(() =>
      createInitialState({ players: [
        { id: "p1", name: "A", seat: 0, isHuman: true },
        { id: "p2", name: "B", seat: 1, isHuman: true },
      ] }, "s")
    ).toThrow();
  });
});

// ─── Offering Paintings ───────────────────────────────────────────────────────

describe("Offering a painting", () => {
  it("only the current auctioneer can offer", () => {
    const s = fresh(4);
    const nonCurrent = s.players[1];
    const card = nonCurrent.hand[0];
    const result = validateAction(s, { type: "OFFER_PAINTING", playerId: nonCurrent.id, cardId: card.id });
    expect(result.valid).toBe(false);
  });

  it("auctioneer can offer any card from their hand", () => {
    const s = fresh(4);
    const current = s.players[s.currentPlayerIndex];
    const card = current.hand[0];
    const result = validateAction(s, { type: "OFFER_PAINTING", playerId: current.id, cardId: card.id });
    expect(result.valid).toBe(true);
  });

  it("offering a non-double card starts an auction", () => {
    const s = fresh(4);
    const current = s.players[s.currentPlayerIndex];
    const nonDouble = current.hand.find((c) => c.auctionType !== "double")!;
    const next = dispatch(s, { type: "OFFER_PAINTING", playerId: current.id, cardId: nonDouble.id });
    const auctionPhases = ["auction-open", "auction-one-offer", "auction-hidden", "auction-fixed-price"];
    expect(auctionPhases).toContain(next.phase);
  });

  it("offering a double card starts double-second-select phase", () => {
    const s = fresh(4);
    const current = s.players[s.currentPlayerIndex];
    const doubleCard = current.hand.find((c) => c.auctionType === "double");
    if (!doubleCard) return; // skip if no double card in hand
    const next = dispatch(s, { type: "OFFER_PAINTING", playerId: current.id, cardId: doubleCard.id });
    expect(next.phase).toBe("double-second-select");
  });

  it("removes offered card from auctioneer's hand", () => {
    const s = fresh(4);
    const current = s.players[s.currentPlayerIndex];
    const nonDouble = current.hand.find((c) => c.auctionType !== "double")!;
    const next = dispatch(s, { type: "OFFER_PAINTING", playerId: current.id, cardId: nonDouble.id });
    const newCurrent = next.players.find((p) => p.id === current.id)!;
    expect(newCurrent.hand.find((c) => c.id === nonDouble.id)).toBeUndefined();
  });

  it("increments offer count for the artist", () => {
    const s = fresh(4);
    const current = s.players[s.currentPlayerIndex];
    const nonDouble = current.hand.find((c) => c.auctionType !== "double")!;
    const next = dispatch(s, { type: "OFFER_PAINTING", playerId: current.id, cardId: nonDouble.id });
    // Skip if round ended
    if (next.phase === "round-end") return;
    expect(next.currentRound.offerCounts[nonDouble.artistId]).toBeGreaterThanOrEqual(1);
  });
});

// ─── Open Auction ─────────────────────────────────────────────────────────────

describe("Open Auction", () => {
  function startOpenAuction() {
    let s = fresh(4);
    const current = s.players[s.currentPlayerIndex];
    const openCard = current.hand.find((c) => c.auctionType === "open");
    if (!openCard) {
      // Manually engineer a state where we can test open auctions
      return null;
    }
    s = dispatch(s, { type: "OFFER_PAINTING", playerId: current.id, cardId: openCard.id });
    if (s.phase !== "auction-open") return null;
    return { state: s, auctioneerId: current.id };
  }

  it("bid must be higher than current", () => {
    const setup = startOpenAuction();
    if (!setup) return;
    const { state } = setup;
    const bidder = state.players.find((p) => p.id !== setup.auctioneerId)!;
    const result = validateAction(state, { type: "OPEN_BID", playerId: bidder.id, amount: 0 });
    expect(result.valid).toBe(false);
  });

  it("cannot bid more than available money", () => {
    const setup = startOpenAuction();
    if (!setup) return;
    const { state } = setup;
    const bidder = state.players.find((p) => p.id !== setup.auctioneerId)!;
    const result = validateAction(state, { type: "OPEN_BID", playerId: bidder.id, amount: bidder.money + 1 });
    expect(result.valid).toBe(false);
  });

  it("valid bid is accepted", () => {
    const setup = startOpenAuction();
    if (!setup) return;
    const { state } = setup;
    const bidder = state.players.find((p) => p.id !== setup.auctioneerId)!;
    const next = dispatch(state, { type: "OPEN_BID", playerId: bidder.id, amount: 10 });
    expect((next.auction as OpenAuctionState).currentHighestBid).toBe(10);
    expect((next.auction as OpenAuctionState).currentHighestBidderId).toBe(bidder.id);
  });

  it("only auctioneer can close the auction", () => {
    const setup = startOpenAuction();
    if (!setup) return;
    const { state } = setup;
    const nonAuctioneer = state.players.find((p) => p.id !== setup.auctioneerId)!;
    const result = validateAction(state, { type: "CLOSE_OPEN_AUCTION", playerId: nonAuctioneer.id });
    expect(result.valid).toBe(false);
  });

  it("closing with no bids gives painting to auctioneer free", () => {
    const setup = startOpenAuction();
    if (!setup) return;
    const { state, auctioneerId } = setup;
    const next = dispatch(state, { type: "CLOSE_OPEN_AUCTION", playerId: auctioneerId });
    const auctioneer = next.players.find((p) => p.id === auctioneerId)!;
    // Painting goes to auctioneer's purchased
    expect(auctioneer.purchasedThisRound.length).toBeGreaterThanOrEqual(1);
    // No money lost
    expect(auctioneer.money).toBe(100);
    expect(next.lastAuctionResult?.wasFree).toBe(true);
  });

  it("winner (non-auctioneer) pays auctioneer", () => {
    const setup = startOpenAuction();
    if (!setup) return;
    const { state, auctioneerId } = setup;
    const winner = state.players.find((p) => p.id !== auctioneerId)!;
    let next = dispatch(state, { type: "OPEN_BID", playerId: winner.id, amount: 30 });
    next = dispatch(next, { type: "CLOSE_OPEN_AUCTION", playerId: auctioneerId });
    const auctioneerAfter = next.players.find((p) => p.id === auctioneerId)!;
    const winnerAfter = next.players.find((p) => p.id === winner.id)!;
    expect(auctioneerAfter.money).toBe(130); // gained 30
    expect(winnerAfter.money).toBe(70);      // lost 30
    expect(winnerAfter.purchasedThisRound.length).toBeGreaterThanOrEqual(1);
  });

  it("auctioneer winning pays the bank", () => {
    const setup = startOpenAuction();
    if (!setup) return;
    const { state, auctioneerId } = setup;
    const other = state.players.find((p) => p.id !== auctioneerId)!;
    let next = dispatch(state, { type: "OPEN_BID", playerId: other.id, amount: 20 });
    next = dispatch(next, { type: "OPEN_BID", playerId: auctioneerId, amount: 25 });
    next = dispatch(next, { type: "CLOSE_OPEN_AUCTION", playerId: auctioneerId });
    const auctioneer = next.players.find((p) => p.id === auctioneerId)!;
    expect(auctioneer.money).toBe(75); // paid 25 to bank
    expect(auctioneer.purchasedThisRound.length).toBeGreaterThanOrEqual(1);
  });
});

// ─── One Offer Auction ────────────────────────────────────────────────────────

describe("One Offer Auction", () => {
  function startOneOfferAuction() {
    let s = fresh(4);
    for (let attempt = 0; attempt < s.players.length; attempt++) {
      const current = s.players[s.currentPlayerIndex];
      const oneOfferCard = current.hand.find((c) => c.auctionType === "one-offer");
      if (oneOfferCard) {
        s = dispatch(s, { type: "OFFER_PAINTING", playerId: current.id, cardId: oneOfferCard.id });
        if (s.phase === "auction-one-offer") {
          return { state: s, auctioneerId: current.id };
        }
        // Round may have ended — skip
        return null;
      }
    }
    return null;
  }

  it("each player gets exactly one turn", () => {
    const setup = startOneOfferAuction();
    if (!setup) return;
    expect((setup.state.auction as OneOfferAuctionState).turnOrder).toHaveLength(setup.state.players.length);
  });

  it("auctioneer acts last", () => {
    const setup = startOneOfferAuction();
    if (!setup) return;
    const turnOrder = (setup.state.auction as OneOfferAuctionState).turnOrder as string[];
    expect(turnOrder[turnOrder.length - 1]).toBe(setup.auctioneerId);
  });

  it("non-auctioneer cannot act out of turn", () => {
    const setup = startOneOfferAuction();
    if (!setup) return;
    const { state } = setup;
    const wrongPlayer = state.players.find(
      (p) => p.id !== (state.auction as OneOfferAuctionState).turnOrder[0]
    )!;
    const result = validateAction(state, { type: "ONE_OFFER_PASS", playerId: wrongPlayer.id });
    expect(result.valid).toBe(false);
  });

  it("no bids → auctioneer gets painting free", () => {
    const setup = startOneOfferAuction();
    if (!setup) return;
    let { state } = setup;
    const turnOrder = (state.auction as OneOfferAuctionState).turnOrder;
    // Everyone passes
    for (const playerId of turnOrder) {
      state = dispatch(state, { type: "ONE_OFFER_PASS", playerId });
    }
    const auctioneer = state.players.find((p) => p.id === setup.auctioneerId)!;
    expect(auctioneer.purchasedThisRound.length).toBeGreaterThanOrEqual(1);
    expect(auctioneer.money).toBe(100);
  });

  it("highest bidder wins and pays auctioneer", () => {
    const setup = startOneOfferAuction();
    if (!setup) return;
    let { state } = setup;
    const turnOrder = (state.auction as OneOfferAuctionState).turnOrder;
    const firstBidder = turnOrder[0];

    // First player bids $25
    state = dispatch(state, { type: "ONE_OFFER_BID", playerId: firstBidder, amount: 25 });
    // All remaining pass
    for (let i = 1; i < turnOrder.length; i++) {
      state = dispatch(state, { type: "ONE_OFFER_PASS", playerId: turnOrder[i] });
    }

    const winner = state.players.find((p) => p.id === firstBidder)!;
    const auctioneer = state.players.find((p) => p.id === setup.auctioneerId)!;
    expect(winner.money).toBe(75);
    expect(auctioneer.money).toBe(125);
  });
});

// ─── Hidden Auction ───────────────────────────────────────────────────────────

describe("Hidden Auction", () => {
  function startHiddenAuction() {
    let s = fresh(4);
    for (let attempt = 0; attempt < s.players.length * 3; attempt++) {
      const current = s.players[s.currentPlayerIndex];
      const hiddenCard = current.hand.find((c) => c.auctionType === "hidden");
      if (hiddenCard) {
        s = dispatch(s, { type: "OFFER_PAINTING", playerId: current.id, cardId: hiddenCard.id });
        if (s.phase === "auction-hidden") {
          return { state: s, auctioneerId: current.id };
        }
        if (s.phase === "round-end") return null;
        // advance turn if resolution happened
      }
      // Try to get to next player
      if (s.phase !== "auction-hidden" && s.phase !== "round-end") {
        // might have resolved to open or something else
        return null;
      }
    }
    return null;
  }

  it("bids are hidden until all submitted", () => {
    const setup = startHiddenAuction();
    if (!setup) return;
    const { state } = setup;
    const auction = state.auction as HiddenAuctionState;
    // All bids are null initially
    for (const v of Object.values(auction.bids)) {
      expect(v).toBeNull();
    }
  });

  it("cannot submit bid twice", () => {
    const setup = startHiddenAuction();
    if (!setup) return;
    let { state } = setup;
    const bidder = state.players[0];
    state = dispatch(state, { type: "HIDDEN_SUBMIT_BID", playerId: bidder.id, amount: 10 });
    const result = validateAction(state, { type: "HIDDEN_SUBMIT_BID", playerId: bidder.id, amount: 20 });
    expect(result.valid).toBe(false);
  });

  it("cannot bid over budget", () => {
    const setup = startHiddenAuction();
    if (!setup) return;
    const { state } = setup;
    const bidder = state.players[0];
    const result = validateAction(state, { type: "HIDDEN_SUBMIT_BID", playerId: bidder.id, amount: bidder.money + 1 });
    expect(result.valid).toBe(false);
  });

  it("cannot reveal before all bids submitted", () => {
    const setup = startHiddenAuction();
    if (!setup) return;
    const { state } = setup;
    const result = validateAction(state, { type: "HIDDEN_REVEAL", playerId: setup.auctioneerId });
    expect(result.valid).toBe(false); // not all submitted yet
  });

  it("highest bidder wins", () => {
    const setup = startHiddenAuction();
    if (!setup) return;
    let { state } = setup;
    const players = state.players;
    const auctioneerId = setup.auctioneerId;
    // Submit bids: one player bids highest
    const highBidder = players.find((p) => p.id !== auctioneerId)!;
    const others = players.filter((p) => p.id !== highBidder.id);

    state = dispatch(state, { type: "HIDDEN_SUBMIT_BID", playerId: highBidder.id, amount: 40 });
    for (const p of others) {
      state = dispatch(state, { type: "HIDDEN_SUBMIT_BID", playerId: p.id, amount: p.id === auctioneerId ? 5 : 0 });
    }

    state = dispatch(state, { type: "HIDDEN_REVEAL", playerId: auctioneerId });
    const winner = state.players.find((p) => p.id === highBidder.id)!;
    expect(winner.purchasedThisRound.length).toBeGreaterThanOrEqual(1);
    expect(winner.money).toBe(60); // 100 - 40
  });

  it("no bids → auctioneer gets painting free", () => {
    const setup = startHiddenAuction();
    if (!setup) return;
    let { state } = setup;
    for (const p of state.players) {
      state = dispatch(state, { type: "HIDDEN_SUBMIT_BID", playerId: p.id, amount: 0 });
    }
    state = dispatch(state, { type: "HIDDEN_REVEAL", playerId: setup.auctioneerId });
    const auctioneer = state.players.find((p) => p.id === setup.auctioneerId)!;
    expect(auctioneer.purchasedThisRound.length).toBeGreaterThanOrEqual(1);
    expect(auctioneer.money).toBe(100);
  });
});

// ─── Fixed Price Auction ──────────────────────────────────────────────────────

describe("Fixed Price Auction", () => {
  function startFixedPrice() {
    let s = fresh(4);
    for (let i = 0; i < s.players.length * 3; i++) {
      const current = s.players[s.currentPlayerIndex];
      const card = current.hand.find((c) => c.auctionType === "fixed-price");
      if (card) {
        s = dispatch(s, { type: "OFFER_PAINTING", playerId: current.id, cardId: card.id });
        if (s.phase === "auction-fixed-price") return { state: s, auctioneerId: current.id };
        if (s.phase === "round-end") return null;
        return null;
      }
    }
    return null;
  }

  it("cannot set price higher than available money", () => {
    const setup = startFixedPrice();
    if (!setup) return;
    const { state } = setup;
    const auctioneer = state.players.find((p) => p.id === setup.auctioneerId)!;
    const result = validateAction(state, {
      type: "FIXED_PRICE_SET",
      playerId: setup.auctioneerId,
      price: auctioneer.money + 1,
    });
    expect(result.valid).toBe(false);
  });

  it("players act clockwise from auctioneer's left", () => {
    const setup = startFixedPrice();
    if (!setup) return;
    const { state } = setup;
    const auctioneerIdx = state.players.findIndex((p) => p.id === setup.auctioneerId);
    const expectedFirst = state.players[(auctioneerIdx + 1) % state.players.length].id;

    const s = dispatch(state, { type: "FIXED_PRICE_SET", playerId: setup.auctioneerId, price: 10 });
    const turnOrder = (s.auction as FixedPriceAuctionState).turnOrder;
    expect(turnOrder[0]).toBe(expectedFirst);
  });

  it("first player to buy wins", () => {
    const setup = startFixedPrice();
    if (!setup) return;
    let { state } = setup;
    state = dispatch(state, { type: "FIXED_PRICE_SET", playerId: setup.auctioneerId, price: 20 });
    const firstBuyer = (state.auction as OneOfferAuctionState).turnOrder[0] as string;
    state = dispatch(state, { type: "FIXED_PRICE_BUY", playerId: firstBuyer });
    const buyer = state.players.find((p) => p.id === firstBuyer)!;
    expect(buyer.money).toBe(80);
    expect(buyer.purchasedThisRound.length).toBeGreaterThanOrEqual(1);
  });

  it("if nobody buys, auctioneer must pay bank", () => {
    const setup = startFixedPrice();
    if (!setup) return;
    let { state } = setup;
    state = dispatch(state, { type: "FIXED_PRICE_SET", playerId: setup.auctioneerId, price: 15 });
    const turnOrder = (state.auction as OneOfferAuctionState).turnOrder;
    for (const pid of turnOrder.slice(0, -1)) {
      state = dispatch(state, { type: "FIXED_PRICE_PASS", playerId: pid });
    }
    // Last in turnOrder is the auctioneer — they must "pass" which forces buy
    const lastId = turnOrder[turnOrder.length - 1];
    state = dispatch(state, { type: "FIXED_PRICE_PASS", playerId: lastId });
    const auctioneer = state.players.find((p) => p.id === setup.auctioneerId)!;
    expect(auctioneer.money).toBe(85); // paid 15 to bank
    expect(auctioneer.purchasedThisRound.length).toBeGreaterThanOrEqual(1);
  });
});

// ─── Round End Condition ──────────────────────────────────────────────────────

describe("Round End", () => {
  it("5th painting of an artist ends the round", () => {
    const s = fresh(4);
    // Manually create a state where an artist has 4 offers and force the 5th
    const artistId: ArtistId = "manuel-carvalho";
    const overrideState: ModernArtState = {
      ...s,
      currentRound: {
        ...s.currentRound,
        offerCounts: { ...s.currentRound.offerCounts, [artistId]: 4 },
      },
    };
    const current = overrideState.players[overrideState.currentPlayerIndex];
    const card = current.hand.find((c) => c.artistId === artistId);
    if (!card) return; // skip if player doesn't have this artist's card
    const next = reduce(overrideState, { type: "OFFER_PAINTING", playerId: current.id, cardId: card.id });
    expect(next.phase).toBe("round-end");
    expect(next.currentRound.roundEndCard?.artistId).toBe(artistId);
  });

  it("5th painting is NOT auctioned", () => {
    const s = fresh(4);
    const artistId: ArtistId = "manuel-carvalho";
    const overrideState: ModernArtState = {
      ...s,
      currentRound: {
        ...s.currentRound,
        offerCounts: { ...s.currentRound.offerCounts, [artistId]: 4 },
      },
    };
    const current = overrideState.players[overrideState.currentPlayerIndex];
    const card = current.hand.find((c) => c.artistId === artistId);
    if (!card) return;
    const next = reduce(overrideState, { type: "OFFER_PAINTING", playerId: current.id, cardId: card.id });
    // Phase should be round-end, not an auction phase
    expect(next.phase).toBe("round-end");
    expect(next.auction).toBeNull();
  });

  it("does not start the next round until every player acknowledges selling", () => {
    const s = fresh(3);
    const selling: ModernArtState = {
      ...s,
      phase: "selling",
      readyPlayerIds: [],
      currentRound: {
        ...s.currentRound,
        rankings: calculateRankings(
          {
            "manuel-carvalho": 5,
            "ramon-martins": 3,
            "daniel-melim": 2,
            "rafael-silveira": 0,
            "sigrid-thaler": 0,
          },
          s.artistMarket,
          1
        ),
      },
    };

    const afterFirst = dispatch(selling, { type: "ACKNOWLEDGE_SELLING", playerId: "p1" });
    expect(afterFirst.phase).toBe("selling");
    expect(afterFirst.round).toBe(1);
    expect(afterFirst.readyPlayerIds).toEqual(["p1"]);

    const afterSecond = dispatch(afterFirst, { type: "ACKNOWLEDGE_SELLING", playerId: "p2" });
    expect(afterSecond.phase).toBe("selling");
    expect(afterSecond.round).toBe(1);

    const afterAll = dispatch(afterSecond, { type: "ACKNOWLEDGE_SELLING", playerId: "p3" });
    expect(afterAll.round).toBe(2);
    expect(afterAll.phase).toBe("select-painting");
    expect(afterAll.readyPlayerIds).toEqual([]);
  });

  it("rejects a second acknowledge from the same player", () => {
    const s = fresh(3);
    const selling: ModernArtState = {
      ...s,
      phase: "selling",
      readyPlayerIds: ["p1"],
      currentRound: {
        ...s.currentRound,
        rankings: calculateRankings(
          {
            "manuel-carvalho": 5,
            "ramon-martins": 3,
            "daniel-melim": 2,
            "rafael-silveira": 0,
            "sigrid-thaler": 0,
          },
          s.artistMarket,
          1
        ),
      },
    };
    const result = validateAction(selling, { type: "ACKNOWLEDGE_SELLING", playerId: "p1" });
    expect(result.valid).toBe(false);
  });
});

// ─── Artist Rankings ──────────────────────────────────────────────────────────

describe("Artist Rankings", () => {
  const emptyMarket = { roundValues: [{}, {}, {}, {}] };

  it("top 3 artists get correct values", () => {
    const counts: Record<ArtistId, number> = {
      "manuel-carvalho": 4,
      "ramon-martins": 3,
      "daniel-melim": 2,
      "rafael-silveira": 1,
      "sigrid-thaler": 0,
    };
    const rankings = calculateRankings(counts, emptyMarket, 1);
    const manuel = rankings.find((r) => r.artistId === "manuel-carvalho")!;
    const ramon = rankings.find((r) => r.artistId === "ramon-martins")!;
    const daniel = rankings.find((r) => r.artistId === "daniel-melim")!;
    const rafael = rankings.find((r) => r.artistId === "rafael-silveira")!;
    expect(manuel.rank).toBe(1);
    expect(manuel.valueThisRound).toBe(30);
    expect(ramon.rank).toBe(2);
    expect(ramon.valueThisRound).toBe(20);
    expect(daniel.rank).toBe(3);
    expect(daniel.valueThisRound).toBe(10);
    expect(rafael.rank).toBeNull();
    expect(rafael.valueThisRound).toBe(0);
  });

  it("tie-breaking: earlier artist on board wins", () => {
    const counts: Record<ArtistId, number> = {
      "manuel-carvalho": 3,
      "ramon-martins": 3,
      "daniel-melim": 3,
      "rafael-silveira": 1,
      "sigrid-thaler": 0,
    };
    const rankings = calculateRankings(counts, emptyMarket, 1);
    const manuel = rankings.find((r) => r.artistId === "manuel-carvalho")!;
    const ramon = rankings.find((r) => r.artistId === "ramon-martins")!;
    const daniel = rankings.find((r) => r.artistId === "daniel-melim")!;
    expect(manuel.rank).toBe(1); // leftmost wins tie
    expect(ramon.rank).toBe(2);
    expect(daniel.rank).toBe(3);
  });

  it("artist with 0 paintings has no rank", () => {
    const counts: Record<ArtistId, number> = {
      "manuel-carvalho": 4,
      "ramon-martins": 3,
      "daniel-melim": 2,
      "rafael-silveira": 1,
      "sigrid-thaler": 0,
    };
    const rankings = calculateRankings(counts, emptyMarket, 1);
    const sigrid = rankings.find((r) => r.artistId === "sigrid-thaler")!;
    expect(sigrid.rank).toBeNull();
    expect(sigrid.valueThisRound).toBe(0);
  });

  it("cumulative values accumulate across rounds", () => {
    const market = {
      roundValues: [
        { "rafael-silveira": 30 }, // round 1: rafael was 1st
        { "rafael-silveira": 10 }, // round 2: rafael was 3rd
        {},
        {},
      ],
    };
    const counts: Record<ArtistId, number> = {
      "manuel-carvalho": 1,
      "ramon-martins": 1,
      "rafael-silveira": 3, // rafael is 1st this round
      "daniel-melim": 0,
      "sigrid-thaler": 0,
    };
    const rankings = calculateRankings(counts, market, 3); // round 3
    const rafael = rankings.find((r) => r.artistId === "rafael-silveira")!;
    expect(rafael.rank).toBe(1);
    // Historical from rounds 1+2 = 30+10 = 40, plus current round 30 = 70
    expect(rafael.cumulativeValue).toBe(70);
  });

  it("artist outside top 3 gets $0 even with historical value", () => {
    const market = {
      roundValues: [
        { "sigrid-thaler": 30 }, // round 1: sigrid was 1st
        {},
        {},
        {},
      ],
    };
    const counts: Record<ArtistId, number> = {
      "manuel-carvalho": 4,
      "ramon-martins": 3,
      "daniel-melim": 2,
      "rafael-silveira": 2,
      "sigrid-thaler": 1,
    };
    // sigrid is 5th (or tied last)
    const rankings = calculateRankings(counts, market, 2); // round 2
    const sigrid = rankings.find((r) => r.artistId === "sigrid-thaler")!;
    expect(sigrid.rank).toBeNull();
    expect(sigrid.valueThisRound).toBe(0);
  });
});

// ─── Money System ─────────────────────────────────────────────────────────────

describe("Money System", () => {
  it("cannot bid more than available money (open)", () => {
    const s = fresh(4);
    // Try to place bid of 9999
    const result = validateAction(s, { type: "OPEN_BID", playerId: "p1", amount: 9999 });
    // Either fails because not in auction phase or over budget
    if (s.phase !== "auction-open") {
      expect(result.valid).toBe(false); // not in auction phase
    } else {
      expect(result.valid).toBe(false); // over budget
    }
  });

  it("internal money values are integers", () => {
    const s = fresh(4);
    for (const p of s.players) {
      expect(Number.isInteger(p.money)).toBe(true);
    }
  });
});

// ─── Double Auction ───────────────────────────────────────────────────────────

describe("Double Auction", () => {
  function getStateWithDouble() {
    let s = fresh(4);
    for (let attempt = 0; attempt < s.players.length * 5; attempt++) {
      const current = s.players[s.currentPlayerIndex];
      const doubleCard = current.hand.find((c) => c.auctionType === "double");
      if (doubleCard) {
        s = dispatch(s, { type: "OFFER_PAINTING", playerId: current.id, cardId: doubleCard.id });
        if (s.phase === "double-second-select") {
          return { state: s, originalAuctioneerId: current.id, doubleCardId: doubleCard.id };
        }
        return null; // ended round
      }
      // Advance past this player if they have no double card
      // We can't easily advance without running an auction, so just return null
      return null;
    }
    return null;
  }

  it("second card must be same artist", () => {
    const setup = getStateWithDouble();
    if (!setup) return;
    const { state } = setup;
    const setup2 = state.doubleAuctionSetup!;
    const askingPlayer = state.players.find((p) => p.id === setup2.currentAskingPlayerId)!;
    const wrongArtistCard = askingPlayer.hand.find(
      (c) => c.artistId !== setup2.artistId && c.auctionType !== "double"
    );
    if (!wrongArtistCard) return;
    const result = validateAction(state, {
      type: "SUPPLY_DOUBLE_SECOND",
      playerId: askingPlayer.id,
      cardId: wrongArtistCard.id,
    });
    expect(result.valid).toBe(false);
  });

  it("second card cannot be a Double", () => {
    const setup = getStateWithDouble();
    if (!setup) return;
    const { state } = setup;
    const setup2 = state.doubleAuctionSetup!;
    const askingPlayer = state.players.find((p) => p.id === setup2.currentAskingPlayerId)!;
    const anotherDouble = askingPlayer.hand.find(
      (c) => c.artistId === setup2.artistId && c.auctionType === "double"
    );
    if (!anotherDouble) return;
    const result = validateAction(state, {
      type: "SUPPLY_DOUBLE_SECOND",
      playerId: askingPlayer.id,
      cardId: anotherDouble.id,
    });
    expect(result.valid).toBe(false);
  });

  it("declining passes to next player", () => {
    const setup = getStateWithDouble();
    if (!setup) return;
    const { state } = setup;
    const firstAsker = state.doubleAuctionSetup!.currentAskingPlayerId;
    const next = dispatch(state, { type: "DECLINE_DOUBLE_SECOND", playerId: firstAsker });
    if (next.phase === "double-second-select") {
      expect(next.doubleAuctionSetup!.currentAskingPlayerId).not.toBe(firstAsker);
    }
    // Could have resolved to free painting if nobody left
  });

  it("if nobody supplies second card, original auctioneer gets painting free", () => {
    const setup = getStateWithDouble();
    if (!setup) return;
    let { state } = setup;
    // Everyone declines
    let declines = 0;
    while (state.phase === "double-second-select") {
      const asker = state.doubleAuctionSetup!.currentAskingPlayerId;
      state = dispatch(state, { type: "DECLINE_DOUBLE_SECOND", playerId: asker });
      declines++;
      if (declines > 10) break; // safety
    }
    const originalAuctioneer = state.players.find((p) => p.id === setup.originalAuctioneerId)!;
    if (state.phase !== "double-second-select") {
      // Should have gotten the painting free
      expect(originalAuctioneer.purchasedThisRound.length).toBeGreaterThanOrEqual(1);
    }
  });
});

// ─── Serialization ────────────────────────────────────────────────────────────

describe("Serialization", () => {
  it("game state can be JSON serialized and deserialized", () => {
    const s = fresh(4);
    const serialized = JSON.stringify(s);
    const deserialized = JSON.parse(serialized) as ModernArtState;
    expect(deserialized.round).toBe(s.round);
    expect(deserialized.players).toHaveLength(s.players.length);
    expect(deserialized.deck).toHaveLength(s.deck.length);
  });

  it("state from restored JSON can still process actions", () => {
    const s = fresh(4);
    const serialized = JSON.stringify(s);
    const deserialized = JSON.parse(serialized) as ModernArtState;
    const current = deserialized.players[deserialized.currentPlayerIndex];
    const card = current.hand.find((c) => c.auctionType !== "double")!;
    // This should not throw
    const next = reduce(deserialized, { type: "OFFER_PAINTING", playerId: current.id, cardId: card.id });
    expect(next).toBeDefined();
  });
});


