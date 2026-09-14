/**
 * Undercover — elimination chain engine.
 *
 * Processes a player elimination through an event queue, resolving:
 *  - Duelist state
 *  - Lover chain (immediate partner death)
 *  - Revenger trigger
 *  - Ghost conversion
 *
 * Returns the updated players array and any pending actions that need
 * further input (Revenger target selection, Mr. White guess).
 */

import type { UndercoverPlayer, SpecialCharacterSettings } from "../types";

// ─── Elimination result ────────────────────────────────────────────────────────

export interface EliminationResult {
  players: UndercoverPlayer[];
  eliminatedIds: string[];           // all players eliminated in this chain
  pendingRevengerId: string | null;  // if revenger needs to pick a target
  pendingMrWhiteIds: string[];       // mr. whites eliminated this chain (need guess)
  events: EliminationEvent[];
}

export interface EliminationEvent {
  type:
    | "eliminated"
    | "ghost_created"
    | "lover_chain"
    | "revenger_triggered"
    | "duelist_resolved";
  playerId: string;
  data?: Record<string, unknown>;
}

// ─── Main elimination processor ────────────────────────────────────────────────

/**
 * Eliminate a player and process all chain effects.
 *
 * @param players - Current player list.
 * @param targetId - The player being eliminated.
 * @param reason - Why this player is being eliminated.
 * @param settings - The match special character settings.
 */
export function processElimination(
  players: UndercoverPlayer[],
  targetId: string,
  reason: "vote" | "judge" | "lover" | "revenger" | "admin",
  settings: SpecialCharacterSettings
): EliminationResult {
  let currentPlayers = players.map((p) => ({ ...p })); // shallow clone
  const eliminatedIds: string[] = [];
  const events: EliminationEvent[] = [];
  let pendingRevengerId: string | null = null;
  const pendingMrWhiteIds: string[] = [];

  // Queue of player IDs to eliminate
  const queue: Array<{ id: string; reason: EliminationEvent["type"] }> = [
    { id: targetId, reason: "eliminated" },
  ];

  const processedIds = new Set<string>();

  while (queue.length > 0) {
    const { id: currentId } = queue.shift()!;

    // Skip already processed
    if (processedIds.has(currentId)) continue;
    processedIds.add(currentId);

    const playerIdx = currentPlayers.findIndex((p) => p.id === currentId);
    if (playerIdx === -1) continue;

    const player = currentPlayers[playerIdx];
    if (player.isEliminated) continue; // already dead

    // ── Mark eliminated ────────────────────────────────────────────────────
    currentPlayers = currentPlayers.map((p, i) =>
      i === playerIdx ? { ...p, isEliminated: true } : p
    );
    eliminatedIds.push(currentId);
    events.push({ type: "eliminated", playerId: currentId });

    // ── Ghost conversion ───────────────────────────────────────────────────
    // Only the player assigned the Ghost character can keep voting after death.
    if (settings.ghost && player.specialCharacters.includes("ghost")) {
      currentPlayers = currentPlayers.map((p) =>
        p.id === currentId ? { ...p, isGhost: true } : p
      );
      events.push({ type: "ghost_created", playerId: currentId });
    }

    // ── Lovers chain (queued before duelist so a bonded rival dies simultaneously)
    if (settings.lovers && player.specialCharacters.includes("lover") && player.loverPartnerId) {
      const partner = currentPlayers.find((p) => p.id === player.loverPartnerId);
      if (partner && !partner.isEliminated && !processedIds.has(partner.id)) {
        events.push({
          type: "lover_chain",
          playerId: player.loverPartnerId,
          data: { triggeredBy: currentId },
        });
        queue.push({ id: player.loverPartnerId, reason: "lover_chain" });
      }
    }

    // ── Duelist resolution ─────────────────────────────────────────────────
    // Only resolve if still pending — once a duelist's status is set
    // (first_eliminated / survivor / simultaneous) don't override it.
    // This ensures the survivor keeps +2 even if they're later eliminated.
    if (
      player.specialCharacters.includes("duelist") &&
      player.duelistRivalId &&
      player.duelistStatus === "pending"
    ) {
      const dyingThisChain = [...eliminatedIds, ...queue.map((q) => q.id)];
      currentPlayers = resolveDuelist(
        currentPlayers,
        currentId,
        player.duelistRivalId,
        dyingThisChain,
        events
      );
    }

    // ── Revenger trigger (only on vote elimination, not chain deaths) ───────
    if (
      settings.revenger &&
      player.specialCharacters.includes("revenger") &&
      reason === "vote" &&
      currentId === targetId // only the primary elimination, not chain
    ) {
      pendingRevengerId = currentId;
      events.push({ type: "revenger_triggered", playerId: currentId });
    }

    // ── Track Mr. White eliminations ────────────────────────────────────────
    if (player.faction === "mr_white") {
      pendingMrWhiteIds.push(currentId);
    }
  }

  return {
    players: currentPlayers,
    eliminatedIds,
    pendingRevengerId,
    pendingMrWhiteIds,
    events,
  };
}

// ─── Duelist resolution helper ────────────────────────────────────────────────

function resolveDuelist(
  players: UndercoverPlayer[],
  eliminatedId: string,
  rivalId: string,
  eliminatedIds: string[],
  events: EliminationEvent[]
): UndercoverPlayer[] {
  const rival = players.find((p) => p.id === rivalId);

  if (!rival) return players;

  // Check if rival is already eliminated in this chain (simultaneous)
  const rivalEliminatedNow = eliminatedIds.includes(rivalId);
  const rivalAlreadyDead = rival.isEliminated;

  if (rivalAlreadyDead || rivalEliminatedNow) {
    // Simultaneous — no bonus/penalty
    return players.map((p) => {
      if (p.id === eliminatedId || p.id === rivalId) {
        return { ...p, duelistStatus: "simultaneous" as const };
      }
      return p;
    });
  }

  // This duelist was eliminated first
  events.push({
    type: "duelist_resolved",
    playerId: eliminatedId,
    data: { survivorId: rivalId, firstEliminated: eliminatedId },
  });

  return players.map((p) => {
    if (p.id === eliminatedId) {
      return { ...p, duelistStatus: "first_eliminated" as const };
    }
    if (p.id === rivalId) {
      return { ...p, duelistStatus: "survivor" as const };
    }
    return p;
  });
}

// ─── Revenger elimination ─────────────────────────────────────────────────────

/**
 * Process the Revenger's chosen target.
 * This is a secondary elimination triggered by the Revenger.
 */
export function processRevengerTarget(
  players: UndercoverPlayer[],
  targetId: string,
  settings: SpecialCharacterSettings
): EliminationResult {
  return processElimination(players, targetId, "revenger", settings);
}
