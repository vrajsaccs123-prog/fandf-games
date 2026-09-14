"use client";

/**
 * Undercover — Online game surface.
 *
 * Architecture (mirrors CodenamesOnline):
 *  HOST   — creates PeerJS room, holds authoritative state, broadcasts every change.
 *  PLAYER — connects to host, receives state, sends actions back.
 *
 * Lobby phase (before game starts):
 *  Host configures undercovers / Mr. Whites / difficulty / special characters.
 *  Changes are broadcast to all players so they can see the current settings.
 *  Host starts when enough players have joined.
 *
 * Game phase:
 *  Host dispatches UndercoverActions, validates, reduces, broadcasts full state.
 *  Players send actions → host processes → broadcasts back.
 *  Each device renders getPlayerView(state, myPlayerId) — sees only their own card.
 */

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { useOnlineRoom } from "@/hooks/useOnlineRoom";
import type { RoomInfo } from "@/lib/online/types";
import { normalizeRoomCode, isValidRoomCode } from "@/lib/online/roomCode";
import { undercoverFacts } from "../rules";
import { createInitialState } from "../state";
import { reduce } from "../reducer";
import { validateAction } from "../validation";
import { getPlayerView } from "../selectors";
import type { UndercoverState, SpecialCharacterSettings, WordDifficulty } from "../types";
import type { UndercoverAction } from "../actions";
import { UndercoverGame } from "./UndercoverGame";

// ─── Settings that the host configures pre-game ────────────────────────────────

interface WaitingSettings {
  undercovers: number;
  mrWhites: number;
  difficulty: WordDifficulty;
  specialCharacters: SpecialCharacterSettings;
}

const DEFAULT_SETTINGS: WaitingSettings = {
  undercovers: 1,
  mrWhites: 1,
  difficulty: "medium",
  specialCharacters: {
    judge: false, joyFool: false, ghost: false,
    lovers: false, revenger: false, duelists: false,
  },
};

// ─── Sync payload broadcast by host ───────────────────────────────────────────

type UndercoverSync =
  | { phase: "lobby"; settings: WaitingSettings }
  | { phase: "game"; gameState: UndercoverState };

// ─── Special character display list ───────────────────────────────────────────

const SPECIALS: Array<{ key: keyof SpecialCharacterSettings; name: string; emoji: string; desc: string }> = [
  { key: "judge",    name: "Judge",    emoji: "⚖️",  desc: "Breaks perfect ties." },
  { key: "joyFool",  name: "Joy Fool", emoji: "🤡",  desc: "+4 pts if voted out round 1." },
  { key: "ghost",    name: "Ghost",    emoji: "👻",  desc: "One player keeps voting after elimination." },
  { key: "lovers",   name: "Lovers",   emoji: "💕",  desc: "Bonded pair — one dies, both die." },
  { key: "revenger", name: "Revenger", emoji: "🗡️", desc: "Drags one target on elimination." },
  { key: "duelists", name: "Duelists", emoji: "⚔️", desc: "Rivals: first out −2, other +2." },
];

// ─── Entry component ──────────────────────────────────────────────────────────

interface UndercoverOnlineProps {
  onExit: () => void;
}

type OnlineScreen = "pick-mode" | "create" | "join" | "room";

