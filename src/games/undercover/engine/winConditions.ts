/**
 * Undercover — win condition checks.
 *
 * Called after every elimination chain completes.
 * Returns the winning condition if one has been met, or null to continue.
 */

import type { UndercoverPlayer, WinResult } from "../types";
import { getLivingPlayers, getLivingByFaction } from "./roles";

// ─── Win condition check ───────────────────────────────────────────────────────

/**
 * Check win conditions after every elimination.
 *
 * Rules:
 * - Undercover victory: livingUndercovers >= livingCivilians (Mr. Whites don't count
 *   as Civilians). This includes the "only 1 Civilian remains with Undercovers" case.
 * - Mr. White victory: only 1 Civilian remains (or none) and no Undercovers are left.
 * - Civilian victory: All Undercovers AND all Mr. Whites are eliminated.
 * - Mr. White may also win separately via a correct word guess (handled in the reducer).
 */
export function checkWinConditions(
  players: UndercoverPlayer[]
): WinResult | null {
  const livingCivilians = getLivingByFaction(players, "civilian");
  const livingUndercovers = getLivingByFaction(players, "undercover");
  const livingMrWhites = getLivingByFaction(players, "mr_white");
  const living = getLivingPlayers(players);

  // ── Undercover victory ────────────────────────────────────────────────────
  // Undercovers win when their count >= living civilians (e.g. 1 Civilian left with them)
  if (livingUndercovers.length > 0 && livingUndercovers.length >= livingCivilians.length) {
    return {
      faction: "undercover",
      winnerIds: livingUndercovers.map((p) => p.id),
      summary:
        livingCivilians.length <= 1
          ? `Undercovers win! Only ${livingCivilians.length === 1 ? "one Civilian remains" : "no Civilians remain"}.`
          : `Undercovers win! They outnumbered the Civilians ${livingUndercovers.length} to ${livingCivilians.length}.`,
    };
  }

  // ── Mr. White victory ─────────────────────────────────────────────────────
  // Only one Civilian remains (or none) with Mr. White and no Undercovers left
  if (
    livingUndercovers.length === 0 &&
    livingMrWhites.length > 0 &&
    livingCivilians.length <= 1
  ) {
    return {
      faction: "mr_white",
      winnerIds: livingMrWhites.map((p) => p.id),
      summary:
        livingCivilians.length === 1
          ? "Mr. White wins! Only one Civilian remains."
          : "Mr. White wins! No Civilians or Undercovers remain.",
    };
  }

  // ── Civilian victory ───────────────────────────────────────────────────────
  // All undercovers and all Mr. Whites eliminated
  if (livingUndercovers.length === 0 && livingMrWhites.length === 0) {
    return {
      faction: "civilian",
      winnerIds: livingCivilians.map((p) => p.id),
      summary: "Civilians win! All Undercovers and Mr. Whites have been eliminated.",
    };
  }

  // ── No winner yet ─────────────────────────────────────────────────────────
  // Edge case: no one living (shouldn't happen in normal play)
  if (living.length === 0) {
    return {
      faction: "civilian",
      winnerIds: [],
      summary: "No survivors — Civilians win by default.",
    };
  }

  return null;
}

/**
 * Check if Mr. White wins by surviving to the end.
 * Called when the game ends for another reason (e.g., Civilians win) but
 * Mr. White is still alive.
 */
export function checkMrWhiteSurvival(
  players: UndercoverPlayer[]
): string[] {
  return getLivingByFaction(players, "mr_white").map((p) => p.id);
}
