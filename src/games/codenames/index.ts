/**
 * Codenames — GameDefinition export.
 *
 * Entry point for the game module. Lazy-loaded when the user navigates to /games/codenames.
 */

import type { GameDefinition, GameConfig } from "@/game/core/types";
import type { CodenamesState } from "./types";
import type { CodenamesAction } from "./actions";
import type { CodenamesPlayerView } from "./selectors";

import { codenamesMetadata } from "./metadata";
import { createInitialState } from "./state";
import { reduce } from "./reducer";
import { validateAction } from "./validation";
import { getAvailableActions, getPlayerView, getStatus } from "./selectors";
import { getRules } from "./rules";

import { CodenamesLobby } from "./components/CodenamesLobby";
import { CodenamesGame } from "./components/CodenamesGame";

// ─── Game Definition ─────────────────────────────────────────────────────────

const codenamesGame: GameDefinition<CodenamesState, CodenamesAction, CodenamesPlayerView> = {
  metadata: codenamesMetadata,

  createInitialState(config: GameConfig, seed?: string): CodenamesState {
    return createInitialState(config, seed);
  },

  reduce(state: CodenamesState, action: CodenamesAction): CodenamesState {
    return reduce(state, action);
  },

  validateAction(state: CodenamesState, action: CodenamesAction) {
    return validateAction(state, action);
  },

  getAvailableActions(state: CodenamesState, playerId: string): CodenamesAction[] {
    return getAvailableActions(state, playerId);
  },

  getPlayerView(state: CodenamesState, playerId: string): CodenamesPlayerView {
    return getPlayerView(state, playerId);
  },

  getStatus(state: CodenamesState) {
    return getStatus(state);
  },

  getRules() {
    return getRules();
  },

  components: {
    GameSurface: CodenamesGame as unknown as GameDefinition["components"]["GameSurface"],
    Lobby: CodenamesLobby as unknown as GameDefinition["components"]["Lobby"],
  },
};

export default codenamesGame;

export { codenamesMetadata };
export type { CodenamesState, CodenamesAction, CodenamesPlayerView };
