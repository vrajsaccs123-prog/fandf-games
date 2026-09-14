/**
 * Shared types for the online room / P2P multiplayer layer.
 */

export type GameMode = "offline" | "online";

/** Role in an online room */
export type RoomRole = "host" | "player";

/** A player's presence info in the lobby */
export interface RoomMember {
  id: string;
  name: string;
  role: RoomRole;
  /** Stable peer ID used by PeerJS (= fandf-{roomCode}-{id}) */
  peerId: string;
  /** Whether this member is currently connected */
  connected?: boolean;
}

/** Lobby state shared across all devices */
export interface RoomInfo {
  roomCode: string;
  gameId: string;
  hostId: string;
  members: RoomMember[];
  started: boolean;
}

// ─── Messages over the PeerJS data channel ────────────────────────────────────

/** Host → all players: current lobby state before the game starts */
export interface MsgRoomUpdate {
  type: "ROOM_UPDATE";
  room: RoomInfo;
}

/** Host → all players: full serialized game state after any action */
export interface MsgGameState {
  type: "GAME_STATE";
  /** Serialized game state (JSON) — each device derives its own player view */
  state: unknown;
}

/** Any player → host: an action to be validated and applied */
export interface MsgPlayerAction {
  type: "PLAYER_ACTION";
  action: unknown;
  fromPlayerId: string;
}

/** Host → all players: game has started, time to mount the table */
export interface MsgGameStarted {
  type: "GAME_STARTED";
}

export type PeerMessage =
  | MsgRoomUpdate
  | MsgGameState
  | MsgPlayerAction
  | MsgGameStarted;
