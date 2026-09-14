/**
 * BlackjackTable — Offline game surface (same device / pass-the-phone).
 *
 * Offline betting mechanic:
 *   During the betting phase, players bet one at a time.
 *   A privacy screen shows between each player so they can set their bet
 *   privately without the next player seeing their chip count.
 *
 * During the playing phase, all hands are visible — this is standard
 * Blackjack table behaviour (everyone can see everyone's cards).
 *
 * Game state is managed locally via useReducer.
 */

"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { DealerArea } from "./DealerArea";
import { PlayerArea } from "./PlayerArea";
import { ActionBar } from "./ActionBar";
import { createInitialState } from "../state";
import { reduce } from "../reducer";
import { validateAction } from "../validation";
import type { BlackjackAction } from "../actions";
import type { BlackjackPlayer } from "../state";
import { MINIMUM_BET } from "../state";
import type { GameConfig } from "@/game/core/types";
import Link from "next/link";
import { RulesDrawer, RulesHelpButton, useRulesHelp } from "@/components/game/RulesDrawer";
import { blackjackHelp } from "../help";

interface BlackjackTableProps {
  config: GameConfig;
  seed?: string;
  /** "offline" = same-device hot-seat (pass-the-phone betting) */
  mode?: "offline";
  onExit?: () => void;
}

// ─── Bet presets ──────────────────────────────────────────────────────────────

const BET_PRESETS = [10, 25, 50, 100, 200];

// ─── Component ────────────────────────────────────────────────────────────────

