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
  /**
   * 4-letter seat token. Broadcast only while the player is disconnected so
   * remaining players can share a rejoin code. Host keeps it internally always.
   */
  reconnectCode?: string;
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

/** Host → joining player: seat assigned (includes private reconnect token) */
export interface MsgJoinOk {
  type: "JOIN_OK";
  playerId: string;
  reconnectCode: string;
  room: RoomInfo;
}

/** Host → rejoining player: original seat restored */
export interface MsgRejoinOk {
  type: "REJOIN_OK";
  playerId: string;
  reconnectCode: string;
  room: RoomInfo;
}

/** Host → joining/rejoining player: handshake rejected */
export interface MsgJoinError {
  type: "JOIN_ERROR" | "REJOIN_ERROR";
  reason: string;
}

export type PeerMessage =
  | MsgRoomUpdate
  | MsgGameState
  | MsgPlayerAction
  | MsgGameStarted
  | MsgJoinOk
  | MsgRejoinOk
  | MsgJoinError;

/** Guest → host handshakes (not part of the typed broadcast union on purpose) */
export interface MsgJoin {
  type: "JOIN";
  playerId: string;
  playerName: string;
}

export interface MsgRejoin {
  type: "REJOIN";
  reconnectCode: string;
  playerName?: string;
}
