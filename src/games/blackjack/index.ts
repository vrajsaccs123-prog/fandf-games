/**
 * Blackjack — Game module entry point.
 *
 * Exports the GameDefinition that the platform uses to run this game.
 * Imported lazily by the game registry when the user opens Blackjack.
 */

import type { GameDefinition } from "@/game/core/types";
import { blackjackMetadata } from "./metadata";
import { blackjackRules } from "./rules";
import { createInitialState } from "./state";
import { reduce } from "./reducer";
import { validateAction, getAvailableActions } from "./validation";
import { getPlayerView, getStatus } from "./selectors";
import type { BlackjackState } from "./state";
import type { BlackjackAction } from "./actions";
import type { BlackjackPlayerView } from "./selectors";

// UI components — imported here so the lazy-loaded bundle includes them
import { BlackjackLobby } from "./components/BlackjackLobby";
import { BlackjackTable } from "./components/BlackjackTable";

const blackjackGame: GameDefinition<
  BlackjackState,
  BlackjackAction,
  BlackjackPlayerView
> = {
  metadata: blackjackMetadata,

  createInitialState,

  reduce,

  validateAction,

  getAvailableActions,

  getPlayerView,

  getStatus,

  getRules: () => blackjackRules,

  components: {
    // The Lobby component handles player setup and then renders GameSurface inline
    Lobby: BlackjackLobby as GameDefinition["components"]["Lobby"],
    // GameSurface is also exported; cast via unknown because BlackjackTable has
    // richer props than the generic GameSurfaceProps contract requires.
    GameSurface: BlackjackTable as unknown as GameDefinition["components"]["GameSurface"],
  },
};

export default blackjackGame;
