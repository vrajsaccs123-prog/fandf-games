/**
 * ActionBar — Hit / Stand / Double buttons shown during the playing phase.
 * Rendered only when it's the local player's turn.
 */

"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import type { BlackjackAction } from "../actions";
import type { BlackjackPlayer } from "../state";

interface ActionBarProps {
  player: BlackjackPlayer;
  onAction: (action: BlackjackAction) => void;
}

export function ActionBar({ player, onAction }: ActionBarProps) {
  const canDoubleDown =
    player.hand.length === 2 && player.chips >= player.bet * 2;

  return (
    <AnimatePresence>
      {player.status === "playing" && (
        <motion.div
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 24, opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className={cn(
            "fixed bottom-0 left-0 right-0",
            "pb-safe",
            "bg-gradient-to-t from-black/80 to-transparent",
            "pt-8 px-4 pb-6",
            "flex gap-3 justify-center"
          )}
        >
          <Button
            size="lg"
            variant="secondary"
            onClick={() => onAction({ type: "STAND", playerId: player.id })}
            className="flex-1 max-w-[140px] border-white/20 text-white hover:bg-white/10"
          >
            Stand
          </Button>

          <Button
            size="lg"
            onClick={() => onAction({ type: "HIT", playerId: player.id })}
            className="flex-1 max-w-[140px]"
          >
            Hit
          </Button>

          {canDoubleDown && (
            <Button
              size="lg"
              variant="secondary"
              onClick={() =>
                onAction({ type: "DOUBLE_DOWN", playerId: player.id })
              }
              className="flex-1 max-w-[140px] border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/10"
            >
              Double
            </Button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
