"use client";

/**
 * Codenames — host toggle + duration picker for the optional round timer.
 */

import * as React from "react";
import { cn } from "@/lib/cn";
import {
  TIMER_MAX_SECONDS,
  TIMER_MIN_SECONDS,
  TIMER_STEP_SECONDS,
  clampTimerSeconds,
  formatTimerDuration,
} from "../timer";

interface TimerSettingsProps {
  enabled: boolean;
  seconds: number;
  onEnabledChange: (enabled: boolean) => void;
  onSecondsChange: (seconds: number) => void;
  /** Non-host players see a compact read-only summary */
  readOnly?: boolean;
}

export function TimerSettings({
  enabled,
  seconds,
  onEnabledChange,
  onSecondsChange,
  readOnly = false,
}: TimerSettingsProps) {
  const duration = clampTimerSeconds(seconds);

  if (readOnly) {
    return (
      <div className="rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface-raised))] px-3 py-2.5">
        <p className="text-xs text-[rgb(var(--color-text-muted))]">
          {enabled
            ? `⏱ Round timer: ${formatTimerDuration(duration)} each clue and guess`
            : "⏱ No round timer"}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface-raised))] p-3 flex flex-col gap-3">
      <button
        type="button"
        onClick={() => onEnabledChange(!enabled)}
        className="flex items-center justify-between gap-3 text-left"
      >
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[rgb(var(--color-text))]">Round timer</p>
          <p className="text-xs text-[rgb(var(--color-text-muted))] mt-0.5">
            Optional limit for each clue-giving and guessing round
          </p>
        </div>
        <span
          className={cn(
            "relative w-11 h-6 rounded-full shrink-0 transition-colors",
            enabled ? "bg-[rgb(var(--color-primary))]" : "bg-[rgb(var(--color-border-strong))]"
          )}
          aria-hidden
        >
          <span
            className={cn(
              "absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform",
              enabled && "translate-x-5"
            )}
          />
        </span>
      </button>

      {enabled && (
        <div className="flex flex-col gap-2 pt-1 border-t border-[rgb(var(--color-border))]">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-[rgb(var(--color-text-muted))]">
              Time per round
            </p>
            <p className="text-sm font-bold text-[rgb(var(--color-text))]">
              {formatTimerDuration(duration)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onSecondsChange(clampTimerSeconds(duration - TIMER_STEP_SECONDS))}
              disabled={duration <= TIMER_MIN_SECONDS}
              className={cn(
                "w-9 h-9 rounded-lg text-lg font-bold shrink-0",
                "bg-[rgb(var(--color-surface))] border border-[rgb(var(--color-border-strong))]",
                "text-[rgb(var(--color-text))] disabled:opacity-40"
              )}
            >
              −
            </button>
            <input
              type="range"
              min={TIMER_MIN_SECONDS}
              max={TIMER_MAX_SECONDS}
              step={TIMER_STEP_SECONDS}
              value={duration}
              onChange={(e) => onSecondsChange(clampTimerSeconds(Number(e.target.value)))}
              className="flex-1 accent-[rgb(var(--color-primary))]"
              aria-label="Seconds per round"
            />
            <button
              type="button"
              onClick={() => onSecondsChange(clampTimerSeconds(duration + TIMER_STEP_SECONDS))}
              disabled={duration >= TIMER_MAX_SECONDS}
              className={cn(
                "w-9 h-9 rounded-lg text-lg font-bold shrink-0",
                "bg-[rgb(var(--color-surface))] border border-[rgb(var(--color-border-strong))]",
                "text-[rgb(var(--color-text))] disabled:opacity-40"
              )}
            >
              +
            </button>
          </div>
          <p className="text-[10px] text-[rgb(var(--color-text-subtle))]">
            {TIMER_MIN_SECONDS}s – {TIMER_MAX_SECONDS / 60} min. When time runs out the other team goes.
          </p>
        </div>
      )}
    </div>
  );
}
