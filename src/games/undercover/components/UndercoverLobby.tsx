"use client";

/**
 * Undercover — Lobby / Setup component.
 *
 * Self-contained: manages setup steps AND the live game surface.
 * When Start is pressed, the game renders directly here (no routing).
 * Follows the same pattern as BlackjackLobby / UnoLobby.
 *
 * Flow: Setup (6 steps) → UndercoverGame → Exit → Setup
 */

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import type { MatchSettings, SpecialCharacterSettings, UndercoverState, WordDifficulty } from "../types";
import { createInitialState } from "../state";
import { reduce } from "../reducer";
import { getPlayerView } from "../selectors";
import { UndercoverGame } from "./UndercoverGame";
import { UndercoverOnline } from "./UndercoverOnline";
import type { UndercoverAction } from "../actions";
import { getLivingPlayers } from "../engine/roles";
import { undercoverFacts } from "../rules";
import { clampPlayerCount, defaultPlayerCount } from "@/game/core/rulesFacts";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SetupState {
  step: number;
  mode: "online" | "offline";
  playerNames: string[];
  settings: MatchSettings;
}

const STEPS = ["Mode", "Players", "Factions", "Special", "Difficulty", "Review"];

const SPECIAL_CHARACTERS: Array<{
  key: keyof SpecialCharacterSettings;
  name: string;
  emoji: string;
  description: string;
}> = [
  { key: "judge",    name: "The Judge",  emoji: "⚖️", description: "Breaks perfect voting ties. Secretly chooses who is eliminated." },
  { key: "joyFool",  name: "Joy Fool",   emoji: "🤡", description: "Wants to be voted out in Round 1 for +4 bonus points." },
  { key: "ghost",    name: "Ghost",      emoji: "👻", description: "Assigned to one player. Only that player can still vote after being eliminated." },
  { key: "lovers",   name: "Lovers",     emoji: "💕", description: "Two players are secretly bonded. If one dies, so does the other." },
  { key: "revenger", name: "Revenger",   emoji: "🗡️", description: "When voted out, drags one other player down with them." },
  { key: "duelists", name: "Duelists",   emoji: "⚔️", description: "Two rivals secretly compete. First eliminated: -2 pts. The other: +2 pts (even if later eliminated)." },
];

function getDefaultFactions(total: number) {
  if (total <= 4)  return { civilians: 2, undercovers: 1, mrWhites: 1 };
  if (total <= 5)  return { civilians: 3, undercovers: 1, mrWhites: 1 };
  if (total <= 6)  return { civilians: 4, undercovers: 1, mrWhites: 1 };
  if (total <= 7)  return { civilians: 4, undercovers: 2, mrWhites: 1 };
  if (total <= 8)  return { civilians: 5, undercovers: 2, mrWhites: 1 };
  if (total <= 10) return { civilians: 6, undercovers: 3, mrWhites: 1 };
  if (total <= 12) return { civilians: 8, undercovers: 3, mrWhites: 1 };
  return {
    civilians: Math.floor(total * 0.6),
    undercovers: Math.floor(total * 0.3),
    mrWhites: total - Math.floor(total * 0.6) - Math.floor(total * 0.3),
  };
}

const DEFAULT_PLAYER_COUNT = defaultPlayerCount(undercoverFacts, 6);
const initialDefaults = getDefaultFactions(DEFAULT_PLAYER_COUNT);

// ─── Main Lobby ───────────────────────────────────────────────────────────────

export function UndercoverLobby() {
  // Route online mode to its own room-based flow
  const [showOnlineLobby, setShowOnlineLobby] = React.useState(false);

  if (showOnlineLobby) {
    return <UndercoverOnline onExit={() => setShowOnlineLobby(false)} />;
  }

  return <OfflineLobby onGoOnline={() => setShowOnlineLobby(true)} />;
}

// ─── Offline (same-device) Lobby ──────────────────────────────────────────────

