/**
 * Tests for the game engine — reducer, elimination, win conditions, scoring.
 */

import { describe, it, expect } from "vitest";
import { createInitialState } from "../state";
import { reduce } from "../reducer";
import { processElimination } from "../engine/elimination";
import { checkWinConditions } from "../engine/winConditions";
import { applyRoundScores } from "../scoring";
import { getAvailableActions, getPlayerView } from "../selectors";
import { validateAction } from "../validation";
import type { UndercoverPlayer, SpecialCharacterSettings, UndercoverState } from "../types";
import type { GameConfig } from "@/game/core/types";

// ─── Test helpers ─────────────────────────────────────────────────────────────

const makeConfig = (
  names: string[],
  options?: Record<string, unknown>
): GameConfig => ({
  players: names.map((name, i) => ({
    id: `p${i + 1}`,
    name,
    seat: i,
    isHuman: true,
  })),
  options: options ?? {
    mode: "offline",
    civilians: Math.max(2, Math.floor(names.length * 0.6)),
    undercovers: Math.max(1, Math.floor(names.length * 0.25)),
    mrWhites: names.length - Math.max(2, Math.floor(names.length * 0.6)) - Math.max(1, Math.floor(names.length * 0.25)),
  },
});

const noSpecials: SpecialCharacterSettings = {
  judge: false,
  joyFool: false,
  ghost: false,
  lovers: false,
  revenger: false,
  duelists: false,
};

const makePlayer = (overrides: Partial<UndercoverPlayer>): UndercoverPlayer => ({
  id: "p1",
  name: "Player",
  faction: "civilian",
  specialCharacters: [],
  isEliminated: false,
  isGhost: false,
  joyFoolActive: false,
  duelistStatus: "resolved",
  totalScore: 0,
  ...overrides,
});

// ─── Initialization ───────────────────────────────────────────────────────────

describe("createInitialState", () => {
  it("creates a valid state for 6 players", () => {
    const config = makeConfig(["A", "B", "C", "D", "E", "F"]);
    const state = createInitialState(config, "test-seed");
    expect(state.players.length).toBe(6);
    expect(state.phase).toBe("card_reveal");
    expect(state.roundNumber).toBe(1);
    expect(state.turnOrder.length).toBeGreaterThan(0);
    expect(state.civilianWord).not.toBeNull();
    expect(state.undercoverWord).not.toBeNull();
    expect(state.civilianWord).not.toBe(state.undercoverWord);
  });

  it("assigns correct faction counts", () => {
    const config: GameConfig = {
      players: ["A", "B", "C", "D", "E", "F", "G", "H"].map((n, i) => ({
        id: `p${i + 1}`,
        name: n,
        seat: i,
        isHuman: true,
      })),
      options: { mode: "offline", civilians: 5, undercovers: 2, mrWhites: 1 },
    };
    const state = createInitialState(config, "faction-test");
    const civilians = state.players.filter((p) => p.faction === "civilian");
    const undercovers = state.players.filter((p) => p.faction === "undercover");
    const mrWhites = state.players.filter((p) => p.faction === "mr_white");
    expect(civilians.length).toBe(5);
    expect(undercovers.length).toBe(2);
    expect(mrWhites.length).toBe(1);
  });
});

// ─── Voting: player cannot vote for themselves ────────────────────────────────

