"use client";

/**
 * Undercover — Main Game Surface.
 *
 * Simplified flow: card_reveal → clue_phase → voting → elimination_reveal
 *   → [revenger_pick] → [mr_white_guess] → clue_phase (loop) → game_over
 */

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import type { UndercoverPlayerView, PublicPlayerInfo, PrivateCard } from "../selectors";
import type { UndercoverAction } from "../actions";
import type { SpecialCharacterSettings, WordDifficulty } from "../types";
import { RulesDrawer, RulesHelpButton, useRulesHelp } from "@/components/game/RulesDrawer";
import { getUndercoverHelp } from "../help";

// ─── Props ────────────────────────────────────────────────────────────────────

interface UndercoverGameProps {
  view: UndercoverPlayerView;
  onAction: (action: UndercoverAction) => void;
  onExit?: () => void;
  onPlayAgain?: (difficulty?: WordDifficulty, specialCharacters?: SpecialCharacterSettings) => void;
  onEndSession?: () => void;
  cumulativeScores?: Record<string, number>;
  gamesPlayed?: number;
}

// ─── Main Router ──────────────────────────────────────────────────────────────

export function UndercoverGame({
  view,
  onAction,
  onExit,
  onPlayAgain,
  onEndSession,
  cumulativeScores,
  gamesPlayed,
}: UndercoverGameProps) {
  const { open: rulesOpen, openRules, closeRules } = useRulesHelp();
  const { judge, joyFool, ghost, lovers, revenger, duelists } =
    view.activeSpecialCharacters;
  const help = React.useMemo(
    () =>
      getUndercoverHelp({ judge, joyFool, ghost, lovers, revenger, duelists }),
    [judge, joyFool, ghost, lovers, revenger, duelists]
  );

  return (
    <div className="min-h-screen bg-[rgb(var(--color-surface-sunken))] flex flex-col">
      <GameHeader view={view} onExit={onExit} onOpenRules={openRules} />
      <div className="flex-1 flex flex-col max-w-lg mx-auto w-full px-4 pb-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={view.phase}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.25 }}
            className="flex-1 flex flex-col"
          >
            {view.phase === "card_reveal" && (
              <CardRevealPhase view={view} onAction={onAction} />
            )}
            {view.phase === "clue_phase" && (
              <CluePhase view={view} onAction={onAction} />
            )}
            {view.phase === "voting" && (
              <VotingPhase view={view} onAction={onAction} />
            )}
            {view.phase === "elimination_reveal" && (
              <EliminationRevealPhase view={view} onAction={onAction} />
            )}
            {view.phase === "revenger_pick" && (
              <RevengerPickPhase view={view} onAction={onAction} />
            )}
            {view.phase === "mr_white_guess" && (
              <MrWhiteGuessPhase view={view} onAction={onAction} />
            )}
            {view.phase === "game_over" && (
              <GameOverPhase
                view={view}
                onPlayAgain={onPlayAgain}
                onEndSession={onEndSession}
                cumulativeScores={cumulativeScores}
                gamesPlayed={gamesPlayed ?? 0}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <RulesDrawer open={rulesOpen} onClose={closeRules} help={help} />
    </div>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────

function GameHeader({
  view,
  onExit,
  onOpenRules,
}: {
  view: UndercoverPlayerView;
  onExit?: () => void;
  onOpenRules?: () => void;
}) {
  const phaseLabels: Record<string, string> = {
    card_reveal: "Secret Cards",
    clue_phase: `Round ${view.roundNumber} — Give Clues`,
    voting: `Round ${view.roundNumber} — Vote`,
    elimination_reveal: "Eliminated!",
    revenger_pick: "Revenger's Choice",
    mr_white_guess: "Mr. White's Guess",
    game_over: "Game Over",
  };

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-[rgb(var(--color-surface))] border-b border-[rgb(var(--color-border))]">
      <div>
        <div className="text-sm font-semibold text-[rgb(var(--color-text))]">
          {phaseLabels[view.phase] ?? view.phase}
        </div>
        <div className="text-xs text-[rgb(var(--color-text-muted))]">
          {view.players.filter((p) => !p.isEliminated).length} players remaining
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-[rgb(var(--color-text-muted))]">{view.myName}</span>
        {view.isCreator && (
          <span className="text-xs bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-full px-2 py-0.5 font-medium">
            Host
          </span>
        )}
        {onOpenRules && <RulesHelpButton onClick={onOpenRules} />}
        {onExit && view.phase !== "game_over" && (
          <button
            onClick={onExit}
            className="ml-2 text-xs text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-text))] transition-colors"
            aria-label="Exit game"
          >
            ✕ Exit
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Card Reveal Phase ────────────────────────────────────────────────────────

type RevealStep = "pass-device" | "face-down" | "revealed";

function CardRevealPhase({ view, onAction }: UndercoverGameProps) {
  const [step, setStep] = React.useState<RevealStep>("pass-device");
  const [confirmedLocally, setConfirmedLocally] = React.useState(false);

  const living = view.players.filter((p) => !p.isEliminated);
  const activeTurnOrder = view.turnOrder.filter((id) => living.some((p) => p.id === id));
  const totalPlayers = activeTurnOrder.length;
  const revealed = view.cardRevealIndex;

  const currentRevealPlayer = view.players.find((p) => p.id === view.myPlayerId);

  const handleHideAndPass = () => {
    if (view.mode === "online") {
      setConfirmedLocally(true);
    } else {
      setStep("pass-device");
    }
    onAction({ type: "HIDE_CARD", playerId: view.myPlayerId });
  };

  const iHaveConfirmed = view.cardsRevealed.includes(view.myPlayerId) || confirmedLocally;
  const livingPlayers = view.players.filter((p) => !p.isEliminated);
  const stillWaiting = livingPlayers.filter((p) => !view.cardsRevealed.includes(p.id));

  // ── Online mode ───────────────────────────────────────────────────────────
  if (view.mode === "online") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 py-8 px-2">
        <h2 className="text-lg font-bold text-[rgb(var(--color-text))] text-center">Your Secret Card</h2>
        <p className="text-sm text-[rgb(var(--color-text-muted))] text-center">Don&apos;t show your screen to others.</p>
        {iHaveConfirmed ? (
          <div className="flex flex-col items-center gap-3 text-center px-4">
            <div className="text-5xl">✓</div>
            <h3 className="text-base font-bold text-[rgb(var(--color-text))]">Card memorized</h3>
            <p className="text-sm text-[rgb(var(--color-text-muted))]">
              Waiting for everyone to continue…
            </p>
            <p className="text-xs text-[rgb(var(--color-text-muted))]">
              {view.cardsRevealed.length} / {livingPlayers.length} ready
              {stillWaiting.length > 0 && (
                <>
                  <br />
                  Still waiting: {stillWaiting.map((p) => p.name).join(", ")}
                </>
              )}
            </p>
          </div>
        ) : (
          <>
            {step === "pass-device" && (
              <FaceDownCard onFlip={() => setStep("revealed")} label="Tap to reveal your card" />
            )}
            {step === "revealed" && (
              <>
                <SecretCard card={view.myCard} />
                <Button onClick={handleHideAndPass} variant="secondary" size="lg">
                  I have memorized my card — Continue
                </Button>
              </>
            )}
          </>
        )}
      </div>
    );
  }

  // ── Offline: pass-device ──────────────────────────────────────────────────
  if (step === "pass-device") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 py-8 text-center px-4">
        <div className="flex gap-1.5 mb-2">
          {activeTurnOrder.map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1.5 rounded-full flex-1 transition-all duration-300",
                i < revealed
                  ? "bg-[rgb(var(--color-primary))]"
                  : i === revealed
                  ? "bg-[rgb(var(--color-primary))]/40"
                  : "bg-[rgb(var(--color-border))]"
              )}
            />
          ))}
        </div>
        <div className="text-xs text-[rgb(var(--color-text-muted))] font-medium">
          {revealed} / {totalPlayers} cards revealed
        </div>
        <div className="text-6xl">📱</div>
        <div>
          <h2 className="text-xl font-bold text-[rgb(var(--color-text))]">Pass the Device</h2>
          <p className="text-[rgb(var(--color-text-muted))] text-sm mt-2">
            Hand the phone to{" "}
            <span className="font-bold text-[rgb(var(--color-text))]">
              {currentRevealPlayer?.name}
            </span>
          </p>
        </div>
        <div className="relative w-44 h-28 mx-auto">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-800 to-purple-950 shadow-lg translate-x-1.5 translate-y-1.5 opacity-50" />
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-700 to-purple-900 shadow-lg translate-x-0.5 translate-y-0.5 opacity-70" />
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-800 shadow-xl flex items-center justify-center">
            <span className="text-4xl select-none">🃏</span>
          </div>
        </div>
        <Button variant="primary" size="lg" onClick={() => setStep("face-down")} className="w-full max-w-xs">
          I&apos;m {currentRevealPlayer?.name} — Ready
        </Button>
      </div>
    );
  }

  if (step === "face-down") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 py-8 px-4">
        <h2 className="text-lg font-bold text-[rgb(var(--color-text))] text-center">
          {currentRevealPlayer?.name}&apos;s Secret Card
        </h2>
        <p className="text-sm text-[rgb(var(--color-text-muted))] text-center">
          Make sure nobody else can see your screen, then tap the card.
        </p>
        <FaceDownCard onFlip={() => setStep("revealed")} label="Tap to flip your card" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center gap-5 py-6 px-2">
      <div className="text-center">
        <h2 className="text-base font-bold text-[rgb(var(--color-text))]">
          {currentRevealPlayer?.name}&apos;s Card
        </h2>
        <p className="text-xs text-[rgb(var(--color-text-muted))] mt-0.5">
          Memorise it, then hide the screen.
        </p>
      </div>
      <SecretCard card={view.myCard} />
      <Button onClick={handleHideAndPass} variant="primary" size="lg" className="w-full max-w-xs mt-2">
        Hide & Pass Device →
      </Button>
    </div>
  );
}

