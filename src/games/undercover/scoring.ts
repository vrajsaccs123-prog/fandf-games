/**
 * Undercover — scoring system.
 *
 * Scores persist across rounds within a match.
 * After every elimination/round, calculate points and add to cumulative totals.
 *
 * Standard faction points:
 *  - Civilian win: +2 each surviving Civilian
 *  - Undercover win: 10 total ÷ number of winning Undercovers
 *  - Mr. White win (correct guess, or only one Civilian remaining): +6
 *
 * Special modifiers:
 *  - Joy Fool eliminated in Round 1: +4
 *  - Duelist first eliminated: -2
 *  - Duelist survivor: +2
 */

import type { UndercoverPlayer, WinResult, RoundScore } from "./types";
import { getLivingByFaction } from "./engine/roles";

// ─── Score calculation ────────────────────────────────────────────────────────

export interface ScoreResult {
  players: UndercoverPlayer[];
  roundScores: RoundScore[];
}

/**
 * Calculate and apply round scores after a win condition is reached.
 *
 * @param players - The current player list (with elimination states).
 * @param winCondition - The win condition that was just triggered.
 * @param mrWhiteWinnerIds - Mr. Whites who won (guessed correctly or survived).
 * @param roundNumber - Current round number (used for Joy Fool check).
 */
export function applyRoundScores(
  players: UndercoverPlayer[],
  winCondition: WinResult,
  mrWhiteWinnerIds: string[],
  roundNumber: number
): ScoreResult {
  const livingCivilians = getLivingByFaction(players, "civilian");
  const livingUndercovers = getLivingByFaction(players, "undercover");

  const undercoverPoints =
    livingUndercovers.length > 0 ? 10 / livingUndercovers.length : 0;

  const roundScores: RoundScore[] = [];

  const updatedPlayers = players.map((player) => {
    let roundPoints = 0;
    const breakdown: string[] = [];

    // ── Faction points ────────────────────────────────────────────────────
    if (winCondition.faction === "civilian") {
      if (
        player.faction === "civilian" &&
        livingCivilians.some((p) => p.id === player.id)
      ) {
        roundPoints += 2;
        breakdown.push("+2 Civilian win");
      }
    }

    if (winCondition.faction === "undercover") {
      if (
        player.faction === "undercover" &&
        livingUndercovers.some((p) => p.id === player.id)
      ) {
        const pts = parseFloat(undercoverPoints.toFixed(2));
        roundPoints += pts;
        breakdown.push(`+${pts} Undercover win`);
      }
    }

    // ── Mr. White win points ───────────────────────────────────────────────
    if (mrWhiteWinnerIds.includes(player.id)) {
      roundPoints += 6;
      breakdown.push("+6 Mr. White win");
    }

    // ── Joy Fool bonus ─────────────────────────────────────────────────────
    if (
      player.specialCharacters.includes("joy_fool") &&
      player.joyFoolActive &&
      player.isEliminated &&
      player.eliminationRound === 1 &&
      roundNumber === 1
    ) {
      roundPoints += 4;
      breakdown.push("+4 Joy Fool");
    }

    // ── Duelist scoring ────────────────────────────────────────────────────
    if (player.specialCharacters.includes("duelist")) {
      if (player.duelistStatus === "first_eliminated") {
        roundPoints -= 2;
        breakdown.push("-2 Duelist (eliminated first)");
      } else if (player.duelistStatus === "survivor") {
        roundPoints += 2;
        breakdown.push("+2 Duelist (survived rival)");
      }
      // simultaneous = no change
    }

    const newTotal = parseFloat((player.totalScore + roundPoints).toFixed(2));

    roundScores.push({
      playerId: player.id,
      playerName: player.name,
      roundPoints: parseFloat(roundPoints.toFixed(2)),
      totalScore: newTotal,
      breakdown,
    });

    return {
      ...player,
      totalScore: newTotal,
    };
  });

  // Sort round scores by total desc
  roundScores.sort((a, b) => b.totalScore - a.totalScore);

  return { players: updatedPlayers, roundScores };
}

/**
 * Apply a Joy Fool bonus in isolation (when Joy Fool is voted out in Round 1
 * before the main win condition scoring runs).
 */
export function applyJoyFoolBonus(
  players: UndercoverPlayer[],
  joyFoolId: string
): UndercoverPlayer[] {
  return players.map((p) => {
    if (p.id === joyFoolId && p.specialCharacters.includes("joy_fool") && p.joyFoolActive) {
      return { ...p, totalScore: parseFloat((p.totalScore + 4).toFixed(2)) };
    }
    return p;
  });
}
