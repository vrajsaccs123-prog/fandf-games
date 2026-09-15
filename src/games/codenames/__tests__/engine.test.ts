/**
 * Tests for the Codenames reducer — especially the optional round timer.
 */

import { describe, it, expect } from "vitest";
import { createInitialState } from "../state";
import { reduce } from "../reducer";
import { validateAction } from "../validation";
import type { GameConfig } from "@/game/core/types";
import type { CodenamesState } from "../types";

const timedConfig: GameConfig = {
  players: [
    { id: "r1", name: "Red Spy", seat: 0, isHuman: true },
    { id: "r2", name: "Red Op", seat: 1, isHuman: true },
    { id: "b1", name: "Blue Spy", seat: 2, isHuman: true },
    { id: "b2", name: "Blue Op", seat: 3, isHuman: true },
  ],
  options: {
    teams: { r1: "red", r2: "red", b1: "blue", b2: "blue" },
    spymasters: { red: "r1", blue: "b1" },
    timerSeconds: 60,
  },
};

function freshTimed(seed = "timer-seed"): CodenamesState {
  return createInitialState(timedConfig, seed);
}

function elapsed(state: CodenamesState): CodenamesState {
  return { ...state, phaseStartedAt: Date.now() - 61_000 };
}

function currentSpy(state: CodenamesState) {
  return state.players.find((p) => p.isSpymaster && p.team === state.currentTeam)!;
}

function currentOp(state: CodenamesState) {
  return state.players.find((p) => !p.isSpymaster && p.team === state.currentTeam)!;
}

describe("createInitialState timer", () => {
  it("defaults to no timer", () => {
    const state = createInitialState(
      { ...timedConfig, options: { ...timedConfig.options, timerSeconds: null } },
      "no-timer"
    );
    expect(state.timerSeconds).toBeNull();
    expect(state.phaseStartedAt).toBeNull();
  });

  it("stores a clamped duration and starts the phase clock", () => {
    const state = freshTimed();
    expect(state.timerSeconds).toBe(60);
    expect(state.phaseStartedAt).toBeTypeOf("number");
    expect(state.phase).toBe("giving_clue");
  });
});

describe("TIMER_EXPIRED", () => {
  it("is rejected while the clock is still running", () => {
    const state = freshTimed();
    const result = validateAction(state, { type: "TIMER_EXPIRED" });
    expect(result.valid).toBe(false);
    expect(reduce(state, { type: "TIMER_EXPIRED" })).toBe(state);
  });

  it("skips clue-giving and hands the next team a fresh clock", () => {
    const state = elapsed(freshTimed());
    const from = state.currentTeam;
    const next = reduce(state, { type: "TIMER_EXPIRED" });

    expect(next.currentTeam).not.toBe(from);
    expect(next.phase).toBe("giving_clue");
    expect(next.currentClue).toBeNull();
    expect(next.turn).toBe(state.turn + 1);
    expect(next.phaseStartedAt).toBeGreaterThan(state.phaseStartedAt!);
    expect(next.events.some((e) => e.type === "TIMER_EXPIRED")).toBe(true);
  });

  it("ends a guessing round and starts the other team's clue", () => {
    const start = freshTimed();
    const spy = currentSpy(start);
    const withClue = reduce(start, {
      type: "GIVE_CLUE",
      playerId: spy.id,
      clueWord: "ocean",
      count: 2,
    });
    expect(withClue.phase).toBe("guessing");
    expect(withClue.phaseStartedAt).toBeGreaterThanOrEqual(start.phaseStartedAt!);

    const timedOut = reduce(elapsed(withClue), { type: "TIMER_EXPIRED" });
    expect(timedOut.phase).toBe("giving_clue");
    expect(timedOut.currentTeam).not.toBe(withClue.currentTeam);
    expect(timedOut.currentClue).toBeNull();
  });

  it("is invalid when the timer is off", () => {
    const state = createInitialState(
      { ...timedConfig, options: { ...timedConfig.options, timerSeconds: undefined } },
      "off"
    );
    expect(validateAction(state, { type: "TIMER_EXPIRED" }).valid).toBe(false);
  });
});

describe("phase clock restart", () => {
  it("restarts after a normal clue", () => {
    const start = freshTimed();
    const next = reduce(start, {
      type: "GIVE_CLUE",
      playerId: currentSpy(start).id,
      clueWord: "forest",
      count: 1,
    });
    expect(next.phaseStartedAt).not.toBeNull();
    expect(next.timerSeconds).toBe(60);
  });

  it("restarts after ending a guessing turn", () => {
    const start = freshTimed();
    const guessing = reduce(start, {
      type: "GIVE_CLUE",
      playerId: currentSpy(start).id,
      clueWord: "moon",
      count: 1,
    });
    const ended = reduce(guessing, { type: "END_TURN", playerId: currentOp(guessing).id });
    expect(ended.phase).toBe("giving_clue");
    expect(ended.phaseStartedAt).toBeGreaterThanOrEqual(guessing.phaseStartedAt!);
  });
});
