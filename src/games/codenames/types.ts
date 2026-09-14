/**
 * Codenames — TypeScript type definitions.
 */

export type Team = "red" | "blue";
export type CardType = "red" | "blue" | "neutral" | "assassin";
export type GamePhase = "giving_clue" | "guessing" | "game_over";

// ─── Word Card ────────────────────────────────────────────────────────────────

export interface WordCard {
  /** Index 0–24 on the 5×5 board */
  id: number;
  word: string;
  /** Hidden from operatives until revealed */
  type: CardType;
  revealed: boolean;
  /** Which team's guess revealed this card (for UI highlighting) */
  revealedByTeam?: Team;
}

// ─── Clue ─────────────────────────────────────────────────────────────────────

export interface ClueEntry {
  team: Team;
  word: string;
  /** Number of target cards. 0 means "unlimited / infinity" */
  count: number;
  turn: number;
}

// ─── Players ──────────────────────────────────────────────────────────────────

export interface CodenamesPlayer {
  id: string;
  name: string;
  team: Team;
  isSpymaster: boolean;
}

// ─── Team Info ────────────────────────────────────────────────────────────────

export interface TeamInfo {
  playerIds: string[];
  spymasterId: string;
  /** Cards still left to find (counts down to 0 → win) */
  remaining: number;
  /** Total cards assigned to this team at game start */
  total: number;
}

// ─── Game Event ───────────────────────────────────────────────────────────────

export interface GameEvent {
  type: string;
  payload: Record<string, unknown>;
  turn: number;
  timestamp: number;
}

// ─── Full State ───────────────────────────────────────────────────────────────

export interface CodenamesState {
  phase: GamePhase;

  /** All 25 word cards */
  words: WordCard[];

  /** All players with team/role assignment */
  players: CodenamesPlayer[];

  teams: {
    red: TeamInfo;
    blue: TeamInfo;
  };

  /** The team that goes first — they have 9 cards vs 8 for the other */
  startingTeam: Team;

  /** Whose turn it is right now */
  currentTeam: Team;

  /** Which turn number we're on (increments each time teams switch) */
  turn: number;

  /** The active clue given by the spymaster this turn */
  currentClue: { word: string; count: number } | null;

  /**
   * How many guesses remain this turn.
   * count + 1 (bonus guess). When count === 0 (unlimited) this is 99.
   */
  guessesRemaining: number;

  /** History of all clues given in this game */
  clueHistory: ClueEntry[];

  /** Winning team, or null while game is ongoing */
  winner: Team | null;

  /** Human-readable explanation of how the game ended */
  winReason: string | null;

  events: GameEvent[];
  seed: string;
}
