/**
 * Catalogue types — the shared metadata shape every game must provide.
 * These power: discovery, filtering, routing, catalogue cards, and the game registry.
 *
 * Player counts and play modes are declared on each game's rules
 * (`GameRules.facts` in src/games/<game-id>/rules.ts) and projected
 * into metadata via `catalogueFieldsFromRules`. Do not hardcode those
 * fields independently — they will drift from the lobby and the rules.
 */

// ─── Categories ───────────────────────────────────────────────────────────────

export type GameCategory =
  | "card"
  | "board"
  | "party"
  | "strategy"
  | "social-deduction"
  | "bluffing"
  | "word"
  | "dice"
  | "auction"
  | "economic"
  | "family"
  | "competitive"
  | "cooperative"
  | "two-player"
  | "casino";

// ─── Mechanics ─────────────────────────────────────────────────────────────────

export type GameMechanic =
  | "hand-management"
  | "deck-building"
  | "trick-taking"
  | "set-collection"
  | "drafting"
  | "hidden-roles"
  | "voting"
  | "deduction"
  | "bluffing"
  | "betting"
  | "area-control"
  | "grid-movement"
  | "worker-placement"
  | "tile-placement"
  | "resource-management"
  | "auction"
  | "push-your-luck"
  | "simultaneous-action"
  | "turn-order"
  | "elimination"
  | "teams";

// ─── Modes ────────────────────────────────────────────────────────────────────

export type GameMode = "local" | "online" | "single-device" | "multi-device";

// ─── Difficulty ───────────────────────────────────────────────────────────────

export type GameDifficulty = "easy" | "medium" | "hard" | "expert";

// ─── Status ───────────────────────────────────────────────────────────────────

export type GameStatus = "available" | "coming-soon" | "beta";

// ─── Core Metadata Shape ──────────────────────────────────────────────────────

/**
 * The canonical metadata shape that every game must export from its
 * src/games/<game-id>/metadata.ts file.
 *
 * Catalogue cards, filters, and routing read this object.
 * Player/mode fields must be copied from the game's rules facts.
 */
export interface GameMetadata {
  /** Stable slug — must match the filename in /games/<game-id>.md */
  id: string;

  name: string;
  shortDescription: string;
  description?: string;

  minPlayers: number;
  maxPlayers: number;
  /** Player counts the game is particularly good at */
  recommendedPlayers?: number[];

  difficulty: GameDifficulty;

  durationMinutes: {
    min: number;
    max: number;
  };

  categories: GameCategory[];
  mechanics?: GameMechanic[];
  modes?: GameMode[];

  supportsLocal: boolean;
  supportsOffline: boolean;
  supportsOnline: boolean;

  /** Path to the game's catalogue image, relative to /src/assets/games/<id>/ */
  image: string;
  /** CSS color string used as an accent in the catalogue card */
  accent?: string;

  status: GameStatus;

  publisher?: string;
  year?: number;

  /** Optional age recommendation */
  minAge?: number;
}
