/**
 * ModernArtTableOnline — Online game surface for Modern Art.
 *
 * Architecture
 * ────────────
 * HOST   — creates a PeerJS room. Holds the authoritative ModernArtState in
 *          useReducer. Validates and applies every action (local + remote),
 *          then broadcasts the full state to all peers.
 *
 * PLAYER — connects to the host's room by code. Holds a read-only copy of
 *          state pushed by the host. Sends actions via sendAction().
 *
 * On every device: getMaskedStateForPlayer() strips other players' money and
 * masks hidden-auction bids so each player only sees what they should.
 */

"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { useOnlineRoom } from "@/hooks/useOnlineRoom";
import type { RoomInfo } from "@/lib/online/types";
import type { GameConfig } from "@/game/core/types";
import { modernArtFacts } from "../rules";
import { formatPlayerRange, isPlayerCountAllowed } from "@/game/core/rulesFacts";
import { createInitialState } from "../state";
import { reduce } from "../reducer";
import { validateAction } from "../validation";
import { getMaskedStateForPlayer } from "../selectors";
import { ModernArtGame } from "./ModernArtGame";
import type { ModernArtState } from "../types";
import type { ModernArtAction } from "../actions";

// ─── Props ────────────────────────────────────────────────────────────────────

export interface ModernArtTableOnlineProps {
  isHost: boolean;
  /** Host: display name to show in the room */
  hostName?: string;
  /** Stable per-device player ID */
  myPlayerId: string;
  /** Joining player: 6-letter room code */
  initialRoomCode?: string;
  /** Joining player: display name */
  initialPlayerName?: string;
  onExit?: () => void;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ModernArtTableOnline({
  isHost,
  hostName,
  myPlayerId,
  initialRoomCode,
  initialPlayerName,
  onExit,
}: ModernArtTableOnlineProps) {
  // ── State — null until game starts ────────────────────────────────────────

  const [state, dispatch] = React.useReducer(
    (
      s: ModernArtState | null,
      a: ModernArtState | ModernArtAction
    ): ModernArtState | null => {
      // A "phase" field without a "type" field = full-state replacement (from host)
      if ("phase" in a && !("type" in a)) return a as ModernArtState;
      if (s === null) return null;
      return reduce(s, a as ModernArtAction);
    },
    null
  );

  // Ref always tracks the latest state for use inside async callbacks
  const stateRef = React.useRef<ModernArtState | null>(null);
  React.useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const [roomInfo, setRoomInfo] = React.useState<RoomInfo | null>(null);
  const [gameStarted, setGameStarted] = React.useState(false);
  /** Host-only: Mystery Player toggle (only matters for 3-player games) */
  const [mysteryEnabled, setMysteryEnabled] = React.useState(false);

  // ── Online room ────────────────────────────────────────────────────────────

  const room = useOnlineRoom({
    gameId: "modern-art",
    myPlayerId,

    onGameState: (rawState) => {
      // Received full authoritative state from host → replace local copy
      dispatch(rawState as ModernArtState);
    },

    onAction: (rawAction, fromPlayerId) => {
      // Host receives a player's action → validate + apply → broadcast
      if (!isHost) return;
      const action = rawAction as ModernArtAction;
      const currentState = stateRef.current;
      if (!currentState) return;
      const result = validateAction(currentState, action);
      if (!result.valid) {
        console.warn("[MA:online] Invalid action from", fromPlayerId, result.reason);
        return;
      }
      dispatch(action);
    },

    onRoomUpdate: (info) => setRoomInfo(info),

    onGameStarted: () => setGameStarted(true),
  });

  // ── Broadcast after every host state change ────────────────────────────────

  const prevStateRef = React.useRef<ModernArtState | null>(null);
  React.useEffect(() => {
    if (!isHost || !state || state === prevStateRef.current) return;
    prevStateRef.current = state;
    room.broadcastState(state);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, isHost]);

  // ── On mount: create or join room ─────────────────────────────────────────

  const initializedRef = React.useRef(false);
  React.useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    if (isHost) {
      room.createRoom(hostName ?? "Host");
    } else if (initialRoomCode) {
      room.joinRoom(initialRoomCode, initialPlayerName ?? "Player");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Start game (host only) ────────────────────────────────────────────────

  function handleStartGame() {
    if (!roomInfo) return;
    const playerCount = roomInfo.members.length;
    const config: GameConfig = {
      players: roomInfo.members.map((m, i) => ({
        id: m.id,
        name: m.name,
        seat: i,
        isHuman: true,
      })),
      options: {
        mysteryPlayer: playerCount === 3 ? mysteryEnabled : false,
        startingPlayerIndex: Math.floor(Math.random() * playerCount),
      },
    };
    const initialState = createInitialState(config);
    // Replace local state immediately (treated as state broadcast, not action)
    dispatch(initialState);
    room.broadcastStart();
    room.broadcastState(initialState);
    setGameStarted(true);
  }

  // ── Rematch (host rebuilds state with same players) ────────────────────────

  function handleRematch() {
    if (!roomInfo || !isHost) return;
    const playerCount = roomInfo.members.length;
    const config: GameConfig = {
      players: roomInfo.members.map((m, i) => ({
        id: m.id,
        name: m.name,
        seat: i,
        isHuman: true,
      })),
      options: {
        mysteryPlayer: playerCount === 3 ? mysteryEnabled : false,
        startingPlayerIndex: Math.floor(Math.random() * playerCount),
      },
    };
    const newState = createInitialState(config);
    dispatch(newState);
    room.broadcastState(newState);
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleAction = React.useCallback(
    (action: ModernArtAction) => {
      if (isHost) {
        // Host validates and applies locally; useEffect broadcasts to peers
        // We can't read the latest state here safely in the callback; use dispatch
        // The reducer handles validation through the engine
        dispatch(action);
      } else {
        // Non-host: send to host for validation
        room.sendAction(action);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isHost]
  );

  // ── Waiting Room ──────────────────────────────────────────────────────────

  if (!gameStarted || !state) {
    return (
      <WaitingRoom
        isHost={isHost}
        roomCode={room.roomCode}
        roomInfo={roomInfo}
        status={room.status}
        error={room.error}
        mysteryEnabled={mysteryEnabled}
        onToggleMystery={() => setMysteryEnabled((v) => !v)}
        onStart={handleStartGame}
        onExit={onExit}
      />
    );
  }

  // ── Game Surface ──────────────────────────────────────────────────────────

  const maskedState = getMaskedStateForPlayer(state, myPlayerId);

  return (
    <ModernArtGame
      state={maskedState}
      myPlayerId={myPlayerId}
      onAction={handleAction}
      onExit={onExit}
      onRematch={isHost ? handleRematch : undefined}
    />
  );
}

// ─── Waiting Room ─────────────────────────────────────────────────────────────

interface WaitingRoomProps {
  isHost: boolean;
  roomCode: string | null;
  roomInfo: RoomInfo | null;
  status: string;
  error: string | null;
  mysteryEnabled: boolean;
  onToggleMystery: () => void;
  onStart: () => void;
  onExit?: () => void;
}

function WaitingRoom({
  isHost,
  roomCode,
  roomInfo,
  status,
  error,
  mysteryEnabled,
  onToggleMystery,
  onStart,
  onExit,
}: WaitingRoomProps) {
  const joinedCount = roomInfo?.members.length ?? 0;
  const canStart = isHost && isPlayerCountAllowed(modernArtFacts, joinedCount);
  const show3PlayerOption = isHost && joinedCount === 3;

  return (
    <div className="min-h-dvh flex flex-col bg-[rgb(var(--color-background))] text-[rgb(var(--color-text))]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-[rgb(var(--color-border))]">
        <button
          onClick={onExit}
          className="text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-text))] text-sm transition-colors"
        >
          ← Exit
        </button>
        <span className="text-xs text-[rgb(var(--color-text-muted))] font-[family-name:var(--font-display)]">
          Modern Art · Online
        </span>
        <div className="w-10" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 gap-8 max-w-sm mx-auto w-full">
        {/* Room code display (host) */}
        {isHost && roomCode && (
          <div className="flex flex-col items-center gap-3 w-full">
            <p className="text-[rgb(var(--color-text-muted))] text-sm text-center">
              Share this code with your friends:
            </p>
            <div
              className="w-full bg-[rgb(var(--color-surface-raised))] border border-[rgb(var(--color-border))] rounded-2xl px-8 py-5 text-center cursor-pointer select-all"
              title="Tap to copy"
              onClick={() => navigator.clipboard?.writeText(roomCode)}
            >
              <span className="text-4xl font-mono font-black tracking-[0.3em] text-amber-400">
                {roomCode}
              </span>
            </div>
            <p className="text-[rgb(var(--color-text-muted))] text-xs text-center">
              Each player opens the app, taps <strong>Join Room</strong>, and enters this code.
              <br />
              Tap the code to copy it.
            </p>
          </div>
        )}

        {/* Connection status (joining player) */}
        {!isHost && (
          <div className="flex flex-col items-center gap-3">
            <div
              className={cn(
                "w-14 h-14 rounded-full flex items-center justify-center text-2xl",
                status === "connected" || status === "playing"
                  ? "bg-emerald-500/20"
                  : status === "joining"
                  ? "bg-amber-500/20"
                  : "bg-red-500/20"
              )}
            >
              {status === "joining"
                ? "⏳"
                : status === "connected" || status === "playing"
                ? "✅"
                : "❌"}
            </div>
            <p className="text-[rgb(var(--color-text-muted))] text-sm text-center">
              {status === "joining"
                ? "Connecting to room…"
                : status === "connected" || status === "playing"
                ? "Connected! Waiting for the host to start…"
                : error ?? "Something went wrong."}
            </p>
          </div>
        )}

        {/* Player list */}
        {roomInfo && roomInfo.members.length > 0 && (
          <div className="w-full flex flex-col gap-2">
            <p className="text-[rgb(var(--color-text-muted))] text-xs uppercase tracking-wider text-center font-medium">
              Players ({joinedCount} / {formatPlayerRange(modernArtFacts)})
            </p>
            {roomInfo.members.map((m, i) => (
              <div
                key={m.id}
                className="flex items-center gap-3 px-4 py-3 bg-[rgb(var(--color-surface-raised))] rounded-xl border border-[rgb(var(--color-border))]"
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                  style={{ backgroundColor: `hsl(${(i * 60 + 30) % 360}, 50%, 40%)` }}
                >
                  {m.name[0].toUpperCase()}
                </div>
                <span className="text-sm font-medium flex-1">{m.name}</span>
                {m.id === roomInfo.hostId && (
                  <span className="text-[10px] text-[rgb(var(--color-text-muted))] bg-[rgb(var(--color-surface-sunken))] px-2 py-0.5 rounded-full border border-[rgb(var(--color-border))]">
                    host
                  </span>
                )}
              </div>
            ))}
            {joinedCount < modernArtFacts.minPlayers && isHost && (
              <p className="text-[rgb(var(--color-text-muted))] text-xs text-center mt-1">
                Need at least {modernArtFacts.minPlayers} players to start
              </p>
            )}
          </div>
        )}

        {/* Mystery Player option (host, 3 players only) */}
        {show3PlayerOption && (
          <div className="w-full flex items-center justify-between bg-[rgb(var(--color-surface-raised))] border border-violet-500/20 rounded-xl px-4 py-3">
            <div>
              <div className="text-sm font-medium">Mystery Player</div>
              <div className="text-xs text-[rgb(var(--color-text-muted))]">
                3-player variant with a hidden 4th hand
              </div>
            </div>
            <button
              onClick={onToggleMystery}
              className={cn(
                "relative w-11 h-6 rounded-full transition-all shrink-0",
                mysteryEnabled
                  ? "bg-[rgb(var(--color-primary))]"
                  : "bg-[rgb(var(--color-border))]"
              )}
            >
              <div
                className={cn(
                  "absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform",
                  mysteryEnabled ? "translate-x-5" : "translate-x-0"
                )}
              />
            </button>
          </div>
        )}

        {/* Start button (host) */}
        {isHost && (
          <div className="w-full flex flex-col gap-2">
            <Button size="lg" fullWidth onClick={onStart} disabled={!canStart}>
              {canStart
                ? `🎨 Start Game (${joinedCount} players)`
                : joinedCount < modernArtFacts.minPlayers
                ? "Waiting for players…"
                : `Too many players (max ${modernArtFacts.maxPlayers})`}
            </Button>
            {!canStart && joinedCount < modernArtFacts.minPlayers && (
              <p className="text-[rgb(var(--color-text-muted))] text-xs text-center">
                Minimum {modernArtFacts.minPlayers} players required
              </p>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="w-full bg-red-900/20 border border-red-800/50 rounded-xl px-4 py-3">
            <p className="text-red-400 text-sm">{error}</p>
            {error.includes("timed out") && (
              <p className="text-red-600 text-xs mt-1">
                Make sure the room code is correct and the host is still connected.
              </p>
            )}
          </div>
        )}

        {/* Status label */}
        <p className="text-[rgb(var(--color-text-muted))] text-xs text-center">
          {status === "creating" && "Setting up room…"}
          {status === "waiting" && isHost && "Waiting for others to join…"}
          {status === "error" && "Connection failed."}
          {status === "disconnected" && "Disconnected from room."}
        </p>
      </div>
    </div>
  );
}
