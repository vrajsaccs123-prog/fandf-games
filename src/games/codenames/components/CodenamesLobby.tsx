"use client";

/**
 * Codenames — top-level Lobby.
 *
 * Screen 1: Mode selection (Local / Online)
 * Screen 2a: Local setup (4 steps: Players → Teams → Spymasters → Review)
 * Screen 2b: Online flow (delegates to CodenamesOnline)
 */

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import type { CodenamesState, Team } from "../types";
import { createInitialState } from "../state";
import { reduce } from "../reducer";
import { CodenamesGame } from "./CodenamesGame";
import { CodenamesOnline } from "./CodenamesOnline";
import { TimerSettings } from "./TimerSettings";
import type { CodenamesAction } from "../actions";
import { codenamesFacts } from "../rules";
import { TIMER_DEFAULT_SECONDS } from "../timer";
import { clampPlayerCount, defaultPlayerCount, formatPlayerRange } from "@/game/core/rulesFacts";

// ─── Types ────────────────────────────────────────────────────────────────────

type TopScreen = "mode-select" | "local" | "online";
type TeamSlot = "red" | "blue" | "neutral";

interface SetupPlayer {
  id: string;
  name: string;
}

interface LocalSetupState {
  step: number;
  playerNames: string[];
  playerCount: number;
  teams: Record<string, TeamSlot>;
  spymasters: { red: string; blue: string };
  timerEnabled: boolean;
  timerSeconds: number;
}

