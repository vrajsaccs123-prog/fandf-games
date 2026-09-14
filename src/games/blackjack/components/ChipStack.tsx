/**
 * ChipStack — visual casino chip stack representing a bet amount.
 *
 * Decomposes the amount into standard chip denominations and renders
 * them as stacked colored discs, like real casino chips on a table.
 */

"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/cn";

// ─── Chip Denominations ───────────────────────────────────────────────────────

interface ChipType {
  value: number;
  bg: string;
  border: string;
  text: string;
  label: string;
}

const CHIP_TYPES: ChipType[] = [
  { value: 500, bg: "#6b21a8", border: "#a855f7", text: "#f3e8ff", label: "500" },
  { value: 100, bg: "#1c1917", border: "#78716c", text: "#e7e5e4", label: "100" },
  { value: 25,  bg: "#15803d", border: "#4ade80", text: "#f0fdf4", label: "25"  },
  { value: 10,  bg: "#1d4ed8", border: "#60a5fa", text: "#eff6ff", label: "10"  },
  { value: 5,   bg: "#b91c1c", border: "#f87171", text: "#fff1f2", label: "5"   },
  { value: 1,   bg: "#cbd5e1", border: "#94a3b8", text: "#1e293b", label: "1"   },
];

/** Decompose an amount into chip denominations (greedy) */
function decomposeChips(amount: number): Array<{ chip: ChipType; count: number }> {
  const result: Array<{ chip: ChipType; count: number }> = [];
  let remaining = amount;
  for (const chip of CHIP_TYPES) {
    if (remaining >= chip.value) {
      const count = Math.floor(remaining / chip.value);
      result.push({ chip, count: Math.min(count, 6) }); // cap visual at 6
      remaining -= Math.floor(remaining / chip.value) * chip.value;
    }
  }
  return result;
}

// ─── Single Chip ──────────────────────────────────────────────────────────────

function Chip({
  chip,
  size = 32,
  offsetY = 0,
}: {
  chip: ChipType;
  size?: number;
  offsetY?: number;
}) {
  const innerR = size * 0.32;
  const notchSize = size * 0.09;

  return (
    <div
      className="absolute"
      style={{
        width: size,
        height: size,
        bottom: offsetY,
        left: 0,
      }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Drop shadow */}
        <circle cx={size / 2} cy={size / 2 + 1} r={size / 2 - 1} fill="rgba(0,0,0,0.35)" />
        {/* Main chip body */}
        <circle cx={size / 2} cy={size / 2} r={size / 2 - 1} fill={chip.bg} />
        {/* Outer ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 - 1}
          fill="none"
          stroke={chip.border}
          strokeWidth={size * 0.06}
        />
        {/* Inner ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={innerR}
          fill="none"
          stroke={chip.border}
          strokeWidth={size * 0.03}
        />
        {/* Notches (edge markings) at 4 cardinal positions */}
        {[0, 90, 180, 270].map((deg) => {
          const rad = (deg * Math.PI) / 180;
          const nx = size / 2 + (size / 2 - 2) * Math.cos(rad);
          const ny = size / 2 + (size / 2 - 2) * Math.sin(rad);
          return (
            <rect
              key={deg}
              x={nx - notchSize / 2}
              y={ny - notchSize * 1.2}
              width={notchSize}
              height={notchSize * 2.4}
              fill={chip.border}
              transform={`rotate(${deg}, ${nx}, ${ny})`}
            />
          );
        })}
        {/* Label */}
        <text
          x={size / 2}
          y={size / 2 + 1}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={chip.text}
          fontSize={size * 0.24}
          fontWeight="700"
          fontFamily="monospace"
        >
          {chip.label}
        </text>
      </svg>
    </div>
  );
}

// ─── ChipStack ────────────────────────────────────────────────────────────────

interface ChipStackProps {
  /** Total chip amount to display */
  amount: number;
  /** Diameter of each chip in px */
  chipSize?: number;
  /** Vertical offset between stacked chips in px */
  stackStep?: number;
  /** Show total amount label above */
  showLabel?: boolean;
  className?: string;
}

export function ChipStack({
  amount,
  chipSize = 28,
  stackStep = 4,
  showLabel = true,
  className,
}: ChipStackProps) {
  if (amount <= 0) return null;

  const stacks = decomposeChips(amount);
  // Flatten into a single ordered list of chips to display (biggest on bottom)
  const chipList: ChipType[] = stacks.flatMap(({ chip, count }) =>
    Array(count).fill(chip)
  );
  // Cap total displayed chips to avoid giant towers
  const displayChips = chipList.slice(0, 8);

  const totalHeight = chipSize + displayChips.length * stackStep + 8;

  return (
    <AnimatePresence>
      {amount > 0 && (
        <motion.div
          key={`chips-${amount}`}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className={cn("flex flex-col items-center gap-1", className)}
        >
          {/* Chip tower */}
          <div
            className="relative"
            style={{
              width: chipSize,
              height: totalHeight,
            }}
          >
            {displayChips.map((chip, i) => (
              <Chip
                key={i}
                chip={chip}
                size={chipSize}
                offsetY={i * stackStep}
              />
            ))}
          </div>

          {/* Amount label */}
          {showLabel && (
            <span
              className="text-yellow-300 font-bold tabular-nums leading-none"
              style={{ fontSize: chipSize * 0.38 }}
            >
              {amount.toLocaleString()}
            </span>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
