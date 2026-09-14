/**
 * PaintingCard — Visual representation of a Modern Art painting card.
 *
 * Frame + lower panel use the artist's identity color.
 * The painting itself is a unique graphic whose colors never match that artist.
 */

"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/cn";
import type { PaintingCard as PaintingCardType } from "../types";
import { ARTISTS, AUCTION_TYPE_LABELS } from "../data";
import { ArtworkGraphic } from "./ArtworkGraphic";

// ─── Auction type icons (original Modern Art symbols) ─────────────────────────

function IconOpenEye() {
  return (
    <svg viewBox="0 0 24 24" className="w-full h-full" fill="currentColor" aria-hidden="true">
      <path d="M12 6C6.2 6 1.7 9.6.3 12.1a1 1 0 000 .8C1.7 15.4 6.2 19 12 19s10.3-3.6 11.7-6.1a1 1 0 000-.8C22.3 9.6 17.8 6 12 6z" />
      <circle cx="12" cy="12.5" r="3.4" fill="#f4ead6" />
      <circle cx="12" cy="12.5" r="1.7" />
    </svg>
  );
}

function IconPadlock() {
  return (
    <svg viewBox="0 0 24 24" className="w-full h-full" fill="currentColor" aria-hidden="true">
      <path
        d="M8 10.2V8.4a4 4 0 118 0v1.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
      />
      <rect x="5.2" y="10" width="13.6" height="10.4" rx="2" />
      <rect x="11" y="13.2" width="2" height="3.4" rx="0.7" fill="#f4ead6" />
    </svg>
  );
}

function IconPriceTag() {
  return (
    <svg viewBox="0 0 24 24" className="w-full h-full" fill="currentColor" aria-hidden="true">
      <path d="M13.85 2.9 21.2 10.25a2.3 2.3 0 010 3.25l-7.7 7.7a2.3 2.3 0 01-3.25 0L2.9 13.85A2.3 2.3 0 012.7 12.2V5.2A2.3 2.3 0 015.2 2.7h7c.43 0 .85.17 1.15.47z" />
      <circle cx="8.1" cy="8.1" r="1.55" fill="#f4ead6" />
    </svg>
  );
}

function IconStarOne() {
  return (
    <svg viewBox="0 0 24 24" className="w-full h-full" fill="currentColor" aria-hidden="true">
      <path d="M12 1.4 15.2 8.3l7.5.9-5.55 5.2 1.5 7.4L12 18.1 5.35 21.8l1.5-7.4L1.3 9.2l7.5-.9L12 1.4z" />
      <text
        x="12"
        y="15.2"
        textAnchor="middle"
        fill="#f4ead6"
        fontSize="9"
        fontWeight="800"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
      >
        1
      </text>
    </svg>
  );
}

function IconGavelTimesTwo() {
  return (
    <svg viewBox="0 0 24 24" className="w-full h-full" fill="currentColor" aria-hidden="true">
      <g transform="translate(-1.2,-1) rotate(-36 9.2 10.5)">
        <rect x="8.1" y="7.6" width="2.4" height="11.4" rx="0.7" />
        <rect x="4" y="5.1" width="10.6" height="4.2" rx="0.9" />
        <rect x="3" y="5.5" width="1.7" height="3.4" rx="0.4" />
      </g>
      <text
        x="18"
        y="21.4"
        textAnchor="middle"
        fontSize="8.5"
        fontWeight="800"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
      >
        ×2
      </text>
    </svg>
  );
}

const AUCTION_ICONS: Record<PaintingCardType["auctionType"], React.ReactNode> = {
  open: <IconOpenEye />,
  hidden: <IconPadlock />,
  "fixed-price": <IconPriceTag />,
  "one-offer": <IconStarOne />,
  double: <IconGavelTimesTwo />,
};

