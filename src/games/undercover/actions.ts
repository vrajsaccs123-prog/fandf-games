/**
 * Undercover — action union type.
 *
 * Every possible game input is modelled as an explicit, serializable action.
 * Actions are dispatched by the UI and processed by the reducer.
 *
 * Simplified flow:
 *   card_reveal → clue_phase → voting → elimination_reveal
 *   → [revenger_pick] → [mr_white_guess] → clue_phase (loop) → game_over
 */

export type UndercoverAction =
  // ─── Lobby ──────────────────────────────────────────────────────────────
  /** Creator starts the game after setup. */
  | { type: "START_GAME" }

  // ─── Card Reveal (round 1 only) ──────────────────────────────────────────
  /** Player taps "Reveal My Card". */
  | { type: "REVEAL_CARD"; playerId: string }
  /** Player taps "Hide & Pass Device". Advances to next player's reveal. */
  | { type: "HIDE_CARD"; playerId: string }

  // ─── Clue Phase ──────────────────────────────────────────────────────────
  /** Current player submits their one-word clue. Offline: placeholder "✓". */
  | { type: "SUBMIT_CLUE"; playerId: string; clue: string }

  // ─── Voting ──────────────────────────────────────────────────────────────
  /** Online: current voter locks in their vote for a target. */
  | { type: "SUBMIT_VOTE"; voterId: string; targetId: string }
  /** Offline: host picks who gets eliminated (after verbal discussion). */
  | { type: "ADMIN_ELIMINATE"; targetId: string }
  /** Confirm the pending elimination (online: after all votes tallied). */
  | { type: "CONFIRM_ELIMINATION"; targetId: string }
  /** Host discards the current vote and starts the round's voting over. */
  | { type: "REQUEST_REVOTE" }

  // ─── Elimination Reveal ───────────────────────────────────────────────────
  /** Continue after everyone has seen the eliminated player's role. */
  | { type: "CONTINUE_AFTER_REVEAL" }

  // ─── Revenger ────────────────────────────────────────────────────────────
  /** Revenger picks their final target after being voted out. */
  | { type: "REVENGER_TARGET"; revengerId: string; targetId: string }

  // ─── Mr. White Guess ─────────────────────────────────────────────────────
  /** Mr. White submits their guess for the Civilian word. */
  | { type: "SUBMIT_MR_WHITE_GUESS"; playerId: string; guess: string }

  // ─── Match Control ───────────────────────────────────────────────────────
  /** Creator manually ends the match early. */
  | { type: "END_GAME" };
