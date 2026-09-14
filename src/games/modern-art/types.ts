/**
 * Modern Art — Core types.
 *
 * All game types live here. No game logic — just data shapes.
 */

// ─── Artists ─────────────────────────────────────────────────────────────────

export type ArtistId =
  | "manuel-carvalho"
  | "ramon-martins"
  | "daniel-melim"
  | "rafael-silveira"
  | "sigrid-thaler";

/** Fixed board order — left to right; determines tie-breaking */
export const ARTIST_ORDER: ArtistId[] = [
  "manuel-carvalho",
  "ramon-martins",
  "daniel-melim",
  "rafael-silveira",
  "sigrid-thaler",
];

export interface ArtistInfo {
  id: ArtistId;
  name: string;
  shortName: string;
  /** CSS gradient strings for artwork generation */
  palette: string[];
  accent: string;
}

// ─── Cards ────────────────────────────────────────────────────────────────────

export type AuctionType = "open" | "one-offer" | "hidden" | "fixed-price" | "double";

export interface PaintingCard {
  id: string;
  artistId: ArtistId;
  artworkName: string;
  auctionType: AuctionType;
  /** Card index within artist (0-based), used for visual generation */
  artistIndex: number;
}

// ─── Players ─────────────────────────────────────────────────────────────────

export interface MAPlayer {
  id: string;
  name: string;
  seat: number;
  money: number;
  hand: PaintingCard[];
  purchasedThisRound: PaintingCard[];
}

// ─── Artist Market ───────────────────────────────────────────────────────────

/** Value earned by an artist in a specific round (0 if not ranked) */
export type ArtistMarket = {
  /** Index 0 = round 1, up to index 3 = round 4 */
  roundValues: Array<Partial<Record<ArtistId, number>>>;
};

// ─── Rankings ────────────────────────────────────────────────────────────────

export interface ArtistRanking {
  artistId: ArtistId;
  offerCount: number;
  rank: 1 | 2 | 3 | null;
  valueThisRound: 30 | 20 | 10 | 0;
  /** Sum of all round values including this round (if ranked) */
  cumulativeValue: number;
}

// ─── Auction States ───────────────────────────────────────────────────────────

export interface OpenAuctionState {
  type: "open";
  paintingIds: string[];
  auctioneerId: string;
  currentHighestBid: number;
  currentHighestBidderId: string | null;
}

export interface OneOfferAuctionState {
  type: "one-offer";
  paintingIds: string[];
  auctioneerId: string;
  currentHighestBid: number;
  currentHighestBidderId: string | null;
  /** Player IDs in order: left of auctioneer first, auctioneer last */
  turnOrder: string[];
  currentTurnIndex: number;
}

export interface HiddenAuctionState {
  type: "hidden";
  paintingIds: string[];
  auctioneerId: string;
  /** null = not yet submitted; number = submitted bid (0 = pass/no bid) */
  bids: Record<string, number | null>;
  allSubmitted: boolean;
  revealed: boolean;
}

export interface FixedPriceAuctionState {
  type: "fixed-price";
  paintingIds: string[];
  auctioneerId: string;
  price: number | null;
  /** Left of auctioneer first, auctioneer last */
  turnOrder: string[];
  currentTurnIndex: number;
  winnerId: string | null;
}

export type AuctionState =
  | OpenAuctionState
  | OneOfferAuctionState
  | HiddenAuctionState
  | FixedPriceAuctionState;

// ─── Double Auction Setup ─────────────────────────────────────────────────────

export interface DoubleAuctionSetup {
  /** The double auction card that was played */
  originalPaintingId: string;
  /** Player who played the double card */
  originalAuctioneerId: string;
  artistId: ArtistId;
  /** Players who have declined to supply a second card */
  declinedPlayerIds: string[];
  /**
   * Current player being asked to supply a second card.
   * Goes clockwise from original auctioneer (starts with them), 
   * then their left, etc.
   */
  currentAskingPlayerId: string;
}

// ─── Round State ──────────────────────────────────────────────────────────────

export interface RoundState {
  /** How many paintings of each artist have been OFFERED this round */
  offerCounts: Record<ArtistId, number>;
  /** The painting that ended the round (5th of any artist) — not auctioned */
  roundEndCard: PaintingCard | null;
  /** Rankings calculated at round end */
  rankings: ArtistRanking[] | null;
}

// ─── Mystery Player (3-player variant) ───────────────────────────────────────

export interface MysteryState {
  /** Mystery hand cards — hidden */
  hand: PaintingCard[];
  /** Cards revealed from mystery hand this round */
  revealedThisRound: PaintingCard[];
}

// ─── Game Log ─────────────────────────────────────────────────────────────────

export type LogEventType =
  | "auction-start"
  | "bid-placed"
  | "auction-won"
  | "auction-free"
  | "round-ended"
  | "rankings"
  | "painting-sold"
  | "round-started"
  | "mystery-revealed";

export interface LogEntry {
  id: string;
  round: number;
  eventType: LogEventType;
  message: string;
  timestamp: number;
}

// ─── Game Phase ───────────────────────────────────────────────────────────────

export type GamePhase =
  | "lobby"
  | "round-start"
  | "select-painting"        // current auctioneer picks a card
  | "double-second-select"   // resolving who plays second card for double
  | "auction-open"
  | "auction-one-offer"
  | "auction-hidden"
  | "auction-fixed-price"
  | "mystery-optional"       // after play, optionally reveal mystery card
  | "round-end"              // brief phase showing the round-ending card
  | "market-ranking"         // displaying rankings and value tiles
  | "selling"                // selling paintings and showing earnings
  | "round-transition"       // dealing new cards between rounds
  | "game-over";

// ─── Full Game State ──────────────────────────────────────────────────────────

export interface ModernArtState {
  gameId: string;
  phase: GamePhase;
  round: 1 | 2 | 3 | 4;
  players: MAPlayer[];
  /** Undealt cards */
  deck: PaintingCard[];
  discardPile: PaintingCard[];
  artistMarket: ArtistMarket;
  currentRound: RoundState;
  /** Index into players[] of the current auctioneer */
  currentPlayerIndex: number;
  /** Index of the player who started this round (used for next-round start) */
  startingPlayerIndex: number;
  /** The active auction (null when not in an auction phase) */
  auction: AuctionState | null;
  /** Double auction setup state (null when not resolving a double) */
  doubleAuctionSetup: DoubleAuctionSetup | null;
  mysteryEnabled: boolean;
  mystery: MysteryState | null;
  log: LogEntry[];
  seed: string;
  /** Result of last auction for display */
  lastAuctionResult: {
    paintingIds: string[];
    winnerId: string | null;
    amount: number;
    wasAuctioneersWin: boolean;
    wasFree: boolean;
  } | null;
  /** Players who have confirmed the current selling / next-round screen */
  readyPlayerIds: string[];
}
