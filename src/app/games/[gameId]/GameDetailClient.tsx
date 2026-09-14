/**
 * GameDetailClient — interactive portion of the game detail/lobby page.
 *
 * Handles: player setup, game configuration, and the "Start" action.
 * Game module is lazy-loaded only when the user clicks "Start".
 */

"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Surface } from "@/components/ui/Surface";
import {
  CATEGORY_LABELS,
  DIFFICULTY_LABELS,
} from "@/catalogue/filters";
import type { GameMetadata } from "@/game/core/types";
import { formatModeLabel, formatPlayerRange } from "@/game/core/rulesFacts";

const BlackjackLobby = dynamic(() =>
  import("@/games/blackjack/components/BlackjackLobby").then((m) => ({
    default: m.BlackjackLobby,
  }))
);
const UndercoverLobby = dynamic(() =>
  import("@/games/undercover/components/UndercoverLobby").then((m) => ({
    default: m.UndercoverLobby,
  }))
);
const CodenamesLobby = dynamic(() =>
  import("@/games/codenames/components/CodenamesLobby").then((m) => ({
    default: m.CodenamesLobby,
  }))
);
const ModernArtLobby = dynamic(() =>
  import("@/games/modern-art/components/ModernArtLobby").then((m) => ({
    default: m.ModernArtLobby,
  }))
);
const CaboLobby = dynamic(() =>
  import("@/games/cabo/components/CaboLobby").then((m) => ({
    default: m.CaboLobby,
  }))
);

interface GameDetailClientProps {
  game: GameMetadata;
}

export function GameDetailClient({ game }: GameDetailClientProps) {
  // Players and mode come from each game's rules facts (projected into metadata).
  const playerCountRange = formatPlayerRange(game);

  const durationLabel =
    game.durationMinutes.min === game.durationMinutes.max
      ? `~${game.durationMinutes.min} min`
      : `${game.durationMinutes.min}–${game.durationMinutes.max} min`;

  return (
    <div className="flex-1 flex flex-col max-w-screen-lg mx-auto w-full">
      {/* Back button — above the hero, always readable */}
      <div className="px-4 pt-4 pb-2">
        <Link
          href="/games"
          className={cn(
            "inline-flex items-center gap-1.5",
            "text-sm font-medium",
            "text-[rgb(var(--color-text-muted))]",
            "hover:text-[rgb(var(--color-text))]",
            "transition-colors duration-[var(--duration-fast)]"
          )}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          All games
        </Link>
      </div>

      {/* Hero / artwork area */}
      <div
        className={cn(
          "relative h-48 sm:h-64",
          "bg-[rgb(var(--color-surface-sunken))]",
          "flex items-stretch",
          "overflow-hidden"
        )}
        style={game.accent ? { backgroundColor: game.accent + "33" } : undefined}
      >
        {/* Game image — full height, fixed width column on the left */}
        <div className="relative h-full w-36 sm:w-52 shrink-0">
          {game.image ? (
            <Image
              src={game.image}
              alt={`${game.name} cover art`}
              fill
              className="object-cover object-center"
              priority
              sizes="208px"
            />
          ) : (
            <div className="flex items-center justify-center w-full h-full text-6xl select-none" aria-hidden="true">🎲</div>
          )}
        </div>

        {/* Game name — fills the rest of the hero to the right */}
        <div className="flex flex-1 items-center px-4 sm:px-8 overflow-hidden">
          <h1
            className="font-[family-name:var(--font-display)] font-bold leading-none text-[rgb(var(--color-text))] break-words w-full"
            style={{ fontSize: "clamp(2rem, 6vw, 4rem)" }}
          >
            {game.name}
          </h1>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-6 flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col gap-2">
          {game.status === "coming-soon" && (
            <div>
              <Badge variant="warning">Coming soon</Badge>
            </div>
          )}
          <p className="text-[rgb(var(--color-text-muted))] leading-relaxed">
            {game.description ?? game.shortDescription}
          </p>
        </div>

        {/* Meta grid */}
        <Surface variant="raised" elevation="low" rounded="lg" className="p-4">
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <MetaItem label="Players" value={playerCountRange} icon="👥" />
            <MetaItem label="Duration" value={durationLabel} icon="⏱️" />
            <MetaItem
              label="Difficulty"
              value={DIFFICULTY_LABELS[game.difficulty]}
              icon="📊"
            />
            <MetaItem
              label="Mode"
              value={formatModeLabel(game)}
              icon="🌐"
            />
          </dl>
        </Surface>

        {/* Categories */}
        {game.categories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {game.categories.map((cat) => (
              <Badge key={cat} variant="outline">
                {CATEGORY_LABELS[cat]}
              </Badge>
            ))}
          </div>
        )}

        {/* Start section */}
        <div className="flex flex-col gap-3 pt-2">
          {game.status === "available" ? (
            <GameLobby game={game} />
          ) : (
            <div className="flex flex-col items-center py-8 gap-2 text-center">
              <p className="text-[rgb(var(--color-text-muted))]">
                This game is not yet available.
              </p>
              <Link href="/games">
                <Button variant="secondary">Browse available games</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Meta Item ───────────────────────────────────────────────────────────────

function MetaItem({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs text-[rgb(var(--color-text-muted))] font-medium">
        {label}
      </dt>
      <dd className="text-sm font-semibold text-[rgb(var(--color-text))] flex items-center gap-1">
        <span aria-hidden="true">{icon}</span>
        {value}
      </dd>
    </div>
  );
}

// ─── Game Lobby — dispatches to per-game lobby component ─────────────────────

function GameLobby({ game }: { game: GameMetadata }) {
  // Per-game lobby components
  const lobbyMap: Record<string, React.ComponentType> = {
    blackjack: BlackjackLobby,
    undercover: UndercoverLobby,
    codenames: CodenamesLobby,
    "modern-art": ModernArtLobby,
    cabo: CaboLobby,
  };

  const LobbyComponent = lobbyMap[game.id];

  if (LobbyComponent) {
    return (
      <Surface variant="raised" elevation="low" rounded="xl" className="p-5" bordered>
        <h2 className="text-base font-semibold text-[rgb(var(--color-text))] mb-4">
          Start a game
        </h2>
        <LobbyComponent />
      </Surface>
    );
  }

  // Generic fallback lobby
  return (
    <Surface variant="raised" elevation="low" rounded="xl" className="p-5" bordered>
      <h2 className="text-base font-semibold text-[rgb(var(--color-text))] mb-4">
        Start a game
      </h2>
      <Button size="lg" fullWidth>
        Start local game
      </Button>
    </Surface>
  );
}