function AuctionTypeIcon({
  type,
  size = "sm",
  color,
}: {
  type: PaintingCardType["auctionType"];
  size?: "sm" | "md";
  color?: string;
}) {
  const sizeClass = size === "sm" ? "w-3.5 h-3.5" : "w-5 h-5";

  return (
    <span
      className={cn(sizeClass, "inline-flex items-center justify-center")}
      style={color ? { color } : undefined}
      aria-hidden="true"
    >
      {AUCTION_ICONS[type]}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface PaintingCardProps {
  card: PaintingCardType;
  /** Is this card selected / highlighted? */
  selected?: boolean;
  /** Is this card disabled (e.g., ineligible for selection)? */
  disabled?: boolean;
  /** Show full detail (larger artwork) — for auction display */
  size?: "mini" | "hand" | "table" | "inspect";
  onClick?: () => void;
  className?: string;
  /** Show a "5th painting — round ends" indicator */
  isRoundEnder?: boolean;
}

export function PaintingCard({
  card,
  selected = false,
  disabled = false,
  size = "hand",
  onClick,
  className,
  isRoundEnder = false,
}: PaintingCardProps) {
  const artist = ARTISTS[card.artistId];

  const sizePx = {
    mini: { w: 32, h: 48 },
    hand: { w: 96, h: 144 },
    table: { w: 160, h: 240 },
    inspect: { w: 224, h: 320 },
  };

  const framePad = {
    mini: 2,
    hand: 3,
    table: 4,
    inspect: 5,
  };

  const textSizes = {
    mini: { title: "text-[5px]", artist: "text-[5px]" },
    hand: { title: "text-[9px]", artist: "text-[8px]" },
    table: { title: "text-[11px]", artist: "text-[10px]" },
    inspect: { title: "text-sm", artist: "text-xs" },
  };

  const badgePx = {
    mini: 12,
    hand: 22,
    table: 30,
    inspect: 36,
  }[size];

  const interactive = Boolean(onClick) && !disabled;

  const sideShadow = {
    mini: "3px 2px 5px rgb(0 0 0 / 0.42), 5px 4px 8px rgb(0 0 0 / 0.22)",
    hand: "6px 4px 10px rgb(0 0 0 / 0.4), 12px 8px 16px rgb(0 0 0 / 0.24)",
    table: "8px 5px 14px rgb(0 0 0 / 0.42), 14px 10px 22px rgb(0 0 0 / 0.26)",
    inspect: "10px 7px 18px rgb(0 0 0 / 0.44), 16px 12px 28px rgb(0 0 0 / 0.28)",
  }[size];

  const insetBevel =
    "inset 1px 1px 0 rgb(255 255 255 / 0.28), inset -1px -1px 0 rgb(0 0 0 / 0.28)";

  const boxShadow = selected
    ? `0 0 0 2px rgb(251 191 36), ${sideShadow}, ${insetBevel}`
    : `${sideShadow}, ${insetBevel}`;

  return (
    <motion.div
      className={cn(
        "relative flex flex-col rounded-[var(--radius-card)] overflow-hidden shrink-0",
        "select-none isolate",
        selected && "ring-2 ring-amber-400 ring-offset-2 ring-offset-transparent",
        disabled && "cursor-default",
        interactive && "cursor-pointer",
        interactive && !selected && "hover:scale-105",
        "transition-all duration-[var(--duration-normal)]",
        className
      )}
      style={{
        width: sizePx[size].w,
        height: sizePx[size].h,
        backgroundColor: artist.accent,
        padding: `${framePad[size]}px ${framePad[size]}px 0`,
        boxShadow,
      }}
      onClick={interactive ? onClick : undefined}
      whileHover={interactive ? { y: size === "hand" ? -4 : 0 } : {}}
      whileTap={interactive ? { scale: 0.97 } : {}}
      role={interactive ? "button" : undefined}
      aria-disabled={disabled || undefined}
      aria-label={`${card.artworkName} by ${artist.name}, ${AUCTION_TYPE_LABELS[card.auctionType]} auction`}
    >
      {/* Artwork — top half, inset so the artist color forms the frame */}
      <div
        className="relative min-h-0 overflow-hidden"
        style={{
          flex: "1 1 0",
          borderRadius: size === "mini" ? 2 : 4,
          boxShadow:
            "0 1px 2px rgb(0 0 0 / 0.25), inset 0 1px 0 rgb(255 255 255 / 0.18)",
        }}
      >
        <ArtworkGraphic card={card} />

        {/* Paper grain so the print feels tactile, not flat SVG */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.12] mix-blend-multiply"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(0,0,0,0.08) 1px, rgba(0,0,0,0.08) 2px), repeating-linear-gradient(90deg, transparent, transparent 1px, rgba(255,255,255,0.06) 1px, rgba(255,255,255,0.06) 2px)",
          }}
        />
        {/* Laminate glint on the print */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(125deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.06) 22%, transparent 40%)",
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none ring-1 ring-inset ring-black/20"
          aria-hidden="true"
        />

        {isRoundEnder && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <span className="text-red-400 font-bold text-xs text-center px-1">
              ROUND<br />ENDS
            </span>
          </div>
        )}
      </div>

      {/* Compact name strip — same artist color as the frame */}
      <div
        className="relative shrink-0"
        style={{
          padding:
            size === "mini"
              ? "2px 3px 3px"
              : size === "hand"
                ? "3px 5px 4px"
                : "5px 7px 6px",
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden="true"
          style={{
            background: [
              "linear-gradient(180deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.04) 36%, transparent 58%)",
              "linear-gradient(115deg, rgba(255,255,255,0.12) 0%, transparent 26%)",
              "linear-gradient(105deg, transparent 38%, rgba(255,255,255,0.3) 45%, transparent 53%)",
            ].join(", "),
          }}
        />
        {size !== "mini" && (
          <div className="relative z-[1] leading-tight">
            <div
              className={cn(
                "font-[family-name:var(--font-display)] font-semibold text-white truncate",
                textSizes[size].title
              )}
              style={{ textShadow: "0 1px 2px rgba(0,0,0,0.45)" }}
              title={card.artworkName}
            >
              {card.artworkName}
            </div>
            <div
              className={cn(
                "text-white/80 truncate",
                textSizes[size].artist
              )}
              style={{ textShadow: "0 1px 2px rgba(0,0,0,0.35)" }}
            >
              {artist.shortName}
            </div>
          </div>
        )}
      </div>

      {/* Auction mark — top left, in the artist color */}
      <div
        className="absolute z-20 flex items-center justify-center pointer-events-none"
        style={{
          top: framePad[size],
          left: framePad[size],
          width: badgePx,
          height: badgePx,
          borderRadius: size === "mini" ? 2 : 5,
          background: "#f4ead6",
          color: artist.accent,
          padding: size === "mini" ? 1 : 2,
          boxShadow:
            "0 1px 2px rgb(0 0 0 / 0.28), inset 0 1px 0 rgb(255 255 255 / 0.65)",
        }}
        aria-hidden="true"
      >
        {AUCTION_ICONS[card.auctionType]}
      </div>

      {/* Gloss over the artist-colored frame + panel */}
      <div
        className="absolute inset-0 pointer-events-none rounded-[inherit]"
        aria-hidden="true"
        style={{
          background:
            "linear-gradient(155deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.06) 16%, transparent 32%, transparent 74%, rgba(0,0,0,0.14) 100%)",
        }}
      />
      {/* Thin left highlight / right shade so the stock looks lit from the side */}
      <div
        className="absolute inset-y-0 left-0 pointer-events-none"
        aria-hidden="true"
        style={{
          width: size === "mini" ? 1 : 2,
          background: "linear-gradient(180deg, rgba(255,255,255,0.4), rgba(255,255,255,0.12))",
        }}
      />
      <div
        className="absolute inset-y-0 right-0 pointer-events-none"
        aria-hidden="true"
        style={{
          width: size === "mini" ? 1 : 2,
          background: "linear-gradient(180deg, rgba(0,0,0,0.12), rgba(0,0,0,0.28))",
        }}
      />

      {disabled && (
        <div
          className="absolute inset-0 bg-black/35 pointer-events-none"
          aria-hidden="true"
        />
      )}
    </motion.div>
  );
}

export { AuctionTypeIcon };
