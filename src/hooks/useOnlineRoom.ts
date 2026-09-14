/**
 * useOnlineRoom — React hook for P2P online game rooms via PeerJS.
 *
 * Architecture:
 *  - Host: creates a Peer with ID `fandf-{roomCode}`, accepts connections,
 *    holds the authoritative game state, and broadcasts it to all players.
 *  - Player: creates an anonymous Peer, connects to the host's Peer ID,
 *    receives game state updates, and sends actions to the host.
 *
 * PeerJS uses the public peerjs.com broker for WebRTC signalling (STUN/TURN).
 * No API keys or accounts are required for basic use.
 *
 * Usage:
 *   const room = useOnlineRoom({ gameId: 'blackjack', myPlayerId: 'player-1' });
 *   await room.createRoom(playerName);   // host flow
 *   await room.joinRoom(code, playerName); // join flow
 *   room.broadcastState(newState);       // host broadcasts new state
 *   room.sendAction(action);             // player sends action to host
 */

"use client";

import * as React from "react";
import { generateRoomCode } from "@/lib/online/roomCode";
import type {
  RoomInfo,
  RoomMember,
  PeerMessage,
} from "@/lib/online/types";

// ─── Types ────────────────────────────────────────────────────────────────────

export type RoomStatus =
  | "idle"
  | "creating"    // Host: setting up peer
  | "waiting"     // Host: waiting for players to join
  | "joining"     // Player: connecting to host
  | "connected"   // Player: connected, waiting for start
  | "starting"    // Both: game is starting
  | "playing"     // Both: game in progress
  | "error"
  | "disconnected";

export interface UseOnlineRoomOptions {
  gameId: string;
  myPlayerId: string;
  onGameState: (state: unknown) => void;
  onAction: (action: unknown, fromPlayerId: string) => void;
  onRoomUpdate: (room: RoomInfo) => void;
  onGameStarted: () => void;
  onPlayerDisconnected?: (peerId: string) => void;
}