describe("SUBMIT_VOTE", () => {
  it("ignores self-vote", () => {
    const config = makeConfig(["A", "B", "C", "D"], {
      mode: "offline",
      civilians: 2,
      undercovers: 1,
      mrWhites: 1,
    });
    let state = createInitialState(config, "vote-self");
    // Advance to voting phase manually
    state = { ...state, phase: "voting" };

    const before = { ...state.votes };
    // Try to self-vote
    state = reduce(state, { type: "SUBMIT_VOTE", voterId: "p1", targetId: "p1" });
    expect(state.votes).toEqual(before); // unchanged
  });

  it("records a valid vote", () => {
    const config = makeConfig(["A", "B", "C", "D"], {
      mode: "offline",
      civilians: 2,
      undercovers: 1,
      mrWhites: 1,
    });
    let state = createInitialState(config, "valid-vote");
    state = { ...state, phase: "voting" };

    state = reduce(state, { type: "SUBMIT_VOTE", voterId: "p1", targetId: "p2" });
    expect(state.votes["p1"]).toBe("p2");
  });

  it("ignores a duplicate vote from the same voter", () => {
    const config = makeConfig(["A", "B", "C", "D"], {
      mode: "offline",
      civilians: 2,
      undercovers: 1,
      mrWhites: 1,
    });
    let state = createInitialState(config, "dup-vote");
    state = { ...state, phase: "voting" };

    state = reduce(state, { type: "SUBMIT_VOTE", voterId: "p1", targetId: "p2" });
    state = reduce(state, { type: "SUBMIT_VOTE", voterId: "p1", targetId: "p3" }); // duplicate
    expect(state.votes["p1"]).toBe("p2"); // unchanged
  });
});

// ─── Judge tie-break ──────────────────────────────────────────────────────────

function setupOnlineVoting(opts: {
  judgeId?: string | null;
  playerCount?: number;
  seed?: string;
}): UndercoverState {
  const playerCount = opts.playerCount ?? 4;
  const names = ["A", "B", "C", "D", "E", "F"].slice(0, playerCount);
  const civilians = playerCount - 2;
  const config = makeConfig(names, {
    mode: "online",
    civilians,
    undercovers: 1,
    mrWhites: 1,
    specialCharacters: { ...noSpecials, judge: Boolean(opts.judgeId) },
  });
  const state = createInitialState(config, opts.seed ?? "judge-tie");
  const turnOrder = names.map((_, i) => `p${i + 1}`);
  return {
    ...state,
    mode: "online",
    phase: "voting",
    turnOrder,
    currentVoterIndex: 0,
    votes: {},
    pendingElimination: null,
    pendingJudgeDecision: null,
    voteResult: null,
    players: state.players.map((p) => {
      const withoutJudge = p.specialCharacters.filter((s) => s !== "judge");
      if (opts.judgeId && p.id === opts.judgeId) {
        return { ...p, specialCharacters: [...withoutJudge, "judge"] };
      }
      return { ...p, specialCharacters: withoutJudge };
    }),
    settings: {
      ...state.settings,
      specialCharacters: {
        ...state.settings.specialCharacters,
        judge: Boolean(opts.judgeId),
      },
    },
  };
}

function castFourPlayerTie(state: UndercoverState): UndercoverState {
  state = reduce(state, { type: "SUBMIT_VOTE", voterId: "p1", targetId: "p2" });
  state = reduce(state, { type: "SUBMIT_VOTE", voterId: "p2", targetId: "p1" });
  state = reduce(state, { type: "SUBMIT_VOTE", voterId: "p3", targetId: "p2" });
  state = reduce(state, { type: "SUBMIT_VOTE", voterId: "p4", targetId: "p1" });
  return state;
}