export function UndercoverOnline({ onExit }: UndercoverOnlineProps) {
  const [screen, setScreen] = React.useState<OnlineScreen>("pick-mode");
  const [isHost, setIsHost] = React.useState(false);
  const [hostName, setHostName] = React.useState("");
  const [joinName, setJoinName] = React.useState("");
  const [joinCode, setJoinCode] = React.useState("");
  const [myName, setMyName] = React.useState("");
  const [initialRoomCode, setInitialRoomCode] = React.useState("");

  // Stable player ID for this session (unique per browser tab)
  const [myPlayerId] = React.useState(() => `uc-${Date.now()}`);

  // ── Pick mode ────────────────────────────────────────────────────────────

  if (screen === "pick-mode") {
    return (
      <div className="flex flex-col gap-5">
        <h3 className="font-semibold text-[rgb(var(--color-text))]">Online — How are you playing?</h3>
        <div className="grid grid-cols-2 gap-3">
          {(
            [
              { label: "Create Room", sub: "Host a game for friends", emoji: "🏠", action: "create" as const },
              { label: "Join Room",   sub: "Enter a 6-letter code",   emoji: "🔗", action: "join"   as const },
            ]
          ).map((opt) => (
            <button
              key={opt.action}
              onClick={() => {
                setIsHost(opt.action === "create");
                setScreen(opt.action);
              }}
              className={cn(
                "flex flex-col items-center gap-2 p-5 rounded-xl border-2 transition-all",
                "border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface-raised))]",
                "hover:border-[rgb(var(--color-border-strong))] active:scale-95"
              )}
            >
              <span className="text-3xl">{opt.emoji}</span>
              <div className="text-center">
                <div className="font-bold text-sm text-[rgb(var(--color-text))]">{opt.label}</div>
                <div className="text-xs text-[rgb(var(--color-text-muted))] mt-0.5">{opt.sub}</div>
              </div>
            </button>
          ))}
        </div>
        <Button variant="secondary" onClick={onExit}>← Back</Button>
      </div>
    );
  }

  // ── Create Room ───────────────────────────────────────────────────────────

  if (screen === "create") {
    const ready = hostName.trim().length >= 1;
    return (
      <div className="flex flex-col gap-4">
        <h3 className="font-semibold text-[rgb(var(--color-text))]">Create a Room</h3>
        <p className="text-xs text-[rgb(var(--color-text-muted))]">
          Share the room code with friends so they can join on their device.
        </p>
        <input
          type="text"
          placeholder="Your name"
          value={hostName}
          onChange={(e) => setHostName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && ready) { setMyName(hostName.trim()); setScreen("room"); }}}
          maxLength={20}
          autoFocus
          className={cn(
            "h-11 px-3 rounded-lg border text-sm",
            "bg-[rgb(var(--color-surface))] text-[rgb(var(--color-text))]",
            "border-[rgb(var(--color-border-strong))]",
            "placeholder:text-[rgb(var(--color-text-subtle))]",
            "focus:outline-none focus:ring-2 focus:ring-[rgb(var(--color-focus))]"
          )}
        />
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setScreen("pick-mode")} className="flex-1">← Back</Button>
          <Button
            variant="primary"
            disabled={!ready}
            onClick={() => { setMyName(hostName.trim()); setScreen("room"); }}
            className="flex-1"
          >
            Create Room →
          </Button>
        </div>
      </div>
    );
  }

  // ── Join Room ─────────────────────────────────────────────────────────────

  if (screen === "join") {
    const normalised = normalizeRoomCode(joinCode);
    const codeValid = isValidRoomCode(normalised);
    const ready = joinName.trim().length >= 1 && codeValid;
    return (
      <div className="flex flex-col gap-4">
        <h3 className="font-semibold text-[rgb(var(--color-text))]">Join a Room</h3>
        <input
          type="text"
          placeholder="Room code (6 letters)"
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
          maxLength={6}
          autoFocus
          className={cn(
            "h-11 px-3 rounded-lg border text-sm font-mono tracking-widest uppercase",
            "bg-[rgb(var(--color-surface))] text-[rgb(var(--color-text))]",
            "border-[rgb(var(--color-border-strong))]",
            "placeholder:text-[rgb(var(--color-text-subtle))] placeholder:font-normal placeholder:tracking-normal placeholder:normal-case",
            "focus:outline-none focus:ring-2 focus:ring-[rgb(var(--color-focus))]"
          )}
        />
        <input
          type="text"
          placeholder="Your name"
          value={joinName}
          onChange={(e) => setJoinName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && ready) { setMyName(joinName.trim()); setInitialRoomCode(normalised); setScreen("room"); }}}
          maxLength={20}
          className={cn(
            "h-11 px-3 rounded-lg border text-sm",
            "bg-[rgb(var(--color-surface))] text-[rgb(var(--color-text))]",
            "border-[rgb(var(--color-border-strong))]",
            "placeholder:text-[rgb(var(--color-text-subtle))]",
            "focus:outline-none focus:ring-2 focus:ring-[rgb(var(--color-focus))]"
          )}
        />
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setScreen("pick-mode")} className="flex-1">← Back</Button>
          <Button
            variant="primary"
            disabled={!ready}
            onClick={() => { setMyName(joinName.trim()); setInitialRoomCode(normalised); setScreen("room"); }}
            className="flex-1"
          >
            Join →
          </Button>
        </div>
      </div>
    );
  }

  // ── Room (lobby + game) ───────────────────────────────────────────────────

  return (
    <OnlineRoom
      isHost={isHost}
      myPlayerId={myPlayerId}
      myName={myName}
      initialRoomCode={isHost ? "" : initialRoomCode}
      onExit={onExit}
    />
  );
}

