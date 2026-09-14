/**
 * Undercover — role & special character assignment engine.
 *
 * Handles cryptographically-seeded, randomized assignment of:
 *  - Faction roles (Civilian / Undercover / Mr. White)
 *  - Special character modifiers (Judge, Joy Fool, Ghost, Lovers, Revenger, Duelists)
 *
 * Special characters are modifiers, not factions.
 * A player's faction is independent of their special character.
 */

import { createRng } from "@/game/core/random";
import type { Player } from "@/game/core/types";
import type {
  Faction,
  SpecialCharacter,
  SpecialCharacterSettings,
  UndercoverPlayer,
} from "../types";

// ─── Assignment result ────────────────────────────────────────────────────────

export interface RoleAssignment {
  playerId: string;
  faction: Faction;
  specialCharacters: SpecialCharacter[];
  loverPartnerId?: string;
  duelistRivalId?: string;
}

// ─── Role assignment ──────────────────────────────────────────────────────────

/**
 * Assign faction roles and special characters to all players.
 *
 * @param players - The list of players (name + id only).
 * @param civilians - Number of civilian slots.
 * @param undercovers - Number of undercover slots.
 * @param mrWhites - Number of Mr. White slots.
 * @param specialCharacters - Which special characters are enabled.
 * @param seed - RNG seed for reproducibility.
 */
export function assignRoles(
  players: Player[],
  civilians: number,
  undercovers: number,
  mrWhites: number,
  specialCharacters: SpecialCharacterSettings,
  seed: string
): RoleAssignment[] {
  const rng = createRng(seed);

  // Validate totals
  if (civilians + undercovers + mrWhites !== players.length) {
    throw new Error(
      `Role counts (${civilians} + ${undercovers} + ${mrWhites}) must equal player count (${players.length})`
    );
  }

  // ── Build faction pool ──────────────────────────────────────────────────
  const factionPool: Faction[] = [
    ...Array(civilians).fill("civilian" as Faction),
    ...Array(undercovers).fill("undercover" as Faction),
    ...Array(mrWhites).fill("mr_white" as Faction),
  ];

  const shuffledFactions = rng.shuffle(factionPool) as Faction[];
  const shuffledPlayers = rng.shuffle(players) as Player[];

  // Map player → faction
  const assignments: Map<string, RoleAssignment> = new Map();
  for (let i = 0; i < shuffledPlayers.length; i++) {
    assignments.set(shuffledPlayers[i].id, {
      playerId: shuffledPlayers[i].id,
      faction: shuffledFactions[i],
      specialCharacters: [],
    });
  }

  const playerIds = shuffledPlayers.map((p) => p.id);

  // ── Assign special characters ───────────────────────────────────────────

  // Judge — exactly one player
  if (specialCharacters.judge) {
    const judgeId = rng.pick(playerIds);
    assignments.get(judgeId)!.specialCharacters.push("judge");
  }

  // Joy Fool — exactly one player
  if (specialCharacters.joyFool) {
    const eligibleIds = playerIds.filter(
      (id) => !assignments.get(id)!.specialCharacters.includes("judge")
    );
    const joyFoolId = eligibleIds.length > 0 ? rng.pick(eligibleIds) : rng.pick(playerIds);
    assignments.get(joyFoolId)!.specialCharacters.push("joy_fool");
  }

  // Ghost — exactly one player. Only that player can vote after being eliminated.
  if (specialCharacters.ghost) {
    const ghostId = rng.pick(playerIds);
    assignments.get(ghostId)!.specialCharacters.push("ghost");
  }

  // Lovers — exactly two players form a pair
  if (specialCharacters.lovers && playerIds.length >= 2) {
    const shuffledForLovers = rng.shuffle(playerIds) as string[];
    const lover1 = shuffledForLovers[0];
    const lover2 = shuffledForLovers[1];
    assignments.get(lover1)!.specialCharacters.push("lover");
    assignments.get(lover2)!.specialCharacters.push("lover");
    assignments.get(lover1)!.loverPartnerId = lover2;
    assignments.get(lover2)!.loverPartnerId = lover1;
  }

  // Revenger — exactly one player
  if (specialCharacters.revenger) {
    const takenIds = new Set(
      [...assignments.values()]
        .filter((a) => a.specialCharacters.includes("lover"))
        .map((a) => a.playerId)
    );
    const eligible = playerIds.filter((id) => !takenIds.has(id));
    const pool = eligible.length >= 1 ? eligible : playerIds;
    const revengerId = rng.pick(pool);
    assignments.get(revengerId)!.specialCharacters.push("revenger");
  }

  // Duelists — exactly two players form a rival pair
  if (specialCharacters.duelists && playerIds.length >= 2) {
    const nonDuelistIds = playerIds.filter(
      (id) => !assignments.get(id)!.specialCharacters.includes("lover")
    );
    const pool = nonDuelistIds.length >= 2 ? nonDuelistIds : playerIds;
    const shuffledForDuelists = rng.shuffle(pool) as string[];
    const duelist1 = shuffledForDuelists[0];
    const duelist2 = shuffledForDuelists[1];
    if (duelist1 !== duelist2) {
      assignments.get(duelist1)!.specialCharacters.push("duelist");
      assignments.get(duelist2)!.specialCharacters.push("duelist");
      assignments.get(duelist1)!.duelistRivalId = duelist2;
      assignments.get(duelist2)!.duelistRivalId = duelist1;
    }
  }

  return [...assignments.values()];
}