describe("Judge tie-break", () => {
  it("asks a living Judge to break a tie instead of setting pendingElimination", () => {
    let state = setupOnlineVoting({ judgeId: "p4" });
    state = castFourPlayerTie(state);

    expect(state.voteResult?.isTie).toBe(true);
    expect(state.voteResult?.leaders.sort()).toEqual(["p1", "p2"]);
    expect(state.pendingJudgeDecision).toBe("p4");
    expect(state.pendingElimination).toBeNull();
    expect(state.phase).toBe("voting");
  });

  it("lets the Judge add one extra vote, then the host confirms elimination", () => {
    let state = setupOnlineVoting({ judgeId: "p4" });
    state = castFourPlayerTie(state);

    const judgeActions = getAvailableActions(state, "p4");
    expect(judgeActions).toEqual(
      expect.arrayContaining([
        { type: "JUDGE_DECISION", judgeId: "p4", targetId: "p1" },
        { type: "JUDGE_DECISION", judgeId: "p4", targetId: "p2" },
      ])
    );
    expect(getAvailableActions(state, "p1").some((a) => a.type === "CONFIRM_ELIMINATION")).toBe(false);

    const judgeView = getPlayerView(state, "p4");
    const otherView = getPlayerView(state, "p1");
    expect(judgeView.awaitingJudgeDecision).toBe(true);
    expect(judgeView.isJudge).toBe(true);
    expect(otherView.awaitingJudgeDecision).toBe(true);
    expect(otherView.isJudge).toBe(false);

    state = reduce(state, { type: "JUDGE_DECISION", judgeId: "p4", targetId: "p2" });

    expect(state.pendingJudgeDecision).toBeNull();
    expect(state.pendingElimination).toBe("p2");
    expect(state.voteResult?.totals["p2"]).toBe(3);
    expect(state.voteResult?.totals["p1"]).toBe(2);
    expect(state.voteResult?.isTie).toBe(false);
    expect(state.voteResult?.tieBrokenByJudge).toBe(true);
    expect(state.votes["p4"]).toBe("p1");
    expect(state.events.some((e) => e.type === "JUDGE_DECISION")).toBe(true);

    const hostActions = getAvailableActions(state, "p1");
    expect(hostActions).toEqual(
      expect.arrayContaining([
        { type: "CONFIRM_ELIMINATION", targetId: "p2" },
        { type: "REQUEST_REVOTE" },
      ])
    );

    state = reduce(state, { type: "CONFIRM_ELIMINATION", targetId: "p2" });
    expect(state.phase).toBe("elimination_reveal");
    expect(state.players.find((p) => p.id === "p2")?.isEliminated).toBe(true);
  });

  it("rejects a Judge pick that is not among the tied players", () => {
    let state = setupOnlineVoting({ judgeId: "p4" });
    state = castFourPlayerTie(state);

    const invalid = validateAction(state, {
      type: "JUDGE_DECISION",
      judgeId: "p4",
      targetId: "p3",
    });
    expect(invalid.valid).toBe(false);

    const after = reduce(state, { type: "JUDGE_DECISION", judgeId: "p4", targetId: "p3" });
    expect(after.pendingJudgeDecision).toBe("p4");
    expect(after.pendingElimination).toBeNull();
  });

  it("rejects a non-Judge trying to break the tie", () => {
    let state = setupOnlineVoting({ judgeId: "p4" });
    state = castFourPlayerTie(state);

    const invalid = validateAction(state, {
      type: "JUDGE_DECISION",
      judgeId: "p1",
      targetId: "p2",
    });
    expect(invalid.valid).toBe(false);
  });

  it("lets the Judge pick themselves when they are tied", () => {
    let state = setupOnlineVoting({ judgeId: "p1" });
    state = castFourPlayerTie(state);

    expect(state.pendingJudgeDecision).toBe("p1");
    state = reduce(state, { type: "JUDGE_DECISION", judgeId: "p1", targetId: "p1" });
    expect(state.pendingElimination).toBe("p1");
    expect(state.voteResult?.totals["p1"]).toBe(3);
  });

  it("picks a random tied player when there is no living Judge", () => {
    let state = setupOnlineVoting({ judgeId: null });
    state = castFourPlayerTie(state);

    expect(state.pendingJudgeDecision).toBeNull();
    expect(["p1", "p2"]).toContain(state.pendingElimination);
    expect(state.voteResult?.isTie).toBe(true);
  });

  it("picks a random tied player when the Judge is already eliminated", () => {
    let state = setupOnlineVoting({ judgeId: "p5", playerCount: 5 });
    state = {
      ...state,
      players: state.players.map((p) =>
        p.id === "p5" ? { ...p, isEliminated: true } : p
      ),
    };
    state = castFourPlayerTie(state);

    expect(state.pendingJudgeDecision).toBeNull();
    expect(["p1", "p2"]).toContain(state.pendingElimination);
  });

  it("does not involve the Judge when the vote is not a tie", () => {
    let state = setupOnlineVoting({ judgeId: "p4" });
    state = reduce(state, { type: "SUBMIT_VOTE", voterId: "p1", targetId: "p2" });
    state = reduce(state, { type: "SUBMIT_VOTE", voterId: "p2", targetId: "p3" });
    state = reduce(state, { type: "SUBMIT_VOTE", voterId: "p3", targetId: "p2" });
    state = reduce(state, { type: "SUBMIT_VOTE", voterId: "p4", targetId: "p2" });

    expect(state.pendingJudgeDecision).toBeNull();
    expect(state.pendingElimination).toBe("p2");
    expect(state.voteResult?.isTie).toBe(false);
  });

  it("lets the host revote while waiting for the Judge", () => {
    let state = setupOnlineVoting({ judgeId: "p4" });
    state = castFourPlayerTie(state);

    expect(validateAction(state, { type: "REQUEST_REVOTE" }).valid).toBe(true);
    state = reduce(state, { type: "REQUEST_REVOTE" });

    expect(state.votes).toEqual({});
    expect(state.voteResult).toBeNull();
    expect(state.pendingJudgeDecision).toBeNull();
    expect(state.pendingElimination).toBeNull();
    expect(state.currentVoterIndex).toBe(0);
  });
});