export interface UseOnlineRoomReturn {
  status: RoomStatus;
  roomCode: string | null;
  roomInfo: RoomInfo | null;
  isHost: boolean;
  error: string | null;
  /** Host: create a new room and wait for players */
  createRoom: (playerName: string) => Promise<void>;
  /** Player: join an existing room by code */
  joinRoom: (code: string, playerName: string) => Promise<void>;
  /** Host: broadcast full game state to all connected players */
  broadcastState: (state: unknown) => void;
  /** Player (or host to self): send an action to the host */
  sendAction: (action: unknown) => void;
  /** Host: signal all players that the game has started */
  broadcastStart: () => void;
  /** Tear down all connections */
  disconnect: () => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PeerInstance = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DataConnection = any;

export function useOnlineRoom(
  options: UseOnlineRoomOptions
): UseOnlineRoomReturn {
  const optionsRef = React.useRef(options);
  optionsRef.current = options;

  const [status, setStatus] = React.useState<RoomStatus>("idle");
  const [roomCode, setRoomCode] = React.useState<string | null>(null);
  const [roomInfo, setRoomInfo] = React.useState<RoomInfo | null>(null);
  const [isHost, setIsHost] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // PeerJS refs (not state — avoid triggering re-renders)
  const peerRef = React.useRef<PeerInstance>(null);
  /** host: map from peerId → DataConnection */
  const connectionsRef = React.useRef<Map<string, DataConnection>>(new Map());
  /** player: connection to host */
  const hostConnRef = React.useRef<DataConnection>(null);
  /** host: peerId → playerId */
  const peerToPlayerRef = React.useRef<Map<string, string>>(new Map());
  /** host: room state */
  const roomInfoRef = React.useRef<RoomInfo | null>(null);

  const updateRoom = React.useCallback((newRoom: RoomInfo) => {
    roomInfoRef.current = newRoom;
    setRoomInfo(newRoom);
    optionsRef.current.onRoomUpdate(newRoom);
  }, []);

  // ─── Shared: handle an incoming message ────────────────────────────────────

  const handleMessage = React.useCallback(
    (msg: PeerMessage, fromPeerId: string) => {
      switch (msg.type) {
        case "ROOM_UPDATE":
          updateRoom(msg.room);
          break;

        case "GAME_STATE":
          optionsRef.current.onGameState(msg.state);
          break;

        case "PLAYER_ACTION":
          // Only the host processes actions
          optionsRef.current.onAction(msg.action, msg.fromPlayerId);
          break;

        case "GAME_STARTED":
          setStatus("playing");
          optionsRef.current.onGameStarted();
          break;

        default:
          console.warn("[OnlineRoom] Unknown message type", msg, fromPeerId);
      }
    },
    [updateRoom]
  );

  // ─── Host: attach listeners to a new connection ────────────────────────────

  const attachHostListeners = React.useCallback(
    (conn: DataConnection) => {
      conn.on("open", () => {
        console.log("[OnlineRoom:host] Player connected:", conn.peer);
        connectionsRef.current.set(conn.peer, conn);

        // Send current room state to new joiner
        if (roomInfoRef.current) {
          conn.send({ type: "ROOM_UPDATE", room: roomInfoRef.current } satisfies PeerMessage);
        }
      });

      conn.on("data", (data: unknown) => {
        handleMessage(data as PeerMessage, conn.peer);
      });

      conn.on("close", () => {
        console.log("[OnlineRoom:host] Player disconnected:", conn.peer);
        connectionsRef.current.delete(conn.peer);
        optionsRef.current.onPlayerDisconnected?.(conn.peer);
      });

      conn.on("error", (err: unknown) => {
        console.error("[OnlineRoom:host] Connection error:", err);
      });
    },
    [handleMessage]
  );

  // ─── createRoom ────────────────────────────────────────────────────────────

  const createRoom = React.useCallback(
    async (playerName: string) => {
      setStatus("creating");
      setError(null);

      const code = generateRoomCode();
      const peerId = `fandf-${code}`;
      const myPlayerId = optionsRef.current.myPlayerId;

      try {
        // Dynamic import to avoid SSR issues
        const { Peer } = await import("peerjs");
        const peer = new Peer(peerId);
        peerRef.current = peer;

        await new Promise<void>((resolve, reject) => {
          peer.on("open", (id: string) => {
            console.log("[OnlineRoom] Host peer open:", id);
            resolve();
          });
          peer.on("error", (err: unknown) => {
            reject(new Error(`PeerJS error: ${String(err)}`));
          });
          setTimeout(() => reject(new Error("Connection timed out")), 15_000);
        });

        const initialRoom: RoomInfo = {
          roomCode: code,
          gameId: optionsRef.current.gameId,
          hostId: myPlayerId,
          members: [
            {
              id: myPlayerId,
              name: playerName,
              role: "host",
              peerId,
            },
          ],
          started: false,
        };

        updateRoom(initialRoom);
        setRoomCode(code);
        setIsHost(true);
        setStatus("waiting");

        // Listen for incoming connections
        peer.on("connection", (conn: DataConnection) => {
          attachHostListeners(conn);

            // Custom JOIN handshake — player sends this first
          conn.on("open", () => {
            // When player connects, they'll send a JOIN message
          });
        });

        // Extend: listen for JOIN messages and update room
        peer.on("connection", (conn: DataConnection) => {
          conn.on("open", () => {
            // Player connected; they send a JOIN message
          });
          conn.on("data", (rawData: unknown) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const data = rawData as any;
            if (data.type === "JOIN") {
              // Register this peer → player mapping
              peerToPlayerRef.current.set(conn.peer, data.playerId);

              // Add to room
              const member: RoomMember = {
                id: data.playerId,
                name: data.playerName,
                role: "player",
                peerId: conn.peer,
              };

              const currentRoom = roomInfoRef.current;
              if (currentRoom) {
                const newRoom: RoomInfo = {
                  ...currentRoom,
                  members: [...currentRoom.members, member],
                };
                updateRoom(newRoom);

                // Broadcast updated room to all players
                const broadcastMsg: PeerMessage = {
                  type: "ROOM_UPDATE",
                  room: newRoom,
                };
                for (const c of connectionsRef.current.values()) {
                  c.send(broadcastMsg);
                }
              }
            } else {
              handleMessage(data as PeerMessage, conn.peer);
            }
          });
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to create room";
        setError(message);
        setStatus("error");
        console.error("[OnlineRoom] createRoom failed:", err);
      }
    },
    [attachHostListeners, handleMessage, updateRoom]
  );

  // ─── joinRoom ──────────────────────────────────────────────────────────────

  const joinRoom = React.useCallback(
    async (code: string, playerName: string) => {
      setStatus("joining");
      setError(null);

      const normalizedCode = code.toUpperCase().trim();
      const hostPeerId = `fandf-${normalizedCode}`;
      const myPlayerId = optionsRef.current.myPlayerId;
      // Generate a unique peer ID for this device
      const myPeerId = `fandf-player-${myPlayerId}-${Date.now()}`;

      try {
        const { Peer } = await import("peerjs");
        const peer = new Peer(myPeerId);
        peerRef.current = peer;

        await new Promise<void>((resolve, reject) => {
          peer.on("open", () => resolve());
          peer.on("error", (err: unknown) => {
            reject(new Error(`PeerJS error: ${String(err)}`));
          });
          setTimeout(() => reject(new Error("Peer setup timed out")), 15_000);
        });

        const conn = peer.connect(hostPeerId, { reliable: true });
        hostConnRef.current = conn;

        await new Promise<void>((resolve, reject) => {
          conn.on("open", resolve);
          conn.on("error", (err: unknown) => {
            reject(new Error(`Connection error: ${String(err)}`));
          });
          setTimeout(() => reject(new Error("Join timed out — check the room code")), 20_000);
        });

        // Send JOIN handshake
        conn.send({
          type: "JOIN",
          playerId: myPlayerId,
          playerName,
        });

        // Listen for messages from host
        conn.on("data", (data: unknown) => {
          handleMessage(data as PeerMessage, hostPeerId);
        });

        conn.on("close", () => {
          setStatus("disconnected");
          setError("Disconnected from host.");
        });

        setRoomCode(normalizedCode);
        setIsHost(false);
        setStatus("connected");
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to join room";
        setError(message);
        setStatus("error");
        console.error("[OnlineRoom] joinRoom failed:", err);
      }
    },
    [handleMessage]
  );

  // ─── broadcastState (host only) ────────────────────────────────────────────

  const broadcastState = React.useCallback((state: unknown) => {
    const msg: PeerMessage = { type: "GAME_STATE", state };
    for (const conn of connectionsRef.current.values()) {
      conn.send(msg);
    }
  }, []);

  // ─── sendAction (player → host) ────────────────────────────────────────────

  const sendAction = React.useCallback((action: unknown) => {
    const msg: PeerMessage = {
      type: "PLAYER_ACTION",
      action,
      fromPlayerId: options.myPlayerId,
    };
    if (hostConnRef.current) {
      hostConnRef.current.send(msg);
    }
  }, [options.myPlayerId]);

  // ─── broadcastStart (host only) ────────────────────────────────────────────

  const broadcastStart = React.useCallback(() => {
    const msg: PeerMessage = { type: "GAME_STARTED" };
    for (const conn of connectionsRef.current.values()) {
      conn.send(msg);
    }

    // Update local room to started
    if (roomInfoRef.current) {
      const started: RoomInfo = { ...roomInfoRef.current, started: true };
      updateRoom(started);
    }
    setStatus("playing");
  }, [updateRoom]);

  // ─── disconnect ────────────────────────────────────────────────────────────

  const disconnect = React.useCallback(() => {
    hostConnRef.current?.close();
    for (const conn of connectionsRef.current.values()) {
      conn.close();
    }
    connectionsRef.current.clear();
    peerRef.current?.destroy();
    peerRef.current = null;
    setStatus("idle");
    setRoomCode(null);
    setRoomInfo(null);
    setIsHost(false);
    setError(null);
  }, []);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      peerRef.current?.destroy();
    };
  }, []);

  return {
    status,
    roomCode,
    roomInfo,
    isHost,
    error,
    createRoom,
    joinRoom,
    broadcastState,
    sendAction,
    broadcastStart,
    disconnect,
  };
}
