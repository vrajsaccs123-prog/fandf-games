/**
 * Codenames — round timer helpers.
 *
 * When enabled, the same duration applies to both clue-giving and guessing.
 * Range: 30 seconds – 3 minutes.
 */

export const TIMER_MIN_SECONDS = 30;
export const TIMER_MAX_SECONDS = 180;
export const TIMER_STEP_SECONDS = 15;
export const TIMER_DEFAULT_SECONDS = 60;
/** Allow setTimeout jitter so the host can expire right at the limit. */
export const TIMER_EXPIRY_GRACE_MS = 400;

export function clampTimerSeconds(seconds: number): number {
  const stepped = Math.round(seconds / TIMER_STEP_SECONDS) * TIMER_STEP_SECONDS;
  return Math.min(TIMER_MAX_SECONDS, Math.max(TIMER_MIN_SECONDS, stepped));
}

/** Compact clock, e.g. "0:45" or "2:00". */
export function formatTimerClock(totalSeconds: number): string {
  const s = Math.max(0, Math.ceil(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

/** Human duration for lobby copy, e.g. "90 seconds" or "2 minutes". */
export function formatTimerDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} seconds`;
  if (seconds % 60 === 0) {
    return seconds === 60 ? "1 minute" : `${seconds / 60} minutes`;
  }
  const m = Math.floor(seconds / 60);
  const r = seconds % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export function remainingTimerMs(opts: {
  timerSeconds: number | null;
  phaseStartedAt: number | null;
  now?: number;
}): number | null {
  if (opts.timerSeconds == null || opts.phaseStartedAt == null) return null;
  const now = opts.now ?? Date.now();
  return opts.phaseStartedAt + opts.timerSeconds * 1000 - now;
}

export function isTimerElapsed(opts: {
  timerSeconds: number | null;
  phaseStartedAt: number | null;
  now?: number;
}): boolean {
  if (opts.timerSeconds == null || opts.phaseStartedAt == null) return false;
  const remaining = remainingTimerMs(opts);
  return remaining != null && remaining <= TIMER_EXPIRY_GRACE_MS;
}
