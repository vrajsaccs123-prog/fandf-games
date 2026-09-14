/**
 * DealerArea — Dealer's hand displayed at the top of the oval table.
 */

"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import { Hand } from "./Hand";
import type { DealerState } from "../state";

interface DealerAreaProps {
  dealer: DealerState;
  cardScale?: number;
}

export function DealerArea({ dealer, cardScale = 0.85 }: DealerAreaProps) {
  const statusLabel =
    dealer.status === "bust"
      ? "Bust"
      : dealer.status === "stand"
      ? "Stand"
      : dealer.status === "playing"
      ? "Playing…"
      : null;

  return (
    <div className="flex flex-col items-center gap-1.5 select-none">
      {/* Dealer label */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50">
          Dealer
        </span>
        {statusLabel && (
          <span
            className={cn(
              "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide",
              dealer.status === "bust"
                ? "bg-red-600/70 text-white"
                : dealer.status === "stand"
                ? "bg-green-600/60 text-white"
                : "bg-white/10 text-white/60"
            )}
          >
            {statusLabel}
          </span>
        )}
      </div>

      {/* Dealer's cards */}
      <Hand
        cards={dealer.hand}
        cardScale={cardScale}
        showTotal={dealer.hand.length > 0}
        isDealer
        holeCardRevealed={dealer.holeCardRevealed}
      />
    </div>
  );
}
