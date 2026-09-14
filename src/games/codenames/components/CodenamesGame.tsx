"use client";

/**
 * Codenames — main game surface.
 *
 * Works in two modes:
 *  • Offline (myPlayerId = undefined): single-device pass-and-play.
 *    Spymasters use the 🔑 key toggle. Anyone on the current team can act.
 *
 *  • Online (myPlayerId = string): each player uses their own device.
 *    Role is derived from state — spymasters always see card types;
 *    operatives never do. Only the relevant player sees action controls.
 */

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import type { CodenamesState, WordCard, CardType, Team } from "../types";
import type { CodenamesAction } from "../actions";
import { RulesDrawer, RulesHelpButton, useRulesHelp } from "@/components/game/RulesDrawer";
import { codenamesHelp } from "../help";

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  state: CodenamesState;
  onAction: (action: CodenamesAction) => void;
  onExit: () => void;
  onPlayAgain: () => void;
  /** Provided in online mode — drives role-based display. Absent = offline. */
  myPlayerId?: string;
}

// ─── Log helpers ──────────────────────────────────────────────────────────────

interface LogGuess {
  word: string;
  type: CardType;
}

interface LogTurn {
  turnNum: number;
  team: Team;
  clue: { word: string; count: number };
  guesses: LogGuess[];
}