// ─── Elimination chain ────────────────────────────────────────────────────────

describe("processElimination", () => {
  it("marks the target as eliminated", () => {
    const players = [
      makePlayer({ id: "p1", name: "Alice", faction: "civilian" }),
      makePlayer({ id: "p2", name: "Bob", faction: "undercover" }),
    ];
    const result = processElimination(players, "p1", "vote", noSpecials);
    expect(result.eliminatedIds).toContain("p1");
    const alice = result.players.find((p) => p.id === "p1");
    expect(alice?.isEliminated).toBe(true);
  });

  it("triggers Lover chain when one Lover is eliminated", () => {
    const players = [
      makePlayer({ id: "p1", faction: "civilian", specialCharacters: ["lover"], loverPartnerId: "p2" }),
      makePlayer({ id: "p2", faction: "undercover", specialCharacters: ["lover"], loverPartnerId: "p1" }),
      makePlayer({ id: "p3", faction: "civilian" }),
    ];
    const result = processElimination(players, "p1", "vote", { ...noSpecials, lovers: true });
    expect(result.eliminatedIds).toContain("p1");
    expect(result.eliminatedIds).toContain("p2");
    const chainEvent = result.events.find((e) => e.type === "lover_chain");
    expect(chainEvent).toBeDefined();
  });

  it("converts only the assigned Ghost player when ghost is enabled", () => {
    const players = [
      makePlayer({ id: "p1", faction: "undercover", specialCharacters: ["ghost"] }),
      makePlayer({ id: "p2", faction: "civilian" }),
    ];
    const result = processElimination(players, "p1", "vote", { ...noSpecials, ghost: true });
    const p1 = result.players.find((p) => p.id === "p1");
    expect(p1?.isGhost).toBe(true);
  });

  it("does not convert a non-Ghost player even when the ghost rule is on", () => {
    const players = [
      makePlayer({ id: "p1", faction: "undercover" }),
      makePlayer({ id: "p2", faction: "civilian", specialCharacters: ["ghost"] }),
    ];
    const result = processElimination(players, "p1", "vote", { ...noSpecials, ghost: true });
    const p1 = result.players.find((p) => p.id === "p1");
    expect(p1?.isGhost).toBe(false);
  });

  it("triggers Revenger when voted out", () => {
    const players = [
      makePlayer({ id: "p1", faction: "undercover", specialCharacters: ["revenger"] }),
      makePlayer({ id: "p2", faction: "civilian" }),
    ];
    const result = processElimination(players, "p1", "vote", { ...noSpecials, revenger: true });
    expect(result.pendingRevengerId).toBe("p1");
  });

  it("does NOT trigger Revenger when killed by Lover chain", () => {
    const players = [
      makePlayer({ id: "p1", faction: "civilian", specialCharacters: ["lover", "revenger"], loverPartnerId: "p2" }),
      makePlayer({ id: "p2", faction: "undercover", specialCharacters: ["lover"], loverPartnerId: "p1" }),
      makePlayer({ id: "p3", faction: "civilian" }),
    ];
    // Eliminate p2 by vote
    const result = processElimination(players, "p2", "vote", { ...noSpecials, lovers: true, revenger: true });
    // p1 dies via Lover chain, not vote — Revenger should NOT trigger for p1
    // (Revenger only triggers if the Revenger is the primary vote target)
    expect(result.pendingRevengerId).toBeNull();
  });

  it("resolves Duelist — first eliminated gets -2 status", () => {
    const players = [
      makePlayer({ id: "p1", faction: "civilian", specialCharacters: ["duelist"], duelistRivalId: "p2", duelistStatus: "pending" }),
      makePlayer({ id: "p2", faction: "undercover", specialCharacters: ["duelist"], duelistRivalId: "p1", duelistStatus: "pending" }),
    ];
    const result = processElimination(players, "p1", "vote", { ...noSpecials, duelists: true });
    const p1 = result.players.find((p) => p.id === "p1");
    const p2 = result.players.find((p) => p.id === "p2");
    expect(p1?.duelistStatus).toBe("first_eliminated");
    expect(p2?.duelistStatus).toBe("survivor");
  });

  it("handles simultaneous Duelist deaths", () => {
    const players = [
      makePlayer({ id: "p1", faction: "civilian", specialCharacters: ["duelist", "lover"], duelistRivalId: "p2", loverPartnerId: "p2", duelistStatus: "pending" }),
      makePlayer({ id: "p2", faction: "undercover", specialCharacters: ["duelist", "lover"], duelistRivalId: "p1", loverPartnerId: "p1", duelistStatus: "pending" }),
    ];
    const result = processElimination(players, "p1", "vote", { ...noSpecials, lovers: true, duelists: true });
    // Both die simultaneously — no penalty/bonus
    const p1 = result.players.find((p) => p.id === "p1");
    const p2 = result.players.find((p) => p.id === "p2");
    expect(p1?.duelistStatus).toBe("simultaneous");
    expect(p2?.duelistStatus).toBe("simultaneous");
  });

  it("survivor duelist keeps +2 status even if eliminated later", () => {
    // Round 1: p1 eliminated first → p1=first_eliminated, p2=survivor
    const afterRound1 = [
      makePlayer({ id: "p1", faction: "civilian", specialCharacters: ["duelist"], duelistRivalId: "p2", duelistStatus: "first_eliminated", isEliminated: true }),
      makePlayer({ id: "p2", faction: "undercover", specialCharacters: ["duelist"], duelistRivalId: "p1", duelistStatus: "survivor" }),
      makePlayer({ id: "p3", faction: "civilian" }),
    ];
    // Round 2: p2 (the survivor) is now eliminated
    const result = processElimination(afterRound1, "p2", "vote", { ...noSpecials, duelists: true });
    const p2 = result.players.find((p) => p.id === "p2");
    // Status must NOT be overridden to "simultaneous" — p2 was already the survivor
    expect(p2?.duelistStatus).toBe("survivor");
    expect(p2?.isEliminated).toBe(true);
  });
});

