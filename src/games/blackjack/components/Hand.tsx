/**
 * Hand — displays a row of cards for a player or the dealer.
 * Cards are displayed with a slight overlap to look natural.
 */

"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import { PlayingCard } from "./PlayingCard";
import type { Card } from "@/game/mechanics/cards";
import { handValue, visibleHandValue, isBust, isBlackjack } from "../scoring";

interface HandProps {
  cards: Card[];
  /** Show the computed hand total */
  showTotal?: boolean;
  /** Whether this is the dealer's hand (uses visibleHandValue if hole not revealed) */
  isDealer?: boolean;
  /** Is the hole card revealed yet? (dealer only) */
  holeCardRevealed?: boolean;
  /** Dim all cards when it's not this player's turn */
  dimmed?: boolean;
  /** Card scale factor */
  cardScale?: number;
  className?: string;
}

export function Hand({
  cards,
  showTotal = true,
  isDealer = false,
  holeCardRevealed = true,
  dimmed = false,
  cardScale = 1,
  className,
}: HandProps) {
  const total = isDealer && !holeCardRevealed
    ? visibleHandValue(cards)
    : handValue(cards);

  const bust = !isDealer || holeCardRevealed ? isBust(cards) : false;
  const bj = (!isDealer || holeCardRevealed) && isBlackjack(cards);

  const totalLabel = (() => {
    if (bust) return "Bust";
    if (bj) return "Blackjack!";
    if (isDealer && !holeCardRevealed) return `${total}+`;
    return String(total);
  })();

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      {/* Cards row */}
      <div className="flex items-center" style={{ gap: cardScale * 4 }}>
        {cards.map((card, i) => (
          <PlayingCard
            key={card.id}
            card={card}
            index={i}
            scale={cardScale}
            dimmed={dimmed}
          />
        ))}
        {cards.length === 0 && (
          <EmptyCardSlot scale={cardScale} />
        )}
      </div>

      {/* Total */}
      {showTotal && cards.length > 0 && (
        <span
          className={cn(
            "text-sm font-semibold tabular-nums px-2 py-0.5 rounded-full",
            bust
              ? "bg-red-600/20 text-red-400"
              : bj
              ? "bg-yellow-500/20 text-yellow-400"
              : "bg-black/30 text-white/80"
          )}
        >
          {totalLabel}
        </span>
      )}
    </div>
  );
}

function EmptyCardSlot({ scale = 1 }: { scale?: number }) {
  return (
    <div
      className="rounded-[var(--radius-card)] border border-dashed border-white/20"
      style={{ width: 64 * scale, height: 96 * scale }}
    />
  );
}