// ─── OnlineRoom — manages PeerJS + authoritative game state ───────────────────

interface OnlineRoomProps {
  isHost: boolean;
  myPlayerId: string;
  myName: string;
  initialRoomCode: string;
  onExit: () => void;
}

function OnlineRoom({ isHost, myPlayerId, myName, initialRoomCode, onExit }: OnlineRoomProps) {

  // ── Host: authoritative refs (avoid stale closures) ────────────────────────
  const settingsRef = React.useRef<WaitingSettings>({ ...DEFAULT_SETTINGS });
  const gameStateRef = React.useRef<UndercoverState | null>(null);
  const memberNamesRef = React.useRef<Record<string, string>>({ [myPlayerId]: myName });

  // React state for rendering
  const [settings, setSettings] = React.useState<WaitingSettings>({ ...DEFAULT_SETTINGS });
  const [memberNames, setMemberNames] = React.useState<Record<string, string>>({ [myPlayerId]: myName });
  const [gameState, setGameState] = React.useState<UndercoverState | null>(null);

  // Non-host: sync state received from host
  const [syncState, setSyncState] = React.useState<UndercoverSync | null>(null);
  const [roomInfo, setRoomInfo] = React.useState<RoomInfo | null>(null);

  // Cumulative scores across games (tracked locally per device)
  const [cumulativeScores, setCumulativeScores] = React.useState<Record<string, number>>({});
  const [gamesPlayed, setGamesPlayed] = React.useState(0);

  const broadcastRef = React.useRef<(s: unknown) => void>(() => {});

  // ── Helpers ─────────────────────────────────────────────────────────────

  function broadcastLobby(s?: WaitingSettings) {
    const payload = s ?? settingsRef.current;
    broadcastRef.current({ phase: "lobby", settings: payload } satisfies UndercoverSync);
  }

  function broadcastGame(gs: UndercoverState) {
    broadcastRef.current({ phase: "game", gameState: gs } satisfies UndercoverSync);
  }

  function buildPlayersFromRoom(info: RoomInfo) {
    return info.members.map((m, i) => ({
      id: m.id,
      name: m.name,
      seat: i,
      isHuman: true,
    }));
  }

  // ── PeerJS hook ───────────────────────────────────────────────────────────

  const room = useOnlineRoom({
    gameId: "undercover",
    myPlayerId,

    onGameState: (raw) => {
      const sync = raw as UndercoverSync;
      setSyncState(sync);
      if (sync.phase === "game") {
        gameStateRef.current = sync.gameState;
        setGameState(sync.gameState);
      } else {
        // Returning to lobby (host reset)
        gameStateRef.current = null;
        setGameState(null);
        settingsRef.current = sync.settings;
        setSettings(sync.settings);
      }
    },

    onAction: (rawAction, fromPlayerId) => {
      if (!isHost) return;
      const action = rawAction as UndercoverAction;
      const gs = gameStateRef.current;
      if (!gs) return;

      // Host-only controls: confirm elimination, revote
      if (
        (action.type === "CONFIRM_ELIMINATION" || action.type === "REQUEST_REVOTE") &&
        fromPlayerId !== gs.creatorId
      ) {
        return;
      }

      // Players may only act as themselves
      if (
        (action.type === "SUBMIT_VOTE" && action.voterId !== fromPlayerId) ||
        (action.type === "SUBMIT_CLUE" && action.playerId !== fromPlayerId) ||
        (action.type === "SUBMIT_MR_WHITE_GUESS" && action.playerId !== fromPlayerId) ||
        (action.type === "REVENGER_TARGET" && action.revengerId !== fromPlayerId) ||
        (action.type === "HIDE_CARD" && action.playerId !== fromPlayerId)
      ) {
        return;
      }

      const result = validateAction(gs, action);
      if (!result.valid) return;
      const newGs = reduce(gs, action);
      gameStateRef.current = newGs;
      setGameState(newGs);
      broadcastGame(newGs);
    },

    onRoomUpdate: (info) => {
      setRoomInfo(info);

      // Update member names map
      const newNames = { ...memberNamesRef.current };
      for (const m of info.members) newNames[m.id] = m.name;
      memberNamesRef.current = newNames;
      setMemberNames(newNames);

      // Host: re-broadcast lobby so new joiners get current settings
      if (isHost) {
        broadcastLobby();
      }
    },

    onGameStarted: () => {},
    onPlayerDisconnected: () => {
      // Could show a toast; for now just let players reconnect
    },
  });

  broadcastRef.current = room.broadcastState;

  // ── Initialise connection on mount ────────────────────────────────────────

  const initializedRef = React.useRef(false);
  React.useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    if (isHost) {
      room.createRoom(myName);
    } else {
      room.joinRoom(initialRoomCode, myName);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Host: re-broadcast whenever game state changes ────────────────────────

  const prevBroadcastKeyRef = React.useRef("");
  React.useEffect(() => {
    if (!isHost) return;
    const key = gameState
      ? [
          gameState.phase,
          gameState.roundNumber,
          gameState.clues.length,
          Object.keys(gameState.votes).length,
          gameState.pendingElimination ?? "",
          gameState.pendingMrWhiteGuess ?? "",
          gameState.winCondition?.faction ?? "",
          gameState.cardsRevealed.length,
        ].join(":")
      : "lobby";
    if (key === prevBroadcastKeyRef.current) return;
    prevBroadcastKeyRef.current = key;
    if (gameState) {
      broadcastGame(gameState);
    } else {
      broadcastLobby();
    }
  });

  // ── Settings change (host only) ───────────────────────────────────────────

  function handleSettingsChange(newSettings: WaitingSettings) {
    settingsRef.current = newSettings;
    setSettings(newSettings);
    broadcastLobby(newSettings);
  }

  // ── Start game ────────────────────────────────────────────────────────────

  function handleStartGame() {
    if (!isHost || !roomInfo) return;
    const players = buildPlayersFromRoom(roomInfo);
    if (players.length < undercoverFacts.minPlayers) return;

    const s = settingsRef.current;
    const civilians = players.length - s.undercovers - s.mrWhites;
    if (civilians < 1) return;

    const gs = {
      ...createInitialState({
        players,
        options: {
          mode: "online",
          civilians,
          undercovers: s.undercovers,
          mrWhites: s.mrWhites,
          difficulty: s.difficulty,
          specialCharacters: s.specialCharacters,
        },
      }),
      mode: "online" as const,
      creatorId: myPlayerId,
    };
    gameStateRef.current = gs;
    setGameState(gs);
    room.broadcastStart();
    broadcastGame(gs);
  }

  // ── Game actions ──────────────────────────────────────────────────────────

  function handleGameAction(action: UndercoverAction) {
    if (isHost) {
      const gs = gameStateRef.current;
      if (!gs) return;
      const result = validateAction(gs, action);
      if (!result.valid) return;
      const newGs = reduce(gs, action);
      gameStateRef.current = newGs;
      setGameState(newGs);
      broadcastGame(newGs);
    } else {
      room.sendAction(action);
    }
  }

  // ── Accumulate scores helper ──────────────────────────────────────────────

  function accumulateAndIncrement() {
    const gs = gameStateRef.current;
    if (gs) {
      setCumulativeScores((prev) => {
        const next = { ...prev };
        for (const p of gs.players) next[p.id] = (next[p.id] ?? 0) + p.totalScore;
        return next;
      });
    }
    setGamesPlayed((g) => g + 1);
  }

  // ── Play Again (host restarts with same players/settings) ─────────────────

  function handlePlayAgain(difficulty?: WordDifficulty) {
    if (!isHost || !roomInfo) return;
    accumulateAndIncrement();

    const players = buildPlayersFromRoom(roomInfo);
    const s = settingsRef.current;
    if (difficulty) {
      s.difficulty = difficulty;
      settingsRef.current = s;
      setSettings({ ...s });
    }
    const civilians = players.length - s.undercovers - s.mrWhites;
    if (civilians < 1) {
      // Invalid config — fall back to waiting room
      gameStateRef.current = null;
      setGameState(null);
      broadcastLobby();
      return;
    }

    const gs = {
      ...createInitialState({
        players,
        options: {
          mode: "online",
          civilians,
          undercovers: s.undercovers,
          mrWhites: s.mrWhites,
          difficulty: s.difficulty,
          specialCharacters: s.specialCharacters,
        },
      }),
      mode: "online" as const,
      creatorId: myPlayerId,
    };
    gameStateRef.current = gs;
    setGameState(gs);
    broadcastGame(gs);
  }

  // ── End Session ───────────────────────────────────────────────────────────

  function handleEndSession() {
    accumulateAndIncrement();
    gameStateRef.current = null;
    setGameState(null);
    room.disconnect();
    onExit();
  }

  // ── Leave room (non-host or host abandons waiting room) ───────────────────

  function handleLeave() {
    room.disconnect();
    onExit();
  }

  // ── Derive display values ─────────────────────────────────────────────────

  const displayGameState: UndercoverState | null = isHost
    ? gameState
    : syncState?.phase === "game"
    ? syncState.gameState
    : null;

  const displaySettings: WaitingSettings = isHost
    ? settings
    : syncState?.phase === "lobby"
    ? syncState.settings
    : settings;

  // ── Error ─────────────────────────────────────────────────────────────────

  if (room.status === "error") {
    return (
      <div className="flex flex-col gap-4 items-center py-6 text-center">
        <div className="text-4xl">⚠️</div>
        <p className="font-semibold text-red-500">{room.error}</p>
        <Button variant="secondary" onClick={onExit}>← Back</Button>
      </div>
    );
  }

  // ── Connecting spinner ────────────────────────────────────────────────────

  if (room.status === "creating" || room.status === "joining") {
    return (
      <div className="flex flex-col gap-3 items-center py-8 text-center">
        <div className="text-3xl animate-pulse">🔗</div>
        <p className="text-[rgb(var(--color-text-muted))] text-sm">
          {room.status === "creating" ? "Creating room…" : "Connecting to room…"}
        </p>
      </div>
    );
  }

  // ── Active game ───────────────────────────────────────────────────────────

  if (displayGameState) {
    const view = getPlayerView(displayGameState, myPlayerId);
    return (
      <div className="fixed inset-0 z-[var(--z-game)] bg-[rgb(var(--color-surface-sunken))] overflow-y-auto">
        <UndercoverGame
          view={view}
          onAction={handleGameAction}
          onExit={handleLeave}
          onPlayAgain={isHost ? handlePlayAgain : undefined}
          onEndSession={isHost ? handleEndSession : undefined}
          cumulativeScores={cumulativeScores}
          gamesPlayed={gamesPlayed}
        />
      </div>
    );
  }

  // ── Waiting room ──────────────────────────────────────────────────────────

  const members = roomInfo?.members ?? [{ id: myPlayerId, name: myName, role: "host" as const, peerId: "" }];
  const playerCount = members.length;
  const civilians = playerCount - displaySettings.undercovers - displaySettings.mrWhites;
  const canStart =
    isHost &&
    playerCount >= undercoverFacts.minPlayers &&
    civilians >= 1 &&
    displaySettings.undercovers >= 1;

  const startErrors: string[] = [];
  if (playerCount < undercoverFacts.minPlayers) {
    startErrors.push(`Need at least ${undercoverFacts.minPlayers} players (${undercoverFacts.minPlayers - playerCount} more)`);
  }
  if (civilians < 1) startErrors.push("Too many undercovers / Mr. Whites — increase players or reduce counts");

  return (
    <WaitingRoom
      isHost={isHost}
      myPlayerId={myPlayerId}
      roomCode={room.roomCode}
      members={members}
      settings={displaySettings}
      civilians={civilians}
      canStart={canStart}
      startErrors={startErrors}
      onSettingsChange={isHost ? handleSettingsChange : undefined}
      onStartGame={handleStartGame}
      onLeave={handleLeave}
    />
  );
}

// ─── Waiting Room UI ──────────────────────────────────────────────────────────

interface WaitingRoomProps {
  isHost: boolean;
  myPlayerId: string;
  roomCode: string | null;
  members: Array<{ id: string; name: string; role: string }>;
  settings: WaitingSettings;
  civilians: number;
  canStart: boolean;
  startErrors: string[];
  onSettingsChange?: (s: WaitingSettings) => void;
  onStartGame: () => void;
  onLeave: () => void;
}

function WaitingRoom({
  isHost,
  myPlayerId,
  roomCode,
  members,
  settings,
  civilians,
  canStart,
  startErrors,
  onSettingsChange,
  onStartGame,
  onLeave,
}: WaitingRoomProps) {
  return (
    <div className="flex flex-col gap-5">

      {/* ── Room code ────────────────────────────────────────────────────── */}
      {roomCode && (
        <div className="p-4 rounded-xl bg-[rgb(var(--color-surface-raised))] border border-[rgb(var(--color-border))] text-center">
          <p className="text-xs text-[rgb(var(--color-text-muted))] mb-1">Share this code with everyone</p>
          <p className="text-4xl font-black tracking-widest text-[rgb(var(--color-text))]">{roomCode}</p>
          <p className="text-xs text-[rgb(var(--color-text-muted))] mt-1">Each player opens the Undercover page and joins</p>
        </div>
      )}

      {/* ── Players ──────────────────────────────────────────────────────── */}
      <div>
        <p className="text-sm font-semibold text-[rgb(var(--color-text))] mb-2">
          Players ({members.length})
        </p>
        <div className="flex flex-col gap-1.5">
          {members.map((m) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg text-sm",
                m.id === myPlayerId
                  ? "bg-[rgb(var(--color-primary))]/10 border border-[rgb(var(--color-primary))]/30 font-semibold"
                  : "bg-[rgb(var(--color-surface-raised))]"
              )}
            >
              <span>{m.role === "host" ? "👑" : "👤"}</span>
              <span className="flex-1 text-[rgb(var(--color-text))]">
                {m.name}
                {m.id === myPlayerId && <span className="ml-1 text-[rgb(var(--color-text-muted))] font-normal">(you)</span>}
              </span>
              {m.role === "host" && (
                <span className="text-xs text-[rgb(var(--color-text-muted))]">Host</span>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── Settings (host edits, others see read-only) ───────────────────── */}
      {isHost && onSettingsChange ? (
        <SettingsPicker
          settings={settings}
          playerCount={members.length}
          civilians={civilians}
          onChange={onSettingsChange}
        />
      ) : (
        <SettingsReadOnly settings={settings} civilians={civilians} playerCount={members.length} />
      )}

      {/* ── Validation ────────────────────────────────────────────────────── */}
      {startErrors.map((err, i) => (
        <p key={i} className="text-xs text-amber-600 dark:text-amber-400">⚠️ {err}</p>
      ))}
      {canStart && (
        <p className="text-xs text-green-600 dark:text-green-400">
          ✓ Ready to start with {members.length} players!
        </p>
      )}

      {/* ── Actions ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        {isHost ? (
          <Button variant="primary" size="lg" fullWidth onClick={onStartGame} disabled={!canStart}>
            🕵️ Start Game
          </Button>
        ) : (
          <div className="text-sm text-[rgb(var(--color-text-muted))] text-center py-2">
            Waiting for the host to start the game…
          </div>
        )}
        <Button variant="secondary" fullWidth onClick={onLeave}>
          ← Leave Room
        </Button>
      </div>
    </div>
  );
}

// ─── Settings Picker (host only) ──────────────────────────────────────────────

function SettingsPicker({
  settings,
  playerCount,
  civilians,
  onChange,
}: {
  settings: WaitingSettings;
  playerCount: number;
  civilians: number;
  onChange: (s: WaitingSettings) => void;
}) {
  const maxUndercovers = Math.max(1, playerCount - 2);
  const maxMrWhites = Math.max(0, playerCount - settings.undercovers - 1);

  function set(patch: Partial<WaitingSettings>) {
    onChange({ ...settings, ...patch });
  }

  function setSpecial(key: keyof SpecialCharacterSettings, val: boolean) {
    onChange({ ...settings, specialCharacters: { ...settings.specialCharacters, [key]: val } });
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm font-semibold text-[rgb(var(--color-text))]">Game Settings</p>

      {/* Faction counts */}
      <div className="flex flex-col gap-3 p-4 bg-[rgb(var(--color-surface-raised))] rounded-xl">

        <FactionCounter
          label="Undercovers"
          emoji="🥷"
          value={settings.undercovers}
          min={1}
          max={maxUndercovers}
          onDecrement={() => set({ undercovers: Math.max(1, settings.undercovers - 1) })}
          onIncrement={() => set({ undercovers: Math.min(maxUndercovers, settings.undercovers + 1) })}
        />
        <FactionCounter
          label="Mr. Whites"
          emoji="⬜"
          value={settings.mrWhites}
          min={0}
          max={maxMrWhites}
          onDecrement={() => set({ mrWhites: Math.max(0, settings.mrWhites - 1) })}
          onIncrement={() => set({ mrWhites: Math.min(maxMrWhites, settings.mrWhites + 1) })}
        />

        {/* Civilians is derived */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-[rgb(var(--color-text-muted))]">
            👤 Civilians
          </span>
          <span className={cn(
            "font-bold tabular-nums",
            civilians < 1 ? "text-red-500" : "text-[rgb(var(--color-text))]"
          )}>
            {civilians < 0 ? 0 : civilians}
          </span>
        </div>

        {/* Divider */}
        <div className="h-px bg-[rgb(var(--color-border))]" />

        {/* Difficulty */}
        <div>
          <p className="text-xs text-[rgb(var(--color-text-muted))] mb-2">Word Difficulty</p>
          <div className="flex gap-2">
            {(["easy", "medium", "difficult"] as WordDifficulty[]).map((d) => (
              <button
                key={d}
                onClick={() => set({ difficulty: d })}
                className={cn(
                  "flex-1 py-2 rounded-lg text-xs font-semibold border-2 capitalize transition-all",
                  settings.difficulty === d
                    ? "border-[rgb(var(--color-primary))] bg-[rgb(var(--color-primary))]/10 text-[rgb(var(--color-primary))]"
                    : "border-[rgb(var(--color-border))] text-[rgb(var(--color-text-muted))] hover:border-[rgb(var(--color-border-strong))]"
                )}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Special characters */}
      <div>
        <p className="text-xs font-semibold text-[rgb(var(--color-text-muted))] mb-2 uppercase tracking-wider">
          Special Characters (optional)
        </p>
        <div className="flex flex-col gap-2">
          {SPECIALS.map((sp) => {
            const active = settings.specialCharacters[sp.key];
            return (
              <button
                key={sp.key}
                onClick={() => setSpecial(sp.key, !active)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 text-left transition-all",
                  active
                    ? "border-[rgb(var(--color-primary))]/60 bg-[rgb(var(--color-primary))]/8"
                    : "border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface-raised))] hover:border-[rgb(var(--color-border-strong))]"
                )}
              >
                <span className="text-xl shrink-0">{sp.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className={cn("text-xs font-bold", active ? "text-[rgb(var(--color-primary))]" : "text-[rgb(var(--color-text))]")}>
                    {sp.name}
                  </div>
                  <div className="text-[10px] text-[rgb(var(--color-text-muted))] truncate">{sp.desc}</div>
                </div>
                <div className={cn(
                  "w-4 h-4 rounded-full border-2 shrink-0 transition-all",
                  active
                    ? "bg-[rgb(var(--color-primary))] border-[rgb(var(--color-primary))]"
                    : "border-[rgb(var(--color-border-strong))]"
                )} />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── FactionCounter helper ────────────────────────────────────────────────────

function FactionCounter({
  label, emoji, value, min, max, onDecrement, onIncrement,
}: {
  label: string; emoji: string; value: number;
  min: number; max: number;
  onDecrement: () => void; onIncrement: () => void;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-[rgb(var(--color-text-muted))]">{emoji} {label}</span>
      <div className="flex items-center gap-2">
        <button
          onClick={onDecrement}
          disabled={value <= min}
          className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-base transition-all bg-[rgb(var(--color-surface-sunken))] text-[rgb(var(--color-text))] disabled:opacity-30 hover:bg-[rgb(var(--color-border-strong))]"
        >−</button>
        <span className="w-4 text-center font-bold tabular-nums text-[rgb(var(--color-text))]">{value}</span>
        <button
          onClick={onIncrement}
          disabled={value >= max}
          className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-base transition-all bg-[rgb(var(--color-surface-sunken))] text-[rgb(var(--color-text))] disabled:opacity-30 hover:bg-[rgb(var(--color-border-strong))]"
        >+</button>
      </div>
    </div>
  );
}

// ─── Settings Read-Only (non-host players) ────────────────────────────────────

function SettingsReadOnly({
  settings, civilians, playerCount,
}: { settings: WaitingSettings; civilians: number; playerCount: number }) {
  const activeSpecials = SPECIALS.filter((s) => settings.specialCharacters[s.key]);
  return (
    <div className="p-4 bg-[rgb(var(--color-surface-raised))] rounded-xl flex flex-col gap-2 text-sm">
      <p className="font-semibold text-[rgb(var(--color-text))] text-xs mb-1">Game Settings (set by host)</p>
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-[rgb(var(--color-text-muted))]">
        <span>👥 {playerCount} players</span>
        <span>👤 {civilians < 0 ? 0 : civilians} civilians</span>
        <span>🥷 {settings.undercovers} undercover{settings.undercovers !== 1 ? "s" : ""}</span>
        {settings.mrWhites > 0 && <span>⬜ {settings.mrWhites} Mr. White{settings.mrWhites !== 1 ? "s" : ""}</span>}
        <span className="capitalize">📖 {settings.difficulty}</span>
      </div>
      {activeSpecials.length > 0 && (
        <p className="text-[rgb(var(--color-text-muted))] text-xs">
          Special: {activeSpecials.map((s) => `${s.emoji} ${s.name}`).join(" · ")}
        </p>
      )}
    </div>
  );
}
