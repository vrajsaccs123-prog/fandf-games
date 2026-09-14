/**
 * ArtistMarket — Displays the current artist value board.
 */

"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import type { ArtistMarket as ArtistMarketType, ArtistId, ArtistRanking } from "../types";import { ARTIST_ORDER } from "../types";
import { ARTISTS } from "../data";
import { computeHistoricalValue } from "../engine/rankings";

interface ArtistMarketProps {
  market: ArtistMarketType;
  currentRound: number;
  offerCounts: Record<ArtistId, number>;
  rankings: ArtistRanking[] | null;
  compact?: boolean;
  /** Hide the per-artist offer subtitle (shown elsewhere on the board) */
  hideOfferCount?: boolean;
}

export function ArtistMarket({
  market,
  currentRound,
  offerCounts,
  rankings,
  compact = false,
  hideOfferCount = false,
}: ArtistMarketProps) {
  return (
    <div className={cn("flex flex-col gap-1", compact ? "gap-0.5" : "gap-1")}>
      {/* Header row */}
      <div className={cn(
        "grid text-[rgb(var(--color-text-muted))] font-medium",
        compact ? "text-[9px]" : "text-xs",
        "grid-cols-[1fr_repeat(4,_2rem)]"
      )}>
        <span>Artist</span>
        <span className="text-center">R1</span>
        <span className="text-center">R2</span>
        <span className="text-center">R3</span>
        <span className="text-center">R4</span>
      </div>

      {/* Artist rows */}
      {ARTIST_ORDER.map((artistId) => {
        const artist = ARTISTS[artistId];
        const offerCount = offerCounts[artistId] ?? 0;
        const ranking = rankings?.find((r) => r.artistId === artistId);
        const currentValue = ranking
          ? ranking.cumulativeValue
          : computeHistoricalValue(market, artistId, currentRound - 1);

        return (
          <ArtistRow
            key={artistId}
            artistId={artistId}
            artist={artist}
            roundValues={market.roundValues}
            currentRound={currentRound}
            offerCount={offerCount}
            ranking={ranking ?? null}
            compact={compact}
            hideOfferCount={hideOfferCount}
          />
        );
      })}
    </div>
  );
}

function ArtistRow({
  artistId,
  artist,
  roundValues,
  currentRound,
  offerCount,
  ranking,
  compact,
  hideOfferCount,
}: {
  artistId: ArtistId;
  artist: (typeof ARTISTS)[ArtistId];
  roundValues: ArtistMarketType["roundValues"];
  currentRound: number;
  offerCount: number;
  ranking: ArtistRanking | null;
  compact: boolean;
  hideOfferCount: boolean;
}) {
  const isRanked = ranking && ranking.rank !== null;

  return (
    <div
      className={cn(
        "grid items-center rounded-[var(--radius-sm)]",
        compact ? "grid-cols-[1fr_repeat(4,_2rem)] gap-0.5 py-0.5 px-1" : "grid-cols-[1fr_repeat(4,_2rem)] gap-1 py-1 px-1.5",
        isRanked ? "bg-amber-500/10 ring-1 ring-amber-500/30" : "bg-[rgb(var(--color-surface))]"
      )}
    >
      {/* Artist name + count */}
      <div className="flex items-center gap-1.5 min-w-0">
        {/* Color dot */}
        <div
          className="shrink-0 rounded-full"
          style={{
            width: compact ? "6px" : "8px",
            height: compact ? "6px" : "8px",
            backgroundColor: artist.accent,
          }}
        />
        <div className="flex flex-col min-w-0">
          <span
            className={cn(
              "font-medium text-[rgb(var(--color-text))] truncate",
              compact ? "text-[9px]" : "text-xs"
            )}
          >
            {compact ? artist.shortName : artist.name}
          </span>
          {!hideOfferCount && (
            <span className={cn("text-[rgb(var(--color-text-muted))]", compact ? "text-[8px]" : "text-[10px]")}>
              {offerCount > 0 ? `${offerCount} offered` : "—"}
            </span>
          )}
        </div>
      </div>

      {/* Round value tiles */}
      {[0, 1, 2, 3].map((roundIdx) => {
        const value = roundValues[roundIdx]?.[artistId];
        const isPast = roundIdx < currentRound - 1;
        const isCurrent = roundIdx === currentRound - 1;
        const isFuture = roundIdx > currentRound - 1;

        return (
          <ValueTile
            key={roundIdx}
            value={value ?? null}
            isCurrent={isCurrent}
            isFuture={isFuture}
            compact={compact}
            ranking={isCurrent ? ranking : null}
          />
        );
      })}
    </div>
  );
}

function ValueTile({
  value,
  isCurrent,
  isFuture,
  compact,
  ranking,
}: {
  value: number | null;
  isCurrent: boolean;
  isFuture: boolean;
  compact: boolean;
  ranking: ArtistRanking | null;
}) {
  if (isFuture) {
    return (
      <div className={cn(
        "flex items-center justify-center rounded-sm",
        compact ? "h-4 text-[8px]" : "h-5 text-[9px]",
        "text-[rgb(var(--color-text-muted))/30] border border-dashed border-[rgb(var(--color-border)/0.3)]"
      )}>
        —
      </div>
    );
  }

  const displayValue = isCurrent && ranking?.rank !== null
    ? ranking?.valueThisRound
    : value;

  if (!displayValue) {
    return (
      <div className={cn(
        "flex items-center justify-center rounded-sm",
        compact ? "h-4 text-[8px]" : "h-5 text-[9px]",
        "text-[rgb(var(--color-text-muted))]"
      )}>
        —
      </div>
    );
  }

  const colorClass =
    displayValue === 30 ? "bg-amber-500/20 text-amber-300 border-amber-500/40" :
    displayValue === 20 ? "bg-sky-500/20 text-sky-300 border-sky-500/40" :
    "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-sm border font-semibold",
        compact ? "h-4 text-[8px]" : "h-5 text-[9px]",
        colorClass,
        isCurrent && ranking?.rank !== null ? "ring-1 ring-offset-1 ring-offset-transparent ring-amber-400/50" : ""
      )}
    >
      ${displayValue}
    </div>
  );
}