// ─── Win conditions ───────────────────────────────────────────────────────────

describe("checkWinConditions", () => {
  it("returns civilian victory when all undercovers eliminated", () => {
    const players = [
      makePlayer({ id: "p1", faction: "civilian" }),
      makePlayer({ id: "p2", faction: "undercover", isEliminated: true }),
    ];
    const result = checkWinConditions(players);
    expect(result?.faction).toBe("civilian");
  });

  it("returns undercover victory when undercovers >= civilians", () => {
    const players = [
      makePlayer({ id: "p1", faction: "civilian" }),
      makePlayer({ id: "p2", faction: "undercover" }),
      makePlayer({ id: "p3", faction: "undercover" }),
    ];
    const result = checkWinConditions(players);
    expect(result?.faction).toBe("undercover");
  });

  it("returns null when no win condition met", () => {
    const players = [
      makePlayer({ id: "p1", faction: "civilian" }),
      makePlayer({ id: "p2", faction: "civilian" }),
      makePlayer({ id: "p3", faction: "undercover" }),
    ];
    const result = checkWinConditions(players);
    expect(result).toBeNull();
  });

  it("Mr. White does not count as Civilian for undercover win check", () => {
    const players = [
      makePlayer({ id: "p1", faction: "mr_white" }),  // Mr. White alive
      makePlayer({ id: "p2", faction: "undercover" }), // Undercover alive
      makePlayer({ id: "p3", faction: "civilian", isEliminated: true }),
    ];
    // 1 undercover, 0 living civilians → undercover wins
    const result = checkWinConditions(players);
    expect(result?.faction).toBe("undercover");
  });

  it("Undercovers win when only one Civilian remains with them", () => {
    const players = [
      makePlayer({ id: "p1", faction: "civilian" }),
      makePlayer({ id: "p2", faction: "undercover" }),
      makePlayer({ id: "p3", faction: "civilian", isEliminated: true }),
    ];
    const result = checkWinConditions(players);
    expect(result?.faction).toBe("undercover");
    expect(result?.winnerIds).toEqual(["p2"]);
  });

  it("Mr. White wins when only one Civilian remains and no Undercovers are left", () => {
    const players = [
      makePlayer({ id: "p1", faction: "civilian" }),
      makePlayer({ id: "p2", faction: "mr_white" }),
      makePlayer({ id: "p3", faction: "undercover", isEliminated: true }),
    ];
    const result = checkWinConditions(players);
    expect(result?.faction).toBe("mr_white");
    expect(result?.winnerIds).toEqual(["p2"]);
  });

  it("does not end for Mr. White while two Civilians remain", () => {
    const players = [
      makePlayer({ id: "p1", faction: "civilian" }),
      makePlayer({ id: "p2", faction: "civilian" }),
      makePlayer({ id: "p3", faction: "mr_white" }),
    ];
    const result = checkWinConditions(players);
    expect(result).toBeNull();
  });
});

