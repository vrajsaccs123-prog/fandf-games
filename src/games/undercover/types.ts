/**
 * Undercover — core type definitions.
 *
 * All game-specific types live here. The types are designed to be serializable
 * (no class instances, no functions) so that they can be broadcast over PeerJS.
 */

// ─── Factions ─────────────────────────────────────────────────────────────────

export type Faction = "civilian" | "undercover" | "mr_white";

// ─── Special Characters ───────────────────────────────────────────────────────

export type SpecialCharacter =
  | "judge"
  | "joy_fool"
  | "ghost"
  | "lover"
  | "revenger"
  | "duelist";

// ─── Difficulty ───────────────────────────────────────────────────────────────

export type WordDifficulty = "easy" | "medium" | "difficult";

// ─── Word Pair ────────────────────────────────────────────────────────────────

export interface WordPair {
  id: string;
  wordA: string;
  wordB: string;
  difficulty: WordDifficulty;
  category: string;
}

// ─── Player ───────────────────────────────────────────────────────────────────

export type DuelistStatus =
  | "pending"           // duel not yet decided
  | "first_eliminated"  // this player was eliminated first
  | "survivor"          // this player outlasted their rival
  | "simultaneous"      // both eliminated in same event — no bonus/penalty
  | "resolved";         // scoring already applied

export interface UndercoverPlayer {
  id: string;
  name: string;

  // Role
  faction: Faction;
  specialCharacters: SpecialCharacter[];

  // Pair relationships (assigned at start, fixed for match)
  loverPartnerId?: string;
  duelistRivalId?: string;

  // Lifecycle
  isEliminated: boolean;
  isGhost: boolean;             // True only for the assigned Ghost player after they are eliminated
  eliminationRound?: number;    // which round they were eliminated in

  // Per-character flags
  joyFoolActive: boolean;       // false after Round 1 if not eliminated in Round 1
  duelistStatus: DuelistStatus;

  // Scores
  totalScore: number;           // cumulative across all rounds
}

// ─── Clue ─────────────────────────────────────────────────────────────────────

export interface Clue {
  playerId: string;
  playerName: string;
  clue: string;
  roundNumber: number;
  turnIndex: number; // position in turn order this round
}

// ─── Vote result ──────────────────────────────────────────────────────────────

export interface VoteResult {
  totals: Record<string, number>; // targetId → vote count
  maxVotes: number;
  leaders: string[];              // playerIds tied for most votes
  isTie: boolean;
  /** True after a living Judge casts the extra tie-breaking vote. */
  tieBrokenByJudge?: boolean;
}

// ─── Win condition ────────────────────────────────────────────────────────────

export type WinningFaction = "civilian" | "undercover" | "mr_white";

export interface WinResult {
  faction: WinningFaction;
  winnerIds: string[];
  summary: string;
}

// ─── Events ───────────────────────────────────────────────────────────────────

export type GameEventType =
  | "GAME_STARTED"
  | "ROUND_STARTED"
  | "CARD_REVEALED"
  | "CLUE_SUBMITTED"
  | "VOTE_SUBMITTED"
  | "PLAYER_ELIMINATED"
  | "LOVER_CHAIN"
  | "REVENGER_TRIGGERED"
  | "GHOST_CREATED"
  | "JOY_FOOL_SUCCESS"
  | "DUELIST_RESOLVED"
  | "MR_WHITE_GUESS_CORRECT"
  | "MR_WHITE_GUESS_INCORRECT"
  | "JUDGE_DECISION"
  | "WIN_CONDITION_MET"
  | "ROUND_RESULT";

export interface GameEvent {
  type: GameEventType;
  payload: Record<string, unknown>;
  roundNumber: number;
  timestamp: number;
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export interface SpecialCharacterSettings {
  judge: boolean;
  joyFool: boolean;
  ghost: boolean;
  lovers: boolean;
  revenger: boolean;
  duelists: boolean;
}

export interface MatchSettings {
  totalPlayers: number;
  civilians: number;
  undercovers: number;
  mrWhites: number;
  difficulty: WordDifficulty;
  specialCharacters: SpecialCharacterSettings;
}

// ─── Game Phases ──────────────────────────────────────────────────────────────

export type UndercoverPhase =
  | "lobby"
  | "card_reveal"        // Round 1 only: players privately learn their word
  | "clue_phase"         // All living players give one clue about their word
  | "voting"             // Players vote; when all done the most-voted is eliminated
  | "elimination_reveal" // Briefly shows the eliminated player's role before continuing
  | "revenger_pick"      // Optional: Revenger picks a target before leaving
  | "mr_white_guess"     // Optional: Eliminated Mr. White guesses the Civilian word
  | "game_over";         // Win condition met; scores and roles revealed

// ─── Word Deck ────────────────────────────────────────────────────────────────

export interface WordDeck {
  available: WordPair[];
  used: WordPair[];
  reshuffled: boolean; // true if deck was reset due to exhaustion
}

// ─── Round Scores ─────────────────────────────────────────────────────────────

export interface RoundScore {
  playerId: string;
  playerName: string;
  roundPoints: number;
  totalScore: number;
  breakdown: string[];
}

// ─── Full Match State ─────────────────────────────────────────────────────────

export interface UndercoverState {
  matchId: string;
  mode: "online" | "offline";
  creatorId: string;

  settings: MatchSettings;

  players: UndercoverPlayer[];

  /** Randomized turn order for the current round (player IDs) */
  turnOrder: string[];

  phase: UndercoverPhase;
  roundNumber: number;

  // Word state
  wordDeck: WordDeck;
  currentWordPair: WordPair | null;
  civilianWord: string | null;
  undercoverWord: string | null;

  // Card reveal phase
  cardsRevealed: string[];      // player IDs who have confirmed (hidden) their card
  cardRevealIndex: number;       // offline: index into turnOrder of current revealer

  // Clue phase
  clues: Clue[];
  currentClueIndex: number;      // index into turnOrder

  // Voting phase (online)
  votes: Record<string, string>; // voterId → targetId (finalized votes)
  currentVoterIndex: number;     // index into turnOrder

  // Vote result
  voteResult: VoteResult | null;

  // Judge tie-break: living Judge ID who must cast an extra vote among tied leaders.
  // Null when not awaiting a Judge decision. Do not expose this ID in player views.
  pendingJudgeDecision: string | null;

  // Elimination
  pendingElimination: string | null;   // targetId awaiting creator confirmation
  eliminatedThisRound: string[];       // player IDs eliminated in this round's chain
  pendingRevenger: string | null;      // revenger player ID who must pick a target

  // Elimination reveal (shown after each elimination before continuing)
  eliminationReveal: Array<{
    id: string;
    name: string;
    faction: Faction;
    word: string | null;
    specialCharacters: SpecialCharacter[];
  }> | null;

  // Mr. White guess
  pendingMrWhiteGuess: string | null;  // mr white player ID who must guess

  // Round scores (shown in round_result phase)
  roundScores: RoundScore[];

  // Events log
  events: GameEvent[];

  // Win condition (set when game is over)
  winCondition: WinResult | null;

  // RNG seed
  seed: string;
}