// ─── Face-Down Card ───────────────────────────────────────────────────────────

function FaceDownCard({ onFlip, label }: { onFlip: () => void; label: string }) {
  const [flipping, setFlipping] = React.useState(false);
  const handleTap = () => {
    if (flipping) return;
    setFlipping(true);
    setTimeout(onFlip, 300);
  };
  return (
    <motion.button
      onClick={handleTap}
      whileTap={{ scale: 0.95 }}
      animate={flipping ? { rotateY: 90 } : { rotateY: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center gap-4 cursor-pointer group"
      style={{ perspective: 800 }}
    >
      <div className={cn(
        "w-52 h-36 rounded-2xl shadow-2xl relative overflow-hidden",
        "bg-gradient-to-br from-violet-600 to-purple-800",
        "flex flex-col items-center justify-center gap-2",
        "border-4 border-white/10",
        "transition-transform duration-200 group-hover:scale-105"
      )}>
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "repeating-linear-gradient(45deg, white 0px, white 1px, transparent 1px, transparent 8px)" }} />
        <span className="text-5xl relative z-10 select-none">🃏</span>
        <span className="text-white/70 text-xs font-medium relative z-10">{label}</span>
      </div>
      <p className="text-xs text-[rgb(var(--color-text-muted))] animate-pulse">Tap the card ↑</p>
    </motion.button>
  );
}

// ─── Secret Card ──────────────────────────────────────────────────────────────

function SecretCard({ card }: { card: PrivateCard }) {
  const cardColor =
    card.faction === "mr_white"
      ? "from-gray-500 to-gray-700"
      : "from-slate-600 to-slate-800";
  const isMrWhite = card.faction === "mr_white";

  return (
    <motion.div
      initial={{ rotateY: 90, opacity: 0 }}
      animate={{ rotateY: 0, opacity: 1 }}
      transition={{ duration: 0.4, type: "spring" }}
      className={cn("w-full max-w-xs rounded-2xl shadow-2xl overflow-hidden bg-gradient-to-br", cardColor)}
    >
      {isMrWhite && (
        <>
          <div className="px-5 pt-5 pb-3 text-center">
            <div className="text-4xl mb-1">👤</div>
            <div className="text-white/70 text-xs font-medium uppercase tracking-widest">Your Role</div>
            <div className="text-white text-2xl font-black tracking-wide mt-1">MR. WHITE</div>
          </div>
          <div className="mx-5 border-t border-white/20" />
        </>
      )}
      <div className="px-5 py-4 text-center">
        {card.word !== null ? (
          <>
            <div className="text-white/70 text-xs font-medium uppercase tracking-widest mb-1">Your Word</div>
            <div className="text-white text-3xl font-black">{card.word}</div>
          </>
        ) : (
          <>
            <div className="text-white/70 text-xs font-medium uppercase tracking-widest mb-1">Word</div>
            <div className="text-white/60 text-base italic">
              You have no word.{"\n"}Listen carefully to the clues.
            </div>
          </>
        )}
      </div>
      {card.specialCharacters.length > 0 && (
        <>
          <div className="mx-5 border-t border-white/20" />
          <div className="px-5 py-3">
            <div className="text-white/70 text-xs font-medium uppercase tracking-widest mb-2">Special Role</div>
            <div className="flex flex-wrap gap-1.5">
              {card.specialCharacters.map((sc) => (
                <span key={sc} className="bg-white/20 text-white text-xs font-semibold rounded-full px-2.5 py-1">
                  {formatSpecialCharacter(sc)}
                </span>
              ))}
            </div>
          </div>
        </>
      )}
      {(card.loverPartnerName || card.duelistRivalName) && (
        <>
          <div className="mx-5 border-t border-white/20" />
          <div className="px-5 py-3 text-center space-y-1">
            {card.loverPartnerName && (
              <div className="text-white text-sm">💕 Your Lover: <strong>{card.loverPartnerName}</strong></div>
            )}
            {card.duelistRivalName && (
              <div className="text-white text-sm">⚔️ Your Rival: <strong>{card.duelistRivalName}</strong></div>
            )}
          </div>
        </>
      )}
      {card.instructions.length > 0 && (
        <>
          <div className="mx-5 border-t border-white/20" />
          <div className="px-5 py-3">
            <div className="text-white/70 text-xs font-medium uppercase tracking-widest mb-1.5">Your Goal</div>
            {card.instructions.map((inst, i) => (
              <p key={i} className="text-white/80 text-xs leading-snug">• {inst}</p>
            ))}
          </div>
        </>
      )}
      <div className="pb-4" />
    </motion.div>
  );
}

