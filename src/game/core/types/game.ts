/**
 * Core game engine types — the contract every game module must satisfy.
 *
 * Game logic (reduce, validate, getAvailableActions) must be:
 *  - deterministic where possible
 *  - testable without React
 *  - independent of DOM/visual components
 *  - serializable
 */

import type { GameMetadata } from "./catalogue";

// ─── Players ──────────────────────────────────────────────────────────────────

export interface Player {
  id: string;
  name: string;
  /** Seat position — determines turn order */
  seat: number;
  isHuman: boolean;
}

// ─── Game Config ──────────────────────────────────────────────────────────────

/** Parameters provided when starting a game session */
export interface GameConfig {
  players: Player[];
  /** Optional settings specific to the game (e.g. rule variants) */
  options?: Record<string, unknown>;
  /** Optional seed for deterministic randomness */
  seed?: string;
}

// ─── Game Status ──────────────────────────────────────────────────────────────

export type GamePhaseStatus =
  | "waiting"    // Pre-game: waiting for players
  | "setup"      // Game is being set up
  | "playing"    // Active gameplay
  | "paused"     // Game is paused
  | "finished";  // Game has ended

export interface GameResult {
  /** IDs of the winning player(s) */
  winners: string[];
  /** Final scores keyed by player ID */
  scores?: Record<string, number>;
  /** Human-readable summary of how the game ended */
  summary?: string;
}

// ─── Validation ───────────────────────────────────────────────────────────────

export type ValidationResult =
  | { valid: true }
  | { valid: false; reason: string };

// ─── Rules ────────────────────────────────────────────────────────────────────

export interface RuleSection {
  title: string;
  content: string;
  /** Optional subsections */
  items?: string[];
}

export interface RuleExample {
  title: string;
  description: string;
}

export interface RuleGlossaryEntry {
  term: string;
  definition: string;
}

/**
 * Structured facts declared on a game's rules.
 * These are the source of truth for lobby player counts, mode labels,
 * catalogue cards, and setup controls. Metadata and UI must derive from here.
 */
export interface GameRulesFacts {
  minPlayers: number;
  maxPlayers: number;
  recommendedPlayers?: number[];
  supportsLocal: boolean;
  supportsOffline: boolean;
  supportsOnline: boolean;
}

export interface GameRules {
  /** Authoritative player/mode constraints — do not duplicate elsewhere */
  facts: GameRulesFacts;
  overview: string;
  objective: string;
  setup: RuleSection[];
  gameplay: RuleSection[];
  endCondition: RuleSection[];
  scoring?: RuleSection[];
  specialRules?: RuleSection[];
  examples?: RuleExample[];
  glossary?: RuleGlossaryEntry[];
}

// ─── Game Components (UI contract) ───────────────────────────────────────────

export interface GameComponents {
  /** The main game surface rendered during gameplay */
  GameSurface: React.ComponentType<GameSurfaceProps>;
  /** Optional: rendered in the pre-game lobby */
  Lobby?: React.ComponentType<LobbyProps>;
  /** Optional: rendered on the post-game results screen */
  Results?: React.ComponentType<ResultsProps>;
}

export interface GameSurfaceProps<TState = unknown, TAction = unknown> {
  state: TState;
  playerId: string;
  availableActions: TAction[];
  onAction: (action: TAction) => void;
}

export interface LobbyProps {
  gameId: string;
  onStart: (config: GameConfig) => void;
}

export interface ResultsProps {
  result: GameResult;
  onRematch: () => void;
  onExit: () => void;
}

// ─── Game Definition (the module contract) ───────────────────────────────────

/**
 * Every game module must export a default that satisfies this interface.
 *
 * TState  — the full authoritative game state (must be serializable)
 * TAction — the union of all possible actions
 * TPlayerView — the player-specific view of the state (hides hidden info)
 */
export interface GameDefinition<
  TState = unknown,
  TAction = unknown,
  TPlayerView = unknown,
> {
  metadata: GameMetadata;

  /**
   * Create the starting state for a new game session.
   * Must be deterministic given the same config + seed.
   */
  createInitialState(config: GameConfig, seed?: string): TState;

  /**
   * Pure reducer — given a state and an action, returns the next state.
   * Must not mutate the input state.
   */
  reduce(state: TState, action: TAction): TState;

  /**
   * Returns a ValidationResult — call before dispatching any action.
   */
  validateAction(state: TState, action: TAction): ValidationResult;

  /**
   * Returns all actions the given player may legally take right now.
   */
  getAvailableActions(state: TState, playerId: string): TAction[];

  /**
   * Returns the player-specific view of the state.
   * Must hide information the player should not see (opponent hands, etc.).
   */
  getPlayerView(state: TState, playerId: string): TPlayerView;

  /**
   * Returns the overall game status and result if finished.
   */
  getStatus(state: TState): {
    phase: GamePhaseStatus;
    result?: GameResult;
    currentPlayerId?: string;
    round?: number;
  };

  /**
   * Returns the rules definition, which is surfaced in-app.
   */
  getRules(): GameRules;

  /** React component tree for this game's UI */
  components: GameComponents;
}
