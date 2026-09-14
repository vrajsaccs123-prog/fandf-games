/**
 * Blackjack — Action validation and available actions.
 */

import type { BlackjackState } from "./state";
import type { BlackjackAction } from "./actions";
import { MINIMUM_BET } from "./state";
import type { ValidationResult } from "@/game/core/types";

export function validateAction(
  state: BlackjackState,
  action: BlackjackAction
): ValidationResult {
  switch (action.type) {
    case "PLACE_BET": {
      if (state.phase !== "betting")
        return { valid: false, reason: "Not in betting phase." };

      const player = state.players.find((p) => p.id === action.playerId);
      if (!player) return { valid: false, reason: "Player not found." };
      if (player.status === "eliminated")
        return { valid: false, reason: "Player is eliminated." };

      if (!Number.isInteger(action.amount) || action.amount < MINIMUM_BET)
        return {
          valid: false,
          reason: `Minimum bet is ${MINIMUM_BET} chips.`,
        };
      if (action.amount > player.chips)
        return { valid: false, reason: "Insufficient chips." };

      return { valid: true };
    }

    case "START_ROUND": {
      if (state.phase !== "betting")
        return { valid: false, reason: "Not in betting phase." };

      const unbetPlayers = state.players.filter(
        (p) => p.status !== "eliminated" && p.bet === 0
      );
      if (unbetPlayers.length > 0)
        return {
          valid: false,
          reason: "All active players must place a bet first.",
        };

      return { valid: true };
    }

    case "HIT": {
      if (state.phase !== "playing")
        return { valid: false, reason: "Not in playing phase." };

      const player = state.players.find((p) => p.id === action.playerId);
      if (!player) return { valid: false, reason: "Player not found." };
      if (player.status !== "playing")
        return { valid: false, reason: "It is not your turn." };

      return { valid: true };
    }

    case "STAND": {
      if (state.phase !== "playing")
        return { valid: false, reason: "Not in playing phase." };

      const player = state.players.find((p) => p.id === action.playerId);
      if (!player) return { valid: false, reason: "Player not found." };
      if (player.status !== "playing")
        return { valid: false, reason: "It is not your turn." };

      return { valid: true };
    }

    case "DOUBLE_DOWN": {
      if (state.phase !== "playing")
        return { valid: false, reason: "Not in playing phase." };

      const player = state.players.find((p) => p.id === action.playerId);
      if (!player) return { valid: false, reason: "Player not found." };
      if (player.status !== "playing")
        return { valid: false, reason: "It is not your turn." };
      if (player.hand.length !== 2)
        return {
          valid: false,
          reason: "Double down is only available on your first two cards.",
        };
      if (player.chips < player.bet * 2)
        return {
          valid: false,
          reason: "Insufficient chips to double down.",
        };

      return { valid: true };
    }

    case "NEXT_ROUND": {
      if (state.phase !== "round-over")
        return { valid: false, reason: "Round is not over yet." };
      return { valid: true };
    }

    default:
      return { valid: false, reason: "Unknown action." };
  }
}

export function getAvailableActions(
  state: BlackjackState,
  playerId: string
): BlackjackAction[] {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return [];

  const actions: BlackjackAction[] = [];

  if (state.phase === "betting" && player.status === "betting") {
    // Provide a default bet suggestion
    actions.push({ type: "PLACE_BET", playerId, amount: MINIMUM_BET });
  }

  if (
    state.phase === "betting" &&
    state.players
      .filter((p) => p.status !== "eliminated")
      .every((p) => p.bet > 0 || p.status === "waiting")
  ) {
    actions.push({ type: "START_ROUND" });
  }

  if (state.phase === "playing" && player.status === "playing") {
    actions.push({ type: "HIT", playerId });
    actions.push({ type: "STAND", playerId });
    if (player.hand.length === 2 && player.chips >= player.bet * 2) {
      actions.push({ type: "DOUBLE_DOWN", playerId });
    }
  }

  if (state.phase === "round-over") {
    actions.push({ type: "NEXT_ROUND" });
  }

  return actions;
}
