/**
 * GameOverScreen — Final results after Round 4.
 */

"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/cn";
import type { ModernArtState } from "../types";
import type { ModernArtAction } from "../actions";
import { Button } from "@/components/ui/Button";

interface GameOverScreenProps {
  state: ModernArtState;
  onRematch: () => void;
  onExit: () => void;
}

export function GameOverScreen({ state, onRematch, onExit }: GameOverScreenProps) {
  const { players } = state;
  const sorted = [...players].sort((a, b) => b.money - a.money);
  const maxMoney = sorted[0]?.money ?? 0;
  const winners = sorted.filter((p) => p.money === maxMoney);
  const isMultiWinner = winners.length > 1;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 p-6 overflow-y-auto"
    >
      <div className="max-w-md w-full flex flex-col gap-6">
        {/* Trophy */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", bounce: 0.5, delay: 0.2 }}
          className="text-center text-7xl"
        >
          🏆
        </motion.div>

        {/* Winner announcement */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center"
        >
          <h2 className="text-xs font-medium text-[rgb(var(--color-text-muted))] uppercase tracking-widest mb-2">
            The Final Sale
          </h2>
          <h1
            className="font-[family-name:var(--font-display)] font-bold text-[rgb(var(--color-text))]"
            style={{ fontSize: "clamp(2rem, 8vw, 3rem)" }}
          >
            {isMultiWinner ? "It\u2019s a Tie!" : `${winners[0]?.name} Wins!`}
          </h1>
          <p className="text-amber-400 text-xl font-semibold mt-1">
            ${maxMoney}
          </p>
        </motion.div>

        {/* Final standings */}
        <div className="flex flex-col gap-2">
          {sorted.map((player, i) => {
            const isWinner = player.money === maxMoney;
            const medals = ["🥇", "🥈", "🥉", "4th", "5th"];
            return (
              <motion.div
                key={player.id}
                initial={{ x: -40, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.7 + i * 0.1 }}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl",
                  isWinner
                    ? "bg-amber-500/15 ring-1 ring-amber-500/40"
                    : "bg-[rgb(var(--color-surface-raised))]"
                )}
              >
                <span className="text-xl w-8 text-center shrink-0">
                  {medals[i]}
                </span>
                <div className="flex-1 min-w-0">
                  <div
                    className={cn(
                      "font-semibold truncate",
                      isWinner
                        ? "text-amber-300"
                        : "text-[rgb(var(--color-text))]"
                    )}
                  >
                    {player.name}
                  </div>
                </div>
                <div
                  className={cn(
                    "text-xl font-bold",
                    isWinner ? "text-amber-400" : "text-[rgb(var(--color-text))]"
                  )}
                >
                  ${player.money}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <Button variant="primary" size="lg" fullWidth onClick={onRematch}>
            Play Again
          </Button>
          <Button variant="secondary" size="md" fullWidth onClick={onExit}>
            Back to Lobby
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
