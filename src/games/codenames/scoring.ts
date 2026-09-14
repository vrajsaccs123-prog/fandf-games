/**
 * Codenames — scoring.
 *
 * Codenames doesn't have individual point scores — teams win or lose.
 * This module produces the result summary.
 */

import type { CodenamesState } from "./types";

export interface CodenamesResult {
  winnerTeam: "red" | "blue" | null;
  reason: string | null;
  redRemaining: number;
  blueRemaining: number;
}

export function getResult(state: CodenamesState): CodenamesResult {
  return {
    winnerTeam: state.winner,
    reason: state.winReason,
    redRemaining: state.teams.red.remaining,
    blueRemaining: state.teams.blue.remaining,
  };
}
