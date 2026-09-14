/**
 * GameCard — catalogue card for a single game.
 *
 * Used in the game catalogue grid. Shows artwork, name, key metadata,
 * and availability status. Navigates to the game detail page on click.
 *
 * Designed to be scannable at a glance on a phone viewport.
 */

"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { cn } from "@/lib/cn";
import { Badge } from "./Badge";
import type { GameMetadata } from "@/game/core/types";
import { formatPlayerCountLabel } from "@/game/core/rulesFacts";
import {
  CATEGORY_LABELS,
  DIFFICULTY_LABELS,
} from "@/catalogue/filters";

interface GameCardProps {
  game: GameMetadata;
  /** Index in the grid — used to stagger entrance animations */
  index?: number;
}

export function GameCard({ game, index = 0 }: GameCardProps) {
  const isComingSoon = game.status === "coming-soon";

  const playerCountLabel = formatPlayerCountLabel(game);

  const durationLabel =
    game.durationMinutes.min === game.durationMinutes.max
      ? `~${game.durationMinutes.min} min`
      : `${game.durationMinutes.min}–${game.durationMinutes.max} min`;

  const card = (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.3,
        delay: Math.min(index * 0.05, 0.4), // Cap stagger so it doesn't drag
        ease: [0.16, 1, 0.3, 1],
      }}
      className={cn(
        "group relative flex flex-col",
        "bg-[rgb(var(--color-surface))]",
        "rounded-[var(--radius-xl)]",
        "border border-[rgb(var(--color-border))]",
        "shadow-card",
        "overflow-hidden",
        "transition-all duration-[var(--duration-normal)]",
        !isComingSoon && [
          "hover:shadow-card-hover",
          "hover:-translate-y-0.5",
          "cursor-pointer",
        ],
        isComingSoon && "opacity-70 cursor-default"
      )}
    >
      {/* Artwork area */}
      <div
        className={cn(
          "relative h-36 sm:h-44",
          "bg-[rgb(var(--color-surface-sunken))]",
          "flex items-center justify-center",
          "overflow-hidden"
        )}
        style={
          game.accent
            ? { backgroundColor: game.accent + "22" } // Use accent at low opacity
            : undefined
        }
      >
        {/* Game artwork */}
        {game.image ? (
          <Image
            src={game.image}
            alt={`${game.name} cover art`}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, 50vw"
          />
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-center text-5xl select-none"
            aria-hidden="true"
          >
            🎲
          </div>
        )}

        {/* Coming-soon ribbon */}
        {isComingSoon && (
          <div
            className={cn(
              "absolute top-3 right-3",
              "px-2 py-0.5",
              "text-xs font-semibold",
              "bg-[rgb(var(--color-surface-overlay)/0.7)]",
              "text-[rgb(var(--color-text-inverse))]",
              "rounded-full backdrop-blur-sm"
            )}
          >
            Coming soon
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-4 gap-2">
        {/* Name */}
        <h2 className="text-base font-semibold text-[rgb(var(--color-text))] leading-snug line-clamp-1">
          {game.name}
        </h2>

        {/* Short description */}
        <p className="text-sm text-[rgb(var(--color-text-muted))] line-clamp-2 leading-relaxed flex-1">
          {game.shortDescription}
        </p>

        {/* Meta row */}
        <div className="flex items-center gap-3 text-xs text-[rgb(var(--color-text-muted))] mt-1">
          <span>{playerCountLabel}</span>
          <span aria-hidden="true">·</span>
          <span>{durationLabel}</span>
          <span aria-hidden="true">·</span>
          <span className="capitalize">
            {DIFFICULTY_LABELS[game.difficulty]}
          </span>
        </div>

        {/* Category badges — show up to 2 */}
        {game.categories.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {game.categories.slice(0, 2).map((cat) => (
              <Badge key={cat} variant="outline">
                {CATEGORY_LABELS[cat]}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </motion.article>
  );

  if (isComingSoon) {
    return card;
  }

  return (
    <Link
      href={`/games/${game.id}`}
      className="block focus-visible:outline-2 focus-visible:outline-[rgb(var(--color-focus))] focus-visible:rounded-[var(--radius-xl)]"
      tabIndex={0}
    >
      {card}
    </Link>
  );
}