export function BlackjackTable({ config, seed, onExit }: BlackjackTableProps) {
  const { open: rulesOpen, openRules, closeRules } = useRulesHelp();
  const [state, dispatch] = React.useReducer(
    reduce,
    undefined,
    () => createInitialState(config, seed)
  );

  const handleAction = React.useCallback(
    (action: BlackjackAction) => {
      const result = validateAction(state, action);
      if (!result.valid) {
        console.warn("[Blackjack] Invalid action:", action.type, result.reason);
        return;
      }
      dispatch(action);
    },
    [state]
  );

  const currentPlayer =
    state.phase === "playing"
      ? state.players[state.currentPlayerIndex]
      : undefined;

  const cardScale = 0.85;
  const allEliminated = state.players.every((p) => p.status === "eliminated");

  // ─── Offline betting: one player at a time ───────────────────────────────────

  // Which player is currently placing their bet?
  const bettingPlayer = React.useMemo(() => {
    if (state.phase !== "betting") return null;
    return state.players.find((p) => p.status === "betting") ?? null;
  }, [state.phase, state.players]);

  // Is this the last player who needs to bet? (all others are already waiting)
  const isLastBettingPlayer = React.useMemo(() => {
    if (!bettingPlayer) return false;
    return state.players
      .filter((p) => p.id !== bettingPlayer.id && p.status !== "eliminated")
      .every((p) => p.status === "waiting");
  }, [bettingPlayer, state.players]);

  // Auto-start the round as soon as every player has placed their bet
  React.useEffect(() => {
    if (state.phase !== "betting") return;
    const allReady = state.players
      .filter((p) => p.status !== "eliminated")
      .every((p) => p.status === "waiting");
    if (allReady) {
      dispatch({ type: "START_ROUND" });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase, state.players]);

  // Show a "pass to player X" screen before their bet
  const [bettingPassScreen, setBettingPassScreen] = React.useState<{
    playerName: string;
    playerId: string;
  } | null>(() => {
    // On first render, show the screen for the first betting player
    const first = config.players[0];
    if (first) {
      return { playerName: first.name || "Player 1", playerId: first.id };
    }
    return null;
  });

  // When the active betting player changes, show a pass screen for the new one
  const prevBettingPlayerIdRef = React.useRef<string | undefined>(bettingPlayer?.id);
  React.useEffect(() => {
    const prev = prevBettingPlayerIdRef.current;
    const curr = bettingPlayer?.id;
    if (curr && prev !== curr) {
      setBettingPassScreen({ playerName: bettingPlayer!.name, playerId: curr });
    }
    prevBettingPlayerIdRef.current = curr;
  }, [bettingPlayer]);

  // ─── Pass-the-phone screen (betting phase) ───────────────────────────────────

  // Show a pass screen for every player, including the last one.
  // The round auto-starts via useEffect once all bets are placed.
  if (state.phase === "betting" && bettingPassScreen && bettingPlayer?.id === bettingPassScreen.playerId) {
    return (
      <div className="fixed inset-0 bg-zinc-950 flex flex-col items-center justify-center p-6 z-50 text-white">
        <div className="flex flex-col items-center gap-6 max-w-xs w-full text-center">
          <div className="text-5xl">🃏</div>
          <h2 className="text-2xl font-bold">Pass the phone to</h2>
          <div className="text-3xl font-extrabold text-yellow-400">
            {bettingPassScreen.playerName}
          </div>
          <p className="text-zinc-500 text-sm">
            Place your bet privately — others shouldn&apos;t see your chip count.
          </p>
          <Button
            size="lg"
            fullWidth
            onClick={() => setBettingPassScreen(null)}
            className="mt-2"
          >
            I&apos;m {bettingPassScreen.playerName} — place my bet
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative min-h-dvh flex flex-col",
        "bg-table texture-felt",
        "overflow-hidden"
      )}
      role="main"
      aria-label="Blackjack table"
    >
      {/* ── Top bar ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 pt-safe pt-3 pb-2">
        <Link href="/games/blackjack">
          <button
            onClick={onExit}
            aria-label="Exit game"
            className="text-white/40 hover:text-white/80 transition-colors text-sm"
          >
            ← Exit
          </button>
        </Link>
        <div className="flex items-center gap-3 text-xs text-white/40">
          <span>Round {state.round}</span>
          <span className="text-white/20">offline</span>
        </div>
        <RulesHelpButton onClick={openRules} className="text-white/40 hover:text-white/80 hover:bg-white/10" />
      </div>

      {/* ── Dealer area ─────────────────────────────────────── */}
      <div className="flex-shrink-0 flex justify-center pt-4 pb-6">
        <DealerArea dealer={state.dealer} cardScale={cardScale} />
      </div>

      {/* ── Centre divider ───────────────────────────────────── */}
      <div className="w-4/5 mx-auto h-px bg-white/10" aria-hidden="true" />

      {/* ── Main area ────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col">
        {/* Betting phase: inline per-player bet selector (one at a time) */}
        {state.phase === "betting" && bettingPlayer && (
          <OfflineBetSelector
            player={bettingPlayer}
            allPlayers={state.players}
            onBet={(amount) => {
              handleAction({ type: "PLACE_BET", playerId: bettingPlayer.id, amount });
            }}
          />
        )}

        {/* Playing / dealer-turn / resolving / round-over */}
        {state.phase !== "betting" && (
          <div className="flex flex-col items-center gap-6 pt-6 pb-36">
            {/* Player areas — all visible (standard Blackjack) */}
            <div
              className={cn(
                "flex gap-4 flex-wrap justify-center px-4",
                state.players.length <= 2 ? "flex-col items-center" : "flex-row"
              )}
            >
              {state.players.map((player) => (
                <PlayerArea
                  key={player.id}
                  player={player}
                  isCurrentPlayer={currentPlayer?.id === player.id}
                  cardScale={cardScale}
                />
              ))}
            </div>

            {/* Round-over controls */}
            {state.phase === "round-over" && (
              <div className="flex flex-col items-center gap-3 mt-4">
                {!allEliminated ? (
                  <Button size="lg" onClick={() => handleAction({ type: "NEXT_ROUND" })}>
                    Next round
                  </Button>
                ) : (
                  <div className="flex flex-col items-center gap-3 text-center">
                    <p className="text-white/60 text-sm">All players have been eliminated.</p>
                    <Link href="/games/blackjack">
                      <Button variant="secondary">Back to lobby</Button>
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Action bar ─────────────────────────────────────────── */}
      {state.phase === "playing" && currentPlayer && (
        <ActionBar player={currentPlayer} onAction={handleAction} />
      )}

      <RulesDrawer open={rulesOpen} onClose={closeRules} help={blackjackHelp} />
    </div>
  );
}

// ─── Offline Bet Selector ─────────────────────────────────────────────────────
// Shows the active betting player's private bet panel.
// Other players' bets are shown as confirmed (amount hidden if not yet shown).

interface OfflineBetSelectorProps {
  player: BlackjackPlayer;
  allPlayers: BlackjackPlayer[];
  onBet: (amount: number) => void;
}

function OfflineBetSelector({ player, allPlayers, onBet }: OfflineBetSelectorProps) {
  const [bet, setBet] = React.useState(MINIMUM_BET);

  const clamp = (val: number) =>
    Math.max(MINIMUM_BET, Math.min(player.chips, val));

  // Is this the last player to bet? Show a hint so they know dealing will auto-start.
  const isLast = allPlayers
    .filter((p) => p.id !== player.id && p.status !== "eliminated")
    .every((p) => p.status === "waiting");

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-lg mx-auto px-4 py-6">
      <h2 className="text-white font-[family-name:var(--font-display)] text-xl font-semibold">
        {player.name}&apos;s bet
      </h2>
      {isLast && (
        <p className="text-white/50 text-sm -mt-3 text-center">
          You&apos;re last — cards deal automatically after you confirm.
        </p>
      )}

      {/* Other players status */}
      {allPlayers.length > 1 && (
        <div className="flex flex-wrap gap-2 justify-center">
          {allPlayers.filter((p) => p.id !== player.id).map((p) => (
            <div key={p.id} className="flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-lg">
              <div className={cn(
                "w-2 h-2 rounded-full",
                p.status === "waiting" ? "bg-green-400" : "bg-zinc-500"
              )} />
              <span className="text-white/70 text-xs">{p.name}</span>
              {p.status === "waiting" && (
                <span className="text-green-400 text-xs">✓</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Bet amount display */}
      <div className="w-full flex flex-col gap-3 px-4 py-4 rounded-xl bg-white/10 border border-white/10">
        <div className="flex items-center justify-between">
          <span className="text-white font-semibold">{player.name}</span>
          <span className="text-white/60 text-sm">{player.chips.toLocaleString()} chips</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            aria-label="Decrease bet"
            onClick={() => setBet(clamp(bet - 10))}
            className="w-10 h-10 rounded-full bg-white/10 text-white text-xl flex items-center justify-center hover:bg-white/20 active:scale-95 transition-all"
          >
            −
          </button>
          <div className="flex-1 text-center">
            <span className="text-2xl font-bold text-yellow-400 tabular-nums">{bet}</span>
            <span className="text-white/50 text-sm ml-1">chips</span>
          </div>
          <button
            aria-label="Increase bet"
            onClick={() => setBet(clamp(bet + 10))}
            className="w-10 h-10 rounded-full bg-white/10 text-white text-xl flex items-center justify-center hover:bg-white/20 active:scale-95 transition-all"
          >
            +
          </button>
        </div>

        {/* Presets */}
        <div className="flex gap-2 flex-wrap">
          {BET_PRESETS.map((preset) => (
            <button
              key={preset}
              disabled={preset > player.chips}
              onClick={() => setBet(clamp(preset))}
              className={cn(
                "flex-1 min-w-[48px] py-1.5 rounded-lg text-xs font-semibold",
                "border transition-all duration-150",
                bet === preset
                  ? "bg-yellow-500 border-yellow-400 text-black"
                  : "bg-white/10 border-white/10 text-white/80 hover:bg-white/20",
                "disabled:opacity-30 disabled:cursor-not-allowed"
              )}
            >
              {preset}
            </button>
          ))}
          <button
            onClick={() => setBet(player.chips)}
            className={cn(
              "flex-1 min-w-[48px] py-1.5 rounded-lg text-xs font-semibold",
              "border transition-all duration-150",
              bet === player.chips && player.chips > 0
                ? "bg-red-500 border-red-400 text-white"
                : "bg-white/10 border-white/10 text-white/80 hover:bg-white/20"
            )}
          >
            All in
          </button>
        </div>

        <Button size="md" fullWidth onClick={() => onBet(bet)} className="mt-1">
          Confirm bet
        </Button>
      </div>
    </div>
  );
}
