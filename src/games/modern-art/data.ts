/**
 * Modern Art — Static game data.
 *
 * Defines all 70 painting cards and artist information.
 * This is pure static data — no game logic here.
 */

import type { ArtistId, ArtistInfo, PaintingCard, AuctionType } from "./types";

// ─── Artist Information ───────────────────────────────────────────────────────

export const ARTISTS: Record<ArtistId, ArtistInfo> = {
  "manuel-carvalho": {
    id: "manuel-carvalho",
    name: "Manuel Carvalho",
    shortName: "Carvalho",
    palette: ["#1e3a5f", "#2d6a9f", "#4a9eda", "#7ac5f0", "#b8dff5"],
    accent: "#2d6a9f",
  },
  "ramon-martins": {
    id: "ramon-martins",
    name: "Ramon Martins",
    shortName: "Martins",
    palette: ["#7a3a00", "#c46a00", "#f09a20", "#f5c060", "#fce4a8"],
    accent: "#c46a00",
  },
  "daniel-melim": {
    id: "daniel-melim",
    name: "Daniel Melim",
    shortName: "Melim",
    palette: ["#2a1a4a", "#5a3a8a", "#8a60c0", "#b490d8", "#dcc8f0"],
    accent: "#5a3a8a",
  },
  "rafael-silveira": {
    id: "rafael-silveira",
    name: "Rafael Silveira",
    shortName: "Silveira",
    palette: ["#5a0a0a", "#9a1515", "#d02020", "#e86060", "#f5a0a0"],
    accent: "#9a1515",
  },
  "sigrid-thaler": {
    id: "sigrid-thaler",
    name: "Sigrid Thaler",
    shortName: "Thaler",
    palette: ["#1a3a1a", "#2d6a2d", "#4a9a4a", "#7ac87a", "#b8e8b8"],
    accent: "#2d6a2d",
  },
};

// ─── Card Definitions ─────────────────────────────────────────────────────────

type CardDef = {
  id: string;
  artistId: ArtistId;
  artworkName: string;
  auctionType: AuctionType;
  artistIndex: number;
};

function makeCards(
  artistId: ArtistId,
  entries: Array<{ name: string; type: AuctionType }>
): CardDef[] {
  return entries.map((e, i) => ({
    id: `${artistId}-${i + 1}`,
    artistId,
    artworkName: e.name,
    auctionType: e.type,
    artistIndex: i,
  }));
}

// Manuel Carvalho — 12 cards
const manuelCards = makeCards("manuel-carvalho", [
  { name: "Blue Horizon",        type: "open" },
  { name: "The Scholar",         type: "open" },
  { name: "Coastal Study",       type: "open" },
  { name: "Evening Light",       type: "one-offer" },
  { name: "Morning Fragments",   type: "one-offer" },
  { name: "Garden Thoughts",     type: "one-offer" },
  { name: "Composition I",       type: "hidden" },
  { name: "Abstract Forms",      type: "hidden" },
  { name: "The Red Door",        type: "fixed-price" },
  { name: "Still Life No.3",     type: "fixed-price" },
  { name: "Together",            type: "double" },
  { name: "Reunion",             type: "double" },
]);

// Ramon Martins — 15 cards
const ramonCards = makeCards("ramon-martins", [
  { name: "Tropical Memory",   type: "open" },
  { name: "Festival Day",      type: "open" },
  { name: "The Market",        type: "open" },
  { name: "Golden Hour",       type: "open" },
  { name: "Silent River",      type: "one-offer" },
  { name: "Dance",             type: "one-offer" },
  { name: "Rain Study",        type: "one-offer" },
  { name: "Nocturne",          type: "hidden" },
  { name: "The City Wakes",    type: "hidden" },
  { name: "Deep Blue",         type: "hidden" },
  { name: "Inner Light",       type: "fixed-price" },
  { name: "Solitude",          type: "fixed-price" },
  { name: "Movement",          type: "fixed-price" },
  { name: "Together Always",   type: "double" },
  { name: "Duet",              type: "double" },
]);

