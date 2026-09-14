/**
 * Codenames — pure game reducer.
 *
 * Phase flow:
 *   giving_clue  →  guessing  →  giving_clue (other team)
 *                              ↘  game_over (assassin / all found)
 */

import type { CodenamesState, Team, WordCard } from "./types";
import type { CodenamesAction } from "./actions";

// ─── Reducer ──────────────────────────────────────────────────────────────────

export function reduce(
  state: CodenamesState,
  action: CodenamesAction
): CodenamesState {
  switch (action.type) {
    case "GIVE_CLUE":
      return handleGiveClue(state, action.playerId, action.clueWord, action.count);
    case "GUESS_CARD":
      return handleGuessCard(state, action.playerId, action.cardId);
    case "END_TURN":
      return handleEndTurn(state);
    default:
      return state;
  }
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

function handleGiveClue(
  state: CodenamesState,
  playerId: string,
  clueWord: string,
  count: number
): CodenamesState {
  if (state.phase !== "giving_clue") return state;

  const player = state.players.find((p) => p.id === playerId);
  if (!player || !player.isSpymaster || player.team !== state.currentTeam) {
    return state;
  }

  const trimmedClue = clueWord.trim().toUpperCase();
  if (!trimmedClue) return state;

  // count 0 = unlimited (UI shows ∞), capped to 99 internally
  const guessesRemaining = count === 0 ? 99 : count + 1;

  const clueEntry = {
    team: state.currentTeam,
    word: trimmedClue,
    count,
    turn: state.turn,
  };

  return {
    ...state,
    phase: "guessing",
    currentClue: { word: trimmedClue, count },
    guessesRemaining,
    clueHistory: [...state.clueHistory, clueEntry],
    events: [
      ...state.events,
      {
        type: "CLUE_GIVEN",
        payload: { team: state.currentTeam, clue: trimmedClue, count, playerId },
        turn: state.turn,
        timestamp: Date.now(),
      },
    ],
  };
}

function handleGuessCard(
  state: CodenamesState,
  playerId: string,
  cardId: number
): CodenamesState {
  if (state.phase !== "guessing") return state;

  const player = state.players.find((p) => p.id === playerId);
  if (!player || player.team !== state.currentTeam || player.isSpymaster) {
    return state;
  }

  const card = state.words.find((w) => w.id === cardId);
  if (!card || card.revealed) return state;

  // Reveal the card
  const updatedWords: WordCard[] = state.words.map((w) =>
    w.id === cardId ? { ...w, revealed: true, revealedByTeam: state.currentTeam } : w
  );

  const baseState: CodenamesState = {
    ...state,
    words: updatedWords,
    events: [
      ...state.events,
      {
        type: "CARD_REVEALED",
        payload: { cardId, word: card.word, cardType: card.type, team: state.currentTeam, playerId },
        turn: state.turn,
        timestamp: Date.now(),
      },
    ],
  };

  // ── Assassin: immediate loss ───────────────────────────────────────────────
  if (card.type === "assassin") {
    const winner: Team = state.currentTeam === "red" ? "blue" : "red";
    return {
      ...baseState,
      phase: "game_over",
      winner,
      winReason: `${capitalize(state.currentTeam)} team hit the Assassin — ${capitalize(winner)} wins!`,
      events: [
        ...baseState.events,
        {
          type: "ASSASSIN_HIT",
          payload: { team: state.currentTeam, winner },
          turn: state.turn,
          timestamp: Date.now(),
        },
      ],
    };
  }

  // ── Correct team card ──────────────────────────────────────────────────────
  if (card.type === state.currentTeam) {
    const newRemaining = state.teams[state.currentTeam].remaining - 1;
    const updatedTeams = {
      ...state.teams,
      [state.currentTeam]: { ...state.teams[state.currentTeam], remaining: newRemaining },
    };

    // Win condition: all of this team's cards revealed
    if (newRemaining <= 0) {
      return {
        ...baseState,
        teams: updatedTeams,
        phase: "game_over",
        winner: state.currentTeam,
        winReason: `${capitalize(state.currentTeam)} team found all their agents — they win!`,
        events: [
          ...baseState.events,
          {
            type: "GAME_WON",
            payload: { winner: state.currentTeam, reason: "all_found" },
            turn: state.turn,
            timestamp: Date.now(),
          },
        ],
      };
    }

    // Decrement guesses
    const newGuessesRemaining = state.guessesRemaining - 1;
    if (newGuessesRemaining <= 0) {
      return switchTeam({ ...baseState, teams: updatedTeams });
    }

    return {
      ...baseState,
      teams: updatedTeams,
      guessesRemaining: newGuessesRemaining,
    };
  }

  // ── Opponent's card ────────────────────────────────────────────────────────
  if (card.type === "red" || card.type === "blue") {
    const hitTeam = card.type;
    const newRemaining = state.teams[hitTeam].remaining - 1;
    const updatedTeams = {
      ...state.teams,
      [hitTeam]: { ...state.teams[hitTeam], remaining: newRemaining },
    };

    // That team might win early if it was their last card!
    if (newRemaining <= 0) {
      return {
        ...baseState,
        teams: updatedTeams,
        phase: "game_over",
        winner: hitTeam,
        winReason: `${capitalize(state.currentTeam)} team accidentally found all of ${capitalize(hitTeam)}'s agents — ${capitalize(hitTeam)} wins!`,
        events: [
          ...baseState.events,
          {
            type: "GAME_WON",
            payload: { winner: hitTeam, reason: "opponent_completed" },
            turn: state.turn,
            timestamp: Date.now(),
          },
        ],
      };
    }

    // End turn — opponent card ends the turn
    return switchTeam({ ...baseState, teams: updatedTeams });
  }

  // ── Neutral card ───────────────────────────────────────────────────────────
  return switchTeam(baseState);
}

function handleEndTurn(state: CodenamesState): CodenamesState {
  if (state.phase !== "guessing") return state;
  return switchTeam(state);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function switchTeam(state: CodenamesState): CodenamesState {
  const nextTeam: Team = state.currentTeam === "red" ? "blue" : "red";
  return {
    ...state,
    phase: "giving_clue",
    currentTeam: nextTeam,
    turn: state.turn + 1,
    currentClue: null,
    guessesRemaining: 0,
    events: [
      ...state.events,
      {
        type: "TURN_SWITCHED",
        payload: { from: state.currentTeam, to: nextTeam, newTurn: state.turn + 1 },
        turn: state.turn + 1,
        timestamp: Date.now(),
      },
    ],
  };
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
