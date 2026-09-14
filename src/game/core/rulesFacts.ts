/**
 * Helpers for the structured facts declared on GameRules.
 *
 * Every game's rules.ts owns player counts and supported modes.
 * Catalogue metadata, the lobby page, and setup controls must go
 * through these helpers so they cannot drift from the rules.
 */

import type { GameMetadata, GameMode } from "./types/catalogue";
import type { GameRulesFacts } from "./types/game";

export type { GameRulesFacts };

/** Catalogue fields that are a projection of rules facts — never author these twice. */
export type RulesCatalogueFields = Pick<
  GameMetadata,
  | "minPlayers"
  | "maxPlayers"
  | "recommendedPlayers"
  | "modes"
  | "supportsLocal"
  | "supportsOffline"
  | "supportsOnline"
>;

export function catalogueFieldsFromRules(facts: GameRulesFacts): RulesCatalogueFields {
  const modes: GameMode[] = [];
  if (facts.supportsLocal) modes.push("local");
  if (facts.supportsOnline) modes.push("online");

  return {
    minPlayers: facts.minPlayers,
    maxPlayers: facts.maxPlayers,
    recommendedPlayers: facts.recommendedPlayers,
    modes,
    supportsLocal: facts.supportsLocal,
    supportsOffline: facts.supportsOffline,
    supportsOnline: facts.supportsOnline,
  };
}

/** e.g. "4–10" or "2" */
export function formatPlayerRange(facts: Pick<GameRulesFacts, "minPlayers" | "maxPlayers">): string {
  return facts.minPlayers === facts.maxPlayers
    ? `${facts.minPlayers}`
    : `${facts.minPlayers}–${facts.maxPlayers}`;
}

/** e.g. "4–10 players" */
export function formatPlayerCountLabel(
  facts: Pick<GameRulesFacts, "minPlayers" | "maxPlayers">
): string {
  const range = formatPlayerRange(facts);
  return facts.minPlayers === facts.maxPlayers && facts.minPlayers === 1
    ? "1 player"
    : `${range} players`;
}

export function formatModeLabel(
  facts: Pick<GameRulesFacts, "supportsLocal" | "supportsOnline">
): string {
  if (facts.supportsLocal && facts.supportsOnline) return "Local + Online";
  if (facts.supportsOnline) return "Online";
  if (facts.supportsLocal) return "Local";
  return "—";
}

export function playerCountOptions(facts: Pick<GameRulesFacts, "minPlayers" | "maxPlayers">): number[] {
  const span = facts.maxPlayers - facts.minPlayers + 1;
  if (span <= 0) return [facts.minPlayers];
  return Array.from({ length: span }, (_, i) => facts.minPlayers + i);
}

export function clampPlayerCount(
  facts: Pick<GameRulesFacts, "minPlayers" | "maxPlayers">,
  count: number
): number {
  return Math.max(facts.minPlayers, Math.min(facts.maxPlayers, count));
}

export function defaultPlayerCount(facts: GameRulesFacts, preferred?: number): number {
  const raw = preferred ?? facts.recommendedPlayers?.[0] ?? facts.minPlayers;
  return clampPlayerCount(facts, raw);
}

export function isPlayerCountAllowed(
  facts: Pick<GameRulesFacts, "minPlayers" | "maxPlayers">,
  count: number
): boolean {
  return count >= facts.minPlayers && count <= facts.maxPlayers;
}