function OfflineLobby({ onGoOnline }: { onGoOnline: () => void }) {
  const [setup, setSetup] = React.useState<SetupState>({
    step: 0,
    mode: "offline",
    playerNames: Array(DEFAULT_PLAYER_COUNT).fill(""),
    settings: {
      totalPlayers: DEFAULT_PLAYER_COUNT,
      ...initialDefaults,
      difficulty: "medium",
      specialCharacters: {
        judge: false, joyFool: false, ghost: false,
        lovers: false, revenger: false, duelists: false,
      },
    },
  });

  const [gameState, setGameState] = React.useState<UndercoverState | null>(null);

  // ── Multi-game session tracking ────────────────────────────────────────────
  // Cumulative scores across all games in this session
  const [cumulativeScores, setCumulativeScores] = React.useState<Record<string, number>>({});
  const [gamesPlayed, setGamesPlayed] = React.useState(0);
  // Player name list for re-use across games (stored when first game starts)
  const [sessionPlayers, setSessionPlayers] = React.useState<Array<{ id: string; name: string }>>([]);
  // Show final session rankings after "End Session"
  const [showFinalRankings, setShowFinalRankings] = React.useState(false);

  const factionSum = setup.settings.civilians + setup.settings.undercovers + setup.settings.mrWhites;
  const factionValid = factionSum === setup.settings.totalPlayers;
  const namesValid = setup.playerNames.filter((n) => n.trim().length > 0).length === setup.settings.totalPlayers;

  function canAdvance() {
    if (setup.step === 1) return namesValid;
    if (setup.step === 2) return factionValid;
    if (setup.step === 5) return factionValid && namesValid;
    return true;
  }

  function handleNext() {
    // Step 0 = Mode selection: online → hand off to online lobby
    if (setup.step === 0 && setup.mode === "online") {
      onGoOnline();
      return;
    }
    if (setup.step < STEPS.length - 1) {
      setSetup((s) => ({ ...s, step: s.step + 1 }));
    } else {
      startGame();
    }
  }

  function buildPlayers() {
    return setup.playerNames
      .filter((n) => n.trim().length > 0)
      .map((name, i) => ({ id: `player-${i + 1}`, name: name.trim(), seat: i, isHuman: true }));
  }

  function startGame(
    players?: Array<{ id: string; name: string; seat: number; isHuman: boolean }>,
    difficultyOverride?: WordDifficulty
  ) {
    const resolvedPlayers = players ?? buildPlayers();
    if (resolvedPlayers.length === 0) return;

    const state = createInitialState({
      players: resolvedPlayers,
      options: {
        mode: setup.mode,
        civilians: setup.settings.civilians,
        undercovers: setup.settings.undercovers,
        mrWhites: setup.settings.mrWhites,
        difficulty: difficultyOverride ?? setup.settings.difficulty,
        specialCharacters: setup.settings.specialCharacters,
      },
    });

    setSessionPlayers(resolvedPlayers);
    setGameState({ ...state, creatorId: "player-1" });
  }

  function handleAction(action: UndercoverAction) {
    setGameState((prev) => (prev ? reduce(prev, action) : prev));
  }

  function handleExit() {
    setGameState(null);
    setCumulativeScores({});
    setGamesPlayed(0);
    setSessionPlayers([]);
    setShowFinalRankings(false);
    setSetup((s) => ({ ...s, step: 0 }));
  }

  // Accumulate current game's scores into cumulative
  function accumulateScores(): Record<string, number> {
    if (!gameState) return cumulativeScores;
    const next = { ...cumulativeScores };
    for (const player of gameState.players) {
      next[player.id] = (next[player.id] ?? 0) + player.totalScore;
    }
    return next;
  }

  function handlePlayAgain(difficulty?: WordDifficulty) {
    const newCumulative = accumulateScores();
    setCumulativeScores(newCumulative);
    setGamesPlayed((g) => g + 1);
    if (difficulty) {
      setSetup((s) => ({ ...s, settings: { ...s.settings, difficulty } }));
    }
    // Restart with the same players and (optionally updated) difficulty
    const players = sessionPlayers.length > 0
      ? sessionPlayers.map((p, i) => ({ ...p, seat: i, isHuman: true }))
      : buildPlayers();
    startGame(players, difficulty);
  }

  function handleEndSession() {
    const newCumulative = accumulateScores();
    setCumulativeScores(newCumulative);
    setGamesPlayed((g) => g + 1);
    setGameState(null);
    setShowFinalRankings(true);
  }

  // ── Final Rankings Screen ─────────────────────────────────────────────────

  if (showFinalRankings) {
    const rankedPlayers = sessionPlayers
      .map((p) => ({ ...p, score: cumulativeScores[p.id] ?? 0 }))
      .sort((a, b) => b.score - a.score);

    return (
      <div className="flex flex-col gap-5">
        <div className="text-center">
          <div className="text-5xl mb-3">🏆</div>
          <h2 className="text-2xl font-black text-[rgb(var(--color-text))]">Final Rankings</h2>
          <p className="text-sm text-[rgb(var(--color-text-muted))] mt-1">
            {gamesPlayed} game{gamesPlayed !== 1 ? "s" : ""} played
          </p>
        </div>

        <div className="flex flex-col gap-2">
          {rankedPlayers.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.07 }}
              className={cn(
                "flex items-center gap-3 p-4 rounded-xl",
                i === 0
                  ? "bg-amber-500/15 border-2 border-amber-500/40"
                  : i === 1
                  ? "bg-gray-400/10 border border-gray-400/30"
                  : i === 2
                  ? "bg-orange-700/10 border border-orange-700/20"
                  : "bg-[rgb(var(--color-surface-raised))]"
              )}
            >
              <div className={cn(
                "w-9 h-9 rounded-full flex items-center justify-center font-black text-sm shrink-0",
                i === 0 ? "bg-amber-500 text-white"
                  : i === 1 ? "bg-gray-400 text-white"
                  : i === 2 ? "bg-orange-700 text-white"
                  : "bg-[rgb(var(--color-surface-sunken))] text-[rgb(var(--color-text-muted))]"
              )}>
                {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
              </div>
              <span className="flex-1 font-bold text-[rgb(var(--color-text))]">{p.name}</span>
              <span className="font-black text-lg text-[rgb(var(--color-text))]">
                {p.score.toFixed(p.score % 1 === 0 ? 0 : 1)} pts
              </span>
            </motion.div>
          ))}
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={() => {
              setCumulativeScores({});
              setGamesPlayed(0);
              setShowFinalRankings(false);
              setSetup((s) => ({ ...s, step: 0 }));
            }}
          >
            🎮 Play Again (New Session)
          </Button>
          <Button
            variant="secondary"
            size="md"
            fullWidth
            onClick={handleExit}
          >
            ← Back to Lobby
          </Button>
        </div>
      </div>
    );
  }

  // ── Active game ───────────────────────────────────────────────────────────

  if (gameState) {
    // Single-device: the "current player" view changes depending on the phase.
    // We always use the perspective of whoever needs to act privately right now.
    let viewPlayerId = "player-1";

    if (gameState.phase === "card_reveal") {
      // Show the card of whichever player is revealing next
      const living = getLivingPlayers(gameState.players);
      const activeTurnOrder = gameState.turnOrder.filter((id) =>
        living.some((p) => p.id === id)
      );
      const currentRevealerId = activeTurnOrder[gameState.cardRevealIndex];
      if (currentRevealerId) viewPlayerId = currentRevealerId;
    } else if (gameState.phase === "mr_white_guess" && gameState.pendingMrWhiteGuess) {
      // Switch to Mr. White's perspective so only they see (and can submit) the guess
      viewPlayerId = gameState.pendingMrWhiteGuess;
    } else if (gameState.phase === "revenger_pick" && gameState.pendingRevenger) {
      // Switch to the Revenger's perspective so they can choose their target
      viewPlayerId = gameState.pendingRevenger;
    }

    const view = getPlayerView(gameState, viewPlayerId);

    return (
      <div className="fixed inset-0 z-[var(--z-game)] bg-[rgb(var(--color-surface-sunken))] overflow-y-auto">
        <UndercoverGame
          view={view}
          onAction={handleAction}
          onExit={handleExit}
          onPlayAgain={handlePlayAgain}
          onEndSession={handleEndSession}
          cumulativeScores={cumulativeScores}
          gamesPlayed={gamesPlayed}
        />
      </div>
    );
  }

  // ── Setup UI ──────────────────────────────────────────────────────────────

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
            <ModeStep
              mode={setup.mode}
              onChange={(mode) => setSetup((s) => ({ ...s, mode }))}
            />
          )}
          {setup.step === 1 && (
            <PlayersStep
              totalPlayers={setup.settings.totalPlayers}
              playerNames={setup.playerNames}
              onTotalChange={(total) => {
                const clamped = clampPlayerCount(undercoverFacts, total);
                const defaults = getDefaultFactions(clamped);
                setSetup((s) => ({
                  ...s,
                  playerNames: Array(clamped).fill("").map((_, i) => s.playerNames[i] ?? ""),
                  settings: { ...s.settings, totalPlayers: clamped, ...defaults },
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
          {setup.step === 2 && (
            <FactionsStep
              settings={setup.settings}
              factionValid={factionValid}
              factionSum={factionSum}
              onChange={(patch) =>
                setSetup((s) => ({ ...s, settings: { ...s.settings, ...patch } }))
              }
            />
          )}
          {setup.step === 3 && (
            <SpecialStep
              settings={setup.settings.specialCharacters}
              onChange={(key, value) =>
                setSetup((s) => ({
                  ...s,
                  settings: {
                    ...s.settings,
                    specialCharacters: { ...s.settings.specialCharacters, [key]: value },
                  },
                }))
              }
            />
          )}
          {setup.step === 4 && (
            <DifficultyStep
              difficulty={setup.settings.difficulty}
              onChange={(d) =>
                setSetup((s) => ({ ...s, settings: { ...s.settings, difficulty: d } }))
              }
            />
          )}
          {setup.step === 5 && (
            <ReviewStep setup={setup} factionValid={factionValid} namesValid={namesValid} />
          )}
        </motion.div>
      </AnimatePresence>

      <div className="flex gap-3 pt-1">
        {setup.step > 0 && (
          <Button variant="secondary" onClick={() => setSetup((s) => ({ ...s, step: s.step - 1 }))} className="flex-1">
            ← Back
          </Button>
        )}
        <Button variant="primary" onClick={handleNext} disabled={!canAdvance()} className="flex-1">
          {setup.step === STEPS.length - 1
            ? "🕵️ Start Game"
            : setup.step === 0 && setup.mode === "online"
            ? "Create / Join Room →"
            : "Next →"}
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
          <div className={cn(
            "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200",
            i < current
              ? "bg-[rgb(var(--color-primary))] text-[rgb(var(--color-primary-foreground))]"
              : i === current
              ? "bg-[rgb(var(--color-primary))] text-[rgb(var(--color-primary-foreground))] ring-2 ring-[rgb(var(--color-primary))]/30"
              : "bg-[rgb(var(--color-surface-raised))] text-[rgb(var(--color-text-muted))]"
          )}>
            {i < current ? "✓" : i + 1}
          </div>
          {i < steps.length - 1 && (
            <div className={cn("flex-1 h-0.5 transition-all duration-300", i < current ? "bg-[rgb(var(--color-primary))]" : "bg-[rgb(var(--color-border))]")} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ─── Step 0: Mode ─────────────────────────────────────────────────────────────

function ModeStep({ mode, onChange }: { mode: "online" | "offline"; onChange: (m: "online" | "offline") => void }) {
  const options: Array<{ value: "offline" | "online"; emoji: string; label: string; sub: string }> = [];
  if (undercoverFacts.supportsLocal) {
    options.push({ value: "offline", emoji: "👥", label: "Same Device", sub: "Pass & play — everyone in the same room" });
  }
  if (undercoverFacts.supportsOnline) {
    options.push({ value: "online", emoji: "🌐", label: "Online", sub: "Each player on their own device" });
  }

  return (
    <div className="flex flex-col gap-3">
      <h3 className="font-semibold text-[rgb(var(--color-text))]">How are you playing?</h3>
      <div className="grid grid-cols-2 gap-3">
        {options.map((opt) => (
          <button key={opt.value} onClick={() => onChange(opt.value)}
            className={cn(
              "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-150 text-center",
              mode === opt.value
                ? "border-[rgb(var(--color-primary))] bg-[rgb(var(--color-primary))]/10"
                : "border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface-raised))] hover:border-[rgb(var(--color-border-strong))]"
            )}
          >
            <span className="text-3xl">{opt.emoji}</span>
            <div>
              <div className="font-semibold text-sm text-[rgb(var(--color-text))]">{opt.label}</div>
              <div className="text-xs text-[rgb(var(--color-text-muted))] mt-0.5">{opt.sub}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Step 1: Players ──────────────────────────────────────────────────────────

function PlayersStep({ totalPlayers, playerNames, onTotalChange, onNameChange }: {
  totalPlayers: number; playerNames: string[];
  onTotalChange: (n: number) => void; onNameChange: (i: number, name: string) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <h3 className="font-semibold text-[rgb(var(--color-text))]">Number of Players</h3>
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={() => onTotalChange(totalPlayers - 1)} disabled={totalPlayers <= undercoverFacts.minPlayers} className="w-10 h-10 text-lg font-bold">−</Button>
          <span className="text-2xl font-bold text-[rgb(var(--color-text))] w-8 text-center">{totalPlayers}</span>
          <Button variant="secondary" size="sm" onClick={() => onTotalChange(totalPlayers + 1)} disabled={totalPlayers >= undercoverFacts.maxPlayers} className="w-10 h-10 text-lg font-bold">+</Button>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <h3 className="font-semibold text-[rgb(var(--color-text))]">Player Names</h3>
        <div className="grid gap-2">
          {Array.from({ length: totalPlayers }).map((_, i) => (
            <input key={i} type="text" placeholder={`Player ${i + 1}`}
              value={playerNames[i] ?? ""} onChange={(e) => onNameChange(i, e.target.value)} maxLength={20}
              className={cn("h-11 px-3 rounded-lg border text-sm",
                "bg-[rgb(var(--color-surface))] text-[rgb(var(--color-text))]",
                "border-[rgb(var(--color-border-strong))]",
                "placeholder:text-[rgb(var(--color-text-subtle))]",
                "focus:outline-none focus:ring-2 focus:ring-[rgb(var(--color-focus))] focus:ring-offset-1")}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Step 2: Factions ─────────────────────────────────────────────────────────

function FactionsStep({ settings, factionValid, factionSum, onChange }: {
  settings: MatchSettings; factionValid: boolean; factionSum: number;
  onChange: (patch: Partial<MatchSettings>) => void;
}) {
  function adj(key: "civilians" | "undercovers" | "mrWhites", d: number) {
    const v = Math.max(0, settings[key] + d);
    if (key === "civilians" && v < 1) return;
    onChange({ [key]: v });
  }
  return (
    <div className="flex flex-col gap-4">
      <h3 className="font-semibold text-[rgb(var(--color-text))]">Faction Counts</h3>
      <div className={cn("p-3 rounded-lg text-sm font-mono text-center",
        factionValid ? "bg-green-500/10 text-green-600 dark:text-green-400" : "bg-red-500/10 text-red-600 dark:text-red-400")}>
        {settings.civilians}C + {settings.undercovers}U + {settings.mrWhites}W = {factionSum}
        {" "}{factionValid ? "✓" : `≠ ${settings.totalPlayers}`}
      </div>
      <div className="flex flex-col gap-3">
        {([
          { key: "civilians" as const,   label: "Civilians",   emoji: "🕵️", color: "text-blue-500",  min: 1 },
          { key: "undercovers" as const, label: "Undercovers", emoji: "🦊", color: "text-red-500",   min: 1 },
          { key: "mrWhites" as const,    label: "Mr. Whites",  emoji: "👤", color: "text-gray-500",  min: 0 },
        ]).map(({ key, label, emoji, color, min }) => (
          <div key={key} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">{emoji}</span>
              <span className={cn("font-semibold text-sm", color)}>{label}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => adj(key, -1)} disabled={settings[key] <= min} className="w-8 h-8 text-lg">−</Button>
              <span className="text-lg font-bold w-6 text-center text-[rgb(var(--color-text))]">{settings[key]}</span>
              <Button variant="ghost" size="sm" onClick={() => adj(key, +1)} disabled={factionSum >= settings.totalPlayers} className="w-8 h-8 text-lg">+</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Step 3: Special Characters ───────────────────────────────────────────────

function SpecialStep({ settings, onChange }: {
  settings: SpecialCharacterSettings;
  onChange: (key: keyof SpecialCharacterSettings, value: boolean) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="font-semibold text-[rgb(var(--color-text))]">Special Characters</h3>
      <p className="text-xs text-[rgb(var(--color-text-muted))]">Optional — they modify existing players, not add new ones.</p>
      <div className="flex flex-col gap-2">
        {SPECIAL_CHARACTERS.map((sc) => (
          <button key={sc.key} onClick={() => onChange(sc.key, !settings[sc.key])}
            className={cn("flex items-start gap-3 p-3 rounded-xl border-2 text-left transition-all duration-150",
              settings[sc.key] ? "border-violet-500 bg-violet-500/10" : "border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface-raised))]")}>
            <span className="text-2xl mt-0.5">{sc.emoji}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-[rgb(var(--color-text))]">{sc.name}</span>
                {settings[sc.key] && <span className="text-xs bg-violet-500 text-white rounded-full px-1.5 py-0.5">ON</span>}
              </div>
              <p className="text-xs text-[rgb(var(--color-text-muted))] mt-0.5 leading-snug">{sc.description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Step 4: Difficulty ───────────────────────────────────────────────────────

function DifficultyStep({ difficulty, onChange }: { difficulty: WordDifficulty; onChange: (d: WordDifficulty) => void }) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="font-semibold text-[rgb(var(--color-text))]">Word Difficulty</h3>
      <div className="flex flex-col gap-2">
        {([
          { value: "easy" as const,      emoji: "🍎", label: "Easy",      sub: "Clearly related — great for beginners" },
          { value: "medium" as const,    emoji: "🌊", label: "Medium",    sub: "Moderately similar — recommended for most groups" },
          { value: "difficult" as const, emoji: "🗡️", label: "Difficult", sub: "Subtly related — for experienced players" },
        ] as const).map((opt) => (
          <button key={opt.value} onClick={() => onChange(opt.value)}
            className={cn("flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all duration-150",
              difficulty === opt.value
                ? "border-[rgb(var(--color-primary))] bg-[rgb(var(--color-primary))]/10"
                : "border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface-raised))] hover:border-[rgb(var(--color-border-strong))]")}>
            <span className="text-2xl">{opt.emoji}</span>
            <div>
              <div className="font-semibold text-sm text-[rgb(var(--color-text))]">{opt.label}</div>
              <div className="text-xs text-[rgb(var(--color-text-muted))]">{opt.sub}</div>
            </div>
            {difficulty === opt.value && <span className="ml-auto text-[rgb(var(--color-primary))] font-bold">✓</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Step 5: Review ───────────────────────────────────────────────────────────

function ReviewStep({ setup, factionValid, namesValid }: { setup: SetupState; factionValid: boolean; namesValid: boolean }) {
  const activeSpecials = SPECIAL_CHARACTERS.filter((sc) => setup.settings.specialCharacters[sc.key]);
  return (
    <div className="flex flex-col gap-4">
      <h3 className="font-semibold text-[rgb(var(--color-text))]">Review Setup</h3>
      <div className="flex flex-col gap-0">
        <ReviewRow label="Mode"       value={setup.mode === "offline" ? "👥 Same Device" : "🌐 Online"} />
        <ReviewRow label="Players"    value={`${setup.settings.totalPlayers} players`} detail={setup.playerNames.filter(Boolean).join(", ")} valid={namesValid} />
        <ReviewRow label="Factions"   value={`${setup.settings.civilians}C / ${setup.settings.undercovers}U / ${setup.settings.mrWhites}W`} valid={factionValid} />
        <ReviewRow label="Difficulty" value={setup.settings.difficulty.charAt(0).toUpperCase() + setup.settings.difficulty.slice(1)} />
        <ReviewRow label="Specials"   value={activeSpecials.length === 0 ? "None" : activeSpecials.map((s) => s.name).join(", ")} />
      </div>
      {(!factionValid || !namesValid) && (
        <div className="p-3 bg-red-500/10 rounded-lg text-sm text-red-600 dark:text-red-400">
          {!namesValid && "⚠️ Fill in all player names. "}
          {!factionValid && "⚠️ Faction counts must add up to total players."}
        </div>
      )}
    </div>
  );
}

function ReviewRow({ label, value, detail, valid }: { label: string; value: string; detail?: string; valid?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-2 py-2.5 border-b border-[rgb(var(--color-border))] last:border-0">
      <span className="text-sm text-[rgb(var(--color-text-muted))]">{label}</span>
      <div className="text-right">
        <span className={cn("text-sm font-semibold", valid === false ? "text-red-500" : "text-[rgb(var(--color-text))]")}>{value}</span>
        {detail && <div className="text-xs text-[rgb(var(--color-text-muted))] mt-0.5 max-w-[180px] text-right">{detail}</div>}
      </div>
    </div>
  );
}
