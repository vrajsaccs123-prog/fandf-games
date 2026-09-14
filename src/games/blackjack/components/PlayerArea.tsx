/**
 * PlayerArea — compact player slot for the arc table layout.
 *
 * Shows: cards on the table, name + chip count label below,
 * and a chip stack (bet) between the player and the table center.
 * Outcome badge animates in at round end.
 */

"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/cn";
import { Hand } from "./Hand";
import { ChipStack } from "./ChipStack";
import type { BlackjackPlayer } from "../state";

interface PlayerAreaProps {
  player: BlackjackPlayer;
  isCurrentPlayer: boolean;
  cardScale?: number;
  /** Show the bet chip stack toward table center (pass false for compact mode) */
  showChips?: boolean;
}

const OUTCOME_CONFIG: Record<
  string,
  { label: string; bg: string; text: string }
> = {
  blackjack: { label: "Blackjack!", bg: "bg-yellow-500/90",  text: "text-black"     },
  win:       { label: "Win",        bg: "bg-green-500/90",   text: "text-white"     },
  push:      { label: "Push",       bg: "bg-blue-500/90",    text: "text-white"     },
  lose:      { label: "Lose",       bg: "bg-red-600/90",     text: "text-white"     },
};

const STATUS_LABEL: Partial<Record<string, string>> = {
  bust:      "BUST",
  stand:     "Stand",
  doubled:   "Doubled",
  blackjack: "Blackjack!",
  eliminated:"Out",
};

export function PlayerArea({
  player,
  isCurrentPlayer,
  cardScale = 0.8,
  showChips = true,
}: PlayerAreaProps) {
  const outcomeConfig = player.outcome ? OUTCOME_CONFIG[player.outcome] : null;
  const statusLabel = STATUS_LABEL[player.status];
  const hasCards = player.hand.length > 0;

  return (
    <div className="flex flex-col items-center gap-1.5 select-none">

      {/* Outcome overlay badge (pops up at round end) */}
      <AnimatePresence>
        {outcomeConfig && (
          <motion.div
            key="outcome"
            initial={{ scale: 0.6, opacity: 0, y: 4 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 28 }}
            className={cn(
              "px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide shadow-high",
              outcomeConfig.bg,
              outcomeConfig.text
            )}
          >
            {outcomeConfig.label}
            {player.payout !== undefined && player.payout !== 0 && (
              <span className="ml-1 opacity-80">
                {player.payout > 0 ? `+${player.payout}` : player.payout}
              </span>
            )}
          </motion.div>
        )}

        {/* In-play status label */}
        {!outcomeConfig && statusLabel && (
          <motion.span
            key="status"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={cn(
              "text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full",
              player.status === "bust"
                ? "bg-red-600/70 text-white"
                : player.status === "blackjack"
                ? "bg-yellow-500/80 text-black"
                : "bg-white/10 text-white/60"
            )}
          >
            {statusLabel}
          </motion.span>
        )}

        {/* Active turn indicator */}
        {isCurrentPlayer && !outcomeConfig && !statusLabel && player.status === "playing" && (
          <motion.span
            key="turn"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-[10px] text-yellow-300 font-semibold"
          >
            Your turn
          </motion.span>
        )}
      </AnimatePresence>

      {/* Cards */}
      <div
        className={cn(
          "rounded-xl p-1.5 transition-all duration-300",
          isCurrentPlayer && player.status === "playing"
            ? "ring-2 ring-yellow-400/70 ring-offset-1 ring-offset-transparent bg-white/8"
            : "ring-0"
        )}
      >
        <Hand
          cards={player.hand}
          cardScale={cardScale}
          showTotal={hasCards}
          dimmed={player.status === "eliminated"}
        />

        {/* Empty seat indicator during betting */}
        {!hasCards && player.status === "betting" && (
          <div
            className="border border-dashed border-white/20 rounded-lg flex items-center justify-center text-white/20 text-xs"
            style={{ width: 64 * cardScale, height: 96 * cardScale }}
          >
          </div>
        )}
      </div>

      {/* Bet chip stack */}
      {showChips && player.bet > 0 && (
        <ChipStack amount={player.bet} chipSize={24} stackStep={3} showLabel />
      )}

      {/* Player name + total chips */}
      <div className="flex flex-col items-center gap-0">
        <span
          className={cn(
            "text-xs font-semibold leading-tight",
            isCurrentPlayer && player.status === "playing"
              ? "text-yellow-300"
              : player.status === "eliminated"
              ? "text-white/30"
              : "text-white/80"
          )}
        >
          {player.name}
        </span>
        <span className="text-[10px] text-white/40 tabular-nums">
          {player.chips.toLocaleString()} chips
        </span>
      </div>
    </div>
  );
}
