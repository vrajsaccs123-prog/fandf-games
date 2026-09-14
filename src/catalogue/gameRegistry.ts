/**
 * Game Registry — the single source of truth for all games in the platform.
 *
 * To add a new game:
 *  1. Create /games/<game-id>.md (rules + metadata spec)
 *  2. Create src/games/<game-id>/ (game module source)
 *     — declare player counts and modes on rules.ts `facts`
 *     — project those into metadata.ts via catalogueFieldsFromRules
 *  3. Import and register the game here
 *  4. Add assets to src/assets/games/<game-id>/
 *
 * The registry powers: catalogue listing, routing, filtering, lazy loading,
 * and game availability checks.
 *
 * Do NOT import full game implementations here — only their metadata
 * (which already projects player/mode facts from each game's rules).
 * Full game modules are lazy-loaded when a user navigates to a game.
 */

import type { GameMetadata } from "@/game/core/types";
import type { CatalogueFilters } from "./filters";
import { getDurationBuckets } from "./filters";
import { blackjackMetadata } from "@/games/blackjack/metadata";
import { undercoverMetadata } from "@/games/undercover/metadata";
import { codenamesMetadata } from "@/games/codenames/metadata";
import { modernArtMetadata } from "@/games/modern-art/metadata";
import { caboMetadata } from "@/games/cabo/metadata";

// ─── Game Registry ────────────────────────────────────────────────────────────

/**
 * Registry entry — metadata only, plus a lazy loader for the full module.
 */
export interface GameRegistryEntry {
  metadata: GameMetadata;
  /**
   * Lazy loader for the full game module.
   * Returns the GameDefinition when the user actually opens the game.
   */
  load: () => Promise<{ default: unknown }>;
}

/**
 * The game registry.
 *
 * Add entries here when a new game module is ready.
 * Keep metadata imports lightweight — no game logic in this file.
 */
export const gameRegistry: GameRegistryEntry[] = [
  {
    metadata: blackjackMetadata,
    load: () => import("@/games/blackjack"),
  },
  {
    metadata: undercoverMetadata,
    load: () => import("@/games/undercover"),
  },
  {
    metadata: codenamesMetadata,
    load: () => import("@/games/codenames"),
  },
  {
    metadata: modernArtMetadata,
    load: () => import("@/games/modern-art"),
  },
  {
    metadata: caboMetadata,
    load: () => import("@/games/cabo"),
  },
];

// ─── Registry Accessors ───────────────────────────────────────────────────────

/** All games in the registry */
export function getAllGames(): GameMetadata[] {
  return gameRegistry.map((entry) => entry.metadata);
}

/** All available (non-coming-soon) games */
export function getAvailableGames(): GameMetadata[] {
  return getAllGames().filter((g) => g.status === "available");
}

/** Find a game by its ID */
export function getGameById(id: string): GameMetadata | undefined {
  return getAllGames().find((g) => g.id === id);
}

/** Get the lazy loader for a game by ID */
export function getGameLoader(
  id: string
): GameRegistryEntry["load"] | undefined {
  return gameRegistry.find((entry) => entry.metadata.id === id)?.load;
}

// ─── Filtering ────────────────────────────────────────────────────────────────

/**
 * Filter and sort the catalogue based on the user's active filters.
 * Available games always come before coming-soon games.
 */
export function filterGames(
  games: GameMetadata[],
  filters: CatalogueFilters
): GameMetadata[] {
  return games
    .filter((game) => {
      // Player count
      if (filters.playerCount !== undefined) {
        if (
          game.minPlayers > filters.playerCount ||
          game.maxPlayers < filters.playerCount
        ) {
          return false;
        }
      }

      // Difficulty
      if (filters.difficulty && filters.difficulty.length > 0) {
        if (!filters.difficulty.includes(game.difficulty)) return false;
      }

      // Duration
      if (filters.duration && filters.duration.length > 0) {
        const gameBuckets = getDurationBuckets(
          game.durationMinutes.min,
          game.durationMinutes.max
        );
        const match = gameBuckets.some((b) => filters.duration!.includes(b));
        if (!match) return false;
      }

      // Categories
      if (filters.categories && filters.categories.length > 0) {
        const match = filters.categories.some((c) =>
          game.categories.includes(c)
        );
        if (!match) return false;
      }

      // Mechanics
      if (filters.mechanics && filters.mechanics.length > 0) {
        const match = filters.mechanics.some((m) =>
          game.mechanics?.includes(m)
        );
        if (!match) return false;
      }

      // Modes
      if (filters.modes && filters.modes.length > 0) {
        const hasLocal =
          filters.modes.includes("local") && game.supportsLocal;
        const hasOnline =
          filters.modes.includes("online") && game.supportsOnline;
        if (!hasLocal && !hasOnline) return false;
      }

      // Search
      if (filters.search && filters.search.trim().length > 0) {
        const q = filters.search.toLowerCase().trim();
        const match =
          game.name.toLowerCase().includes(q) ||
          game.shortDescription.toLowerCase().includes(q) ||
          (game.description?.toLowerCase().includes(q) ?? false);
        if (!match) return false;
      }

      return true;
    })
    .sort((a, b) => {
      // Available games first
      if (a.status !== b.status) {
        return a.status === "available" ? -1 : 1;
      }
      // Alphabetical within same status
      return a.name.localeCompare(b.name);
    });
}