// ─── Scoring ──────────────────────────────────────────────────────────────────

describe("applyRoundScores", () => {
  it("awards +2 to surviving Civilians on civilian win", () => {
    const players = [
      makePlayer({ id: "p1", faction: "civilian", totalScore: 0 }),
      makePlayer({ id: "p2", faction: "undercover", isEliminated: true, totalScore: 0 }),
    ];
    const { players: updated } = applyRoundScores(
      players,
      { faction: "civilian", winnerIds: ["p1"], summary: "" },
      [],
      1
    );
    const p1 = updated.find((p) => p.id === "p1");
    expect(p1?.totalScore).toBe(2);
  });

  it("splits 10 points equally among surviving Undercovers", () => {
    const players = [
      makePlayer({ id: "p1", faction: "undercover", totalScore: 0 }),
      makePlayer({ id: "p2", faction: "undercover", totalScore: 0 }),
    ];
    const { players: updated } = applyRoundScores(
      players,
      { faction: "undercover", winnerIds: ["p1", "p2"], summary: "" },
      [],
      1
    );
    const p1 = updated.find((p) => p.id === "p1");
    const p2 = updated.find((p) => p.id === "p2");
    expect(p1?.totalScore).toBe(5);
    expect(p2?.totalScore).toBe(5);
  });

  it("awards +6 to Mr. White when they win with one Civilian remaining", () => {
    const players = [
      makePlayer({ id: "p1", faction: "mr_white", totalScore: 0 }),
      makePlayer({ id: "p2", faction: "civilian", totalScore: 0 }),
      makePlayer({ id: "p3", faction: "undercover", isEliminated: true, totalScore: 0 }),
    ];
    const { players: updated } = applyRoundScores(
      players,
      { faction: "mr_white", winnerIds: ["p1"], summary: "" },
      ["p1"],
      2
    );
    const p1 = updated.find((p) => p.id === "p1");
    const p2 = updated.find((p) => p.id === "p2");
    expect(p1?.totalScore).toBe(6);
    expect(p2?.totalScore).toBe(0);
  });

  it("applies Joy Fool +4 when eliminated in Round 1", () => {
    const players = [
      makePlayer({
        id: "p1",
        faction: "civilian",
        specialCharacters: ["joy_fool"],
        joyFoolActive: true,
        isEliminated: true,
        eliminationRound: 1,
        totalScore: 0,
      }),
    ];
    const { players: updated } = applyRoundScores(
      players,
      { faction: "civilian", winnerIds: [], summary: "" },
      [],
      1
    );
    const p1 = updated.find((p) => p.id === "p1");
    // Joy fool eliminated in round 1 → +4
    expect(p1?.totalScore).toBe(4);
  });

  it("applies Duelist -2 to first eliminated and +2 to survivor", () => {
    // p1 (civilian) was eliminated first; p2 (undercover) is the lone survivor
    const players = [
      makePlayer({ id: "p1", faction: "civilian", specialCharacters: ["duelist"], duelistStatus: "first_eliminated", isEliminated: true, totalScore: 0 }),
      makePlayer({ id: "p2", faction: "undercover", specialCharacters: ["duelist"], duelistStatus: "survivor", totalScore: 0 }),
    ];
    const { players: updated } = applyRoundScores(
      players,
      { faction: "undercover", winnerIds: ["p2"], summary: "" },
      [],
      1
    );
    const p1 = updated.find((p) => p.id === "p1");
    const p2 = updated.find((p) => p.id === "p2");
    // p1: 0 (eliminated civilian, no faction win pts) - 2 (duelist) = -2
    expect(p1?.totalScore).toBe(-2);
    // p2: 10/1 (sole living undercover) + 2 (duelist survivor) = 12
    expect(p2?.totalScore).toBeCloseTo(12);
  });

  it("does not apply Duelist bonus on simultaneous death", () => {
    // Both duelists are eliminated — simultaneous, no bonus or penalty
    const players = [
      makePlayer({ id: "p1", faction: "civilian", specialCharacters: ["duelist"], duelistStatus: "simultaneous", isEliminated: true, totalScore: 0 }),
      makePlayer({ id: "p2", faction: "undercover", specialCharacters: ["duelist"], duelistStatus: "simultaneous", isEliminated: true, totalScore: 0 }),
    ];
    const { players: updated } = applyRoundScores(
      players,
      // No living players — civilian win by default, but no survivors
      { faction: "civilian", winnerIds: [], summary: "" },
      [],
      1
    );
    const p1 = updated.find((p) => p.id === "p1");
    const p2 = updated.find((p) => p.id === "p2");
    // Neither gets faction points (both eliminated), neither gets duelist pts (simultaneous)
    expect(p1?.totalScore).toBe(0);
    expect(p2?.totalScore).toBe(0);
  });
});

