/**
 * Modern Art — Game module entry point.
 */

import type { GameDefinition } from "@/game/core/types";
import { modernArtMetadata } from "./metadata";
import { modernArtRules } from "./rules";
import { createInitialState } from "./state";
import { reduce } from "./reducer";
import { validateAction, getAvailableActions } from "./validation";
import { getPlayerView, getStatus } from "./selectors";
import type { ModernArtState } from "./types";
import type { ModernArtAction } from "./actions";
import type { ModernArtPlayerView } from "./selectors";

import { ModernArtLobby } from "./components/ModernArtLobby";
import { ModernArtGame } from "./components/ModernArtGame";

const modernArtGame: GameDefinition<
  ModernArtState,
  ModernArtAction,
  ModernArtPlayerView
> = {
  metadata: modernArtMetadata,
  createInitialState,
  reduce,
  validateAction,
  getAvailableActions,
  getPlayerView,
  getStatus,
  getRules: () => modernArtRules,
  components: {
    Lobby: ModernArtLobby as GameDefinition["components"]["Lobby"],
    GameSurface: ModernArtGame as unknown as GameDefinition["components"]["GameSurface"],
  },
};

export default modernArtGame;
