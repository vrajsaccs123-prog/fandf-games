/**
 * Codenames — action validation.
 */

import type { ValidationResult } from "@/game/core/types";
import type { CodenamesState } from "./types";
import type { CodenamesAction } from "./actions";
import { isTimerElapsed } from "./timer";

export function validateAction(
  state: CodenamesState,
  action: CodenamesAction
): ValidationResult {
  switch (action.type) {
    case "GIVE_CLUE":
      return validateGiveClue(state, action.playerId, action.clueWord, action.count);
    case "GUESS_CARD":
      return validateGuessCard(state, action.playerId, action.cardId);
    case "END_TURN":
      return validateEndTurn(state, action.playerId);
    case "TIMER_EXPIRED":
      return validateTimerExpired(state);
    default:
      return { valid: false, reason: "Unknown action" };
  }
}

function validateGiveClue(
  state: CodenamesState,
  playerId: string,
  clueWord: string,
  count: number
): ValidationResult {
  if (state.phase !== "giving_clue") {
    return { valid: false, reason: "Not the clue-giving phase" };
  }
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return { valid: false, reason: "Player not found" };
  if (!player.isSpymaster) return { valid: false, reason: "Only the Spymaster can give clues" };
  if (player.team !== state.currentTeam) {
    return { valid: false, reason: "It is not your team's turn" };
  }
  const trimmed = clueWord.trim();
  if (!trimmed) return { valid: false, reason: "Clue word cannot be empty" };
  if (trimmed.includes(" ")) return { valid: false, reason: "Clue must be a single word" };
  if (count < 0) return { valid: false, reason: "Count cannot be negative" };
  return { valid: true };
}

function validateGuessCard(
  state: CodenamesState,
  playerId: string,
  cardId: number
): ValidationResult {
  if (state.phase !== "guessing") {
    return { valid: false, reason: "Not the guessing phase" };
  }
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return { valid: false, reason: "Player not found" };
  if (player.isSpymaster) return { valid: false, reason: "Spymasters cannot guess" };
  if (player.team !== state.currentTeam) {
    return { valid: false, reason: "It is not your team's turn" };
  }
  const card = state.words.find((w) => w.id === cardId);
  if (!card) return { valid: false, reason: "Card not found" };
  if (card.revealed) return { valid: false, reason: "Card is already revealed" };
  return { valid: true };
}

function validateEndTurn(
  state: CodenamesState,
  playerId: string
): ValidationResult {
  if (state.phase !== "guessing") {
    return { valid: false, reason: "No active guessing turn to end" };
  }
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return { valid: false, reason: "Player not found" };
  if (player.isSpymaster) return { valid: false, reason: "Spymasters cannot end the turn" };
  if (player.team !== state.currentTeam) {
    return { valid: false, reason: "It is not your team's turn" };
  }
  return { valid: true };
}

function validateTimerExpired(state: CodenamesState): ValidationResult {
  if (state.phase !== "giving_clue" && state.phase !== "guessing") {
    return { valid: false, reason: "No active timed round" };
  }
  if (state.timerSeconds == null || state.phaseStartedAt == null) {
    return { valid: false, reason: "Timer is not enabled" };
  }
  if (!isTimerElapsed(state)) {
    return { valid: false, reason: "Timer has not elapsed" };
  }
  return { valid: true };
}