// ─── Mr. White guess ──────────────────────────────────────────────────────────

describe("Mr. White guess", () => {
  it("correct guess ends game with Mr. White win", () => {
    const config: GameConfig = {
      players: [
        { id: "p1", name: "Alice", seat: 0, isHuman: true },
        { id: "p2", name: "Bob", seat: 1, isHuman: true },
        { id: "p3", name: "Charlie", seat: 2, isHuman: true },
        { id: "p4", name: "Dave", seat: 3, isHuman: true },
      ],
      options: { mode: "offline", civilians: 2, undercovers: 1, mrWhites: 1 },
    };
    let state = createInitialState(config, "mw-test");

    // Find Mr. White
    const mrWhite = state.players.find((p) => p.faction === "mr_white");
    expect(mrWhite).toBeDefined();

    // Manually set up Mr. White guess phase
    state = {
      ...state,
      phase: "mr_white_guess",
      pendingMrWhiteGuess: mrWhite!.id,
    };

    // Correct guess
    const civilianWord = state.civilianWord!;
    state = reduce(state, {
      type: "SUBMIT_MR_WHITE_GUESS",
      playerId: mrWhite!.id,
      guess: civilianWord,
    });

    expect(state.phase).toBe("game_over");
    expect(state.winCondition?.faction).toBe("mr_white");
  });

  it("incorrect guess continues the game", () => {
    const config: GameConfig = {
      players: [
        { id: "p1", name: "Alice", seat: 0, isHuman: true },
        { id: "p2", name: "Bob", seat: 1, isHuman: true },
        { id: "p3", name: "Charlie", seat: 2, isHuman: true },
        { id: "p4", name: "Dave", seat: 3, isHuman: true },
      ],
      options: { mode: "offline", civilians: 2, undercovers: 1, mrWhites: 1 },
    };
    let state = createInitialState(config, "mw-wrong");

    const mrWhite = state.players.find((p) => p.faction === "mr_white")!;
    state = {
      ...state,
      phase: "mr_white_guess",
      pendingMrWhiteGuess: mrWhite.id,
    };

    state = reduce(state, {
      type: "SUBMIT_MR_WHITE_GUESS",
      playerId: mrWhite.id,
      guess: "DEFINITELY_WRONG_WORD_XYZ",
    });

    expect(state.phase).not.toBe("game_over");
    expect(state.winCondition).toBeNull();
  });

  it("guess is case-insensitive", () => {
    const config: GameConfig = {
      players: [
        { id: "p1", name: "A", seat: 0, isHuman: true },
        { id: "p2", name: "B", seat: 1, isHuman: true },
        { id: "p3", name: "C", seat: 2, isHuman: true },
        { id: "p4", name: "D", seat: 3, isHuman: true },
      ],
      options: { mode: "offline", civilians: 2, undercovers: 1, mrWhites: 1 },
    };
    let state = createInitialState(config, "case-insensitive");
    const mrWhite = state.players.find((p) => p.faction === "mr_white")!;
    state = { ...state, phase: "mr_white_guess", pendingMrWhiteGuess: mrWhite.id };

    const upperCaseGuess = state.civilianWord!.toUpperCase();
    state = reduce(state, {
      type: "SUBMIT_MR_WHITE_GUESS",
      playerId: mrWhite.id,
      guess: upperCaseGuess,
    });

    expect(state.phase).toBe("game_over");
  });
});