function formatSpecialCharacter(sc: string): string {
  const labels: Record<string, string> = {
    judge: "⚖️ Judge", joy_fool: "🤡 Joy Fool", ghost: "👻 Ghost",
    lover: "💕 Lover", revenger: "🗡️ Revenger", duelist: "⚔️ Duelist",
  };
  return labels[sc] ?? sc;
}

// ─── Clue Phase ───────────────────────────────────────────────────────────────

function CluePhase({ view, onAction }: UndercoverGameProps) {
  const [clueText, setClueText] = React.useState("");

  const living = view.players.filter((p) => !p.isEliminated);
  const activeTurnOrder = view.turnOrder.filter((id) => living.some((p) => p.id === id));
  const currentPlayerId = activeTurnOrder[view.currentClueIndex];
  const currentPlayer = view.players.find((p) => p.id === currentPlayerId);
  const roundClues = view.clues.filter((c) => c.roundNumber === view.roundNumber);
  const isLastPlayer = view.currentClueIndex === activeTurnOrder.length - 1;

  // ── Offline: verbal clues, host taps Next ─────────────────────────────────
  if (view.mode === "offline") {
    const handleNext = () => {
      onAction({ type: "SUBMIT_CLUE", playerId: currentPlayerId, clue: "✓" });
    };
    return (
      <div className="flex-1 flex flex-col gap-5 py-4">
        <div className="flex flex-col gap-1.5">
          <div className="text-xs font-semibold text-[rgb(var(--color-text-muted))] uppercase tracking-wide px-1">
            Clue order
          </div>
          {activeTurnOrder.map((id, i) => {
            const p = view.players.find((pl) => pl.id === id);
            const done = i < view.currentClueIndex;
            const active = i === view.currentClueIndex;
            return (
              <motion.div
                key={id}
                initial={false}
                animate={{ opacity: done ? 0.45 : 1 }}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
                  active
                    ? "bg-[rgb(var(--color-primary))]/15 border-2 border-[rgb(var(--color-primary))]/40"
                    : "bg-[rgb(var(--color-surface-raised))]"
                )}
              >
                <div className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
                  done  ? "bg-green-500/20 text-green-500"
                       : active ? "bg-[rgb(var(--color-primary))]/20 text-[rgb(var(--color-primary))]"
                       : "bg-[rgb(var(--color-surface-sunken))] text-[rgb(var(--color-text-muted))]"
                )}>
                  {done ? "✓" : active ? "🎤" : i + 1}
                </div>
                <span className={cn("flex-1 font-semibold text-sm",
                  active ? "text-[rgb(var(--color-text))]" : "text-[rgb(var(--color-text-muted))]")}>
                  {p?.name ?? id}
                </span>
                {active && (
                  <span className="text-xs text-[rgb(var(--color-primary))] font-medium animate-pulse">speaking now</span>
                )}
              </motion.div>
            );
          })}
        </div>

        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <div className="text-4xl">🎤</div>
          <div>
            <div className="text-lg font-black text-[rgb(var(--color-text))]">
              {currentPlayer?.name}&apos;s turn
            </div>
            <div className="text-sm text-[rgb(var(--color-text-muted))] mt-1">Say your clue out loud</div>
          </div>
        </div>

        <Button variant="primary" size="lg" fullWidth onClick={handleNext}>
          {isLastPlayer
            ? "✓ All clues done — Vote →"
            : `Next — ${view.players.find((p) => p.id === activeTurnOrder[view.currentClueIndex + 1])?.name ?? ""} →`}
        </Button>
      </div>
    );
  }

  // ── Online: typed clues, input only open for current player ──────────────
  const isMyTurn = currentPlayerId === view.myPlayerId;
  const me = view.players.find((p) => p.id === view.myPlayerId);
  const iAmOut = !!me?.isEliminated && !me?.isGhost;

  const turnStatusText = iAmOut
    ? "You have been eliminated — watch the remaining players."
    : isMyTurn
    ? "🎤 Your turn to give a clue!"
    : <>Waiting for <strong>{currentPlayer?.name ?? "…"}</strong></>;

  const handleSubmit = () => {
    if (!clueText.trim() || !isMyTurn || iAmOut) return;
    onAction({ type: "SUBMIT_CLUE", playerId: view.myPlayerId, clue: clueText.trim() });
    setClueText("");
  };

  return (
    <div className="flex-1 flex flex-col gap-4 py-4">
      <IdentityBanner view={view} />
      <PreviousClues view={view} />

      <div className="text-center text-sm text-[rgb(var(--color-text-muted))]">
        {roundClues.length} / {activeTurnOrder.length} clues given this round
      </div>

      <div className="flex-1 flex flex-col gap-2 overflow-y-auto">
        {roundClues.map((clue) => (
          <motion.div
            key={`${clue.playerId}-${clue.turnIndex}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3 p-3 bg-[rgb(var(--color-surface-raised))] rounded-xl"
          >
            <div className="w-8 h-8 rounded-full bg-[rgb(var(--color-primary))]/20 flex items-center justify-center text-sm font-bold text-[rgb(var(--color-primary))] shrink-0">
              {clue.playerName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="text-xs text-[rgb(var(--color-text-muted))] mb-0.5">{clue.playerName}</div>
              <div className="text-[rgb(var(--color-text))] font-semibold">{clue.clue}</div>
            </div>
          </motion.div>
        ))}
        {roundClues.length === 0 && (
          <div className="text-center text-[rgb(var(--color-text-muted))] text-sm py-8">
            {turnStatusText}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <div className={cn(
          "p-3 rounded-xl text-sm font-medium text-center",
          isMyTurn
            ? "bg-[rgb(var(--color-primary))]/15 text-[rgb(var(--color-primary))]"
            : "bg-[rgb(var(--color-surface-raised))] text-[rgb(var(--color-text-muted))]"
        )}>
          {turnStatusText}
        </div>

        {isMyTurn && !iAmOut && (
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Your one-word clue…"
              value={clueText}
              onChange={(e) => setClueText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              maxLength={40}
              autoFocus
              className={cn(
                "flex-1 h-12 px-4 rounded-xl border text-sm",
                "bg-[rgb(var(--color-surface))] text-[rgb(var(--color-text))]",
                "border-[rgb(var(--color-border-strong))]",
                "focus:outline-none focus:ring-2 focus:ring-[rgb(var(--color-focus))]"
              )}
            />
            <Button onClick={handleSubmit} disabled={!clueText.trim()} size="lg" className="shrink-0">Send</Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Vote tally (shared by tie-break and host confirm) ────────────────────────

function VoteTally({
  view,
  highlightIds,
  pendingId,
}: {
  view: UndercoverPlayerView;
  highlightIds: string[];
  pendingId: string | null;
}) {
  if (!view.voteResult) return null;
  const highlighted = new Set(highlightIds);

  return (
    <div className="w-full flex flex-col gap-2">
      {Object.entries(view.voteResult.totals)
        .sort(([, a], [, b]) => b - a)
        .map(([targetId, count]) => {
          const player = view.players.find((p) => p.id === targetId);
          const isPending = targetId === pendingId;
          const isHighlighted = highlighted.has(targetId);
          return (
            <div
              key={targetId}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl",
                isPending
                  ? "bg-red-500/15 border-2 border-red-500"
                  : isHighlighted
                    ? "bg-[rgb(var(--color-primary))]/10 border-2 border-[rgb(var(--color-primary))]/40"
                    : "bg-[rgb(var(--color-surface-raised))]"
              )}
            >
              <PlayerAvatar player={player} />
              <span className="font-semibold flex-1 text-[rgb(var(--color-text))]">{player?.name}</span>
              <span className="font-bold text-[rgb(var(--color-text))]">
                {count} vote{count !== 1 ? "s" : ""}
              </span>
            </div>
          );
        })}
    </div>
  );
}

// ─── Voting Phase ─────────────────────────────────────────────────────────────
//
// Three states (online):
//   1. pendingElimination === null && !awaitingJudgeDecision → voting in progress
//   2. awaitingJudgeDecision → vote tied; living Judge casts one extra vote
//   3. pendingElimination is set → all votes in; host confirms or revotes
//
// Offline: OfflineEliminationPicker has its own confirmation; ADMIN_ELIMINATE
//          goes straight to elimination_reveal.

function VotingPhase({ view, onAction }: UndercoverGameProps) {
  // All hooks must be at the top (before any early returns)
  const [selectedTarget, setSelectedTarget] = React.useState<string | null>(null);

  const living = view.players.filter((p) => !p.isEliminated);
  const activeTurnOrder = view.turnOrder.filter((id) => living.some((p) => p.id === id));

  // Offline
  if (view.mode === "offline") {
    return (
      <OfflineEliminationPicker
        living={living}
        onEliminate={(id) => onAction({ type: "ADMIN_ELIMINATE", targetId: id })}
      />
    );
  }

  // Online — tied vote: Judge casts one extra vote, then host confirms as usual
  if (view.awaitingJudgeDecision && view.voteResult) {
    const tiedPlayers = view.voteResult.leaders
      .map((id) => view.players.find((p) => p.id === id))
      .filter((p): p is PublicPlayerInfo => !!p);
    const canJudgePick = view.isJudge && !view.players.find((p) => p.id === view.myPlayerId)?.isEliminated;

    const handleJudgeVote = () => {
      if (!selectedTarget || !canJudgePick) return;
      onAction({ type: "JUDGE_DECISION", judgeId: view.myPlayerId, targetId: selectedTarget });
      setSelectedTarget(null);
    };

    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 py-8">
        <div className="text-5xl">⚖️</div>
        <div className="text-center">
          <h2 className="text-lg font-bold text-[rgb(var(--color-text))]">It&apos;s a tie!</h2>
          <p className="text-sm text-[rgb(var(--color-text-muted))] mt-1">
            {canJudgePick
              ? "Cast one extra vote for a tied player. That vote breaks the tie."
              : "Waiting for the Judge to cast an extra vote and break the tie."}
          </p>
        </div>

        <VoteTally
          view={view}
          highlightIds={view.voteResult.leaders}
          pendingId={null}
        />

        {canJudgePick ? (
          <div className="w-full flex flex-col gap-3">
            <div className="p-3 rounded-xl bg-[rgb(var(--color-primary))]/10 text-center text-sm font-medium text-[rgb(var(--color-primary))]">
              ⚖️ Your extra vote — tap a tied player
            </div>
            <div className="flex flex-col gap-2">
              {tiedPlayers.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedTarget(p.id === selectedTarget ? null : p.id)}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left",
                    selectedTarget === p.id
                      ? "border-red-500 bg-red-500/10"
                      : "border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface-raised))] hover:border-[rgb(var(--color-border-strong))]"
                  )}
                >
                  <PlayerAvatar player={p} />
                  <span className="font-semibold text-[rgb(var(--color-text))]">{p.name}</span>
                  {selectedTarget === p.id && (
                    <span className="ml-auto text-red-500 font-bold text-sm">✓ Selected</span>
                  )}
                </button>
              ))}
              <Button onClick={handleJudgeVote} disabled={!selectedTarget} variant="danger" size="lg" fullWidth className="mt-1">
                Cast extra vote
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-[rgb(var(--color-text-muted))] text-center">
            The Judge&apos;s identity stays secret.
          </p>
        )}

        {view.isCreator && (
          <Button
            variant="secondary"
            size="md"
            fullWidth
            onClick={() => onAction({ type: "REQUEST_REVOTE" })}
          >
            🔄 Revote
          </Button>
        )}
      </div>
    );
  }

  // Online — all votes in: host confirms or calls a revote
  if (view.pendingElimination) {
    const target = view.players.find((p) => p.id === view.pendingElimination);
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 py-8">
        <div className="text-5xl">⚠️</div>
        <div className="text-center">
          <h2 className="text-lg font-bold text-[rgb(var(--color-text))]">Vote complete!</h2>
          <p className="text-sm text-[rgb(var(--color-text-muted))] mt-1">
            {view.voteResult?.tieBrokenByJudge
              ? "The Judge broke the tie with an extra vote."
              : view.isCreator
                ? "Confirm the elimination, or call a revote."
                : "Waiting for the host to confirm the elimination."}
          </p>
          {view.voteResult?.tieBrokenByJudge && (
            <p className="text-sm text-[rgb(var(--color-text-muted))] mt-1">
              {view.isCreator
                ? "Confirm the elimination, or call a revote."
                : "Waiting for the host to confirm the elimination."}
            </p>
          )}
        </div>

        <VoteTally
          view={view}
          highlightIds={view.pendingElimination ? [view.pendingElimination] : []}
          pendingId={view.pendingElimination}
        />

        <div className="w-full p-4 bg-red-500/10 border-2 border-red-500/30 rounded-xl text-center">
          <p className="text-sm text-[rgb(var(--color-text-muted))]">About to eliminate:</p>
          <p className="text-2xl font-black text-[rgb(var(--color-text))] mt-1">{target?.name}</p>
        </div>

        {view.isCreator ? (
          <div className="w-full flex flex-col gap-2">
            <Button
              variant="danger"
              size="lg"
              fullWidth
              onClick={() => onAction({ type: "CONFIRM_ELIMINATION", targetId: view.pendingElimination! })}
            >
              ☠️ Eliminate {target?.name}
            </Button>
            <Button
              variant="secondary"
              size="md"
              fullWidth
              onClick={() => onAction({ type: "REQUEST_REVOTE" })}
            >
              🔄 Revote
            </Button>
          </div>
        ) : (
          <p className="text-sm text-[rgb(var(--color-text-muted))] text-center">
            Only the host can confirm or restart the vote.
          </p>
        )}
      </div>
    );
  }

  // Online — voting in progress
  const voterOrder = view.voterOrder.length > 0 ? view.voterOrder : activeTurnOrder;
  const currentVoterId = voterOrder[view.currentVoterIndex];
  const currentVoter = view.players.find((p) => p.id === currentVoterId);
  const me = view.players.find((p) => p.id === view.myPlayerId);
  const iCanVote = !me?.isEliminated || (!!me?.isGhost && view.ghostEnabled);
  const isMyVoteTurn = iCanVote && currentVoterId === view.myPlayerId;

  const handleVote = () => {
    if (!selectedTarget || !isMyVoteTurn) return;
    onAction({ type: "SUBMIT_VOTE", voterId: view.myPlayerId, targetId: selectedTarget });
    setSelectedTarget(null);
  };

  return (
    <div className="flex-1 flex flex-col gap-4 py-4">
      <div className="text-center">
        <h2 className="text-lg font-bold text-[rgb(var(--color-text))]">Vote to Eliminate</h2>
        <p className="text-sm text-[rgb(var(--color-text-muted))] mt-0.5">
          {Object.keys(view.allVotes).length} / {voterOrder.length} votes cast
        </p>
      </div>

      <PreviousClues view={view} />
      <ClueRecap view={view} />

      {/* Vote board — transparent: show who has voted for whom */}
      <div className="flex flex-col gap-1.5">
        <div className="text-xs font-semibold text-[rgb(var(--color-text-muted))] uppercase tracking-wide px-1">
          Votes so far
        </div>
        {voterOrder.map((voterId, i) => {
          const voter = view.players.find((p) => p.id === voterId);
          const targetId = view.allVotes[voterId];
          const target = targetId ? view.players.find((p) => p.id === targetId) : null;
          const isCurrentVoter = voterId === currentVoterId;
          const hasVoted = !!targetId;
          return (
            <div
              key={voterId}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all",
                isCurrentVoter && !hasVoted
                  ? "bg-[rgb(var(--color-primary))]/15 border-2 border-[rgb(var(--color-primary))]/40"
                  : hasVoted
                  ? "bg-[rgb(var(--color-surface-raised))]"
                  : "bg-[rgb(var(--color-surface-raised))] opacity-50"
              )}
            >
              <div className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                hasVoted ? "bg-green-500/20 text-green-500"
                  : isCurrentVoter ? "bg-[rgb(var(--color-primary))]/20 text-[rgb(var(--color-primary))]"
                  : "bg-[rgb(var(--color-surface-sunken))] text-[rgb(var(--color-text-muted))]"
              )}>
                {hasVoted ? "✓" : isCurrentVoter ? "🗳️" : i + 1}
              </div>
              <span className={cn("font-semibold text-sm flex-1",
                isCurrentVoter && !hasVoted ? "text-[rgb(var(--color-text))]" : "text-[rgb(var(--color-text-muted))]")}>
                {voter?.name ?? voterId}
                {voter?.isGhost && (
                  <span className="ml-1 text-[10px] font-normal">👻</span>
                )}
              </span>
              {hasVoted && target && (
                <span className="text-xs font-medium text-red-500">→ {target.name}</span>
              )}
              {!hasVoted && isCurrentVoter && (
                <span className="text-xs text-[rgb(var(--color-primary))] animate-pulse">choosing…</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Only the current voter may pick a target */}
      <div className="flex flex-col gap-3">
        {!iCanVote ? (
          <div className="p-3 rounded-xl bg-[rgb(var(--color-surface-raised))] text-center text-sm text-[rgb(var(--color-text-muted))]">
            You have been eliminated and cannot vote.
          </div>
        ) : isMyVoteTurn ? (
          <>
            <div className="p-3 rounded-xl bg-[rgb(var(--color-primary))]/10 text-center text-sm font-medium text-[rgb(var(--color-primary))]">
              🗳️ Your turn — tap a player to vote
            </div>
            <div className="flex flex-col gap-2">
              {living.filter((p) => p.id !== view.myPlayerId).map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedTarget(p.id === selectedTarget ? null : p.id)}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left",
                    selectedTarget === p.id
                      ? "border-red-500 bg-red-500/10"
                      : "border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface-raised))] hover:border-[rgb(var(--color-border-strong))]"
                  )}
                >
                  <PlayerAvatar player={p} />
                  <span className="font-semibold text-[rgb(var(--color-text))]">{p.name}</span>
                  {selectedTarget === p.id && (
                    <span className="ml-auto text-red-500 font-bold text-sm">✓ Selected</span>
                  )}
                </button>
              ))}
              <Button onClick={handleVote} disabled={!selectedTarget} variant="danger" size="lg" fullWidth className="mt-1">
                Confirm Vote
              </Button>
            </div>
          </>
        ) : (
          <div className="p-3 rounded-xl bg-[rgb(var(--color-surface-raised))] text-center text-sm text-[rgb(var(--color-text-muted))]">
            Waiting for <strong>{currentVoter?.name ?? "the next player"}</strong> to vote…
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Offline Elimination Picker ───────────────────────────────────────────────

function OfflineEliminationPicker({
  living,
  onEliminate,
}: {
  living: PublicPlayerInfo[];
  onEliminate: (id: string) => void;
}) {
  const [confirming, setConfirming] = React.useState<string | null>(null);
  const confirmTarget = living.find((p) => p.id === confirming);

  if (confirming && confirmTarget) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 py-8">
        <div className="text-5xl">⚠️</div>
        <div className="text-center">
          <div className="text-xl font-black text-[rgb(var(--color-text))]">
            Eliminate {confirmTarget.name}?
          </div>
          <div className="text-sm text-[rgb(var(--color-text-muted))] mt-1">
            This cannot be undone
          </div>
        </div>
        <div className="flex gap-3 w-full">
          <Button variant="secondary" size="lg" fullWidth onClick={() => setConfirming(null)}>
            ← Back
          </Button>
          <Button variant="danger" size="lg" fullWidth onClick={() => onEliminate(confirming)}>
            Eliminate
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col gap-4 py-4">
      <div className="text-center">
        <div className="text-3xl mb-2">🗳️</div>
        <h2 className="text-lg font-bold text-[rgb(var(--color-text))]">Who gets eliminated?</h2>
        <p className="text-sm text-[rgb(var(--color-text-muted))] mt-1">
          Discuss, then tap a player to eliminate them
        </p>
      </div>
      <div className="flex flex-col gap-2">
        {living.map((p) => (
          <motion.button
            key={p.id}
            whileTap={{ scale: 0.97 }}
            onClick={() => setConfirming(p.id)}
            className={cn(
              "flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left w-full",
              "border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface-raised))]",
              "hover:border-red-500/60 hover:bg-red-500/10 active:bg-red-500/15"
            )}
          >
            <PlayerAvatar player={p} />
            <span className="flex-1 font-semibold text-[rgb(var(--color-text))]">{p.name}</span>
            <span className="text-[rgb(var(--color-text-muted))] text-lg">→</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

// ─── Elimination Reveal Phase ─────────────────────────────────────────────────

function EliminationRevealPhase({ view, onAction }: UndercoverGameProps) {
  const reveals = view.eliminationReveal ?? [];

  return (
    <div className="flex-1 flex flex-col items-center gap-6 py-6">
      <motion.div
        initial={{ scale: 0, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 250 }}
        className="text-5xl"
      >
        🃏
      </motion.div>

      <div className="text-center">
        <h2 className="text-xl font-black text-[rgb(var(--color-text))]">
          {reveals.length === 1 ? "Eliminated!" : "Eliminated!"}
        </h2>
        <p className="text-sm text-[rgb(var(--color-text-muted))] mt-1">
          {reveals.map((r) => r.name).join(" & ")} {reveals.length === 1 ? "was" : "were"} eliminated.
          Here&apos;s what they were:
        </p>
      </div>

      <div className="w-full flex flex-col gap-3">
        {reveals.map((r) => (
          <motion.div
            key={r.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "w-full rounded-2xl overflow-hidden shadow-lg",
              r.faction === "mr_white"
                ? "bg-gradient-to-br from-gray-500 to-gray-700"
                : r.faction === "undercover"
                ? "bg-gradient-to-br from-red-700 to-rose-900"
                : "bg-gradient-to-br from-blue-600 to-blue-900"
            )}
          >
            <div className="px-5 py-5 text-center">
              <div className="text-4xl mb-2">
                {r.faction === "mr_white" ? "👤" : r.faction === "undercover" ? "🦊" : "🕵️"}
              </div>
              <div className="text-white/70 text-xs font-medium uppercase tracking-widest">
                {r.name} was a
              </div>
              <div className="text-white text-2xl font-black tracking-wide mt-1">
                {r.faction === "mr_white" ? "Mr. White" : r.faction === "undercover" ? "Undercover" : "Civilian"}
              </div>
            </div>
            {r.specialCharacters.length > 0 && (
              <>
                <div className="mx-5 border-t border-white/20" />
                <div className="px-5 py-3 text-center">
                  <div className="flex flex-wrap gap-1.5 justify-center">
                    {r.specialCharacters.map((sc) => (
                      <span key={sc} className="bg-white/20 text-white text-xs font-semibold rounded-full px-2.5 py-1">
                        {formatSpecialCharacter(sc)}
                      </span>
                    ))}
                  </div>
                </div>
              </>
            )}
          </motion.div>
        ))}
      </div>

      <Button
        variant="primary"
        size="lg"
        fullWidth
        onClick={() => onAction({ type: "CONTINUE_AFTER_REVEAL" })}
        className="mt-2"
      >
        Continue →
      </Button>
      <p className="text-xs text-center text-[rgb(var(--color-text-muted))]">
        If a winning condition is met the game will end. Otherwise the next round starts.
      </p>
    </div>
  );
}

// ─── Revenger Pick Phase ──────────────────────────────────────────────────────

function RevengerPickPhase({ view, onAction }: UndercoverGameProps) {
  const isRevenger = view.pendingRevenger === view.myPlayerId;
  const living = view.players.filter((p) => !p.isEliminated && p.id !== view.pendingRevenger);

  return (
    <div className="flex-1 flex flex-col items-center gap-6 py-8">
      <div className="text-5xl">🗡️</div>
      <h2 className="text-xl font-bold text-[rgb(var(--color-text))] text-center">
        The Revenger&apos;s Final Strike
      </h2>
      {isRevenger ? (
        <>
          <p className="text-[rgb(var(--color-text-muted))] text-sm text-center">
            You&apos;ve been eliminated — but you can take one player down with you.
          </p>
          <div className="w-full flex flex-col gap-2">
            {living.map((p) => (
              <Button
                key={p.id}
                variant="danger"
                onClick={() => onAction({ type: "REVENGER_TARGET", revengerId: view.myPlayerId, targetId: p.id })}
              >
                Take down {p.name}
              </Button>
            ))}
          </div>
        </>
      ) : (
        <p className="text-[rgb(var(--color-text-muted))] text-sm text-center">
          The Revenger is choosing their final target…
        </p>
      )}
    </div>
  );
}

// ─── Mr. White Guess Phase ────────────────────────────────────────────────────
//
// The Lobby always sets viewPlayerId = pendingMrWhiteGuess (Mr. White's player),
// so view.myPlayerId === view.pendingMrWhiteGuess on single-device.
//
// Flow:
//  1. "Pass device" screen — everyone else looks away
//  2. Mr. White types their secret guess (not visible to others)
//  3. Submit → game transitions (correct → game_over, wrong → continues silently)

type MrWhiteStep = "pass-device" | "guess";

function MrWhiteGuessPhase({ view, onAction }: UndercoverGameProps) {
  const [step, setStep] = React.useState<MrWhiteStep>("pass-device");
  const [guess, setGuess] = React.useState("");

  const isMrWhite = view.pendingMrWhiteGuess === view.myPlayerId;
  const mrWhitePlayer = view.players.find((p) => p.id === view.pendingMrWhiteGuess);

  const handleSubmit = () => {
    if (!guess.trim() || !isMrWhite) return;
    onAction({
      type: "SUBMIT_MR_WHITE_GUESS",
      playerId: view.myPlayerId,
      guess: guess.trim(),
    });
  };

  // Online: only Mr. White sees the input; everyone else waits.
  if (view.mode === "online" && !isMrWhite) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 py-8 text-center px-4">
        <div className="text-6xl">👤</div>
        <div>
          <h2 className="text-xl font-bold text-[rgb(var(--color-text))]">
            Mr. White&apos;s Last Chance
          </h2>
          <p className="text-sm text-[rgb(var(--color-text-muted))] mt-2">
            {mrWhitePlayer?.name ?? "Mr. White"} is making a secret guess.
            If they are right, they win. If they are wrong, the game continues
            and nobody will see what they typed.
          </p>
        </div>
      </div>
    );
  }

  // ── Step 1: pass-device screen (offline shared device only) ───────────────
  if (view.mode !== "online" && step === "pass-device") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 py-8 text-center px-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200 }}
          className="text-6xl"
        >
          👤
        </motion.div>
        <div>
          <h2 className="text-xl font-bold text-[rgb(var(--color-text))]">
            Mr. White&apos;s Last Chance
          </h2>
          <p className="text-[rgb(var(--color-text-muted))] text-sm mt-2">
            Pass the device to{" "}
            <span className="font-bold text-[rgb(var(--color-text))]">
              {mrWhitePlayer?.name ?? "Mr. White"}
            </span>
            . Everyone else look away!
          </p>
        </div>
        <div className="p-4 bg-[rgb(var(--color-surface-raised))] rounded-xl text-sm text-[rgb(var(--color-text-muted))] max-w-xs">
          Mr. White was voted out. If they can guess the Civilian word, they win the game.
          Their guess will be secret.
        </div>
        <Button
          variant="primary"
          size="lg"
          className="w-full max-w-xs"
          onClick={() => setStep("guess")}
        >
          I&apos;m {mrWhitePlayer?.name} — Ready to Guess
        </Button>
      </div>
    );
  }

  // ── Step 2: guess input (only Mr. White sees this) ────────────────────────
  return (
    <div className="flex-1 flex flex-col items-center gap-6 py-8 px-4">
      <div className="text-5xl">🤫</div>
      <div className="text-center">
        <h2 className="text-xl font-bold text-[rgb(var(--color-text))]">
          What was the Civilian word?
        </h2>
        <p className="text-sm text-[rgb(var(--color-text-muted))] mt-1">
          Type your guess below. Nobody else can see this screen.
          If you&apos;re right, you win!
        </p>
      </div>

      <div className="w-full max-w-sm flex flex-col gap-3">
        <input
          type="text"
          placeholder="Your guess…"
          value={guess}
          onChange={(e) => setGuess(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          autoFocus
          className={cn(
            "h-12 px-4 rounded-xl border text-sm w-full",
            "bg-[rgb(var(--color-surface))] text-[rgb(var(--color-text))]",
            "border-[rgb(var(--color-border-strong))]",
            "focus:outline-none focus:ring-2 focus:ring-[rgb(var(--color-focus))]"
          )}
        />
        <Button
          onClick={handleSubmit}
          disabled={!guess.trim()}
          variant="primary"
          size="lg"
          fullWidth
        >
          Submit Guess
        </Button>
      </div>
    </div>
  );
}

// ─── Game Over Phase ──────────────────────────────────────────────────────────

const NEXT_GAME_SPECIALS: Array<{
  key: keyof SpecialCharacterSettings;
  name: string;
  emoji: string;
}> = [
  { key: "judge",    name: "Judge",    emoji: "⚖️" },
  { key: "joyFool",  name: "Joy Fool", emoji: "🤡" },
  { key: "ghost",    name: "Ghost",    emoji: "👻" },
  { key: "lovers",   name: "Lovers",   emoji: "💕" },
  { key: "revenger", name: "Revenger", emoji: "🗡️" },
  { key: "duelists", name: "Duelists", emoji: "⚔️" },
];

function GameOverPhase({
  view,
  onPlayAgain,
  onEndSession,
  cumulativeScores,
  gamesPlayed,
}: {
  view: UndercoverPlayerView;
  onPlayAgain?: (difficulty?: WordDifficulty, specialCharacters?: SpecialCharacterSettings) => void;
  onEndSession?: () => void;
  cumulativeScores?: Record<string, number>;
  gamesPlayed: number;
}) {
  const win = view.winCondition;
  const factionName: Record<string, string> = {
    civilian: "Civilians", undercover: "Undercovers", mr_white: "Mr. White",
  };
  const factionEmoji: Record<string, string> = {
    civilian: "🕵️", undercover: "🦊", mr_white: "👤",
  };
  const hasCumulative = cumulativeScores && Object.keys(cumulativeScores).length > 0 && gamesPlayed > 0;
  const [nextDifficulty, setNextDifficulty] = React.useState<WordDifficulty>(view.wordDifficulty);
  const [nextSpecials, setNextSpecials] = React.useState<SpecialCharacterSettings>(
    view.activeSpecialCharacters
  );
  const enabledSpecialCount = NEXT_GAME_SPECIALS.filter((s) => nextSpecials[s.key]).length;

  function toggleSpecial(key: keyof SpecialCharacterSettings) {
    setNextSpecials((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function setAllSpecials(value: boolean) {
    setNextSpecials({
      judge: value, joyFool: value, ghost: value,
      lovers: value, revenger: value, duelists: value,
    });
  }

  return (
    <div className="flex-1 flex flex-col items-center gap-6 py-6">
      <motion.div
        initial={{ scale: 0, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 200 }}
        className="text-6xl"
      >
        {win ? factionEmoji[win.faction] ?? "🎉" : "🎉"}
      </motion.div>

      <div className="text-center">
        <div className="text-sm text-[rgb(var(--color-text-muted))] uppercase tracking-widest font-medium">
          Game Over
        </div>
        <h2 className="text-2xl font-black text-[rgb(var(--color-text))] mt-1">
          {win ? `${factionName[win.faction] ?? "?"} Win!` : "Match Complete"}
        </h2>
        {win && (
          <p className="text-sm text-[rgb(var(--color-text-muted))] mt-1 max-w-xs">{win.summary}</p>
        )}
      </div>

      {/* Word reveal */}
      {view.civilianWordRevealed && (
        <div className="w-full p-4 bg-[rgb(var(--color-surface-raised))] rounded-xl text-center">
          <div className="text-xs text-[rgb(var(--color-text-muted))] uppercase tracking-wide mb-1">The words</div>
          <div className="flex items-center justify-center gap-4 text-lg font-bold text-[rgb(var(--color-text))]">
            <span className="text-blue-500">{view.civilianWordRevealed}</span>
            <span className="text-[rgb(var(--color-text-muted))]">vs</span>
            <span className="text-red-500">{view.undercoverWordRevealed}</span>
          </div>
          <div className="flex items-center justify-center gap-4 text-xs text-[rgb(var(--color-text-muted))] mt-1">
            <span>Civilian</span>
            <span></span>
            <span>Undercover</span>
          </div>
        </div>
      )}

      {/* Final roles + scores */}
      <div className="w-full flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-[rgb(var(--color-text))]">Roles & Scores</h3>
        {view.players
          .slice()
          .sort((a, b) => {
            const sa = view.roundScores.find((s) => s.playerId === a.id)?.totalScore ?? 0;
            const sb = view.roundScores.find((s) => s.playerId === b.id)?.totalScore ?? 0;
            return sb - sa;
          })
          .map((p, i) => {
            const score = view.roundScores.find((s) => s.playerId === p.id);
            const prevCumulative = cumulativeScores?.[p.id] ?? 0;
            const totalCombined = prevCumulative + (score?.totalScore ?? 0);
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl",
                  i === 0 ? "bg-amber-500/10 border border-amber-500/30" : "bg-[rgb(var(--color-surface-raised))]"
                )}
              >
                <span className="text-sm font-bold text-[rgb(var(--color-text-muted))] w-5 shrink-0">{i + 1}.</span>
                <PlayerAvatar player={p} />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-[rgb(var(--color-text))] flex items-center gap-1">
                    {i === 0 && <span>🏆</span>}
                    {p.name}
                    {p.isEliminated && <span className="text-[rgb(var(--color-text-muted))] font-normal text-xs">(elim.)</span>}
                  </div>
                  <div className="text-xs text-[rgb(var(--color-text-muted))]">
                    {p.revealedFaction ? formatFaction(p.revealedFaction) : "?"}
                    {p.revealedSpecialCharacters && p.revealedSpecialCharacters.length > 0 && (
                      <span className="ml-1">· {p.revealedSpecialCharacters.map(formatSpecialCharacter).join(", ")}</span>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-bold text-sm text-[rgb(var(--color-text))]">
                    {score?.totalScore.toFixed(0) ?? 0} pts
                  </div>
                  {hasCumulative && (
                    <div className="text-xs text-[rgb(var(--color-text-muted))]">Total: {totalCombined.toFixed(0)}</div>
                  )}
                </div>
              </motion.div>
            );
          })}
      </div>

      <div className="w-full flex flex-col gap-2 mt-2">
        {onPlayAgain && (
          <>
            <div className="w-full p-3 rounded-xl bg-[rgb(var(--color-surface-raised))] border border-[rgb(var(--color-border))] flex flex-col gap-3">
              <div>
                <p className="text-xs font-semibold text-[rgb(var(--color-text-muted))] uppercase tracking-wide mb-2">
                  Word difficulty for next game
                </p>
                <div className="flex gap-2">
                  {([
                    { value: "easy" as const, label: "Easy" },
                    { value: "medium" as const, label: "Medium" },
                    { value: "difficult" as const, label: "Difficult" },
                  ]).map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setNextDifficulty(opt.value)}
                      className={cn(
                        "flex-1 py-2 rounded-lg text-xs font-semibold border-2 capitalize transition-all",
                        nextDifficulty === opt.value
                          ? "border-[rgb(var(--color-primary))] bg-[rgb(var(--color-primary))]/10 text-[rgb(var(--color-primary))]"
                          : "border-[rgb(var(--color-border))] text-[rgb(var(--color-text-muted))] hover:border-[rgb(var(--color-border-strong))]"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <p className="text-xs font-semibold text-[rgb(var(--color-text-muted))] uppercase tracking-wide">
                    Special characters
                    <span className="ml-1 font-normal normal-case tracking-normal">
                      ({enabledSpecialCount}/{NEXT_GAME_SPECIALS.length})
                    </span>
                  </p>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setAllSpecials(true)}
                      className="px-2 py-1 rounded-md text-[10px] font-semibold text-[rgb(var(--color-primary))] hover:bg-[rgb(var(--color-primary))]/10"
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={() => setAllSpecials(false)}
                      className="px-2 py-1 rounded-md text-[10px] font-semibold text-[rgb(var(--color-text-muted))] hover:bg-[rgb(var(--color-border))]/40"
                    >
                      None
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {NEXT_GAME_SPECIALS.map((sc) => {
                    const active = nextSpecials[sc.key];
                    return (
                      <button
                        key={sc.key}
                        type="button"
                        onClick={() => toggleSpecial(sc.key)}
                        className={cn(
                          "flex items-center gap-2 px-2.5 py-2 rounded-lg border-2 text-left transition-all",
                          active
                            ? "border-violet-500 bg-violet-500/10"
                            : "border-[rgb(var(--color-border))] text-[rgb(var(--color-text-muted))] hover:border-[rgb(var(--color-border-strong))]"
                        )}
                      >
                        <span className="text-base shrink-0">{sc.emoji}</span>
                        <span className={cn(
                          "flex-1 min-w-0 text-xs font-semibold truncate",
                          active ? "text-[rgb(var(--color-text))]" : "text-[rgb(var(--color-text-muted))]"
                        )}>
                          {sc.name}
                        </span>
                        <span className={cn(
                          "text-[10px] font-bold shrink-0",
                          active ? "text-violet-500" : "text-[rgb(var(--color-text-muted))]"
                        )}>
                          {active ? "ON" : "OFF"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={() => onPlayAgain(nextDifficulty, nextSpecials)}
            >
              🔄 Play Another Game
            </Button>
          </>
        )}
        {onEndSession && (
          <Button variant="secondary" size="md" fullWidth onClick={onEndSession}>
            🏁 End Session & See Final Rankings
          </Button>
        )}
        {!onPlayAgain && !onEndSession && (
          <p className="text-sm text-center text-[rgb(var(--color-text-muted))] py-2">
            Waiting for the host to start the next game…
          </p>
        )}
      </div>
    </div>
  );
}

function formatFaction(faction: string): string {
  const labels: Record<string, string> = {
    civilian: "🕵️ Civilian", undercover: "🦊 Undercover", mr_white: "👤 Mr. White",
  };
  return labels[faction] ?? faction;
}

// ─── Shared helpers ────────────────────────────────────────────────────────────

function PlayerAvatar({ player }: { player: PublicPlayerInfo | undefined }) {
  const colors = [
    "bg-blue-500", "bg-red-500", "bg-green-500", "bg-yellow-500",
    "bg-purple-500", "bg-pink-500", "bg-indigo-500", "bg-orange-500",
  ];
  const colorIdx = player ? player.name.charCodeAt(0) % colors.length : 0;
  return (
    <div className={cn(
      "w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0",
      colors[colorIdx],
      player?.isEliminated && "opacity-40 grayscale"
    )}>
      {player?.name.charAt(0).toUpperCase() ?? "?"}
    </div>
  );
}

function ClueRecap({ view }: { view: UndercoverPlayerView }) {
  const roundClues = view.clues.filter((c) => c.roundNumber === view.roundNumber);
  if (roundClues.length === 0) return null;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="text-xs font-semibold text-[rgb(var(--color-text-muted))] uppercase tracking-wide">
        Round {view.roundNumber} clues
      </div>
      <div className="flex flex-wrap gap-2">
        {roundClues.map((clue) => (
          <div
            key={`${clue.playerId}-${clue.turnIndex}`}
            className="flex items-center gap-1.5 bg-[rgb(var(--color-surface-raised))] rounded-full px-3 py-1 text-sm"
          >
            <span className="text-[rgb(var(--color-text-muted))] text-xs">{clue.playerName}:</span>
            <span className="font-semibold text-[rgb(var(--color-text))]">{clue.clue}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Private reminder of this player's word / Mr. White role / special characters. */
function IdentityBanner({ view }: { view: UndercoverPlayerView }) {
  const specials = view.myCard.specialCharacters;
  return (
    <div className="p-3 rounded-xl bg-[rgb(var(--color-surface-raised))] border border-[rgb(var(--color-border))]">
      {view.isMrWhite || view.myCard.faction === "mr_white" ? (
        <div className="text-center">
          <div className="text-xs uppercase tracking-wide text-[rgb(var(--color-text-muted))]">You are</div>
          <div className="text-lg font-black text-[rgb(var(--color-text))]">👤 Mr. White</div>
          <p className="text-xs text-[rgb(var(--color-text-muted))] mt-1">
            You have no word. Listen to the clues and blend in.
          </p>
        </div>
      ) : (
        <div className="text-center">
          <div className="text-xs uppercase tracking-wide text-[rgb(var(--color-text-muted))]">Your word</div>
          <div className="text-lg font-black text-[rgb(var(--color-text))]">
            {view.myCard.word ?? "—"}
          </div>
        </div>
      )}
      {specials.length > 0 && (
        <div className="flex flex-wrap justify-center gap-1.5 mt-2">
          {specials.map((sc) => (
            <span
              key={sc}
              className="text-xs font-semibold rounded-full px-2.5 py-0.5 bg-[rgb(var(--color-primary))]/15 text-[rgb(var(--color-primary))]"
            >
              {formatSpecialCharacter(sc)}
            </span>
          ))}
        </div>
      )}
      {view.myCard.loverPartnerName && (
        <p className="text-center text-xs text-[rgb(var(--color-text-muted))] mt-1">
          💕 Partner: {view.myCard.loverPartnerName}
        </p>
      )}
      {view.myCard.duelistRivalName && (
        <p className="text-center text-xs text-[rgb(var(--color-text-muted))] mt-1">
          ⚔️ Rival: {view.myCard.duelistRivalName}
        </p>
      )}
    </div>
  );
}

function PreviousClues({ view }: { view: UndercoverPlayerView }) {
  const previous = view.clues.filter((c) => c.roundNumber < view.roundNumber);
  if (previous.length === 0) return null;

  const rounds = [...new Set(previous.map((c) => c.roundNumber))].sort((a, b) => a - b);

  return (
    <div className="flex flex-col gap-2 p-3 rounded-xl bg-[rgb(var(--color-surface-raised))]/70 border border-[rgb(var(--color-border))]">
      <div className="text-xs font-semibold text-[rgb(var(--color-text-muted))] uppercase tracking-wide">
        Previous rounds
      </div>
      {rounds.map((round) => {
        const clues = previous.filter((c) => c.roundNumber === round);
        return (
          <div key={round} className="flex flex-col gap-1">
            <div className="text-[10px] font-bold text-[rgb(var(--color-text-muted))]">Round {round}</div>
            <div className="flex flex-wrap gap-1.5">
              {clues.map((clue) => (
                <div
                  key={`${clue.playerId}-${clue.roundNumber}-${clue.turnIndex}`}
                  className="flex items-center gap-1 bg-[rgb(var(--color-surface-sunken))] rounded-full px-2.5 py-0.5 text-xs"
                >
                  <span className="text-[rgb(var(--color-text-muted))]">{clue.playerName}:</span>
                  <span className="font-semibold text-[rgb(var(--color-text))]">{clue.clue}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