const STEPS = ["Players", "Teams", "Spymasters", "Ready"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildSetupPlayers(names: string[]): SetupPlayer[] {
  return names
    .filter((n) => n.trim())
    .map((name, i) => ({ id: `player-${i + 1}`, name: name.trim() }));
}

function randomizeTeams(players: SetupPlayer[]): Record<string, TeamSlot> {
  const shuffled = [...players].sort(() => Math.random() - 0.5);
  const half = Math.ceil(shuffled.length / 2);
  const result: Record<string, TeamSlot> = {};
  shuffled.forEach((p, i) => { result[p.id] = i < half ? "red" : "blue"; });
  return result;
}

function autoBalance(players: SetupPlayer[]): Record<string, TeamSlot> {
  const result: Record<string, TeamSlot> = {};
  players.forEach((p, i) => { result[p.id] = i % 2 === 0 ? "red" : "blue"; });
  return result;
}

function neutralTeams(players: SetupPlayer[]): Record<string, TeamSlot> {
  const result: Record<string, TeamSlot> = {};
  players.forEach((p) => { result[p.id] = "neutral"; });
  return result;
}

// ─── Main Lobby ───────────────────────────────────────────────────────────────

export function CodenamesLobby() {
  const [topScreen, setTopScreen] = React.useState<TopScreen>("mode-select");

  if (topScreen === "online") {
    return <CodenamesOnline onExit={() => setTopScreen("mode-select")} />;
  }

  if (topScreen === "local") {
    return <LocalLobby onExit={() => setTopScreen("mode-select")} />;
  }

  // ── Mode selection ────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-5">
      <h3 className="font-semibold text-[rgb(var(--color-text))]">How are you playing?</h3>
      <div className="grid grid-cols-2 gap-3">
        {(
          [
            ...(codenamesFacts.supportsLocal
              ? [{ label: "Local", sub: "Same device, pass & play", emoji: "👥", screen: "local" as const }]
              : []),
            ...(codenamesFacts.supportsOnline
              ? [{ label: "Online", sub: "Each player on their own device", emoji: "🌐", screen: "online" as const }]
              : []),
          ]
        ).map((opt) => (
          <button
            key={opt.screen}
            onClick={() => setTopScreen(opt.screen)}
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
    </div>
  );
}

// ─── Local Lobby ──────────────────────────────────────────────────────────────

function LocalLobby({ onExit }: { onExit: () => void }) {
  const [setup, setSetup] = React.useState<LocalSetupState>({
    step: 0,
    playerCount: defaultPlayerCount(codenamesFacts),
    playerNames: Array(defaultPlayerCount(codenamesFacts)).fill(""),
    teams: {},
    spymasters: { red: "", blue: "" },
    timerEnabled: false,
    timerSeconds: TIMER_DEFAULT_SECONDS,
  });

  const [gameState, setGameState] = React.useState<CodenamesState | null>(null);

  // ── Derived ────────────────────────────────────────────────────────────────
  const setupPlayers = buildSetupPlayers(setup.playerNames);
  const namesValid = setupPlayers.length === setup.playerCount;

  const redPlayers   = setupPlayers.filter((p) => setup.teams[p.id] === "red");
  const bluePlayers  = setupPlayers.filter((p) => setup.teams[p.id] === "blue");
  const neutralPlayers = setupPlayers.filter(
    (p) => setup.teams[p.id] === "neutral" || !setup.teams[p.id]
  );

  const teamsValid =
    neutralPlayers.length === 0 && redPlayers.length >= 2 && bluePlayers.length >= 2;

  const spymastersValid =
    setup.spymasters.red !== "" &&
    setup.spymasters.blue !== "" &&
    setup.spymasters.red !== setup.spymasters.blue;

  function canAdvance(): boolean {
    if (setup.step === 0) return namesValid;
    if (setup.step === 1) return teamsValid;
    if (setup.step === 2) return spymastersValid;
    return namesValid && teamsValid && spymastersValid;
  }

  function movePlayer(playerId: string, to: TeamSlot) {
    setSetup((s) => {
      const newTeams = { ...s.teams, [playerId]: to };
      const newSpymasters = { ...s.spymasters };
      if (s.spymasters.red === playerId && to !== "red") newSpymasters.red = "";
      if (s.spymasters.blue === playerId && to !== "blue") newSpymasters.blue = "";
      return { ...s, teams: newTeams, spymasters: newSpymasters };
    });
  }

  function applyRandomize() {
    const players = buildSetupPlayers(setup.playerNames);
    const rt = randomizeTeams(players);
    const redFirst  = players.find((p) => rt[p.id] === "red");
    const blueFirst = players.find((p) => rt[p.id] === "blue");
    setSetup((s) => ({
      ...s,
      teams: rt,
      spymasters: { red: redFirst?.id ?? "", blue: blueFirst?.id ?? "" },
    }));
  }

  // ── Navigation ─────────────────────────────────────────────────────────────
  function handleNext() {
    if (setup.step === 0) {
      const players = buildSetupPlayers(setup.playerNames);
      setSetup((s) => ({
        ...s,
        step: 1,
        teams: neutralTeams(players),
        spymasters: { red: "", blue: "" },
      }));
      return;
    }
    if (setup.step < STEPS.length - 1) {
      setSetup((s) => ({ ...s, step: s.step + 1 }));
    } else {
      startGame();
    }
  }

  function handleBack() {
    if (setup.step === 0) {
      onExit();
    } else {
      setSetup((s) => ({ ...s, step: s.step - 1 }));
    }
  }

  // ── Start Game ─────────────────────────────────────────────────────────────
  function startGame() {
    const players = buildSetupPlayers(setup.playerNames);
    const finalTeams: Record<string, Team> = {};
    players.forEach((p) => {
      const slot = setup.teams[p.id];
      if (slot === "red" || slot === "blue") finalTeams[p.id] = slot;
    });
    const config = {
      players: players.map((p, i) => ({ id: p.id, name: p.name, seat: i, isHuman: true })),
      options: {
        teams: finalTeams,
        spymasters: setup.spymasters,
        timerSeconds: setup.timerEnabled ? setup.timerSeconds : null,
      },
    };
    setGameState(createInitialState(config));
  }

  function handleAction(action: CodenamesAction) {
    setGameState((prev) => (prev ? reduce(prev, action) : prev));
  }

  function handleExit() {
    setGameState(null);
    setSetup((s) => ({ ...s, step: 0 }));
  }

  // ── Active Game ────────────────────────────────────────────────────────────
  if (gameState) {
    return (
      <div className="fixed inset-0 z-[var(--z-game)] bg-[#3a1f0d] overflow-y-auto">
        <CodenamesGame
          state={gameState}
          onAction={handleAction}
          onExit={handleExit}
          onPlayAgain={startGame}
        />
      </div>
    );
  }

  // ── Setup UI ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-5">
      <StepIndicator steps={STEPS} current={setup.step} />

      <AnimatePresence mode="wait">
        <motion.div
          key={setup.step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {setup.step === 0 && (
            <PlayersStep
              playerCount={setup.playerCount}
              playerNames={setup.playerNames}
              onCountChange={(count) => {
                const clamped = clampPlayerCount(codenamesFacts, count);
                setSetup((s) => ({
                  ...s,
                  playerCount: clamped,
                  playerNames: Array(clamped)
                    .fill("")
                    .map((_, i) => s.playerNames[i] ?? ""),
                  teams: {},
                  spymasters: { red: "", blue: "" },
                }));
              }}
              onNameChange={(i, name) =>
                setSetup((s) => {
                  const names = [...s.playerNames];
                  names[i] = name;
                  return { ...s, playerNames: names };
                })
              }
            />
          )}

          {setup.step === 1 && (
            <TeamsStep
              players={setupPlayers}
              teams={setup.teams}
              redCount={redPlayers.length}
              blueCount={bluePlayers.length}
              neutralCount={neutralPlayers.length}
              onMove={movePlayer}
              onRandomize={applyRandomize}
              onAutoBalance={() => {
                const players = buildSetupPlayers(setup.playerNames);
                const bal = autoBalance(players);
                const redFirst  = players.find((p) => bal[p.id] === "red");
                const blueFirst = players.find((p) => bal[p.id] === "blue");
                setSetup((s) => ({
                  ...s,
                  teams: bal,
                  spymasters: { red: redFirst?.id ?? "", blue: blueFirst?.id ?? "" },
                }));
              }}
            />
          )}

          {setup.step === 2 && (
            <SpymastersStep
              players={setupPlayers}
              teams={setup.teams}
              spymasters={setup.spymasters}
              onSetSpymaster={(team, id) =>
                setSetup((s) => ({
                  ...s,
                  spymasters: { ...s.spymasters, [team]: id },
                }))
              }
            />
          )}

          {setup.step === 3 && (
            <ReviewStep
              players={setupPlayers}
              teams={setup.teams}
              spymasters={setup.spymasters}
              timerEnabled={setup.timerEnabled}
              timerSeconds={setup.timerSeconds}
              onTimerEnabledChange={(enabled) =>
                setSetup((s) => ({ ...s, timerEnabled: enabled }))
              }
              onTimerSecondsChange={(seconds) =>
                setSetup((s) => ({ ...s, timerSeconds: seconds }))
              }
            />
          )}
        </motion.div>
      </AnimatePresence>

      <div className="flex gap-3 pt-1">
        <Button variant="secondary" onClick={handleBack} className="flex-1">
          ← {setup.step === 0 ? "Mode" : "Back"}
        </Button>
        <Button
          variant="primary"
          onClick={handleNext}
          disabled={!canAdvance()}
          className="flex-1"
        >
          {setup.step === STEPS.length - 1 ? "🕵️ Start Game" : "Next →"}
        </Button>
      </div>
    </div>
  );
}

// ─── Step Indicator ───────────────────────────────────────────────────────────

function StepIndicator({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div className="flex items-center gap-1">
      {steps.map((label, i) => (
        <React.Fragment key={label}>
          <div
            title={label}
            className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200",
              i < current
                ? "bg-[rgb(var(--color-primary))] text-[rgb(var(--color-primary-foreground))]"
                : i === current
                ? "bg-[rgb(var(--color-primary))] text-[rgb(var(--color-primary-foreground))] ring-2 ring-[rgb(var(--color-primary))]/30"
                : "bg-[rgb(var(--color-surface-raised))] text-[rgb(var(--color-text-muted))]"
            )}
          >
            {i < current ? "✓" : i + 1}
          </div>
          {i < steps.length - 1 && (
            <div
              className={cn(
                "flex-1 h-0.5 transition-all duration-300",
                i < current ? "bg-[rgb(var(--color-primary))]" : "bg-[rgb(var(--color-border))]"
              )}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ─── Step 0: Players ──────────────────────────────────────────────────────────

function PlayersStep({
  playerCount,
  playerNames,
  onCountChange,
  onNameChange,
}: {
  playerCount: number;
  playerNames: string[];
  onCountChange: (n: number) => void;
  onNameChange: (i: number, name: string) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <h3 className="font-semibold text-[rgb(var(--color-text))]">Number of Players</h3>
        <p className="text-xs text-[rgb(var(--color-text-muted))]">
          Codenames requires at least {codenamesFacts.minPlayers} players ({formatPlayerRange(codenamesFacts)}) — 2 per team.
        </p>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary" size="sm"
            onClick={() => onCountChange(playerCount - 1)}
            disabled={playerCount <= codenamesFacts.minPlayers}
            className="w-10 h-10 text-lg font-bold"
          >−</Button>
          <span className="text-2xl font-bold text-[rgb(var(--color-text))] w-8 text-center">
            {playerCount}
          </span>
          <Button
            variant="secondary" size="sm"
            onClick={() => onCountChange(playerCount + 1)}
            disabled={playerCount >= codenamesFacts.maxPlayers}
            className="w-10 h-10 text-lg font-bold"
          >+</Button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="font-semibold text-[rgb(var(--color-text))]">Player Names</h3>
        <div className="grid gap-2">
          {Array.from({ length: playerCount }).map((_, i) => (
            <input
              key={i}
              type="text"
              placeholder={`Player ${i + 1}`}
              value={playerNames[i] ?? ""}
              onChange={(e) => onNameChange(i, e.target.value)}
              maxLength={20}
              className={cn(
                "h-11 px-3 rounded-lg border text-sm",
                "bg-[rgb(var(--color-surface))] text-[rgb(var(--color-text))]",
                "border-[rgb(var(--color-border-strong))]",
                "placeholder:text-[rgb(var(--color-text-subtle))]",
                "focus:outline-none focus:ring-2 focus:ring-[rgb(var(--color-focus))] focus:ring-offset-1"
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Step 1: Teams ────────────────────────────────────────────────────────────

function TeamsStep({
  players, teams, redCount, blueCount, neutralCount, onMove, onRandomize, onAutoBalance,
}: {
  players: SetupPlayer[];
  teams: Record<string, TeamSlot>;
  redCount: number; blueCount: number; neutralCount: number;
  onMove: (id: string, to: TeamSlot) => void;
  onRandomize: () => void;
  onAutoBalance: () => void;
}) {
  const neutralPlayers = players.filter((p) => (teams[p.id] ?? "neutral") === "neutral");
  const redPlayers     = players.filter((p) => teams[p.id] === "red");
  const bluePlayers    = players.filter((p) => teams[p.id] === "blue");
  const redError  = redCount > 0 && redCount < 2;
  const blueError = blueCount > 0 && blueCount < 2;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold text-[rgb(var(--color-text))]">Assign Teams</h3>
        <div className="flex items-center gap-2">
          <button onClick={onAutoBalance} className="text-xs text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-text))] underline">
            Balance
          </button>
          <button
            onClick={onRandomize}
            className={cn(
              "flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg",
              "bg-[rgb(var(--color-surface-raised))] border border-[rgb(var(--color-border))]",
              "text-[rgb(var(--color-text))] hover:border-[rgb(var(--color-border-strong))]",
              "transition-all active:scale-95"
            )}
          >
            🎲 Randomize
          </button>
        </div>
      </div>

      {/* Neutral pool */}
      <AnimatePresence>
        {neutralPlayers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-xl border-2 border-dashed border-[rgb(var(--color-border-strong))] bg-[rgb(var(--color-surface-raised))]/50 p-3">
              <p className="text-xs font-semibold text-[rgb(var(--color-text-muted))] mb-2 uppercase tracking-wider">
                Unassigned ({neutralPlayers.length})
              </p>
              <div className="flex flex-col gap-1.5">
                {neutralPlayers.map((p) => (
                  <NeutralPlayerRow
                    key={p.id}
                    player={p}
                    onJoinRed={() => onMove(p.id, "red")}
                    onJoinBlue={() => onMove(p.id, "blue")}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Team columns */}
      <div className="grid grid-cols-2 gap-3">
        <TeamColumn color="red"  label={`🔴 Red (${redCount})`}  players={redPlayers}  hasError={redError}  onRemove={(id) => onMove(id, "neutral")} />
        <TeamColumn color="blue" label={`🔵 Blue (${blueCount})`} players={bluePlayers} hasError={blueError} onRemove={(id) => onMove(id, "neutral")} />
      </div>

      {/* Hints */}
      <div className="flex flex-col gap-1">
        {neutralCount > 0 && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            ⚠️ {neutralCount} player{neutralCount !== 1 ? "s" : ""} still unassigned.
          </p>
        )}
        {(redError || blueError) && (
          <p className="text-xs text-red-500">⚠️ Each team needs at least 2 players.</p>
        )}
        {neutralCount === 0 && !redError && !blueError && (
          <p className="text-xs text-green-600 dark:text-green-400">
            ✓ Teams look good — {redCount} vs {blueCount}!
          </p>
        )}
      </div>
    </div>
  );
}

function NeutralPlayerRow({
  player, onJoinRed, onJoinBlue,
}: { player: SetupPlayer; onJoinRed: () => void; onJoinBlue: () => void }) {
  return (
    <motion.div layout initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} className="flex items-center gap-2">
      <button onClick={onJoinRed} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 bg-red-500/15 text-red-500 border border-red-500/30 hover:bg-red-500/25">
        🔴 ←
      </button>
      <span className="flex-1 text-sm font-medium text-center text-[rgb(var(--color-text))]">{player.name}</span>
      <button onClick={onJoinBlue} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 bg-blue-500/15 text-blue-500 border border-blue-500/30 hover:bg-blue-500/25">
        → 🔵
      </button>
    </motion.div>
  );
}

function TeamColumn({
  color, label, players, hasError, onRemove,
}: { color: "red" | "blue"; label: string; players: SetupPlayer[]; hasError: boolean; onRemove: (id: string) => void }) {
  return (
    <div className={cn(
      "rounded-xl border-2 p-3 flex flex-col gap-2 min-h-[100px] transition-colors",
      hasError ? "border-red-500" : color === "red" ? "border-red-500/40" : "border-blue-500/40",
      color === "red" ? "bg-red-500/5" : "bg-blue-500/5"
    )}>
      <p className={cn("text-xs font-bold text-center", color === "red" ? "text-red-500" : "text-blue-500")}>{label}</p>
      {players.length === 0 ? (
        <p className="text-xs text-[rgb(var(--color-text-subtle))] text-center italic mt-auto mb-auto">Empty</p>
      ) : (
        players.map((p) => (
          <motion.div key={p.id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="flex items-center gap-1">
            <span className="flex-1 text-xs font-medium text-[rgb(var(--color-text))] truncate">{p.name}</span>
            <button onClick={() => onRemove(p.id)} title="Move back to unassigned" className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 bg-[rgb(var(--color-surface-raised))] text-[rgb(var(--color-text-muted))] hover:bg-red-500/20 hover:text-red-500 transition-colors">✕</button>
          </motion.div>
        ))
      )}
    </div>
  );
}

// ─── Step 2: Spymasters ───────────────────────────────────────────────────────

function SpymastersStep({
  players, teams, spymasters, onSetSpymaster,
}: {
  players: SetupPlayer[];
  teams: Record<string, TeamSlot>;
  spymasters: { red: string; blue: string };
  onSetSpymaster: (team: Team, id: string) => void;
}) {
  const redPlayers  = players.filter((p) => teams[p.id] === "red");
  const bluePlayers = players.filter((p) => teams[p.id] === "blue");

  return (
    <div className="flex flex-col gap-4">
      <h3 className="font-semibold text-[rgb(var(--color-text))]">Choose Spymasters</h3>
      <p className="text-xs text-[rgb(var(--color-text-muted))]">
        One Spymaster per team. They secretly see all card colours and give one-word clues.
      </p>
      <SpymasterPicker label="🔴 Red Spymaster" color="red" players={redPlayers} selectedId={spymasters.red} onSelect={(id) => onSetSpymaster("red", id)} />
      <SpymasterPicker label="🔵 Blue Spymaster" color="blue" players={bluePlayers} selectedId={spymasters.blue} onSelect={(id) => onSetSpymaster("blue", id)} />
    </div>
  );
}

function SpymasterPicker({
  label, color, players, selectedId, onSelect,
}: { label: string; color: "red" | "blue"; players: SetupPlayer[]; selectedId: string; onSelect: (id: string) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <p className={cn("text-sm font-bold", color === "red" ? "text-red-500" : "text-blue-500")}>{label}</p>
      <div className="flex flex-wrap gap-2">
        {players.map((p) => (
          <button
            key={p.id}
            onClick={() => onSelect(p.id)}
            className={cn(
              "px-3 py-2 rounded-lg text-sm font-medium border-2 transition-all",
              selectedId === p.id
                ? color === "red"
                  ? "border-red-500 bg-red-500/15 text-red-500"
                  : "border-blue-500 bg-blue-500/15 text-blue-500"
                : "border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface-raised))] text-[rgb(var(--color-text))]"
            )}
          >
            {selectedId === p.id ? "🕵️ " : ""}{p.name}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Step 3: Review ───────────────────────────────────────────────────────────

function ReviewStep({
  players, teams, spymasters, timerEnabled, timerSeconds, onTimerEnabledChange, onTimerSecondsChange,
}: {
  players: SetupPlayer[];
  teams: Record<string, TeamSlot>;
  spymasters: { red: string; blue: string };
  timerEnabled: boolean;
  timerSeconds: number;
  onTimerEnabledChange: (enabled: boolean) => void;
  onTimerSecondsChange: (seconds: number) => void;
}) {
  const redPlayers  = players.filter((p) => teams[p.id] === "red");
  const bluePlayers = players.filter((p) => teams[p.id] === "blue");
  const redSpy  = players.find((p) => p.id === spymasters.red);
  const blueSpy = players.find((p) => p.id === spymasters.blue);

  function renderTeam(color: "red" | "blue", teamPlayers: SetupPlayer[], spy: SetupPlayer | undefined) {
    return (
      <div className={cn("rounded-xl p-4 border-2", color === "red" ? "border-red-500/50 bg-red-500/5" : "border-blue-500/50 bg-blue-500/5")}>
        <p className={cn("text-sm font-bold mb-3", color === "red" ? "text-red-500" : "text-blue-500")}>
          {color === "red" ? "🔴 Red Team" : "🔵 Blue Team"}
          <span className="ml-1 text-xs font-normal opacity-70">({teamPlayers.length})</span>
        </p>
        <div className="flex flex-col gap-1">
          {teamPlayers.map((p) => (
            <div key={p.id} className="flex items-center gap-2 text-sm">
              <span className="text-[rgb(var(--color-text))]">{p.name}</span>
              {p.id === spy?.id && (
                <span className="text-xs bg-amber-500/20 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-full font-semibold">
                  🕵️ Spymaster
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <h3 className="font-semibold text-[rgb(var(--color-text))]">Ready to Play!</h3>
      <div className="grid grid-cols-2 gap-3">
        {renderTeam("red", redPlayers, redSpy)}
        {renderTeam("blue", bluePlayers, blueSpy)}
      </div>
      <TimerSettings
        enabled={timerEnabled}
        seconds={timerSeconds}
        onEnabledChange={onTimerEnabledChange}
        onSecondsChange={onTimerSecondsChange}
      />
      <div className="p-3 bg-amber-500/10 rounded-lg text-xs text-amber-700 dark:text-amber-300">
        💡 The starting team (9 cards) is chosen randomly — they get one extra card to find.
      </div>
    </div>
  );
}
