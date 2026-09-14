"use client";

/**
 * Codenames — Online game surface.
 *
 * Architecture (mirrors UnoTableOnline):
 *  HOST   — creates PeerJS room, holds authoritative state, broadcasts every change.
 *  PLAYER — connects to host, receives state, sends actions back.
 *
 * Lobby phase (before game starts):
 *  Each device picks team (Red / Blue) and role (Spymaster / Operative).
 *  Changes are sent as LOBBY_CHANGE actions → host updates + rebroadcasts.
 *  Host starts when teams are valid.
 *
 * Game phase:
 *  Normal CodenamesActions flow through the same channel.
 *  Each device sees role-appropriate board via myPlayerId prop.
 */

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { useOnlineRoom } from "@/hooks/useOnlineRoom";
import type { RoomInfo } from "@/lib/online/types";
import { normalizeRoomCode, isValidRoomCode } from "@/lib/online/roomCode";
import { createInitialState } from "../state";
import { reduce } from "../reducer";
import { validateAction } from "../validation";
import type { CodenamesState, Team } from "../types";
import type { CodenamesAction } from "../actions";
import { CodenamesGame } from "./CodenamesGame";

// ─── Shared types ─────────────────────────────────────────────────────────────

interface Assignment {
  team: "red" | "blue" | "none";
  isSpymaster: boolean;
}

/** Broadcasted by host to all players */
type CodenamesSync =
  | { phase: "lobby"; assignments: Record<string, Assignment>; memberNames: Record<string, string> }
  | { phase: "game"; gameState: CodenamesState };

// ─── Exported component ───────────────────────────────────────────────────────

interface CodenamesOnlineProps {
  onExit: () => void;
}

type OnlineScreen = "pick-mode" | "create" | "join" | "room";

