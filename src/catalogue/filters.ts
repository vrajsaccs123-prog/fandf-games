/**
 * Catalogue filter definitions — canonical labels for every filter value.
 *
 * These must stay in sync with the GameCategory / GameMechanic types in
 * src/game/core/types/catalogue.ts and with /games/README.md.
 */

import type {
  GameCategory,
  GameDifficulty,
  GameMechanic,
  GameMode,
} from "@/game/core/types";

// ─── Category Labels ──────────────────────────────────────────────────────────

export const CATEGORY_LABELS: Record<GameCategory, string> = {
  "card": "Card",
  "board": "Board",
  "party": "Party",
  "strategy": "Strategy",
  "social-deduction": "Social Deduction",
  "bluffing": "Bluffing",
  "word": "Word",
  "dice": "Dice",
  "auction": "Auction",
  "economic": "Economic",
  "family": "Family",
  "competitive": "Competitive",
  "cooperative": "Cooperative",
  "two-player": "2-Player",
  "casino": "Casino",
};

// ─── Difficulty Labels ────────────────────────────────────────────────────────

export const DIFFICULTY_LABELS: Record<GameDifficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
  expert: "Expert",
};

export const DIFFICULTY_ORDER: GameDifficulty[] = [
  "easy",
  "medium",
  "hard",
  "expert",
];

// ─── Mechanic Labels ──────────────────────────────────────────────────────────

export const MECHANIC_LABELS: Record<GameMechanic, string> = {
  "hand-management": "Hand Management",
  "deck-building": "Deck Building",
  "trick-taking": "Trick Taking",
  "set-collection": "Set Collection",
  "drafting": "Drafting",
  "hidden-roles": "Hidden Roles",
  "voting": "Voting",
  "deduction": "Deduction",
  "bluffing": "Bluffing",
  "betting": "Betting",
  "area-control": "Area Control",
  "grid-movement": "Grid Movement",
  "worker-placement": "Worker Placement",
  "tile-placement": "Tile Placement",
  "resource-management": "Resource Management",
  "auction": "Auction",
  "push-your-luck": "Push Your Luck",
  "simultaneous-action": "Simultaneous Action",
  "turn-order": "Turn Order",
  "elimination": "Elimination",
  "teams": "Teams",
};

// ─── Mode Labels ──────────────────────────────────────────────────────────────

export const MODE_LABELS: Record<GameMode, string> = {
  "local": "Local Play",
  "online": "Online",
  "single-device": "Single Device",
  "multi-device": "Multi Device",
};

// ─── Duration Buckets ─────────────────────────────────────────────────────────

export type DurationBucket =
  | "under-15"
  | "15-30"
  | "30-60"
  | "60-90"
  | "90-plus";

export const DURATION_BUCKET_LABELS: Record<DurationBucket, string> = {
  "under-15": "Under 15 min",
  "15-30": "15–30 min",
  "30-60": "30–60 min",
  "60-90": "60–90 min",
  "90-plus": "90+ min",
};

/** Map a game's duration range to which bucket(s) it falls in */
export function getDurationBuckets(
  min: number,
  max: number
): DurationBucket[] {
  const avg = (min + max) / 2;
  const buckets: DurationBucket[] = [];
  if (avg < 15) buckets.push("under-15");
  else if (avg < 30) buckets.push("15-30");
  else if (avg < 60) buckets.push("30-60");
  else if (avg < 90) buckets.push("60-90");
  else buckets.push("90-plus");
  return buckets;
}

// ─── Active Filter State ──────────────────────────────────────────────────────

/** The shape of the user's currently active catalogue filters */
export interface CatalogueFilters {
  playerCount?: number;
  difficulty?: GameDifficulty[];
  duration?: DurationBucket[];
  categories?: GameCategory[];
  mechanics?: GameMechanic[];
  modes?: GameMode[];
  /** Free text search against name + description */
  search?: string;
}

export const DEFAULT_FILTERS: CatalogueFilters = {};

export function hasActiveFilters(filters: CatalogueFilters): boolean {
  return (
    filters.playerCount !== undefined ||
    (filters.difficulty?.length ?? 0) > 0 ||
    (filters.duration?.length ?? 0) > 0 ||
    (filters.categories?.length ?? 0) > 0 ||
    (filters.mechanics?.length ?? 0) > 0 ||
    (filters.modes?.length ?? 0) > 0 ||
    (filters.search?.trim().length ?? 0) > 0
  );
}
