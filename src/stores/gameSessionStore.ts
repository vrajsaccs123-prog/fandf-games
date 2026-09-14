/**
 * gameSessionStore — holds the pending game session config for each game.
 *
 * Flow:
 *   1. User configures a game in the lobby (/games/[gameId]).
 *   2. Lobby writes the session here, then navigates to /games/[gameId]/play.
 *   3. Play page reads the session, renders the game table.
 *   4. On exit the play page clears the session and navigates back to the lobby.
 */

import { create } from "zustand";
import type { GameConfig } from "@/game/core/types";
import type { UndercoverState } from "@/games/undercover/types";

// ─── Blackjack ────────────────────────────────────────────────────────────────

export type BlackjackSession =
  | { type: "offline"; config: GameConfig }
  | { type: "online-host"; config: GameConfig }
  | { type: "online-join"; playerId: string; roomCode: string; playerName: string };

// ─── Undercover ───────────────────────────────────────────────────────────────

export type UndercoverSession = {
  initialState: UndercoverState;
  myPlayerId: string;
};

// ─── Modern Art ───────────────────────────────────────────────────────────────

export type ModernArtSession =
  | { type: "online-host"; hostName: string; playerId: string }
  | { type: "online-join"; playerId: string; roomCode: string; playerName: string };

// ─── Cabo ─────────────────────────────────────────────────────────────────────

export type CaboSession =
  | { type: "online-host"; config: GameConfig; myPlayerId: string }
  | { type: "online-join"; playerId: string; roomCode: string; playerName: string };

// ─── Store ────────────────────────────────────────────────────────────────────

interface GameSessionStore {
  blackjack: BlackjackSession | null;
  undercover: UndercoverSession | null;
  modernArt: ModernArtSession | null;
  cabo: CaboSession | null;
  setBlackjack: (session: BlackjackSession | null) => void;
  setUndercover: (session: UndercoverSession | null) => void;
  setModernArt: (session: ModernArtSession | null) => void;
  setCabo: (session: CaboSession | null) => void;
}

export const useGameSessionStore = create<GameSessionStore>((set) => ({
  blackjack: null,
  undercover: null,
  modernArt: null,
  cabo: null,
  setBlackjack: (session) => set({ blackjack: session }),
  setUndercover: (session) => set({ undercover: session }),
  setModernArt: (session) => set({ modernArt: session }),
  setCabo: (session) => set({ cabo: session }),
}));
