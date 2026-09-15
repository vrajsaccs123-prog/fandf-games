/**
 * Undercover — initial state factory.
 *
 * Creates the starting UndercoverState for a new match from a GameConfig.
 * Roles are assigned once and remain fixed throughout the match.
 */

import { createRng } from "@/game/core/random";
import type { GameConfig } from "@/game/core/types";
import type { MatchSettings, UndercoverState, WordDifficulty } from "./types";
import { assignRoles, buildPlayers } from "./engine/roles";
import { createWordDeck, pickWordPair, randomizeWordDirection } from "./engine/wordQueue";

// ─── Factory ──────────────────────────────────────────────────────────────────

export function createInitialState(
  config: GameConfig,
  seed?: string
): UndercoverState {
  const resolvedSeed = seed ?? `undercover-${Date.now()}`;
  const rng = createRng(resolvedSeed);

  // Extract options (from lobby setup)
  const options = config.options as Partial<{
    mode: "online" | "offline";
    civilians: number;
    undercovers: number;
    mrWhites: number;
    difficulty: WordDifficulty;
    specialCharacters: MatchSettings["specialCharacters"];
  }> | undefined;

  const civilians = options?.civilians ?? Math.max(Math.floor(config.players.length * 0.6), 2);
  const undercovers = options?.undercovers ?? Math.max(Math.floor(config.players.length * 0.25), 1);
  const mrWhites = config.players.length - civilians - undercovers;
  const difficulty: WordDifficulty = options?.difficulty ?? "easy";
  const mode = options?.mode ?? "offline";

  const specialCharacters: MatchSettings["specialCharacters"] = options?.specialCharacters ?? {
    judge: false,
    joyFool: false,
    ghost: false,
    lovers: false,
    revenger: false,
    duelists: false,
  };

  const settings: MatchSettings = {
    totalPlayers: config.players.length,
    civilians,
    undercovers,
    mrWhites,
    difficulty,
    specialCharacters,
  };

  // Assign roles
  const roleAssignments = assignRoles(
    config.players,
    civilians,
    undercovers,
    mrWhites,
    specialCharacters,
    resolvedSeed + "-roles"
  );

  const players = buildPlayers(config.players, roleAssignments);

  // Create word deck
  const wordDeck = createWordDeck(resolvedSeed);

  // Pick first word pair
  const pickResult = pickWordPair(wordDeck, difficulty, resolvedSeed + "-round-1");
  const wordDirection = randomizeWordDirection(pickResult.pair, resolvedSeed, 1);

  // Generate turn order (randomized)
  const shuffledIds = rng.shuffle(config.players.map((p) => p.id)) as string[];

  // Build initial scores
  const scores: Record<string, { round: number; total: number }> = {};
  for (const p of config.players) {
    scores[p.id] = { round: 0, total: 0 };
  }

  return {
    matchId: `match-${resolvedSeed.slice(0, 8)}`,
    mode,
    creatorId: config.players[0]?.id ?? "",

    settings,
    players,
    turnOrder: shuffledIds,

    phase: "card_reveal",
    roundNumber: 1,

    wordDeck: pickResult.deck,
    currentWordPair: pickResult.pair,
    civilianWord: wordDirection.civilianWord,
    undercoverWord: wordDirection.undercoverWord,

    // Card reveal
    cardsRevealed: [],
    cardRevealIndex: 0,

    // Clue phase
    clues: [],
    currentClueIndex: 0,

    // Voting
    votes: {},
    currentVoterIndex: 0,

    // Vote result / elimination
    voteResult: null,
    pendingJudgeDecision: null,
    pendingElimination: null,
    eliminatedThisRound: [],
    pendingRevenger: null,
    eliminationReveal: null,

    // Mr. White
    pendingMrWhiteGuess: null,

    // Round scores
    roundScores: [],

    // Events
    events: [
      {
        type: "GAME_STARTED",
        payload: { matchId: `match-${resolvedSeed.slice(0, 8)}` },
        roundNumber: 1,
        timestamp: Date.now(),
      },
    ],

    winCondition: null,
    seed: resolvedSeed,
  };
}

// ─── Round reset helper ────────────────────────────────────────────────────────

/**
 * Set up a new round on the same match state.
 * Roles remain fixed. A new word pair is chosen. Turn order is re-randomized.
 */
export function advanceToNextRound(state: UndercoverState): UndercoverState {
  const newRound = state.roundNumber + 1;
  const rng = createRng(state.seed + "-round-" + newRound);

  // Re-randomize turn order among living players
  const livingIds = state.players
    .filter((p) => !p.isEliminated)
    .map((p) => p.id);
  const shuffledIds = rng.shuffle(livingIds) as string[];

  // Pick next word pair
  const pickResult = pickWordPair(
    state.wordDeck,
    state.settings.difficulty,
    state.seed + "-round-" + newRound
  );
  const wordDirection = randomizeWordDirection(pickResult.pair, state.seed, newRound);

  // Deactivate Joy Fool after Round 1
  const updatedPlayers = state.players.map((p) => {
    if (p.specialCharacters.includes("joy_fool") && p.joyFoolActive && !p.isEliminated) {
      // Joy Fool survived Round 1 — deactivate
      if (newRound === 2) {
        return { ...p, joyFoolActive: false };
      }
    }
    return p;
  });

  return {
    ...state,
    roundNumber: newRound,
    phase: "card_reveal",
    turnOrder: shuffledIds,
    currentClueIndex: 0,
    currentVoterIndex: 0,
    currentWordPair: pickResult.pair,
    wordDeck: pickResult.deck,
    civilianWord: wordDirection.civilianWord,
    undercoverWord: wordDirection.undercoverWord,
    clues: [],
    votes: {},
    voteResult: null,
    pendingJudgeDecision: null,
    pendingElimination: null,
    eliminatedThisRound: [],
    pendingRevenger: null,
    pendingMrWhiteGuess: null,
    eliminationReveal: null,
    cardsRevealed: [],
    cardRevealIndex: 0,
    roundScores: [],
    players: updatedPlayers,
    events: [
      ...state.events,
      {
        type: "ROUND_STARTED",
        payload: { roundNumber: newRound },
        roundNumber: newRound,
        timestamp: Date.now(),
      },
    ],
  };
}