// ─── Card confirm: all players must hide before clues ─────────────────────────

describe("HIDE_CARD", () => {
  it("stays in card_reveal until every living player has confirmed", () => {
    const config = makeConfig(["A", "B", "C", "D"], {
      mode: "online",
      civilians: 2,
      undercovers: 1,
      mrWhites: 1,
    });
    let state = createInitialState(config, "hide-all");
    expect(state.phase).toBe("card_reveal");

    state = reduce(state, { type: "HIDE_CARD", playerId: "p1" });
    expect(state.phase).toBe("card_reveal");
    expect(state.cardsRevealed).toEqual(["p1"]);

    // Duplicate confirm from the same player must not advance the phase
    state = reduce(state, { type: "HIDE_CARD", playerId: "p1" });
    expect(state.phase).toBe("card_reveal");
    expect(state.cardsRevealed).toEqual(["p1"]);

    state = reduce(state, { type: "HIDE_CARD", playerId: "p2" });
    state = reduce(state, { type: "HIDE_CARD", playerId: "p3" });
    expect(state.phase).toBe("card_reveal");

    state = reduce(state, { type: "HIDE_CARD", playerId: "p4" });
    expect(state.phase).toBe("clue_phase");
    expect(state.cardsRevealed).toHaveLength(4);
  });
});
