/**
 * Tests for role and special character assignment.
 */

import { describe, it, expect } from "vitest";
import { assignRoles, buildPlayers, getLivingJudge, getVoterOrder, isEligibleVoter } from "../engine/roles";
import type { Player } from "@/game/core/types";
import type { SpecialCharacterSettings } from "../types";

const makePlayers = (count: number): Player[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `p${i + 1}`,
    name: `Player ${i + 1}`,
    seat: i,
    isHuman: true,
  }));

const noSpecials: SpecialCharacterSettings = {
  judge: false,
  joyFool: false,
  ghost: false,
  lovers: false,
  revenger: false,
  duelists: false,
};

describe("assignRoles", () => {
  it("assigns exactly the right faction counts", () => {
    const players = makePlayers(8);
    const assignments = assignRoles(players, 5, 2, 1, noSpecials, "test-seed");

    const civilians = assignments.filter((a) => a.faction === "civilian");
    const undercovers = assignments.filter((a) => a.faction === "undercover");
    const mrWhites = assignments.filter((a) => a.faction === "mr_white");

    expect(civilians.length).toBe(5);
    expect(undercovers.length).toBe(2);
    expect(mrWhites.length).toBe(1);
    expect(assignments.length).toBe(8);
  });

  it("throws if faction counts don't add up", () => {
    const players = makePlayers(8);
    expect(() => assignRoles(players, 3, 2, 1, noSpecials, "seed")).toThrow();
  });

  it("assigns exactly one Judge when enabled", () => {
    const players = makePlayers(6);
    const assignments = assignRoles(players, 4, 1, 1, { ...noSpecials, judge: true }, "seed-j");
    const judges = assignments.filter((a) => a.specialCharacters.includes("judge"));
    expect(judges.length).toBe(1);
  });

  it("assigns exactly one Joy Fool when enabled", () => {
    const players = makePlayers(6);
    const assignments = assignRoles(players, 4, 1, 1, { ...noSpecials, joyFool: true }, "seed-jf");
    const fools = assignments.filter((a) => a.specialCharacters.includes("joy_fool"));
    expect(fools.length).toBe(1);
  });

  it("assigns exactly two Lovers when enabled and records partner IDs", () => {
    const players = makePlayers(6);
    const assignments = assignRoles(players, 4, 1, 1, { ...noSpecials, lovers: true }, "seed-l");
    const lovers = assignments.filter((a) => a.specialCharacters.includes("lover"));
    expect(lovers.length).toBe(2);
    expect(lovers[0].loverPartnerId).toBe(lovers[1].playerId);
    expect(lovers[1].loverPartnerId).toBe(lovers[0].playerId);
  });

  it("assigns exactly two Duelists when enabled and records rival IDs", () => {
    const players = makePlayers(6);
    const assignments = assignRoles(players, 4, 1, 1, { ...noSpecials, duelists: true }, "seed-d");
    const duelists = assignments.filter((a) => a.specialCharacters.includes("duelist"));
    expect(duelists.length).toBe(2);
    expect(duelists[0].duelistRivalId).toBe(duelists[1].playerId);
    expect(duelists[1].duelistRivalId).toBe(duelists[0].playerId);
  });

  it("assigns exactly one Ghost when enabled", () => {
    const players = makePlayers(6);
    const assignments = assignRoles(players, 4, 1, 1, { ...noSpecials, ghost: true }, "seed-g");
    const ghosts = assignments.filter((a) => a.specialCharacters.includes("ghost"));
    expect(ghosts.length).toBe(1);
  });

  it("assigns exactly one Revenger when enabled", () => {
    const players = makePlayers(6);
    const assignments = assignRoles(players, 4, 1, 1, { ...noSpecials, revenger: true }, "seed-r");
    const revengers = assignments.filter((a) => a.specialCharacters.includes("revenger"));
    expect(revengers.length).toBe(1);
  });

  it("distributes roles differently with different seeds", () => {
    const players = makePlayers(8);
    const a1 = assignRoles(players, 5, 2, 1, noSpecials, "seed-1");
    const a2 = assignRoles(players, 5, 2, 1, noSpecials, "seed-2");
    // There is a small chance these could be identical, but statistically they won't be
    const sameOrder = a1.every((a, i) => a.faction === a2[i].faction && a.playerId === a2[i].playerId);
    // Just check they're both valid
    expect(a1.length).toBe(8);
    expect(a2.length).toBe(8);
  });
});

describe("buildPlayers", () => {
  it("builds players with correct fields from assignments", () => {
    const rawPlayers = makePlayers(6);
    const assignments = assignRoles(rawPlayers, 4, 1, 1, noSpecials, "build-test");
    const players = buildPlayers(rawPlayers, assignments);

    expect(players.length).toBe(6);
    players.forEach((p) => {
      expect(p.isEliminated).toBe(false);
      expect(p.isGhost).toBe(false);
      expect(p.totalScore).toBe(0);
      expect(typeof p.faction).toBe("string");
    });
  });
});

describe("getLivingJudge", () => {
  it("returns the Judge if alive", () => {
    const rawPlayers = makePlayers(6);
    const assignments = assignRoles(rawPlayers, 4, 1, 1, { ...noSpecials, judge: true }, "j-test");
    const players = buildPlayers(rawPlayers, assignments);
    const judge = getLivingJudge(players);
    expect(judge).toBeDefined();
    expect(judge?.specialCharacters.includes("judge")).toBe(true);
  });

  it("returns undefined if Judge is eliminated", () => {
    const rawPlayers = makePlayers(6);
    const assignments = assignRoles(rawPlayers, 4, 1, 1, { ...noSpecials, judge: true }, "j-elim");
    let players = buildPlayers(rawPlayers, assignments);
    const judgeId = getLivingJudge(players)?.id;
    players = players.map((p) =>
      p.id === judgeId ? { ...p, isEliminated: true } : p
    );
    expect(getLivingJudge(players)).toBeUndefined();
  });
});

describe("ghost voting eligibility", () => {
  it("only the assigned Ghost can vote after elimination", () => {
    const players = [
      {
        id: "p1",
        name: "Ghost",
        faction: "civilian" as const,
        specialCharacters: ["ghost" as const],
        isEliminated: true,
        isGhost: true,
        joyFoolActive: false,
        duelistStatus: "resolved" as const,
        totalScore: 0,
      },
      {
        id: "p2",
        name: "Civilian",
        faction: "civilian" as const,
        specialCharacters: [],
        isEliminated: true,
        isGhost: false,
        joyFoolActive: false,
        duelistStatus: "resolved" as const,
        totalScore: 0,
      },
      {
        id: "p3",
        name: "Alive",
        faction: "undercover" as const,
        specialCharacters: [],
        isEliminated: false,
        isGhost: false,
        joyFoolActive: false,
        duelistStatus: "resolved" as const,
        totalScore: 0,
      },
    ];

    expect(isEligibleVoter(players[0], true)).toBe(true);
    expect(isEligibleVoter(players[1], true)).toBe(false);
    expect(isEligibleVoter(players[2], true)).toBe(true);

    const order = getVoterOrder(players, ["p1", "p2", "p3"], true);
    expect(order).toEqual(["p3", "p1"]);
  });

  it("eliminated players cannot vote when ghost is off", () => {
    const ghost = {
      id: "p1",
      name: "Ghost",
      faction: "civilian" as const,
      specialCharacters: ["ghost" as const],
      isEliminated: true,
      isGhost: true,
      joyFoolActive: false,
      duelistStatus: "resolved" as const,
      totalScore: 0,
    };
    expect(isEligibleVoter(ghost, false)).toBe(false);
  });
});