export function CodenamesOnline({ onExit }: CodenamesOnlineProps) {
  const [screen, setScreen] = React.useState<OnlineScreen>("pick-mode");
  const [isHost, setIsHost] = React.useState(false);
  const [hostName, setHostName] = React.useState("");
  const [joinName, setJoinName] = React.useState("");
  const [joinCode, setJoinCode] = React.useState("");
  const [myName, setMyName] = React.useState("");
  const [initialRoomCode, setInitialRoomCode] = React.useState("");
  // Stable player ID for this session
  const [myPlayerId] = React.useState(() => `cn-${Date.now()}`);

  // ── Pick mode ────────────────────────────────────────────────────────────

  if (screen === "pick-mode") {
    return (
      <div className="flex flex-col gap-5">
        <h3 className="font-semibold text-[rgb(var(--color-text))]">How are you playing?</h3>
        <div className="grid grid-cols-2 gap-3">
          {(
            [
              { label: "Create Room", sub: "Host a game for friends", emoji: "🏠", action: "create" },
              { label: "Join Room", sub: "Enter a 6-letter code", emoji: "🔗", action: "join" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.action}
              onClick={() => {
                setIsHost(opt.action === "create");
                setScreen(opt.action as "create" | "join");
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
        <Button variant="secondary" onClick={onExit}>
          ← Back
        </Button>
      </div>
    );
  }

  // ── Create Room setup ─────────────────────────────────────────────────────

  if (screen === "create") {
    const ready = hostName.trim().length >= 1;
    return (
      <div className="flex flex-col gap-4">
        <h3 className="font-semibold text-[rgb(var(--color-text))]">Create a Room</h3>
        <input
          type="text"
          placeholder="Your name"
          value={hostName}
          onChange={(e) => setHostName(e.target.value)}
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
          <Button variant="secondary" onClick={() => setScreen("pick-mode")} className="flex-1">
            ← Back
          </Button>
          <Button
            variant="primary"
            disabled={!ready}
            onClick={() => {
              setMyName(hostName.trim());
              setScreen("room");
            }}
            className="flex-1"
          >
            Create Room →
          </Button>
        </div>
      </div>
    );
  }

  // ── Join Room setup ───────────────────────────────────────────────────────

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
          <Button variant="secondary" onClick={() => setScreen("pick-mode")} className="flex-1">
            ← Back
          </Button>
          <Button
            variant="primary"
            disabled={!ready}
            onClick={() => {
              setMyName(joinName.trim());
              setInitialRoomCode(normalised);
              setScreen("room");
            }}
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

// ─── OnlineRoom — manages PeerJS + state ─────────────────────────────────────

interface OnlineRoomProps {
  isHost: boolean;
  myPlayerId: string;
  myName: string;
  initialRoomCode: string;
  onExit: () => void;
}

function OnlineRoom({ isHost, myPlayerId, myName, initialRoomCode, onExit }: OnlineRoomProps) {
  // ── Host: authoritative state ─────────────────────────────────────────────
  const assignmentsRef = React.useRef<Record<string, Assignment>>({
    [myPlayerId]: { team: "none", isSpymaster: false },
  });
  const memberNamesRef = React.useRef<Record<string, string>>({ [myPlayerId]: myName });
  const gameStateRef = React.useRef<CodenamesState | null>(null);

  // React state for rendering
  const [assignments, setAssignments] = React.useState<Record<string, Assignment>>(() => ({
    [myPlayerId]: { team: "none", isSpymaster: false },
  }));
  const [memberNames, setMemberNames] = React.useState<Record<string, string>>({
    [myPlayerId]: myName,
  });
  const [gameState, setGameState] = React.useState<CodenamesState | null>(null);

  // ── Non-host: sync state received from host ───────────────────────────────
  const [syncState, setSyncState] = React.useState<CodenamesSync | null>(null);
  const [roomInfo, setRoomInfo] = React.useState<RoomInfo | null>(null);

  // ── Broadcast ref (stable reference to room.broadcastState) ───────────────
  const broadcastRef = React.useRef<(s: unknown) => void>(() => {});

  function hostBroadcastLobby(a: Record<string, Assignment>, names: Record<string, string>) {
    broadcastRef.current({ phase: "lobby", assignments: a, memberNames: names } satisfies CodenamesSync);
  }
  function hostBroadcastGame(gs: CodenamesState) {
    broadcastRef.current({ phase: "game", gameState: gs } satisfies CodenamesSync);
  }

  // ── PeerJS hook ───────────────────────────────────────────────────────────

  const room = useOnlineRoom({
    gameId: "codenames",
    myPlayerId,

    onGameState: (raw) => {
      const sync = raw as CodenamesSync;
      setSyncState(sync);
      if (sync.phase === "game") {
        setGameState(sync.gameState);
        gameStateRef.current = sync.gameState;
      }
    },

    onAction: (rawAction) => {
      if (!isHost) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const action = rawAction as any;

      if (action.type === "LOBBY_CHANGE") {
        const newA = {
          ...assignmentsRef.current,
          [action.playerId]: { team: action.team, isSpymaster: action.isSpymaster },
        };
        assignmentsRef.current = newA;
        setAssignments(newA);
        hostBroadcastLobby(newA, memberNamesRef.current);
        return;
      }

      // Regular game action
      const gs = gameStateRef.current;
      if (!gs) return;
      const result = validateAction(gs, action as CodenamesAction);
      if (!result.valid) return;
      const newGs = reduce(gs, action as CodenamesAction);
      gameStateRef.current = newGs;
      setGameState(newGs);
      hostBroadcastGame(newGs);
    },

    onRoomUpdate: (info) => {
      setRoomInfo(info);

      // Update member names
      const newNames = { ...memberNamesRef.current };
      for (const m of info.members) newNames[m.id] = m.name;
      memberNamesRef.current = newNames;
      setMemberNames(newNames);

      // Host: add new members to assignments
      if (isHost) {
        const curA = { ...assignmentsRef.current };
        let changed = false;
        for (const m of info.members) {
          if (!curA[m.id]) {
            curA[m.id] = { team: "none", isSpymaster: false };
            changed = true;
          }
        }
        if (changed) {
          assignmentsRef.current = curA;
          setAssignments(curA);
          hostBroadcastLobby(curA, newNames);
        }
      }
    },

    onGameStarted: () => {},
  });

  // Keep broadcastRef stable
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

  // ── Host: broadcast after local state changes ─────────────────────────────
  const prevSyncRef = React.useRef<string>("");
  React.useEffect(() => {
    if (!isHost) return;
    const gs = gameState;
    const sync: CodenamesSync = gs
      ? { phase: "game", gameState: gs }
      : { phase: "lobby", assignments, memberNames };
    const key = JSON.stringify(sync);
    if (key === prevSyncRef.current) return;
    prevSyncRef.current = key;
    broadcastRef.current(sync);
  }, [assignments, memberNames, gameState, isHost]);

  // ── Derive display state ──────────────────────────────────────────────────
  const displayAssignments: Record<string, Assignment> = isHost
    ? assignments
    : syncState?.phase === "lobby"
    ? syncState.assignments
    : {};
  const displayMemberNames: Record<string, string> = isHost
    ? memberNames
    : syncState?.phase === "lobby"
    ? syncState.memberNames
    : memberNames;
  const displayGameState: CodenamesState | null = isHost
    ? gameState
    : syncState?.phase === "game"
    ? syncState.gameState
    : null;

  // ── Validation for starting ───────────────────────────────────────────────
  const entries = Object.entries(displayAssignments);
  const redPlayers = entries.filter(([, a]) => a.team === "red");
  const bluePlayers = entries.filter(([, a]) => a.team === "blue");
  const redSpymasters = redPlayers.filter(([, a]) => a.isSpymaster);
  const blueSpymasters = bluePlayers.filter(([, a]) => a.isSpymaster);
  const canStart =
    isHost &&
    redPlayers.length >= 2 &&
    bluePlayers.length >= 2 &&
    redSpymasters.length === 1 &&
    blueSpymasters.length === 1;

  // ── Team/role change (this player) ───────────────────────────────────────
  function handleMyChange(team: "red" | "blue" | "none", isSpy: boolean) {
    if (isHost) {
      const newA = { ...assignmentsRef.current, [myPlayerId]: { team, isSpymaster: isSpy } };
      assignmentsRef.current = newA;
      setAssignments(newA);
    } else {
      room.sendAction({ type: "LOBBY_CHANGE", playerId: myPlayerId, team, isSpymaster: isSpy });
    }
  }

  // ── Start game (host only) ────────────────────────────────────────────────
  function handleStartGame() {
    if (!isHost) return;
    const players: Array<{ id: string; name: string; seat: number; isHuman: boolean }> = [];
    const teams: Record<string, Team> = {};
    const spymasters: { red: string; blue: string } = { red: "", blue: "" };

    let seat = 0;
    for (const [pid, a] of Object.entries(assignmentsRef.current)) {
      if (a.team === "none") continue;
      players.push({ id: pid, name: memberNamesRef.current[pid] ?? "Player", seat: seat++, isHuman: true });
      teams[pid] = a.team;
      if (a.isSpymaster) spymasters[a.team] = pid;
    }

    const gs = createInitialState({ players, options: { teams, spymasters } });
    gameStateRef.current = gs;
    setGameState(gs);
    room.broadcastStart();
    hostBroadcastGame(gs);
  }

  // ── Game action (any player) ──────────────────────────────────────────────
  function handleGameAction(action: CodenamesAction) {
    if (isHost) {
      const gs = gameStateRef.current;
      if (!gs) return;
      const result = validateAction(gs, action);
      if (!result.valid) return;
      const newGs = reduce(gs, action);
      gameStateRef.current = newGs;
      setGameState(newGs);
      hostBroadcastGame(newGs);
    } else {
      room.sendAction(action);
    }
  }

  // ── Play Again (host: reset to lobby) ─────────────────────────────────────
  function handlePlayAgain() {
    if (!isHost) return;
    gameStateRef.current = null;
    setGameState(null);
    const newA = { ...assignmentsRef.current };
    // Reset each player to "none"
    for (const pid of Object.keys(newA)) newA[pid] = { team: "none", isSpymaster: false };
    assignmentsRef.current = newA;
    setAssignments(newA);
  }

  // ── Error / connecting screens ────────────────────────────────────────────
  if (room.status === "error") {
    return (
      <div className="flex flex-col gap-4 items-center py-6 text-center">
        <div className="text-4xl">⚠️</div>
        <p className="text-red-500 font-semibold">{room.error}</p>
        <Button variant="secondary" onClick={onExit}>← Back</Button>
      </div>
    );
  }

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
    return (
      <div className="fixed inset-0 z-[var(--z-game)] bg-[#0d2b0d] overflow-y-auto">
        <CodenamesGame
          state={displayGameState}
          onAction={handleGameAction}
          onExit={onExit}
          onPlayAgain={handlePlayAgain}
          myPlayerId={myPlayerId}
        />
      </div>
    );
  }

  // ── Waiting room ──────────────────────────────────────────────────────────
  const myAssignment = displayAssignments[myPlayerId] ?? { team: "none", isSpymaster: false };

  return (
    <WaitingRoom
      isHost={isHost}
      myPlayerId={myPlayerId}
      roomCode={room.roomCode}
      status={room.status}
      assignments={displayAssignments}
      memberNames={displayMemberNames}
      myAssignment={myAssignment}
      canStart={canStart}
      onMyChange={handleMyChange}
      onStartGame={handleStartGame}
      onExit={onExit}
    />
  );
}

// ─── Waiting Room ─────────────────────────────────────────────────────────────

interface WaitingRoomProps {
  isHost: boolean;
  myPlayerId: string;
  roomCode: string | null;
  status: string;
  assignments: Record<string, Assignment>;
  memberNames: Record<string, string>;
  myAssignment: Assignment;
  canStart: boolean;
  onMyChange: (team: "red" | "blue" | "none", isSpymaster: boolean) => void;
  onStartGame: () => void;
  onExit: () => void;
}

function WaitingRoom({
  isHost,
  myPlayerId,
  roomCode,
  assignments,
  memberNames,
  myAssignment,
  canStart,
  onMyChange,
  onStartGame,
  onExit,
}: WaitingRoomProps) {
  const entries = Object.entries(assignments);
  const redPlayers  = entries.filter(([, a]) => a.team === "red");
  const bluePlayers = entries.filter(([, a]) => a.team === "blue");
  const unassigned  = entries.filter(([, a]) => a.team === "none");

  // Validation messages
  const redSpies  = redPlayers.filter(([, a]) => a.isSpymaster).length;
  const blueSpies = bluePlayers.filter(([, a]) => a.isSpymaster).length;

  const issues: string[] = [];
  if (redPlayers.length < 2) issues.push(`Red needs ${2 - redPlayers.length} more player(s)`);
  if (bluePlayers.length < 2) issues.push(`Blue needs ${2 - bluePlayers.length} more player(s)`);
  if (redPlayers.length >= 2 && redSpies !== 1)
    issues.push(`Red needs exactly 1 Spymaster (has ${redSpies})`);
  if (bluePlayers.length >= 2 && blueSpies !== 1)
    issues.push(`Blue needs exactly 1 Spymaster (has ${blueSpies})`);

  return (
    <div className="flex flex-col gap-5">
      {/* Room code */}
      {roomCode && (
        <div className="p-4 rounded-xl bg-[rgb(var(--color-surface-raised))] border border-[rgb(var(--color-border))] text-center">
          <p className="text-xs text-[rgb(var(--color-text-muted))] mb-1">Share this code</p>
          <p className="text-3xl font-black tracking-widest text-[rgb(var(--color-text))]">
            {roomCode}
          </p>
          <p className="text-xs text-[rgb(var(--color-text-muted))] mt-1">
            Others join at the Codenames page
          </p>
        </div>
      )}

      {/* My team picker */}
      <MyTeamPicker assignment={myAssignment} onChange={onMyChange} />

      {/* Player roster */}
      <PlayerRoster
        redPlayers={redPlayers}
        bluePlayers={bluePlayers}
        unassigned={unassigned}
        memberNames={memberNames}
        myPlayerId={myPlayerId}
      />

      {/* Validation */}
      {issues.length > 0 && (
        <div className="flex flex-col gap-1">
          {issues.map((iss, i) => (
            <p key={i} className="text-xs text-amber-600 dark:text-amber-400">⚠️ {iss}</p>
          ))}
        </div>
      )}
      {canStart && (
        <p className="text-xs text-green-600 dark:text-green-400">
          ✓ Teams are ready! {redPlayers.length} vs {bluePlayers.length}
        </p>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-2">
        {isHost && (
          <Button variant="primary" size="lg" fullWidth onClick={onStartGame} disabled={!canStart}>
            🕵️ Start Game
          </Button>
        )}
        {!isHost && (
          <p className="text-sm text-[rgb(var(--color-text-muted))] text-center">
            Waiting for the host to start the game…
          </p>
        )}
        <Button variant="secondary" size="md" fullWidth onClick={onExit}>
          ← Leave Room
        </Button>
      </div>
    </div>
  );
}

// ─── My Team Picker ───────────────────────────────────────────────────────────

function MyTeamPicker({
  assignment,
  onChange,
}: {
  assignment: Assignment;
  onChange: (team: "red" | "blue" | "none", isSpymaster: boolean) => void;
}) {
  const { team, isSpymaster } = assignment;

  return (
    <div className="flex flex-col gap-3">
      <h3 className="font-semibold text-[rgb(var(--color-text))] text-sm">Your Setup</h3>

      {/* Team selection */}
      <div className="grid grid-cols-3 gap-2">
        {(
          [
            { value: "none" as const, emoji: "👤", label: "Unassigned" },
            { value: "red"  as const, emoji: "🔴", label: "Red" },
            { value: "blue" as const, emoji: "🔵", label: "Blue" },
          ]
        ).map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value, opt.value !== "none" ? isSpymaster : false)}
            className={cn(
              "flex flex-col items-center gap-1 py-3 rounded-xl border-2 transition-all text-sm font-semibold",
              team === opt.value
                ? opt.value === "red"
                  ? "border-red-500 bg-red-500/15 text-red-500"
                  : opt.value === "blue"
                  ? "border-blue-500 bg-blue-500/15 text-blue-500"
                  : "border-[rgb(var(--color-primary))] bg-[rgb(var(--color-primary))]/10 text-[rgb(var(--color-primary))]"
                : "border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface-raised))] text-[rgb(var(--color-text-muted))] hover:border-[rgb(var(--color-border-strong))]"
            )}
          >
            <span className="text-xl">{opt.emoji}</span>
            <span className="text-xs">{opt.label}</span>
          </button>
        ))}
      </div>

      {/* Role selection (only when on a team) */}
      <AnimatePresence>
        {team !== "none" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { value: false, emoji: "🔍", label: "Operative", sub: "Guess the words" },
                  { value: true,  emoji: "🕵️", label: "Spymaster", sub: "Give one-word clues" },
                ] as const
              ).map((opt) => (
                <button
                  key={String(opt.value)}
                  onClick={() => onChange(team, opt.value)}
                  className={cn(
                    "flex flex-col items-start gap-0.5 p-3 rounded-xl border-2 transition-all",
                    isSpymaster === opt.value
                      ? "border-amber-500 bg-amber-500/10"
                      : "border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface-raised))] hover:border-[rgb(var(--color-border-strong))]"
                  )}
                >
                  <span className="text-base">{opt.emoji}</span>
                  <span className="text-xs font-bold text-[rgb(var(--color-text))]">{opt.label}</span>
                  <span className="text-[10px] text-[rgb(var(--color-text-muted))]">{opt.sub}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Player Roster ────────────────────────────────────────────────────────────

function PlayerRoster({
  redPlayers,
  bluePlayers,
  unassigned,
  memberNames,
  myPlayerId,
}: {
  redPlayers: [string, Assignment][];
  bluePlayers: [string, Assignment][];
  unassigned: [string, Assignment][];
  memberNames: Record<string, string>;
  myPlayerId: string;
}) {
  function renderPlayer(pid: string, a: Assignment, teamColor: "red" | "blue" | null) {
    const isMe = pid === myPlayerId;
    const name = memberNames[pid] ?? pid;
    return (
      <div
        key={pid}
        className={cn(
          "flex items-center gap-2 py-1.5 px-2 rounded-lg text-xs",
          isMe
            ? teamColor === "red"
              ? "bg-red-500/20 font-bold"
              : teamColor === "blue"
              ? "bg-blue-500/20 font-bold"
              : "bg-[rgb(var(--color-surface-raised))] font-bold"
            : ""
        )}
      >
        <span className="text-sm">{a.isSpymaster ? "🕵️" : "🔍"}</span>
        <span className="flex-1 text-[rgb(var(--color-text))]">
          {name}
          {isMe && <span className="ml-1 text-[rgb(var(--color-text-muted))]">(you)</span>}
        </span>
        <span className="text-[rgb(var(--color-text-muted))] text-[10px]">
          {a.isSpymaster ? "Spymaster" : "Operative"}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <h3 className="font-semibold text-[rgb(var(--color-text))] text-sm">Players</h3>

      <div className="grid grid-cols-2 gap-3">
        {/* Red */}
        <div className="rounded-xl border-2 border-red-500/40 bg-red-500/5 p-3 flex flex-col gap-1">
          <p className="text-xs font-bold text-red-500 mb-1">🔴 Red ({redPlayers.length})</p>
          {redPlayers.length === 0 && (
            <p className="text-xs text-[rgb(var(--color-text-subtle))] italic">Empty</p>
          )}
          {redPlayers.map(([pid, a]) => renderPlayer(pid, a, "red"))}
        </div>

        {/* Blue */}
        <div className="rounded-xl border-2 border-blue-500/40 bg-blue-500/5 p-3 flex flex-col gap-1">
          <p className="text-xs font-bold text-blue-500 mb-1">🔵 Blue ({bluePlayers.length})</p>
          {bluePlayers.length === 0 && (
            <p className="text-xs text-[rgb(var(--color-text-subtle))] italic">Empty</p>
          )}
          {bluePlayers.map(([pid, a]) => renderPlayer(pid, a, "blue"))}
        </div>
      </div>

      {/* Unassigned */}
      {unassigned.length > 0 && (
        <div className="rounded-xl border border-dashed border-[rgb(var(--color-border-strong))] p-3 flex flex-col gap-1">
          <p className="text-xs font-semibold text-[rgb(var(--color-text-muted))] mb-1">
            Unassigned ({unassigned.length})
          </p>
          {unassigned.map(([pid, a]) => renderPlayer(pid, a, null))}
        </div>
      )}
    </div>
  );
}
