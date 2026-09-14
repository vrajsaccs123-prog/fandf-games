/**
 * Undercover — GameDefinition export.
 *
 * This is the entry point for the game module.
 * The platform imports this lazily when the user navigates to /games/undercover.
 */

import type { GameDefinition, GameConfig } from "@/game/core/types";
import type { UndercoverState } from "./types";
import type { UndercoverAction } from "./actions";
import type { UndercoverPlayerView } from "./selectors";

import { undercoverMetadata } from "./metadata";
import { createInitialState } from "./state";
import { reduce } from "./reducer";
import { validateAction } from "./validation";
import { getAvailableActions, getPlayerView, getStatus } from "./selectors";
import { getRules } from "./rules";

// ─── Component imports (dynamic) ─────────────────────────────────────────────

import { UndercoverLobby } from "./components/UndercoverLobby";
import { UndercoverGame } from "./components/UndercoverGame";

// ─── Game Definition ─────────────────────────────────────────────────────────

const undercoverGame: GameDefinition<UndercoverState, UndercoverAction, UndercoverPlayerView> = {
  metadata: undercoverMetadata,

  createInitialState(config: GameConfig, seed?: string): UndercoverState {
    return createInitialState(config, seed);
  },

  reduce(state: UndercoverState, action: UndercoverAction): UndercoverState {
    return reduce(state, action);
  },

  validateAction(state: UndercoverState, action: UndercoverAction) {
    return validateAction(state, action);
  },

  getAvailableActions(state: UndercoverState, playerId: string): UndercoverAction[] {
    return getAvailableActions(state, playerId);
  },

  getPlayerView(state: UndercoverState, playerId: string): UndercoverPlayerView {
    return getPlayerView(state, playerId);
  },

  getStatus(state: UndercoverState) {
    return getStatus(state);
  },

  getRules() {
    return getRules();
  },

  components: {
    // Main game surface — receives player view + action dispatcher
    GameSurface: UndercoverGame as unknown as GameDefinition["components"]["GameSurface"],
    // Lobby component — rendered in the game detail page
    Lobby: UndercoverLobby as unknown as GameDefinition["components"]["Lobby"],
  },
};

export default undercoverGame;

// Named exports for convenience
export { undercoverMetadata };
export type { UndercoverState, UndercoverAction, UndercoverPlayerView };