function buildLog(state: CodenamesState): LogTurn[] {
  const turns: LogTurn[] = [];
  let current: LogTurn | null = null;

  for (const evt of state.events) {
    if (evt.type === "CLUE_GIVEN") {
      if (current) turns.push(current);
      current = {
        turnNum: evt.turn,
        team: evt.payload.team as Team,
        clue: {
          word: evt.payload.clue as string,
          count: evt.payload.count as number,
        },
        guesses: [],
      };
    } else if (evt.type === "CARD_REVEALED" && current) {
      current.guesses.push({
        word: evt.payload.word as string,
        type: evt.payload.cardType as CardType,
      });
    }
  }
  if (current) turns.push(current);
  return turns;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CodenamesGame({ state, onAction, onExit, onPlayAgain, myPlayerId }: Props) {
  const isOnline = myPlayerId !== undefined;

  // Derive this player's role
  const myPlayer = isOnline ? state.players.find((p) => p.id === myPlayerId) ?? null : null;
  const isMySpymaster = myPlayer?.isSpymaster ?? false;
  const myTeam = myPlayer?.team ?? null;
  const isMyTeamsTurn = !isOnline || myTeam === state.currentTeam;
  const isMySpymasterPhase =
    isMyTeamsTurn && isMySpymaster && state.phase === "giving_clue";
  const isMyOperativePhase =
    isMyTeamsTurn && !isMySpymaster && state.phase === "guessing";

  // Offline: key toggle; Online: always shown to spymaster, never to operative
  const [showKey, setShowKey] = React.useState(false);
  const showUnrevealedTypes = isOnline ? isMySpymaster : showKey;

  // Clue input state
  const [clueWord, setClueWord] = React.useState("");
  const [clueCount, setClueCount] = React.useState(2);

  // Log panel
  const [logOpen, setLogOpen] = React.useState(false);
  const { open: rulesOpen, openRules, closeRules } = useRulesHelp();
  const [lastRevealedId, setLastRevealedId] = React.useState<number | null>(null);
  const logRef = React.useRef<HTMLDivElement>(null);

  // Auto-hide key when operatives start guessing (offline)
  React.useEffect(() => {
    if (!isOnline && state.phase === "guessing") setShowKey(false);
  }, [isOnline, state.phase]);

  // Scroll log to bottom when entries change
  const logLength = state.events.length;
  React.useEffect(() => {
    if (logOpen && logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logOpen, logLength]);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const currentSpymaster = state.players.find(
    (p) => p.isSpymaster && p.team === state.currentTeam
  );
  const currentOperative = state.players.find(
    (p) => !p.isSpymaster && p.team === state.currentTeam
  );

  function getActingPlayerId(): string {
    if (state.phase === "giving_clue") return currentSpymaster?.id ?? "";
    if (state.phase === "guessing") {
      // Online: use my own id; Offline: use first operative
      return isOnline ? (myPlayerId ?? currentOperative?.id ?? "") : (currentOperative?.id ?? "");
    }
    return "";
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  function handleCardClick(card: WordCard) {
    if (state.phase !== "guessing" || card.revealed) return;
    // Online: only operative of current team can click
    // Offline: anyone (for current team)
    if (isOnline && !isMyOperativePhase) return;
    setLastRevealedId(card.id);
    onAction({ type: "GUESS_CARD", playerId: getActingPlayerId(), cardId: card.id });
  }

  function handleGiveClue() {
    const trimmed = clueWord.trim();
    if (!trimmed || !currentSpymaster) return;
    onAction({
      type: "GIVE_CLUE",
      playerId: currentSpymaster.id,
      clueWord: trimmed,
      count: clueCount,
    });
    setClueWord("");
    setClueCount(2);
  }

  function handleEndTurn() {
    onAction({ type: "END_TURN", playerId: getActingPlayerId() });
  }

  // ── Game Over ──────────────────────────────────────────────────────────────

  if (state.phase === "game_over") {
    return (
      <GameOverScreen
        state={state}
        onPlayAgain={onPlayAgain}
        onExit={onExit}
        showKey={showUnrevealedTypes}
        onToggleKey={isOnline ? undefined : () => setShowKey((k) => !k)}
        logOpen={logOpen}
        onToggleLog={() => setLogOpen((o) => !o)}
        logRef={logRef}
      />
    );
  }

  // ── Active Game ────────────────────────────────────────────────────────────

  const cardClickable = (card: WordCard) =>
    state.phase === "guessing" &&
    !card.revealed &&
    (isOnline ? isMyOperativePhase : true);

  return (
    <div className="flex flex-col min-h-screen select-none">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <Header
        state={state}
        isOnline={isOnline}
        showKey={showUnrevealedTypes}
        onToggleKey={isOnline ? undefined : () => setShowKey((k) => !k)}
        logOpen={logOpen}
        onToggleLog={() => setLogOpen((o) => !o)}
        onOpenRules={openRules}
        onExit={onExit}
        myPlayer={myPlayer}
      />

      {/* ── Score Bar ──────────────────────────────────────────────────────── */}
      <ScoreBar state={state} />

      {/* ── Board ──────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-2 sm:p-3">
        <div className="w-full max-w-2xl">
          <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
            {state.words.map((card) => (
              <WordCardTile
                key={card.id}
                card={card}
                showType={showUnrevealedTypes}
                isClickable={cardClickable(card)}
                isLastRevealed={card.id === lastRevealedId}
                onClick={() => handleCardClick(card)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── Bottom Panel ───────────────────────────────────────────────────── */}
      <div className="p-3 sm:p-4">
        <BottomPanel
          state={state}
          isOnline={isOnline}
          isMySpymasterPhase={isMySpymasterPhase}
          isMyOperativePhase={isMyOperativePhase}
          isMyTeamsTurn={isMyTeamsTurn}
          isMySpymaster={isMySpymaster}
          showKey={showUnrevealedTypes}
          onShowKey={isOnline ? undefined : () => setShowKey((k) => !k)}
          clueWord={clueWord}
          clueCount={clueCount}
          onClueWordChange={setClueWord}
          onClueCountChange={setClueCount}
          onGiveClue={handleGiveClue}
          onEndTurn={handleEndTurn}
          myPlayer={myPlayer}
          currentSpymaster={currentSpymaster}
        />
      </div>

      {/* ── Log Drawer ─────────────────────────────────────────────────────── */}
      <LogDrawer open={logOpen} onClose={() => setLogOpen(false)} state={state} logRef={logRef} />
      <RulesDrawer open={rulesOpen} onClose={closeRules} help={codenamesHelp} />
    </div>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────

function Header({
  state,
  isOnline,
  showKey,
  onToggleKey,
  logOpen,
  onToggleLog,
  onOpenRules,
  onExit,
  myPlayer,
}: {
  state: CodenamesState;
  isOnline: boolean;
  showKey: boolean;
  onToggleKey?: () => void;
  logOpen: boolean;
  onToggleLog: () => void;
  onOpenRules: () => void;
  onExit: () => void;
  myPlayer: CodenamesState["players"][number] | null;
}) {
  const phaseLabel =
    state.phase === "giving_clue" ? "Spymaster's turn" : "Guessing";

  return (
    <div className="flex items-center justify-between px-3 py-2 bg-black/30 gap-2">
      <button
        onClick={onExit}
        className="text-white/70 hover:text-white text-sm flex items-center gap-1 transition-colors shrink-0"
      >
        ← Exit
      </button>

      <div className="text-center min-w-0">
        <div className="text-white font-black text-base tracking-widest">CODENAMES</div>
        <div
          className={cn(
            "text-[10px] font-semibold truncate",
            state.currentTeam === "red" ? "text-red-400" : "text-blue-400"
          )}
        >
          {state.currentTeam === "red" ? "🔴 Red" : "🔵 Blue"} • {phaseLabel}
          {isOnline && myPlayer && (
            <span className="text-white/40 ml-1">
              ({myPlayer.isSpymaster ? "Spymaster" : "Operative"})
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <RulesHelpButton onClick={onOpenRules} className="text-white/70 hover:text-white hover:bg-white/10" />

        {/* Log toggle */}
        <button
          onClick={onToggleLog}
          className={cn(
            "text-sm px-2 py-1 rounded-lg font-bold transition-all",
            logOpen ? "bg-emerald-500 text-black" : "bg-white/10 text-white/70 hover:text-white"
          )}
          title="Toggle clue log"
        >
          📋
        </button>

        {/* Key toggle (offline only) */}
        {onToggleKey && (
          <button
            onClick={onToggleKey}
            className={cn(
              "text-sm px-2 py-1 rounded-lg font-bold transition-all",
              showKey ? "bg-amber-500 text-black" : "bg-white/10 text-white/70 hover:text-white"
            )}
            title="Toggle Spymaster Key"
          >
            🔑
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Score Bar ────────────────────────────────────────────────────────────────

function ScoreBar({ state }: { state: CodenamesState }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-black/20">
      <TeamScore state={state} team="red" />
      <div className="text-white/40 text-sm font-bold">vs</div>
      <TeamScore state={state} team="blue" />
    </div>
  );
}

function TeamScore({ state, team }: { state: CodenamesState; team: Team }) {
  const info = state.teams[team];
  const isActive = state.currentTeam === team;
  return (
    <div
      className={cn(
        "flex-1 flex flex-col items-center py-2 rounded-xl transition-all",
        team === "red"
          ? isActive ? "bg-red-600/30 ring-2 ring-red-500" : "bg-red-900/20"
          : isActive ? "bg-blue-600/30 ring-2 ring-blue-500" : "bg-blue-900/20"
      )}
    >
      <span
        className={cn(
          "text-2xl sm:text-3xl font-black",
          team === "red" ? "text-red-400" : "text-blue-400"
        )}
      >
        {info.remaining}
      </span>
      <span
        className={cn(
          "text-[10px] font-semibold tracking-wider uppercase",
          team === "red" ? "text-red-300" : "text-blue-300"
        )}
      >
        {team} · {info.total - info.remaining}/{info.total}
      </span>
    </div>
  );
}

// ─── Word Card Tile ───────────────────────────────────────────────────────────

function WordCardTile({
  card,
  showType,
  isClickable,
  isLastRevealed,
  onClick,
}: {
  card: WordCard;
  showType: boolean;
  isClickable: boolean;
  isLastRevealed: boolean;
  onClick: () => void;
}) {
  const style = getCardStyle(card, showType, isClickable);

  return (
    <motion.button
      layout
      onClick={isClickable ? onClick : undefined}
      disabled={!isClickable && !card.revealed}
      animate={isLastRevealed && card.revealed ? { scale: [1, 1.08, 1] } : {}}
      transition={{ duration: 0.3 }}
      className={cn(
        "relative rounded-lg border shadow-sm",
        "flex flex-col items-center justify-center",
        "aspect-[4/3] p-1",
        "transition-all duration-200",
        "text-[clamp(7px,2.2vw,12px)] font-black tracking-wide uppercase text-center leading-tight break-words overflow-hidden",
        style
      )}
    >
      {card.revealed && card.type === "assassin" && (
        <span className="text-[clamp(7px,1.8vw,11px)] mb-0.5 opacity-80">💀</span>
      )}
      {card.revealed && card.type === "neutral" && (
        <span className="text-[clamp(7px,1.8vw,11px)] mb-0.5 opacity-60">👤</span>
      )}
      <span className="line-clamp-2">{card.word}</span>
    </motion.button>
  );
}

function getCardStyle(card: WordCard, showType: boolean, isClickable: boolean): string {
  if (card.revealed) {
    switch (card.type) {
      case "red":     return "bg-red-600 text-white border-red-700";
      case "blue":    return "bg-blue-600 text-white border-blue-700";
      case "neutral": return "bg-amber-200 text-amber-900 border-amber-300";
      case "assassin":return "bg-gray-900 text-white border-gray-700";
    }
  }
  if (showType) {
    switch (card.type) {
      case "red":     return "bg-red-800/60 text-red-100 border-red-500 border-2";
      case "blue":    return "bg-blue-800/60 text-blue-100 border-blue-500 border-2";
      case "neutral": return "bg-stone-600/60 text-stone-200 border-stone-400 border-2";
      case "assassin":return "bg-black text-gray-300 border-gray-500 border-2";
    }
  }
  return isClickable
    ? "bg-amber-50 text-stone-800 border border-stone-300 hover:bg-amber-100 hover:border-stone-400 active:scale-95 cursor-pointer"
    : "bg-stone-200/20 text-stone-300 border border-stone-600/30 cursor-default";
}

// ─── Bottom Panel ─────────────────────────────────────────────────────────────

interface BottomPanelProps {
  state: CodenamesState;
  isOnline: boolean;
  isMySpymasterPhase: boolean;
  isMyOperativePhase: boolean;
  isMyTeamsTurn: boolean;
  isMySpymaster: boolean;
  showKey: boolean;
  onShowKey?: () => void;
  clueWord: string;
  clueCount: number;
  onClueWordChange: (v: string) => void;
  onClueCountChange: (v: number) => void;
  onGiveClue: () => void;
  onEndTurn: () => void;
  myPlayer: CodenamesState["players"][number] | null;
  currentSpymaster: CodenamesState["players"][number] | undefined;
}

function BottomPanel(p: BottomPanelProps) {
  const { state, isOnline } = p;

  // Offline: always show the relevant panel for the current phase
  if (!isOnline) {
    if (state.phase === "giving_clue") {
      return (
        <ClueInputPanel
          state={state}
          clueWord={p.clueWord}
          clueCount={p.clueCount}
          onWordChange={p.onClueWordChange}
          onCountChange={p.onClueCountChange}
          onSubmit={p.onGiveClue}
          onShowKey={p.onShowKey}
          showKey={p.showKey}
        />
      );
    }
    return (
      <GuessingPanel state={state} onEndTurn={p.onEndTurn} />
    );
  }

  // Online mode — show based on role + phase
  if (state.phase === "giving_clue") {
    if (p.isMySpymasterPhase) {
      return (
        <ClueInputPanel
          state={state}
          clueWord={p.clueWord}
          clueCount={p.clueCount}
          onWordChange={p.onClueWordChange}
          onCountChange={p.onClueCountChange}
          onSubmit={p.onGiveClue}
          onShowKey={undefined}  // spymaster always sees key in online
          showKey={p.showKey}
        />
      );
    }
    if (p.isMyTeamsTurn) {
      return (
        <WaitingPanel
          label={`⏳ Your spymaster${p.currentSpymaster ? ` (${p.currentSpymaster.name})` : ""} is thinking…`}
          team={state.currentTeam}
        />
      );
    }
    return (
      <WaitingPanel
        label={`⏳ ${capitalize(state.currentTeam === "red" ? "blue" : "red")} team is giving their clue…`}
        team={state.currentTeam === "red" ? "blue" : "red"}
      />
    );
  }

  if (state.phase === "guessing") {
    if (p.isMyOperativePhase) {
      return <GuessingPanel state={state} onEndTurn={p.onEndTurn} />;
    }
    if (p.isMySpymaster && p.isMyTeamsTurn) {
      return (
        <WaitingPanel
          label={`⏳ Your operatives are guessing — watch the board!`}
          team={state.currentTeam}
          clue={state.currentClue ?? undefined}
        />
      );
    }
    return (
      <WaitingPanel
        label={`⏳ ${capitalize(state.currentTeam)} team is guessing…`}
        team={state.currentTeam}
        clue={state.currentClue ?? undefined}
      />
    );
  }

  return null;
}

// ─── Clue Input Panel ─────────────────────────────────────────────────────────

function ClueInputPanel({
  state,
  clueWord,
  clueCount,
  onWordChange,
  onCountChange,
  onSubmit,
  onShowKey,
  showKey,
}: {
  state: CodenamesState;
  clueWord: string;
  clueCount: number;
  onWordChange: (v: string) => void;
  onCountChange: (v: number) => void;
  onSubmit: () => void;
  onShowKey?: () => void;
  showKey: boolean;
}) {
  const spymaster = state.players.find(
    (p) => p.isSpymaster && p.team === state.currentTeam
  );
  const teamBg =
    state.currentTeam === "red"
      ? "bg-red-500/20 border-red-500/40"
      : "bg-blue-500/20 border-blue-500/40";
  const teamColor =
    state.currentTeam === "red" ? "text-red-400" : "text-blue-400";

  return (
    <div className={cn("rounded-2xl border p-4 flex flex-col gap-3", teamBg)}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-white">
          🕵️{" "}
          <span className={teamColor}>{spymaster?.name ?? "Spymaster"}</span>
          {" — give your clue:"}
        </p>
        {onShowKey && (
          <button
            onClick={onShowKey}
            className={cn(
              "text-xs px-2 py-1 rounded-lg font-semibold transition-all",
              showKey
                ? "bg-amber-400 text-black"
                : "bg-white/10 text-white/60 hover:text-white"
            )}
          >
            {showKey ? "🔑 Hide Key" : "🔑 Show Key"}
          </button>
        )}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          placeholder="One word…"
          value={clueWord}
          onChange={(e) => onWordChange(e.target.value.replace(/\s/g, ""))}
          onKeyDown={(e) => { if (e.key === "Enter" && clueWord.trim()) onSubmit(); }}
          maxLength={30}
          className={cn(
            "flex-1 h-11 px-3 rounded-xl border text-sm font-bold uppercase",
            "bg-black/30 text-white placeholder:text-white/30 placeholder:normal-case placeholder:font-normal",
            "border-white/20 focus:border-white/50 focus:outline-none focus:ring-2 focus:ring-white/20"
          )}
        />
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onCountChange(Math.max(0, clueCount - 1))}
            className="w-8 h-11 rounded-xl bg-white/10 text-white hover:bg-white/20 text-lg font-bold flex items-center justify-center"
          >
            −
          </button>
          <div className="w-10 h-11 flex items-center justify-center">
            <span className="text-white font-black text-lg">
              {clueCount === 0 ? "∞" : clueCount}
            </span>
          </div>
          <button
            onClick={() => onCountChange(clueCount + 1)}
            className="w-8 h-11 rounded-xl bg-white/10 text-white hover:bg-white/20 text-lg font-bold flex items-center justify-center"
          >
            +
          </button>
        </div>
      </div>

      <Button
        variant="primary"
        size="lg"
        fullWidth
        onClick={onSubmit}
        disabled={!clueWord.trim()}
      >
        Give Clue →
      </Button>
    </div>
  );
}

// ─── Guessing Panel ───────────────────────────────────────────────────────────

function GuessingPanel({
  state,
  onEndTurn,
}: {
  state: CodenamesState;
  onEndTurn: () => void;
}) {
  const clue = state.currentClue;
  const teamBg =
    state.currentTeam === "red"
      ? "bg-red-500/20 border-red-500/40"
      : "bg-blue-500/20 border-blue-500/40";
  const teamColor =
    state.currentTeam === "red" ? "text-red-400" : "text-blue-400";
  const guessDisplay =
    state.guessesRemaining >= 99 ? "∞" : state.guessesRemaining;

  const operatives = state.players
    .filter((p) => p.team === state.currentTeam && !p.isSpymaster)
    .map((p) => p.name)
    .join(", ");

  return (
    <div className={cn("rounded-2xl border p-4 flex flex-col gap-3", teamBg)}>
      <div className="flex items-center justify-between">
        <p className="text-xs text-white/60">
          Operatives:{" "}
          <span className="text-white font-semibold">{operatives || "–"}</span>
        </p>
        <span
          className={cn(
            "text-xs px-2 py-1 rounded-full font-bold",
            state.currentTeam === "red"
              ? "bg-red-500/30 text-red-300"
              : "bg-blue-500/30 text-blue-300"
          )}
        >
          {guessDisplay} guess{state.guessesRemaining === 1 ? "" : "es"} left
        </span>
      </div>

      {clue && (
        <div className="bg-black/30 rounded-xl px-4 py-3 flex items-center gap-3">
          <span className={cn("text-2xl font-black tracking-widest uppercase", teamColor)}>
            {clue.word}
          </span>
          <span className="text-white/50 text-sm">×</span>
          <span className="text-white font-bold text-xl">
            {clue.count === 0 ? "∞" : clue.count}
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="secondary"
          size="md"
          onClick={onEndTurn}
          className="border-white/20 text-white/80"
        >
          End Turn →
        </Button>
        <div className="text-xs text-white/40 flex items-center justify-center text-center leading-snug px-2">
          Tap cards on the board to guess
        </div>
      </div>
    </div>
  );
}

// ─── Waiting Panel (online: not your turn) ────────────────────────────────────

function WaitingPanel({
  label,
  team,
  clue,
}: {
  label: string;
  team: Team;
  clue?: { word: string; count: number } | null;
}) {
  const teamBg =
    team === "red"
      ? "bg-red-900/20 border-red-500/20"
      : "bg-blue-900/20 border-blue-500/20";

  return (
    <div className={cn("rounded-2xl border p-4 flex flex-col gap-2", teamBg)}>
      <p className="text-sm text-white/60 text-center">{label}</p>
      {clue && (
        <div className="bg-black/20 rounded-xl px-4 py-2 flex items-center justify-center gap-3">
          <span
            className={cn(
              "text-xl font-black tracking-widest uppercase",
              team === "red" ? "text-red-400" : "text-blue-400"
            )}
          >
            {clue.word}
          </span>
          <span className="text-white/40">×</span>
          <span className="text-white font-bold text-lg">
            {clue.count === 0 ? "∞" : clue.count}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Log Drawer ───────────────────────────────────────────────────────────────

function LogDrawer({
  open,
  onClose,
  state,
  logRef,
}: {
  open: boolean;
  onClose: () => void;
  state: CodenamesState;
  logRef: React.RefObject<HTMLDivElement | null>;
}) {
  const turns = buildLog(state);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50"
            onClick={onClose}
          />
          {/* Drawer */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-[#0a200a] rounded-t-3xl border-t border-white/10 flex flex-col"
            style={{ maxHeight: "72vh" }}
          >
            {/* Handle + title */}
            <div className="flex items-center justify-between px-5 py-4">
              <p className="text-white font-bold text-base">📋 Clue Log</p>
              <button
                onClick={onClose}
                className="text-white/40 hover:text-white text-xl leading-none"
              >
                ✕
              </button>
            </div>

            {/* Scrollable content */}
            <div
              ref={logRef as React.RefObject<HTMLDivElement>}
              className="flex-1 overflow-y-auto px-4 pb-6 flex flex-col gap-4"
            >
              {turns.length === 0 ? (
                <p className="text-white/30 text-sm text-center py-6">
                  No clues given yet.
                </p>
              ) : (
                turns.map((turn) => (
                  <LogTurnCard key={`${turn.team}-${turn.turnNum}`} turn={turn} />
                ))
              )}

              {/* Game over note */}
              {state.phase === "game_over" && state.winReason && (
                <div className="mt-1 p-3 rounded-xl bg-white/5 border border-white/10 text-center">
                  <span className="text-white/70 text-xs">{state.winReason}</span>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function LogTurnCard({ turn }: { turn: LogTurn }) {
  const teamColor = turn.team === "red" ? "text-red-400" : "text-blue-400";
  const teamBg =
    turn.team === "red" ? "bg-red-500/10 border-red-500/20" : "bg-blue-500/10 border-blue-500/20";

  function guessIcon(type: CardType): string {
    switch (type) {
      case "red":      return "🟥";
      case "blue":     return "🟦";
      case "neutral":  return "🟫";
      case "assassin": return "💀";
    }
  }

  function guessLabel(type: CardType, guessingTeam: Team): string {
    if (type === "assassin") return "Assassin!";
    if (type === "neutral") return "Neutral";
    if (type === guessingTeam) return "✓ Correct";
    return "✗ Wrong team";
  }

  return (
    <div className={cn("rounded-xl border p-3 flex flex-col gap-2", teamBg)}>
      <div className="flex items-center gap-2">
        <span className={cn("text-xs font-bold uppercase tracking-wider", teamColor)}>
          {turn.team === "red" ? "🔴 Red" : "🔵 Blue"} · Turn {turn.turnNum}
        </span>
      </div>

      {/* Clue */}
      <div className="flex items-center gap-2 bg-black/20 rounded-lg px-3 py-2">
        <span className="text-white/50 text-xs">🕵️ Clue:</span>
        <span className={cn("font-black text-sm uppercase tracking-wider", teamColor)}>
          {turn.clue.word}
        </span>
        <span className="text-white/40 text-xs">×</span>
        <span className="text-white font-bold text-sm">
          {turn.clue.count === 0 ? "∞" : turn.clue.count}
        </span>
      </div>

      {/* Guesses */}
      {turn.guesses.length === 0 ? (
        <p className="text-white/30 text-xs italic px-1">No guesses made yet</p>
      ) : (
        <div className="flex flex-col gap-1">
          {turn.guesses.map((g, i) => (
            <div key={i} className="flex items-center gap-2 px-1">
              <span className="text-sm">{guessIcon(g.type)}</span>
              <span className="text-white text-xs font-semibold uppercase tracking-wide flex-1">
                {g.word}
              </span>
              <span
                className={cn(
                  "text-[10px] font-medium",
                  g.type === turn.team ? "text-green-400" : g.type === "assassin" ? "text-red-500" : "text-white/40"
                )}
              >
                {guessLabel(g.type, turn.team)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Game Over Screen ─────────────────────────────────────────────────────────

function GameOverScreen({
  state,
  onPlayAgain,
  onExit,
  showKey,
  onToggleKey,
  logOpen,
  onToggleLog,
  logRef,
}: {
  state: CodenamesState;
  onPlayAgain: () => void;
  onExit: () => void;
  showKey: boolean;
  onToggleKey?: () => void;
  logOpen: boolean;
  onToggleLog: () => void;
  logRef: React.RefObject<HTMLDivElement | null>;
}) {
  const winner = state.winner;
  const isRed = winner === "red";
  const isAssassin = state.winReason?.includes("Assassin");

  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex items-center justify-between px-3 py-2 bg-black/30 gap-2">
        <button onClick={onExit} className="text-white/70 hover:text-white text-sm">
          ← Exit
        </button>
        <span className="text-white font-black text-base tracking-widest">CODENAMES</span>
        <div className="flex items-center gap-1">
          <button
            onClick={onToggleLog}
            className={cn(
              "text-sm px-2 py-1 rounded-lg font-bold transition-all",
              logOpen ? "bg-emerald-500 text-black" : "bg-white/10 text-white/70"
            )}
          >
            📋
          </button>
          {onToggleKey && (
            <button
              onClick={onToggleKey}
              className={cn(
                "text-sm px-2 py-1 rounded-lg font-bold",
                showKey ? "bg-amber-500 text-black" : "bg-white/10 text-white/70"
              )}
            >
              🔑
            </button>
          )}
        </div>
      </div>

      <ScoreBar state={state} />

      <div className="relative flex-1 flex items-center justify-center p-4">
        {/* Dimmed final board */}
        <div className="absolute inset-0 p-2 opacity-25 pointer-events-none">
          <div className="w-full h-full grid grid-cols-5 gap-1.5">
            {state.words.map((card) => (
              <WordCardTile
                key={card.id}
                card={{ ...card, revealed: true }}
                showType
                isClickable={false}
                isLastRevealed={false}
                onClick={() => {}}
              />
            ))}
          </div>
        </div>

        {/* Result card */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 24 }}
          className={cn(
            "relative z-10 rounded-3xl border-2 p-8 flex flex-col items-center gap-4 text-center max-w-xs w-full shadow-2xl bg-[#0d2b0d]/95 backdrop-blur",
            isRed ? "border-red-500" : "border-blue-500"
          )}
        >
          <div className="text-6xl">{isAssassin ? "💀" : "🏆"}</div>
          <div className={cn("text-3xl font-black", isRed ? "text-red-400" : "text-blue-400")}>
            {winner ? `${winner.toUpperCase()} WINS` : "GAME OVER"}
          </div>
          <p className="text-white/70 text-sm leading-relaxed">{state.winReason}</p>

          <div className="flex gap-6 mt-1">
            <div className="text-center">
              <div className="text-red-400 font-black text-xl">{state.teams.red.remaining}</div>
              <div className="text-white/40 text-xs">Red left</div>
            </div>
            <div className="text-center">
              <div className="text-blue-400 font-black text-xl">{state.teams.blue.remaining}</div>
              <div className="text-white/40 text-xs">Blue left</div>
            </div>
          </div>

          <div className="flex flex-col gap-2 w-full mt-2">
            <Button variant="primary" size="lg" fullWidth onClick={onPlayAgain}>
              🎮 Play Again
            </Button>
            <Button variant="secondary" size="md" fullWidth onClick={onExit}>
              ← Back to Lobby
            </Button>
          </div>
        </motion.div>
      </div>

      {/* Log drawer on game over too */}
      <LogDrawer open={logOpen} onClose={onToggleLog} state={state} logRef={logRef} />
    </div>
  );
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