// ─── Build UndercoverPlayers from assignments ─────────────────────────────────

/**
 * Converts raw Player objects + assignments into full UndercoverPlayer objects.
 */
export function buildPlayers(
  players: Player[],
  assignments: RoleAssignment[]
): UndercoverPlayer[] {
  const assignmentMap = new Map(assignments.map((a) => [a.playerId, a]));

  return players.map((p) => {
    const assignment = assignmentMap.get(p.id);
    if (!assignment) {
      throw new Error(`No role assignment found for player ${p.id}`);
    }

    return {
      id: p.id,
      name: p.name,
      faction: assignment.faction,
      specialCharacters: assignment.specialCharacters,
      loverPartnerId: assignment.loverPartnerId,
      duelistRivalId: assignment.duelistRivalId,
      isEliminated: false,
      isGhost: false,
      joyFoolActive: assignment.specialCharacters.includes("joy_fool"),
      duelistStatus: assignment.specialCharacters.includes("duelist")
        ? "pending"
        : "resolved", // "resolved" means N/A
      totalScore: 0,
    };
  });
}

// ─── Player query helpers ──────────────────────────────────────────────────────

/** Players who can vote (living + the one assigned Ghost player after elimination) */
export function getEligibleVoters(
  players: UndercoverPlayer[],
  ghostEnabled: boolean
): UndercoverPlayer[] {
  return players.filter(
    (p) => !p.isEliminated || (ghostEnabled && p.isGhost)
  );
}

/**
 * Sequential voter order for online voting:
 * living players in the current turn order, then the Ghost player if they
 * have been eliminated. Other eliminated players never vote.
 */
export function getVoterOrder(
  players: UndercoverPlayer[],
  turnOrder: string[],
  ghostEnabled: boolean
): string[] {
  const livingIds = new Set(getLivingPlayers(players).map((p) => p.id));
  const livingVoters = turnOrder.filter((id) => livingIds.has(id));
  if (!ghostEnabled) return livingVoters;

  const ghostIds = players
    .filter((p) => p.isEliminated && p.isGhost)
    .map((p) => p.id);
  return [...livingVoters, ...ghostIds];
}

export function isEligibleVoter(
  player: UndercoverPlayer | undefined,
  ghostEnabled: boolean
): boolean {
  if (!player) return false;
  if (!player.isEliminated) return true;
  return ghostEnabled && player.isGhost;
}

/** Living players (not eliminated or ghost — truly alive) */
export function getLivingPlayers(players: UndercoverPlayer[]): UndercoverPlayer[] {
  return players.filter((p) => !p.isEliminated);
}

/** Living players of a specific faction */
export function getLivingByFaction(
  players: UndercoverPlayer[],
  faction: Faction
): UndercoverPlayer[] {
  return players.filter((p) => !p.isEliminated && p.faction === faction);
}

/** Find the living Judge (if any) */
export function getLivingJudge(players: UndercoverPlayer[]): UndercoverPlayer | undefined {
  return players.find(
    (p) => !p.isEliminated && p.specialCharacters.includes("judge")
  );
}
