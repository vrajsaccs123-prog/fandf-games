/**
 * Modern Art — Actions.
 */

export type ModernArtAction =
  // ── Main Turn ──────────────────────────────────────────────────────────────
  /** Current auctioneer offers a painting from their hand */
  | { type: "OFFER_PAINTING"; playerId: string; cardId: string }

  // ── Double Auction Setup ───────────────────────────────────────────────────
  /** A player supplies the second card for a double auction */
  | { type: "SUPPLY_DOUBLE_SECOND"; playerId: string; cardId: string }
  /** A player declines to supply a second card */
  | { type: "DECLINE_DOUBLE_SECOND"; playerId: string }

  // ── Open Auction ───────────────────────────────────────────────────────────
  /** Any player places a bid */
  | { type: "OPEN_BID"; playerId: string; amount: number }
  /** Auctioneer closes the open auction */
  | { type: "CLOSE_OPEN_AUCTION"; playerId: string }

  // ── One Offer Auction ──────────────────────────────────────────────────────
  /** Current player in turn order places an offer */
  | { type: "ONE_OFFER_BID"; playerId: string; amount: number }
  /** Current player passes */
  | { type: "ONE_OFFER_PASS"; playerId: string }

  // ── Hidden Auction ─────────────────────────────────────────────────────────
  /** Player submits their secret bid (0 = no bid / pass) */
  | { type: "HIDDEN_SUBMIT_BID"; playerId: string; amount: number }
  /** After all submitted, auctioneer reveals */
  | { type: "HIDDEN_REVEAL"; playerId: string }

  // ── Fixed Price Auction ────────────────────────────────────────────────────
  /** Auctioneer sets the fixed price */
  | { type: "FIXED_PRICE_SET"; playerId: string; price: number }
  /** A player buys at the fixed price */
  | { type: "FIXED_PRICE_BUY"; playerId: string }
  /** A player passes on the fixed price */
  | { type: "FIXED_PRICE_PASS"; playerId: string }

  // ── Mystery Player ─────────────────────────────────────────────────────────
  /** Current player reveals a mystery card (optional) */
  | { type: "MYSTERY_REVEAL"; playerId: string }
  /** Current player skips the mystery reveal */
  | { type: "MYSTERY_SKIP"; playerId: string }

  // ── Phase Transitions (UI-driven acknowledgements) ────────────────────────
  /** Move from round-end to market-ranking phase */
  | { type: "ACKNOWLEDGE_ROUND_END"; playerId: string }
  /** Move from market-ranking to selling phase */
  | { type: "ACKNOWLEDGE_RANKINGS"; playerId: string }
  /** Move from selling to next round / game-over */
  | { type: "ACKNOWLEDGE_SELLING"; playerId: string }

  // ── Post-game ──────────────────────────────────────────────────────────────
  | { type: "REMATCH" }
  | { type: "EXIT" };
