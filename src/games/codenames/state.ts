/**
 * Codenames — initial state factory.
 */

import { createRng } from "@/game/core/random";
import type { GameConfig } from "@/game/core/types";
import type { CodenamesState, CodenamesPlayer, Team, TeamInfo, WordCard } from "./types";
import { CODENAMES_WORDS } from "./words";

// ─── Constants ────────────────────────────────────────────────────────────────

const BOARD_SIZE = 25;
const STARTING_TEAM_COUNT = 9;
const OTHER_TEAM_COUNT = 8;
const NEUTRAL_COUNT = 7;
// Assassin count = 1 (the remainder)

// ─── Factory ──────────────────────────────────────────────────────────────────

export interface CodenamesSetupOptions {
  /** Team assignments: { playerId: "red" | "blue" } */
  teams: Record<string, Team>;
  /** Which player is spymaster for each team */
  spymasters: { red: string; blue: string };
}

export function createInitialState(
  config: GameConfig,
  seed?: string
): CodenamesState {
  const resolvedSeed = seed ?? `codenames-${Date.now()}`;
  const rng = createRng(resolvedSeed);

  const options = config.options as Partial<CodenamesSetupOptions> | undefined;

  // ── Pick 25 random words ───────────────────────────────────────────────────
  const shuffledWords = rng.shuffle([...CODENAMES_WORDS]) as string[];
  const selectedWords = shuffledWords.slice(0, BOARD_SIZE);

  // ── Determine starting team ────────────────────────────────────────────────
  const startingTeam: Team = rng.pick(["red", "blue"]) as Team;
  const otherTeam: Team = startingTeam === "red" ? "blue" : "red";

  // ── Assign card types ──────────────────────────────────────────────────────
  // 9 for starting team, 8 for other, 7 neutral, 1 assassin
  const types: Array<"red" | "blue" | "neutral" | "assassin"> = [
    ...Array(STARTING_TEAM_COUNT).fill(startingTeam),
    ...Array(OTHER_TEAM_COUNT).fill(otherTeam),
    ...Array(NEUTRAL_COUNT).fill("neutral"),
    "assassin",
  ];
  const shuffledTypes = rng.shuffle(types) as typeof types;

  const words: WordCard[] = selectedWords.map((word, i) => ({
    id: i,
    word,
    type: shuffledTypes[i],
    revealed: false,
  }));

  // ── Build players ──────────────────────────────────────────────────────────
  const teamAssignments = options?.teams ?? {};
  const spymasterAssignments = options?.spymasters ?? { red: "", blue: "" };

  // Auto-assign teams if not provided
  const assignedPlayers: CodenamesPlayer[] = config.players.map((p, i) => {
    const team: Team = teamAssignments[p.id] ?? (i % 2 === 0 ? "red" : "blue");
    const isSpymaster =
      p.id === spymasterAssignments.red || p.id === spymasterAssignments.blue;
    return {
      id: p.id,
      name: p.name,
      team,
      isSpymaster,
    };
  });

  // ── Build team info ────────────────────────────────────────────────────────
  const redPlayers = assignedPlayers.filter((p) => p.team === "red");
  const bluePlayers = assignedPlayers.filter((p) => p.team === "blue");

  const redSpymasterId =
    spymasterAssignments.red ||
    redPlayers.find((p) => p.isSpymaster)?.id ||
    redPlayers[0]?.id ||
    "";
  const blueSpymasterId =
    spymasterAssignments.blue ||
    bluePlayers.find((p) => p.isSpymaster)?.id ||
    bluePlayers[0]?.id ||
    "";

  // Make sure spymasters are marked correctly
  const finalPlayers = assignedPlayers.map((p) => ({
    ...p,
    isSpymaster: p.id === redSpymasterId || p.id === blueSpymasterId,
  }));

  const redRemaining =
    startingTeam === "red" ? STARTING_TEAM_COUNT : OTHER_TEAM_COUNT;
  const blueRemaining =
    startingTeam === "blue" ? STARTING_TEAM_COUNT : OTHER_TEAM_COUNT;

  const teams: { red: TeamInfo; blue: TeamInfo } = {
    red: {
      playerIds: redPlayers.map((p) => p.id),
      spymasterId: redSpymasterId,
      remaining: redRemaining,
      total: redRemaining,
    },
    blue: {
      playerIds: bluePlayers.map((p) => p.id),
      spymasterId: blueSpymasterId,
      remaining: blueRemaining,
      total: blueRemaining,
    },
  };

  return {
    phase: "giving_clue",
    words,
    players: finalPlayers,
    teams,
    startingTeam,
    currentTeam: startingTeam,
    turn: 1,
    currentClue: null,
    guessesRemaining: 0,
    clueHistory: [],
    winner: null,
    winReason: null,
    events: [
      {
        type: "GAME_STARTED",
        payload: { startingTeam },
        turn: 1,
        timestamp: Date.now(),
      },
    ],
    seed: resolvedSeed,
  };
}
