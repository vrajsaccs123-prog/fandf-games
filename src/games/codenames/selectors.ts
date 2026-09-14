/**
 * Codenames — player views & available actions.
 *
 * getPlayerView strips hidden information so operatives cannot see card types.
 * Spymasters always see the full board.
 */

import type { CodenamesState, WordCard } from "./types";
import type { CodenamesAction } from "./actions";

// ─── Player View ──────────────────────────────────────────────────────────────

/** The card as seen by an operative (type hidden unless revealed) */
export interface OperativeCard extends Omit<WordCard, "type"> {
  /** Only present after the card is revealed */
  type: WordCard["type"] | null;
}

export interface CodenamesPlayerView {
  phase: CodenamesState["phase"];
  /** The board — for spymasters all types visible; for operatives only revealed cards */
  words: OperativeCard[];
  /** Whether this player is a spymaster (sees all card types) */
  isSpymaster: boolean;
  players: CodenamesState["players"];
  teams: CodenamesState["teams"];
  startingTeam: CodenamesState["startingTeam"];
  currentTeam: CodenamesState["currentTeam"];
  turn: CodenamesState["turn"];
  currentClue: CodenamesState["currentClue"];
  guessesRemaining: CodenamesState["guessesRemaining"];
  clueHistory: CodenamesState["clueHistory"];
  winner: CodenamesState["winner"];
  winReason: CodenamesState["winReason"];
  /** The viewer's player record */
  me: CodenamesState["players"][number] | null;
}

export function getPlayerView(
  state: CodenamesState,
  playerId: string
): CodenamesPlayerView {
  const me = state.players.find((p) => p.id === playerId) ?? null;
  const isSpymaster = me?.isSpymaster ?? false;

  const words: OperativeCard[] = state.words.map((card) => ({
    id: card.id,
    word: card.word,
    // Spymasters always see the type; operatives only see it after reveal
    type: isSpymaster || card.revealed ? card.type : null,
    revealed: card.revealed,
    revealedByTeam: card.revealedByTeam,
  }));

  return {
    phase: state.phase,
    words,
    isSpymaster,
    me,
    players: state.players,
    teams: state.teams,
    startingTeam: state.startingTeam,
    currentTeam: state.currentTeam,
    turn: state.turn,
    currentClue: state.currentClue,
    guessesRemaining: state.guessesRemaining,
    clueHistory: state.clueHistory,
    winner: state.winner,
    winReason: state.winReason,
  };
}

// ─── Available Actions ────────────────────────────────────────────────────────

export function getAvailableActions(
  state: CodenamesState,
  playerId: string
): CodenamesAction[] {
  if (state.phase === "game_over") return [];

  const player = state.players.find((p) => p.id === playerId);
  if (!player || player.team !== state.currentTeam) return [];

  if (state.phase === "giving_clue" && player.isSpymaster) {
    // Spymaster can give any clue — actions are free-form, so we return a placeholder
    return [{ type: "GIVE_CLUE", playerId, clueWord: "", count: 1 }];
  }

  if (state.phase === "guessing" && !player.isSpymaster) {
    const guessActions: CodenamesAction[] = state.words
      .filter((w) => !w.revealed)
      .map((w) => ({ type: "GUESS_CARD", playerId, cardId: w.id }));

    return [...guessActions, { type: "END_TURN", playerId }];
  }

  return [];
}

// ─── Game Status ──────────────────────────────────────────────────────────────

export function getStatus(state: CodenamesState) {
  if (state.phase === "game_over") {
    return {
      phase: "finished" as const,
      result: {
        winners: state.winner
          ? state.players
              .filter((p) => p.team === state.winner)
              .map((p) => p.id)
          : [],
        summary: state.winReason ?? "Game over",
      },
    };
  }

  return { phase: "playing" as const };
}
