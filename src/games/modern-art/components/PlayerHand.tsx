/**
 * PlayerHand — Displays the current player's cards.
 */

"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/cn";
import type { PaintingCard as PaintingCardType } from "../types";
import { PaintingCard } from "./PaintingCard";

interface PlayerHandProps {
  cards: PaintingCardType[];
  selectedCardId: string | null;
  onSelectCard: (cardId: string | null) => void;
  /** Card IDs that can be offered (highlighted) */
  eligibleCardIds?: string[] | "all" | "none";
  label?: string;
  disabled?: boolean;
}

export function PlayerHand({
  cards,
  selectedCardId,
  onSelectCard,
  eligibleCardIds = "all",
  label = "Your Hand",
  disabled = false,
}: PlayerHandProps) {
  function isEligible(cardId: string): boolean {
    if (disabled) return false;
    if (eligibleCardIds === "all") return true;
    if (eligibleCardIds === "none") return false;
    return eligibleCardIds.includes(cardId);
  }

  if (cards.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        <div className="text-xs text-[rgb(var(--color-text-muted))] font-medium">{label}</div>
        <div className="flex items-center justify-center h-20 rounded-xl border border-dashed border-[rgb(var(--color-border))] text-[rgb(var(--color-text-muted))] text-sm">
          No paintings left to auction
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-[rgb(var(--color-text-muted))] font-medium">{label}</span>
        <span className="text-xs text-[rgb(var(--color-text-muted))]">{cards.length} cards</span>
      </div>

      {/* Horizontal scroll container */}
      <div className="relative">
        <div
          className="flex gap-2 overflow-x-auto pb-2"
          style={{ scrollbarWidth: "thin", scrollbarColor: "rgb(var(--color-border)) transparent" }}
        >
          <AnimatePresence>
            {cards.map((card) => {
              const eligible = isEligible(card.id);
              const selected = selectedCardId === card.id;
              return (
                <motion.div
                  key={card.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: -20 }}
                  transition={{ duration: 0.2 }}
                  className="shrink-0"
                >
                  <PaintingCard
                    card={card}
                    selected={selected}
                    disabled={!eligible}
                    size="hand"
                    onClick={eligible ? () => onSelectCard(selected ? null : card.id) : undefined}
                  />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
