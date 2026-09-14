/**
 * PlayingCard — A single physical card with flip animation.
 *
 * Shows face (rank + suit) when faceUp, card back when face-down.
 * Animates into position when first rendered (deal animation).
 */

"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/cn";
import type { Card } from "@/game/mechanics/cards";
import { SUIT_SYMBOL, SUIT_COLOR } from "@/game/mechanics/cards";

interface PlayingCardProps {
  card: Card;
  /** Index in the hand — used to stagger deal animations */
  index?: number;
  /** Scale the card (1 = full size ~64×96px) */
  scale?: number;
  /** Slight random rotation for a natural look (reserved for future use) */
  _rotate?: number;
  /** Extra classes on the outer wrapper */
  className?: string;
  /** Dim the card (e.g. when player is eliminated or it's not their turn) */
  dimmed?: boolean;
}

// Card dimensions
const CARD_W = 64;
const CARD_H = 96;

export function PlayingCard({
  card,
  index = 0,
  scale = 1,
  _rotate = 0,
  className,
  dimmed = false,
}: PlayingCardProps) {
  const isRed = SUIT_COLOR[card.suit] === "red";
  const symbol = SUIT_SYMBOL[card.suit];

  return (
    <motion.div
      key={card.id}
      className={cn("relative select-none", className)}
      style={{
        width: CARD_W * scale,
        height: CARD_H * scale,
        perspective: 600,
      }}
      initial={{ y: -40, opacity: 0, scale: 0.85 }}
      animate={{ y: 0, opacity: dimmed ? 0.5 : 1, scale: 1 }}
      transition={{
        delay: index * 0.08,
        duration: 0.3,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      {/* Card flip container */}
      <motion.div
        className="relative w-full h-full"
        style={{ transformStyle: "preserve-3d" }}
        animate={{ rotateY: card.faceUp ? 0 : 180 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Face */}
        <div
          className={cn(
            "absolute inset-0",
            "rounded-[var(--radius-card)]",
            "bg-[rgb(var(--color-card-face))]",
            "border border-[rgb(var(--color-card-border))]",
            "shadow-card",
            "flex flex-col justify-between p-1.5",
            "backface-hidden"
          )}
          style={{ backfaceVisibility: "hidden" }}
          aria-label={`${card.rank} of ${card.suit}`}
        >
          {/* Top-left rank + suit */}
          <div
            className={cn(
              "flex flex-col leading-none",
              isRed ? "text-red-600" : "text-gray-900"
            )}
            style={{ fontSize: CARD_W * scale * 0.2 }}
          >
            <span className="font-bold leading-none">{card.rank}</span>
            <span className="leading-none">{symbol}</span>
          </div>

          {/* Center suit */}
          <div
            className={cn(
              "flex items-center justify-center",
              isRed ? "text-red-600" : "text-gray-900"
            )}
            style={{ fontSize: CARD_W * scale * 0.38 }}
            aria-hidden="true"
          >
            {symbol}
          </div>

          {/* Bottom-right rank + suit (rotated) */}
          <div
            className={cn(
              "flex flex-col leading-none self-end rotate-180",
              isRed ? "text-red-600" : "text-gray-900"
            )}
            style={{ fontSize: CARD_W * scale * 0.2 }}
            aria-hidden="true"
          >
            <span className="font-bold leading-none">{card.rank}</span>
            <span className="leading-none">{symbol}</span>
          </div>
        </div>

        {/* Back */}
        <div
          className={cn(
            "absolute inset-0",
            "rounded-[var(--radius-card)]",
            "bg-[rgb(var(--color-card-back))]",
            "border border-[rgb(var(--color-card-border))]",
            "shadow-card",
            "flex items-center justify-center",
            "backface-hidden"
          )}
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
          aria-label="Card face down"
        >
          {/* Decorative back pattern */}
          <div
            className="w-4/5 h-4/5 rounded-[4px] border border-white/20"
            style={{
              background: "repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.05) 4px, rgba(255,255,255,0.05) 8px)",
            }}
          />
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Card Back (standalone) ───────────────────────────────────────────────────

export function CardBack({
  scale = 1,
  className,
}: {
  scale?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-card)]",
        "bg-[rgb(var(--color-card-back))]",
        "border border-[rgb(var(--color-card-border))]",
        "shadow-card",
        "flex items-center justify-center",
        className
      )}
      style={{ width: CARD_W * scale, height: CARD_H * scale }}
    >
      <div
        className="w-4/5 h-4/5 rounded-[4px] border border-white/20"
        style={{
          background:
            "repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.05) 4px, rgba(255,255,255,0.05) 8px)",
        }}
      />
    </div>
  );
}
