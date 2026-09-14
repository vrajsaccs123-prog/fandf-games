/**
 * BettingPhase — UI for placing bets before each round.
 * Each player who hasn't bet yet sees a bet selector.
 */

"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { MINIMUM_BET } from "../state";
import type { BlackjackPlayer } from "../state";
import type { BlackjackAction } from "../actions";

interface BettingPhaseProps {
  players: BlackjackPlayer[];
  onAction: (action: BlackjackAction) => void;
  /** The ID of the human player on this device (for single-device local play, this may be undefined — all players bet) */
  localPlayerId?: string; // Reserved for future multi-device online play
}

const BET_PRESETS = [10, 25, 50, 100, 200];

export function BettingPhase({
  players,
  onAction,
  localPlayerId,
}: BettingPhaseProps) {
  const bettingPlayers = players.filter((p) => p.status === "betting");
  const waitingPlayers = players.filter((p) => p.status === "waiting");
  const allBetsPlaced = bettingPlayers.length === 0;

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-lg mx-auto px-4 py-6">
      <h2 className="text-white font-[family-name:var(--font-display)] text-xl font-semibold">
        Place your bets
      </h2>

      {/* Bet selectors per player */}
      <div className="flex flex-col gap-4 w-full">
        {players.map((player) => {
          if (player.status === "eliminated") {
            return (
              <div
                key={player.id}
                className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/5 opacity-40"
              >
                <span className="text-white text-sm">{player.name}</span>
                <span className="text-white/40 text-xs">Eliminated</span>
              </div>
            );
          }

          if (player.status === "waiting") {
            return (
              <div
                key={player.id}
                className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/10"
              >
                <span className="text-white text-sm font-medium">{player.name}</span>
                <span className="text-yellow-400 text-sm font-bold">
                  Bet: {player.bet} ✓
                </span>
              </div>
            );
          }

          // Betting player
          return (
            <PlayerBetSelector
              key={player.id}
              player={player}
              onBet={(amount) =>
                onAction({ type: "PLACE_BET", playerId: player.id, amount })
              }
            />
          );
        })}
      </div>

      {/* Start round button */}
      {allBetsPlaced && (
        <Button
          size="lg"
          fullWidth
          onClick={() => onAction({ type: "START_ROUND" })}
          className="mt-2"
        >
          Deal cards
        </Button>
      )}

      {waitingPlayers.length > 0 && bettingPlayers.length > 0 && (
        <p className="text-white/40 text-xs">
          Waiting for {bettingPlayers.map((p) => p.name).join(", ")} to bet…
        </p>
      )}
    </div>
  );
}

// ─── Per-player bet selector ──────────────────────────────────────────────────

function PlayerBetSelector({
  player,
  onBet,
}: {
  player: BlackjackPlayer;
  onBet: (amount: number) => void;
}) {
  const [bet, setBet] = React.useState(MINIMUM_BET);

  const clamp = (val: number) =>
    Math.max(MINIMUM_BET, Math.min(player.chips, val));

  return (
    <div className="flex flex-col gap-3 px-4 py-4 rounded-xl bg-white/10 border border-white/10">
      {/* Player info */}
      <div className="flex items-center justify-between">
        <span className="text-white font-semibold">{player.name}</span>
        <span className="text-white/60 text-sm">
          {player.chips.toLocaleString()} chips
        </span>
      </div>

      {/* Bet amount display */}
      <div className="flex items-center gap-3">
        <button
          aria-label="Decrease bet"
          onClick={() => setBet(clamp(bet - 10))}
          className="w-10 h-10 rounded-full bg-white/10 text-white text-xl flex items-center justify-center hover:bg-white/20 active:scale-95 transition-all"
        >
          −
        </button>

        <div className="flex-1 text-center">
          <span className="text-2xl font-bold text-yellow-400 tabular-nums">
            {bet}
          </span>
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

      {/* Preset chips */}
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
        {/* All-in */}
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

      {/* Confirm bet */}
      <Button
        size="md"
        fullWidth
        onClick={() => onBet(bet)}
        className="mt-1"
      >
        Confirm bet
      </Button>
    </div>
  );
}
