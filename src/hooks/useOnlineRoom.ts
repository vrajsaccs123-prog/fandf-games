/**
 * useOnlineRoom — React hook for P2P online game rooms via PeerJS.
 *
 * Architecture:
 *  - Host: creates a Peer with ID `fandf-{roomCode}`, accepts connections,
 *    holds the authoritative game state, and broadcasts it to all players.
 *  - Player: creates an anonymous Peer, connects to the host's Peer ID,
 *    receives game state updates, and sends actions to the host.
 *
 * Disconnect / rejoin:
 *  - Dropped players stay in the roster (same seat) and are marked disconnected.
 *  - Remaining players see a rejoin code (`ROOMCODE-SEAT`) they can share.
 *  - The dropped player enters that code on the Join screen to reclaim the seat.
 *
 * Host failover:
 *  - If the host drops, remaining players elect the next connected member
 *    (join order) to reclaim Peer ID `fandf-{roomCode}` and keep the room.
 *
 * PeerJS uses the public peerjs.com broker for WebRTC signalling (STUN/TURN).
 * No API keys or accounts are required for basic use.
 */

"use client";

import * as React from "react";
import { generateRoomCode } from "@/lib/online/roomCode";
import { generateSeatCode } from "@/lib/online/reconnectCode";
import {
  hostSuccessorCandidates,
  promoteMemberToHost,
  successorClaimIndex,
} from "@/lib/online/hostFailover";
import type {
  RoomInfo,
  RoomMember,
  PeerMessage,
  MsgJoin,
  MsgRejoin,
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
  | "transferring" // Host left; electing / reclaiming the room
  | "error"
  | "disconnected";

export interface UseOnlineRoomOptions {
  gameId: string;
  myPlayerId: string;
  onGameState: (state: unknown) => void;
  onAction: (action: unknown, fromPlayerId: string) => void;
  onRoomUpdate: (room: RoomInfo) => void;
  onGameStarted: () => void;
  onPlayerDisconnected?: (playerId: string) => void;
  onPlayerReconnected?: (playerId: string) => void;
  /** Fired on the device that just took over hosting after a host drop */
  onBecameHost?: () => void;
}

export interface JoinRoomOptions {
  /** 4-letter seat token from a rejoin code shared by remaining players */
  reconnectToken?: string;
  /** Guest→host open timeout (ms). Failover uses a shorter window. */
  timeoutMs?: number;
  /** Don't flip status to error on failure (used while retrying failover). */
  quiet?: boolean;
}

export interface UseOnlineRoomReturn {
  status: RoomStatus;
  roomCode: string | null;
  roomInfo: RoomInfo | null;
  isHost: boolean;
  error: string | null;
  /** Resolved player id — updates after a successful rejoin */
  myPlayerId: string;
  /** This device's seat token (so a dropped player can rejoin themselves) */
  myReconnectCode: string | null;
  /** Host: create a new room and wait for players */
  createRoom: (playerName: string) => Promise<void>;
  /** Player: join an existing room by code (or rejoin with a seat token) */
  joinRoom: (code: string, playerName: string, options?: JoinRoomOptions) => Promise<boolean>;
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

function existingSeatCodes(room: RoomInfo | null): string[] {
  if (!room) return [];
  return room.members
    .map((m) => m.reconnectCode)
    .filter((code): code is string => Boolean(code));
}

/** Guests only see seat tokens for players who are currently disconnected. */
function toPublicRoom(room: RoomInfo): RoomInfo {
  return {
    ...room,
    members: room.members.map((m) => ({
      ...m,
      reconnectCode: m.connected === false ? m.reconnectCode : undefined,
    })),
  };
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function isPeerIdTaken(err: unknown): boolean {
  const e = err as { type?: string; message?: string };
  const text = `${e?.type ?? ""} ${e?.message ?? err}`;
  return /unavailable-id|is taken|taken/i.test(text);
}

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
  const [myPlayerId, setMyPlayerId] = React.useState(options.myPlayerId);
  const [myReconnectCode, setMyReconnectCode] = React.useState<string | null>(null);

  const myPlayerIdRef = React.useRef(options.myPlayerId);
  myPlayerIdRef.current = myPlayerId;
  const isHostRef = React.useRef(false);
  const playerNameRef = React.useRef("");
  const manualDisconnectRef = React.useRef(false);
  const failoverInProgressRef = React.useRef(false);

  // PeerJS refs (not state — avoid triggering re-renders)
  const peerRef = React.useRef<PeerInstance>(null);
  /** host: map from peerId → DataConnection */
  const connectionsRef = React.useRef<Map<string, DataConnection>>(new Map());
  /** player: connection to host */
  const hostConnRef = React.useRef<DataConnection>(null);
  /** host: peerId → playerId */
  const peerToPlayerRef = React.useRef<Map<string, string>>(new Map());
  /** host: room state (includes private reconnect codes) */
  const roomInfoRef = React.useRef<RoomInfo | null>(null);
  /** host: last broadcasted game state, resent to a reconnecting player */
  const lastStateRef = React.useRef<unknown>(undefined);

  const updateRoom = React.useCallback((newRoom: RoomInfo) => {
    roomInfoRef.current = newRoom;
    setRoomInfo(newRoom);
    optionsRef.current.onRoomUpdate(newRoom);
  }, []);

  const sendToConn = React.useCallback((conn: DataConnection, msg: PeerMessage) => {
    try {
      conn.send(msg);
    } catch (err) {
      console.warn("[OnlineRoom] Failed to send", msg.type, err);
    }
  }, []);

  const broadcastRoom = React.useCallback(
    (room: RoomInfo) => {
      const msg: PeerMessage = { type: "ROOM_UPDATE", room: toPublicRoom(room) };
      for (const conn of connectionsRef.current.values()) {
        sendToConn(conn, msg);
      }
      updateRoom(room);
    },
    [sendToConn, updateRoom]
  );

  // ─── Shared: handle an incoming message ────────────────────────────────────

  const handleMessage = React.useCallback(
    (msg: PeerMessage, fromPeerId: string) => {
      switch (msg.type) {
        case "ROOM_UPDATE":
          updateRoom(msg.room);
          break;

        case "GAME_STATE":
          lastStateRef.current = msg.state;
          optionsRef.current.onGameState(msg.state);
          break;

        case "PLAYER_ACTION":
          optionsRef.current.onAction(msg.action, msg.fromPlayerId);
          break;

        case "GAME_STARTED":
          setStatus("playing");
          optionsRef.current.onGameStarted();
          break;

        case "JOIN_OK":
        case "REJOIN_OK":
          myPlayerIdRef.current = msg.playerId;
          setMyPlayerId(msg.playerId);
          setMyReconnectCode(msg.reconnectCode);
          updateRoom(msg.room);
          if (msg.type === "REJOIN_OK") {
            setStatus(msg.room.started ? "playing" : "connected");
          }
          break;

        case "JOIN_ERROR":
        case "REJOIN_ERROR":
          if (failoverInProgressRef.current) break;
          setError(msg.reason);
          setStatus("error");
          break;

        default:
          console.warn("[OnlineRoom] Unknown message type", msg, fromPeerId);
      }
    },
    [updateRoom]
  );

  const markDisconnected = React.useCallback(
    (playerId: string, closedPeerId: string) => {
      const current = roomInfoRef.current;
      if (!current) return;
      const member = current.members.find((m) => m.id === playerId);
      // Ignore stale close events after the seat was already claimed by a rejoin.
      if (!member || member.peerId !== closedPeerId) return;
      if (member.connected === false) return;

      const next: RoomInfo = {
        ...current,
        members: current.members.map((m) =>
          m.id === playerId ? { ...m, connected: false } : m
        ),
      };
      broadcastRoom(next);
      optionsRef.current.onPlayerDisconnected?.(playerId);
    },
    [broadcastRoom]
  );

  const acceptRejoin = React.useCallback(
    (conn: DataConnection, member: RoomMember, playerName?: string) => {
      const current = roomInfoRef.current;
      if (!current) return;

      if (member.peerId !== conn.peer) {
        const oldConn = connectionsRef.current.get(member.peerId);
        if (oldConn && oldConn !== conn) {
          try {
            oldConn.close();
          } catch {
            /* ignore */
          }
          connectionsRef.current.delete(member.peerId);
        }
        peerToPlayerRef.current.delete(member.peerId);
      }

      peerToPlayerRef.current.set(conn.peer, member.id);
      connectionsRef.current.set(conn.peer, conn);

      const next: RoomInfo = {
        ...current,
        members: current.members.map((m) =>
          m.id === member.id
            ? {
                ...m,
                peerId: conn.peer,
                connected: true,
                name: playerName?.trim() ? playerName.trim() : m.name,
              }
            : m
        ),
      };

      const wasDisconnected = member.connected === false;
      broadcastRoom(next);

      const reconnectCode = member.reconnectCode ?? "";
      sendToConn(conn, {
        type: "REJOIN_OK",
        playerId: member.id,
        reconnectCode,
        room: toPublicRoom(next),
      });

      if (next.started) {
        sendToConn(conn, { type: "GAME_STARTED" });
        if (lastStateRef.current !== undefined) {
          sendToConn(conn, { type: "GAME_STATE", state: lastStateRef.current });
        }
      }

      if (wasDisconnected) {
        optionsRef.current.onPlayerReconnected?.(member.id);
      }
    },
    [broadcastRoom, sendToConn]
  );

  const handleHostData = React.useCallback(
    (conn: DataConnection, rawData: unknown) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = rawData as any;
      const current = roomInfoRef.current;
      if (!current) return;

      if (data?.type === "JOIN") {
        const join = data as MsgJoin;
        const existing = current.members.find((m) => m.id === join.playerId);
        if (existing) {
          acceptRejoin(conn, existing, join.playerName);
          return;
        }
        if (current.started) {
          sendToConn(conn, {
            type: "JOIN_ERROR",
            reason:
              "This game already started. Ask someone still in the room for a rejoin code.",
          });
          return;
        }

        const reconnectCode = generateSeatCode(existingSeatCodes(current));
        peerToPlayerRef.current.set(conn.peer, join.playerId);
        connectionsRef.current.set(conn.peer, conn);

        const member: RoomMember = {
          id: join.playerId,
          name: join.playerName,
          role: "player",
          peerId: conn.peer,
          connected: true,
          reconnectCode,
        };
        const next: RoomInfo = {
          ...current,
          members: [...current.members, member],
        };
        broadcastRoom(next);
        sendToConn(conn, {
          type: "JOIN_OK",
          playerId: member.id,
          reconnectCode,
          room: toPublicRoom(next),
        });
        return;
      }

      if (data?.type === "REJOIN") {
        const rejoin = data as MsgRejoin;
        const token = (rejoin.reconnectCode ?? "").toUpperCase().trim();
        const member = current.members.find(
          (m) => m.reconnectCode === token && m.id !== current.hostId
        );
        if (!member) {
          sendToConn(conn, {
            type: "REJOIN_ERROR",
            reason: "That rejoin code doesn't match a player in this room.",
          });
          return;
        }
        acceptRejoin(conn, member, rejoin.playerName);
        return;
      }

      handleMessage(data as PeerMessage, conn.peer);
    },
    [acceptRejoin, broadcastRoom, handleMessage, sendToConn]
  );

  // ─── Host: attach listeners to a new connection ────────────────────────────

  const attachHostListeners = React.useCallback(
    (conn: DataConnection) => {
      conn.on("open", () => {
        console.log("[OnlineRoom:host] Player connected:", conn.peer);
        connectionsRef.current.set(conn.peer, conn);
        if (roomInfoRef.current) {
          sendToConn(conn, {
            type: "ROOM_UPDATE",
            room: toPublicRoom(roomInfoRef.current),
          });
        }
      });

      conn.on("data", (data: unknown) => {
        handleHostData(conn, data);
      });

      conn.on("close", () => {
        console.log("[OnlineRoom:host] Player disconnected:", conn.peer);
        connectionsRef.current.delete(conn.peer);
        const playerId = peerToPlayerRef.current.get(conn.peer);
        if (playerId) markDisconnected(playerId, conn.peer);
      });

      conn.on("error", (err: unknown) => {
        console.error("[OnlineRoom:host] Connection error:", err);
      });
    },
    [handleHostData, markDisconnected, sendToConn]
  );

  // ─── createRoom ────────────────────────────────────────────────────────────

  const createRoom = React.useCallback(
    async (playerName: string) => {
      setStatus("creating");
      setError(null);

      const code = generateRoomCode();
      const peerId = `fandf-${code}`;
      const hostPlayerId = optionsRef.current.myPlayerId;
      myPlayerIdRef.current = hostPlayerId;
      setMyPlayerId(hostPlayerId);

      try {
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

        const hostReconnect = generateSeatCode();
        setMyReconnectCode(hostReconnect);

        const initialRoom: RoomInfo = {
          roomCode: code,
          gameId: optionsRef.current.gameId,
          hostId: hostPlayerId,
          members: [
            {
              id: hostPlayerId,
              name: playerName,
              role: "host",
              peerId,
              connected: true,
              reconnectCode: hostReconnect,
            },
          ],
          started: false,
        };

        playerNameRef.current = playerName;
        isHostRef.current = true;
        manualDisconnectRef.current = false;
        updateRoom(initialRoom);
        setRoomCode(code);
        setIsHost(true);
        setStatus("waiting");

        peer.on("connection", (conn: DataConnection) => {
          attachHostListeners(conn);
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to create room";
        setError(message);
        setStatus("error");
        console.error("[OnlineRoom] createRoom failed:", err);
      }
    },
    [attachHostListeners, updateRoom]
  );

  // ─── joinRoom ──────────────────────────────────────────────────────────────

  const teardownPeer = React.useCallback(() => {
    try {
      hostConnRef.current?.close();
    } catch {
      /* ignore */
    }
    hostConnRef.current = null;
    for (const conn of connectionsRef.current.values()) {
      try {
        conn.close();
      } catch {
        /* ignore */
      }
    }
    connectionsRef.current.clear();
    peerToPlayerRef.current.clear();
    try {
      peerRef.current?.destroy();
    } catch {
      /* ignore */
    }
    peerRef.current = null;
  }, []);

  const runFailoverRef = React.useRef<() => Promise<void>>(async () => {});

  const joinRoom = React.useCallback(
    async (code: string, playerName: string, joinOptions?: JoinRoomOptions): Promise<boolean> => {
      if (!joinOptions?.quiet) {
        setStatus("joining");
        setError(null);
      }

      const normalizedCode = code.toUpperCase().trim();
      const hostPeerId = `fandf-${normalizedCode}`;
      const joiningPlayerId = myPlayerIdRef.current || optionsRef.current.myPlayerId;
      const myPeerId = `fandf-player-${joiningPlayerId}-${Date.now()}`;
      const timeoutMs = joinOptions?.timeoutMs ?? 20_000;
      playerNameRef.current = playerName;

      try {
        teardownPeer();
        const { Peer } = await import("peerjs");
        const peer = new Peer(myPeerId);
        peerRef.current = peer;

        await new Promise<void>((resolve, reject) => {
          peer.on("open", () => resolve());
          peer.on("error", (err: unknown) => {
            reject(new Error(`PeerJS error: ${String(err)}`));
          });
          setTimeout(() => reject(new Error("Peer setup timed out")), 12_000);
        });

        const conn = peer.connect(hostPeerId, { reliable: true });
        hostConnRef.current = conn;

        await new Promise<void>((resolve, reject) => {
          conn.on("open", resolve);
          conn.on("error", (err: unknown) => {
            reject(new Error(`Connection error: ${String(err)}`));
          });
          setTimeout(
            () => reject(new Error("Join timed out — check the room code")),
            timeoutMs
          );
        });

        if (joinOptions?.reconnectToken) {
          conn.send({
            type: "REJOIN",
            reconnectCode: joinOptions.reconnectToken,
            playerName,
          } satisfies MsgRejoin);
        } else {
          conn.send({
            type: "JOIN",
            playerId: joiningPlayerId,
            playerName,
          } satisfies MsgJoin);
        }

        conn.on("data", (data: unknown) => {
          handleMessage(data as PeerMessage, hostPeerId);
        });

        conn.on("close", () => {
          if (manualDisconnectRef.current || isHostRef.current) return;
          void runFailoverRef.current();
        });

        setRoomCode(normalizedCode);
        isHostRef.current = false;
        setIsHost(false);
        setStatus((prev) =>
          prev === "joining" || prev === "idle" || prev === "transferring"
            ? "connected"
            : prev
        );
        return true;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to join room";
        if (!joinOptions?.quiet) {
          setError(message);
          setStatus("error");
        }
        console.error("[OnlineRoom] joinRoom failed:", err);
        teardownPeer();
        return false;
      }
    },
    [handleMessage, teardownPeer]
  );

  const tryClaimHost = React.useCallback(
    async (snapshot: RoomInfo, oldHostId: string): Promise<boolean> => {
      const code = snapshot.roomCode;
      const peerId = `fandf-${code}`;
      const newHostId = myPlayerIdRef.current;

      try {
        teardownPeer();
        const { Peer } = await import("peerjs");
        const peer = new Peer(peerId);

        await new Promise<void>((resolve, reject) => {
          const timer = window.setTimeout(
            () => reject(new Error("Host claim timed out")),
            8_000
          );
          peer.on("open", () => {
            window.clearTimeout(timer);
            resolve();
          });
          peer.on("error", (err: unknown) => {
            window.clearTimeout(timer);
            reject(err);
          });
        });

        peerRef.current = peer;
        const departedCode = generateSeatCode(existingSeatCodes(snapshot));
        const next = promoteMemberToHost(snapshot, newHostId, departedCode);

        isHostRef.current = true;
        setIsHost(true);
        setRoomCode(code);
        setStatus(next.started ? "playing" : "waiting");
        updateRoom(next);

        peer.on("connection", (conn: DataConnection) => {
          attachHostListeners(conn);
        });

        broadcastRoom(next);
        optionsRef.current.onBecameHost?.();
        optionsRef.current.onPlayerDisconnected?.(oldHostId);
        console.log("[OnlineRoom] Took over host as", newHostId);
        return true;
      } catch (err) {
        if (!isPeerIdTaken(err)) {
          console.warn("[OnlineRoom] Host claim failed:", err);
        }
        teardownPeer();
        isHostRef.current = false;
        setIsHost(false);
        return false;
      }
    },
    [attachHostListeners, broadcastRoom, teardownPeer, updateRoom]
  );

  const runFailover = React.useCallback(async () => {
    if (manualDisconnectRef.current || isHostRef.current) return;
    if (failoverInProgressRef.current) return;
    failoverInProgressRef.current = true;

    const snapshot = roomInfoRef.current;
    if (!snapshot) {
      setStatus("disconnected");
      setError("Disconnected from host.");
      failoverInProgressRef.current = false;
      return;
    }

    const oldHostId = snapshot.hostId;
    const myIndex = successorClaimIndex(
      snapshot,
      oldHostId,
      myPlayerIdRef.current
    );

    if (hostSuccessorCandidates(snapshot, oldHostId).length === 0) {
      setStatus("disconnected");
      setError("The host left and nobody else is in the room.");
      failoverInProgressRef.current = false;
      return;
    }

    setStatus("transferring");
    setError(null);
    teardownPeer();
    await sleep(800);

    const name = playerNameRef.current || "Player";
    const deadline = Date.now() + 28_000;

    try {
      while (Date.now() < deadline && !manualDisconnectRef.current) {
        const elapsed = 28_000 - (deadline - Date.now());
        const claimAt = Math.max(0, myIndex) * 4_000;

        if (myIndex >= 0 && elapsed >= claimAt) {
          const claimed = await tryClaimHost(snapshot, oldHostId);
          if (claimed) return;
        }

        const joined = await joinRoom(snapshot.roomCode, name, {
          timeoutMs: 5_000,
          quiet: true,
        });
        if (joined) {
          setStatus(snapshot.started ? "playing" : "connected");
          return;
        }

        await sleep(1_200);
      }

      setStatus("disconnected");
      setError("The host left and the room could not be recovered.");
    } finally {
      failoverInProgressRef.current = false;
    }
  }, [joinRoom, teardownPeer, tryClaimHost]);

  runFailoverRef.current = runFailover;

  // ─── broadcastState (host only) ────────────────────────────────────────────

  const broadcastState = React.useCallback((state: unknown) => {
    lastStateRef.current = state;
    const msg: PeerMessage = { type: "GAME_STATE", state };
    for (const conn of connectionsRef.current.values()) {
      sendToConn(conn, msg);
    }
  }, [sendToConn]);

  // ─── sendAction (player → host) ────────────────────────────────────────────

  const sendAction = React.useCallback((action: unknown) => {
    const msg: PeerMessage = {
      type: "PLAYER_ACTION",
      action,
      fromPlayerId: myPlayerIdRef.current,
    };
    if (hostConnRef.current) {
      hostConnRef.current.send(msg);
    }
  }, []);

  // ─── broadcastStart (host only) ────────────────────────────────────────────

  const broadcastStart = React.useCallback(() => {
    const msg: PeerMessage = { type: "GAME_STARTED" };
    for (const conn of connectionsRef.current.values()) {
      sendToConn(conn, msg);
    }

    if (roomInfoRef.current) {
      // Drop anyone who never came back to the lobby — they weren't dealt in.
      // Players who disconnect after this stay in the roster and can rejoin.
      const started: RoomInfo = {
        ...roomInfoRef.current,
        started: true,
        members: roomInfoRef.current.members.filter(
          (m) => m.connected !== false
        ),
      };
      broadcastRoom(started);
    }
    setStatus("playing");
  }, [broadcastRoom, sendToConn]);

  // ─── disconnect ────────────────────────────────────────────────────────────

  const disconnect = React.useCallback(() => {
    manualDisconnectRef.current = true;
    failoverInProgressRef.current = false;
    isHostRef.current = false;
    teardownPeer();
    lastStateRef.current = undefined;
    setStatus("idle");
    setRoomCode(null);
    setRoomInfo(null);
    setIsHost(false);
    setError(null);
    setMyReconnectCode(null);
  }, [teardownPeer]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      manualDisconnectRef.current = true;
      peerRef.current?.destroy();
    };
  }, []);

  return {
    status,
    roomCode,
    roomInfo,
    isHost,
    error,
    myPlayerId,
    myReconnectCode,
    createRoom,
    joinRoom,
    broadcastState,
    sendAction,
    broadcastStart,
    disconnect,
  };
}
