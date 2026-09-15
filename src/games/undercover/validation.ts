/**
 * Undercover — action validation (simplified).
 */

import type { ValidationResult } from "@/game/core/types";
import type { UndercoverState } from "./types";
import type { UndercoverAction } from "./actions";
import { getLivingPlayers, getVoterOrder, isEligibleVoter } from "./engine/roles";

export function validateAction(
  state: UndercoverState,
  action: UndercoverAction
): ValidationResult {
  switch (action.type) {
    case "START_GAME":
      return state.phase === "lobby"
        ? { valid: true }
        : { valid: false, reason: "Game has already started." };

    case "REVEAL_CARD":
    case "HIDE_CARD": {
      if (state.phase !== "card_reveal") {
        return { valid: false, reason: "Not in the card reveal phase." };
      }
      if (action.type === "HIDE_CARD" && state.cardsRevealed.includes(action.playerId)) {
        return { valid: false, reason: "You have already confirmed your card." };
      }
      const living = getLivingPlayers(state.players);
      const expectedPlayer = state.turnOrder.filter((id) =>
        living.some((p) => p.id === id)
      )[state.cardRevealIndex];
      if (state.mode === "offline" && action.playerId !== expectedPlayer) {
        return { valid: false, reason: "It is not your turn to reveal." };
      }
      return { valid: true };
    }

    case "SUBMIT_CLUE": {
      if (state.phase !== "clue_phase") {
        return { valid: false, reason: "Not in the clue phase." };
      }
      const living = getLivingPlayers(state.players);
      const activeTurnOrder = state.turnOrder.filter((id) =>
        living.some((p) => p.id === id)
      );
      const expectedPlayerId = activeTurnOrder[state.currentClueIndex];
      if (action.playerId !== expectedPlayerId) {
        return { valid: false, reason: "It is not your turn to give a clue." };
      }
      if (!action.clue.trim()) {
        return { valid: false, reason: "Clue cannot be empty." };
      }
      return { valid: true };
    }

    case "SUBMIT_VOTE": {
      if (state.phase !== "voting") {
        return { valid: false, reason: "Not in the voting phase." };
      }
      // Can't vote once pendingElimination is set (all votes in) or Judge is breaking a tie
      if (state.pendingElimination || state.pendingJudgeDecision) {
        return { valid: false, reason: "Voting is already complete." };
      }
      if (action.voterId === action.targetId) {
        return { valid: false, reason: "You cannot vote for yourself." };
      }
      if (state.votes[action.voterId] !== undefined) {
        return { valid: false, reason: "You have already voted." };
      }
      const ghostEnabled = state.settings.specialCharacters.ghost;
      const voter = state.players.find((p) => p.id === action.voterId);
      if (!isEligibleVoter(voter, ghostEnabled)) {
        return { valid: false, reason: "Eliminated players cannot vote unless they are a Ghost." };
      }
      const targetPlayer = state.players.find((p) => p.id === action.targetId);
      if (!targetPlayer || targetPlayer.isEliminated) {
        return { valid: false, reason: "Invalid vote target." };
      }
      if (state.mode === "online") {
        const voterOrder = getVoterOrder(state.players, state.turnOrder, ghostEnabled);
        if (voterOrder[state.currentVoterIndex] !== action.voterId) {
          return { valid: false, reason: "It is not your turn to vote." };
        }
      }
      return { valid: true };
    }

    case "JUDGE_DECISION": {
      if (state.phase !== "voting" || !state.pendingJudgeDecision) {
        return { valid: false, reason: "The Judge is not breaking a tie." };
      }
      if (state.pendingJudgeDecision !== action.judgeId) {
        return { valid: false, reason: "You are not the Judge." };
      }
      if (!state.voteResult?.leaders.includes(action.targetId)) {
        return { valid: false, reason: "The Judge must choose a tied player." };
      }
      const target = state.players.find((p) => p.id === action.targetId);
      if (!target || target.isEliminated) {
        return { valid: false, reason: "Invalid target." };
      }
      return { valid: true };
    }

    case "ADMIN_ELIMINATE": {
      if (state.mode !== "offline") {
        return { valid: false, reason: "Admin elimination is only available in offline mode." };
      }
      if (state.phase !== "voting") {
        return { valid: false, reason: "Cannot eliminate at this time." };
      }
      const target = state.players.find((p) => p.id === action.targetId);
      if (!target || target.isEliminated) {
        return { valid: false, reason: "Invalid target." };
      }
      return { valid: true };
    }

    case "CONFIRM_ELIMINATION": {
      if (state.phase !== "voting" || !state.pendingElimination) {
        return { valid: false, reason: "No elimination pending to confirm." };
      }
      return { valid: true };
    }

    case "REQUEST_REVOTE": {
      if (
        state.phase !== "voting" ||
        (!state.pendingElimination && !state.pendingJudgeDecision)
      ) {
        return { valid: false, reason: "No completed vote to redo." };
      }
      return { valid: true };
    }

    case "CONTINUE_AFTER_REVEAL":
      return state.phase === "elimination_reveal"
        ? { valid: true }
        : { valid: false, reason: "Not in the elimination reveal phase." };

    case "REVENGER_TARGET": {
      if (state.phase !== "revenger_pick") {
        return { valid: false, reason: "Revenger is not picking a target." };
      }
      if (state.pendingRevenger !== action.revengerId) {
        return { valid: false, reason: "You are not the Revenger." };
      }
      if (action.revengerId === action.targetId) {
        return { valid: false, reason: "The Revenger cannot target themselves." };
      }
      const target = state.players.find((p) => p.id === action.targetId);
      if (!target || target.isEliminated) {
        return { valid: false, reason: "Invalid target." };
      }
      return { valid: true };
    }

    case "SUBMIT_MR_WHITE_GUESS": {
      if (state.phase !== "mr_white_guess") {
        return { valid: false, reason: "Not in Mr. White guess phase." };
      }
      if (state.pendingMrWhiteGuess !== action.playerId) {
        return { valid: false, reason: "You are not Mr. White." };
      }
      if (!action.guess.trim()) {
        return { valid: false, reason: "Guess cannot be empty." };
      }
      return { valid: true };
    }

    case "END_GAME":
      return { valid: true };

    default:
      return { valid: false, reason: "Unknown action." };
  }
}