// Daniel Melim — 14 cards
const danielCards = makeCards("daniel-melim", [
  { name: "Vertical Lines",      type: "open" },
  { name: "The Grid",            type: "open" },
  { name: "Deconstruction",      type: "open" },
  { name: "Chromatic Layers",    type: "one-offer" },
  { name: "Balance",             type: "one-offer" },
  { name: "Tension",             type: "one-offer" },
  { name: "Void",                type: "hidden" },
  { name: "White on White",      type: "hidden" },
  { name: "The Space Between",   type: "hidden" },
  { name: "Mediation",           type: "fixed-price" },
  { name: "Texture Study",       type: "fixed-price" },
  { name: "Forms in Space",      type: "fixed-price" },
  { name: "Double Vision",       type: "double" },
  { name: "Mirror",              type: "double" },
]);

// Rafael Silveira — 16 cards
const rafaelCards = makeCards("rafael-silveira", [
  { name: "The Storm",     type: "open" },
  { name: "Awakening",     type: "open" },
  { name: "Fire Study",    type: "open" },
  { name: "Resistance",    type: "open" },
  { name: "Bold Strokes",  type: "one-offer" },
  { name: "Confrontation", type: "one-offer" },
  { name: "Power",         type: "one-offer" },
  { name: "Vitality",      type: "one-offer" },
  { name: "Surge",         type: "hidden" },
  { name: "Force",         type: "hidden" },
  { name: "Primal",        type: "hidden" },
  { name: "Emergence",     type: "fixed-price" },
  { name: "Energy",        type: "fixed-price" },
  { name: "The Wave",      type: "fixed-price" },
  { name: "Passion",       type: "double" },
  { name: "Twice Born",    type: "double" },
]);

// Sigrid Thaler — 13 cards
const sigridCards = makeCards("sigrid-thaler", [
  { name: "Serenity",       type: "open" },
  { name: "The Garden",     type: "open" },
  { name: "Contemplation",  type: "open" },
  { name: "Inner Peace",    type: "one-offer" },
  { name: "Nature's Voice", type: "one-offer" },
  { name: "Quiet Moment",   type: "one-offer" },
  { name: "The Forest",     type: "hidden" },
  { name: "Winter Light",   type: "hidden" },
  { name: "Harmony",        type: "hidden" },
  { name: "Reflection",     type: "fixed-price" },
  { name: "Still Waters",   type: "fixed-price" },
  { name: "Dawn",           type: "double" },
  { name: "The Horizon",    type: "double" },
]);

// ─── Full Deck ────────────────────────────────────────────────────────────────

export const ALL_PAINTINGS: PaintingCard[] = [
  ...manuelCards,
  ...ramonCards,
  ...danielCards,
  ...rafaelCards,
  ...sigridCards,
];

// Total: 12 + 15 + 14 + 16 + 13 = 70 cards

/** Look up a card by ID */
export function getPainting(id: string): PaintingCard | undefined {
  return ALL_PAINTINGS.find((c) => c.id === id);
}

/** Get all cards for a given artist */
export function getArtistCards(artistId: ArtistId): PaintingCard[] {
  return ALL_PAINTINGS.filter((c) => c.artistId === artistId);
}

// ─── Cards dealt per round ────────────────────────────────────────────────────

export const CARDS_PER_ROUND: Record<number, Record<number, number>> = {
  3: { 1: 10, 2: 6, 3: 6, 4: 0 },
  4: { 1: 9,  2: 4, 3: 4, 4: 0 },
  5: { 1: 8,  2: 3, 3: 3, 4: 0 },
};

export const STARTING_MONEY = 100;
export const ROUND_FIRST_VALUE = 30;
export const ROUND_SECOND_VALUE = 20;
export const ROUND_THIRD_VALUE = 10;
export const PAINTINGS_TO_END_ROUND = 5;

// ─── Auction type icons/symbols ───────────────────────────────────────────────

export const AUCTION_TYPE_LABELS: Record<AuctionType, string> = {
  "open":        "Open",
  "one-offer":   "One Offer",
  "hidden":      "Hidden",
  "fixed-price": "Fixed Price",
  "double":      "Double",
};

export const AUCTION_TYPE_SYMBOLS: Record<AuctionType, string> = {
  "open":        "🔨",
  "one-offer":   "☝️",
  "hidden":      "🤫",
  "fixed-price": "🏷️",
  "double":      "✌️",
};
