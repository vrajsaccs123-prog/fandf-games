/**
 * Undercover — selectors for player views, available actions, and game status.
 *
 * CRITICAL: getPlayerView must NEVER expose another player's secret information.
 * Secret data (faction, word, special characters) is delivered only to the
 * intended player. Never broadcast all private state to all clients.
 */

import type { GamePhaseStatus, GameResult } from "@/game/core/types";
import type {
  UndercoverState,
  Clue,
  VoteResult,
  RoundScore,
  SpecialCharacterSettings,
  WordDifficulty,
} from "./types";
import type { UndercoverAction } from "./actions";
import { getLivingPlayers, getVoterOrder, isEligibleVoter } from "./engine/roles";

// ─── Public player view ───────────────────────────────────────────────────────

/** What everyone can see about a player */
export interface PublicPlayerInfo {
  id: string;
  name: string;
  isEliminated: boolean;
  isGhost: boolean;
  totalScore: number;
  /** Revealed factions (only after elimination/game over) */
  revealedFaction?: string;
  /** Revealed special characters (only after elimination/game over) */
  revealedSpecialCharacters?: string[];
}

// ─── Private card ─────────────────────────────────────────────────────────────

/** Secret information only the owning player should see */
export interface PrivateCard {
  playerId: string;
  faction: string;
  word: string | null;       // null for Mr. White
  specialCharacters: string[];
  loverPartnerName?: string;
  duelistRivalName?: string;
  isJudge: boolean;
  instructions: string[];
}

// ─── Player view ──────────────────────────────────────────────────────────────

export interface UndercoverPlayerView {
  // Identity
  myPlayerId: string;
  myName: string;

  // My secret card (private)
  myCard: PrivateCard;

  // Public game state
  phase: string;
  roundNumber: number;
  turnOrder: string[];
  currentClueIndex: number;
  currentVoterIndex: number;
  civilianWordRevealed: string | null;   // only after game over
  undercoverWordRevealed: string | null; // only after game over

  // Public player list
  players: PublicPlayerInfo[];

  // Clues (public once submitted)
  clues: Clue[];

  // Vote state (only my vote visible; totals visible after voting ends)
  myVote: string | null;
  voteResult: VoteResult | null; // shown after voting is complete / pending confirm
  voterOrder: string[];
  ghostEnabled: boolean;
  activeSpecialCharacters: SpecialCharacterSettings;

  // Pending states (only relevant to specific players)
  pendingElimination: string | null;
  awaitingJudgeDecision: boolean;
  pendingRevenger: string | null;
  pendingMrWhiteGuess: string | null;

  // Scores
  roundScores: RoundScore[];

  // Win condition (when game over)
  winCondition: UndercoverState["winCondition"];

  // Mode
  mode: "online" | "offline";
  creatorId: string;
  isCreator: boolean;
  isJudge: boolean;
  isRevenger: boolean;
  isMrWhite: boolean;
  cardRevealIndex: number;
  cardsRevealed: string[];
  wordDifficulty: WordDifficulty;

  // Deck feedback
  wordDeckReshuffled: boolean;

  // All votes visible during voting phase (for transparency on single device)
  allVotes: Record<string, string>; // voterId → targetId

  // What cards were eliminated (shown in elimination_reveal phase)
  eliminationReveal: Array<{
    id: string;
    name: string;
    faction: string;
    word: string | null;
    specialCharacters: string[];
  }> | null;
}

// ─── getPlayerView ────────────────────────────────────────────────────────────

/**
 * Returns the state as seen by a specific player.
 * All secret information for OTHER players is stripped out.
 */
export function getPlayerView(
  state: UndercoverState,
  playerId: string
): UndercoverPlayerView {
  const myPlayer = state.players.find((p) => p.id === playerId);
  if (!myPlayer) {
    throw new Error(`Player ${playerId} not found in state`);
  }

  const isGameOver = state.phase === "game_over";

  // ── Build public player list ──────────────────────────────────────────────
  const publicPlayers: PublicPlayerInfo[] = state.players.map((p) => {
    const isEliminated = p.isEliminated;
    const shouldReveal = isGameOver || isEliminated;

    return {
      id: p.id,
      name: p.name,
      isEliminated: p.isEliminated,
      isGhost: p.isGhost,
      totalScore: p.totalScore,
      // Only reveal role after elimination or game over
      revealedFaction: shouldReveal ? p.faction : undefined,
      revealedSpecialCharacters: shouldReveal
        ? p.specialCharacters
        : undefined,
    };
  });

  // ── Build my private card ─────────────────────────────────────────────────
  let myWord: string | null = null;
  if (myPlayer.faction === "civilian") {
    myWord = state.civilianWord;
  } else if (myPlayer.faction === "undercover") {
    myWord = state.undercoverWord;
  } else {
    myWord = null; // Mr. White has no word
  }

  const loverPartner = myPlayer.loverPartnerId
    ? state.players.find((p) => p.id === myPlayer.loverPartnerId)
    : undefined;

  const duelistRival = myPlayer.duelistRivalId
    ? state.players.find((p) => p.id === myPlayer.duelistRivalId)
    : undefined;

  const isJudge = myPlayer.specialCharacters.includes("judge");

  const instructions: string[] = [];
  if (isJudge) {
    instructions.push("If voting ends in a perfect tie, you will secretly choose who is eliminated.");
  }
  if (myPlayer.specialCharacters.includes("joy_fool") && myPlayer.joyFoolActive) {
    instructions.push("Your goal: get voted out in Round 1 to earn +4 bonus points.");
  }
  if (myPlayer.specialCharacters.includes("revenger")) {
    instructions.push("If you are voted out, you can drag one other player down with you.");
  }
  if (myPlayer.specialCharacters.includes("lover")) {
    instructions.push(`You are bound by love. If your partner dies, you die too.`);
  }
  if (myPlayer.specialCharacters.includes("duelist")) {
    instructions.push(`You and your rival are in a secret duel. Outlast them for +2 points.`);
  }
  if (myPlayer.specialCharacters.includes("ghost")) {
    instructions.push("If you are eliminated, you become a Ghost and can still vote in later rounds. Other eliminated players cannot.");
  }

  const myCard: PrivateCard = {
    playerId: myPlayer.id,
    faction: myPlayer.faction,
    word: myWord,
    specialCharacters: myPlayer.specialCharacters,
    loverPartnerName: loverPartner?.name,
    duelistRivalName: duelistRival?.name,
    isJudge,
    instructions,
  };

  // ── Vote info ─────────────────────────────────────────────────────────────
  const myVote = state.votes[playerId] ?? null;
  const ghostEnabled = state.settings.specialCharacters.ghost;
  const voterOrder = getVoterOrder(state.players, state.turnOrder, ghostEnabled);
  // Reveal vote totals once voting is finished (including host confirm screen)
  const showVoteResult =
    state.voteResult !== null &&
    (state.phase !== "voting" ||
      state.pendingElimination !== null ||
      state.pendingJudgeDecision !== null);
  // Expose all votes during voting for transparency
  const allVotes: Record<string, string> =
    state.phase === "voting" ? { ...state.votes } : {};

  // ── Word reveal (game over only) ──────────────────────────────────────────
  const civilianWordRevealed = isGameOver ? state.civilianWord : null;
  const undercoverWordRevealed = isGameOver ? state.undercoverWord : null;

  return {
    myPlayerId: playerId,
    myName: myPlayer.name,
    myCard,
    phase: state.phase,
    roundNumber: state.roundNumber,
    turnOrder: state.turnOrder,
    currentClueIndex: state.currentClueIndex,
    currentVoterIndex: state.currentVoterIndex,
    civilianWordRevealed,
    undercoverWordRevealed,
    players: publicPlayers,
    clues: state.clues,
    myVote,
    voteResult: showVoteResult ? state.voteResult : null,
    voterOrder,
    ghostEnabled,
    activeSpecialCharacters: state.settings.specialCharacters,
    pendingElimination: state.pendingElimination,
    awaitingJudgeDecision: state.pendingJudgeDecision !== null,
    pendingRevenger: state.pendingRevenger,
    pendingMrWhiteGuess: state.pendingMrWhiteGuess,
    roundScores: state.roundScores,
    winCondition: state.winCondition,
    mode: state.mode,
    creatorId: state.creatorId,
    isCreator: state.creatorId === playerId,
    isJudge,
    isRevenger: myPlayer.specialCharacters.includes("revenger"),
    isMrWhite: myPlayer.faction === "mr_white",
    cardRevealIndex: state.cardRevealIndex,
    cardsRevealed: state.cardsRevealed,
    wordDifficulty: state.settings.difficulty,
    wordDeckReshuffled: state.wordDeck.reshuffled,
    allVotes,
    eliminationReveal: state.eliminationReveal ?? null,
  };
}

// ─── getAvailableActions ──────────────────────────────────────────────────────

/**
 * Returns all actions the given player may legally take right now.
 */
export function getAvailableActions(
  state: UndercoverState,
  playerId: string
): UndercoverAction[] {
  const actions: UndercoverAction[] = [];
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return actions;

  const living = getLivingPlayers(state.players);
  const activeTurnOrder = state.turnOrder.filter((id) =>
    living.some((p) => p.id === id)
  );

  switch (state.phase) {
    case "card_reveal": {
      const expectedPlayer = activeTurnOrder[state.cardRevealIndex];
      if (
        (playerId === expectedPlayer || state.mode === "online") &&
        !state.cardsRevealed.includes(playerId)
      ) {
        actions.push({ type: "HIDE_CARD", playerId });
        actions.push({ type: "REVEAL_CARD", playerId });
      }
      break;
    }

    case "clue_phase": {
      const expectedCluer = activeTurnOrder[state.currentClueIndex];
      if (playerId === expectedCluer) {
        actions.push({ type: "SUBMIT_CLUE", playerId, clue: "" });
      }
      break;
    }

    case "voting": {
      if (state.pendingJudgeDecision) {
        if (playerId === state.pendingJudgeDecision && state.voteResult) {
          for (const targetId of state.voteResult.leaders) {
            actions.push({ type: "JUDGE_DECISION", judgeId: playerId, targetId });
          }
        }
        if (state.mode === "offline" || state.creatorId === playerId) {
          actions.push({ type: "REQUEST_REVOTE" });
        }
        break;
      }
      if (!state.pendingElimination) {
        const ghostEnabled = state.settings.specialCharacters.ghost;
        const voterOrder = getVoterOrder(state.players, state.turnOrder, ghostEnabled);
        const isMyVoteTurn =
          state.mode === "offline" || voterOrder[state.currentVoterIndex] === playerId;
        if (
          isMyVoteTurn &&
          isEligibleVoter(player, ghostEnabled) &&
          !state.votes[playerId]
        ) {
          for (const target of living) {
            if (target.id !== playerId) {
              actions.push({ type: "SUBMIT_VOTE", voterId: playerId, targetId: target.id });
            }
          }
        }
        if (state.mode === "offline" && state.creatorId === playerId) {
          for (const target of living) {
            actions.push({ type: "ADMIN_ELIMINATE", targetId: target.id });
          }
        }
      } else if (state.mode === "offline" || state.creatorId === playerId) {
        // All votes in — host confirms or calls a revote
        actions.push({ type: "CONFIRM_ELIMINATION", targetId: state.pendingElimination });
        actions.push({ type: "REQUEST_REVOTE" });
      }
      break;
    }

    case "elimination_reveal": {
      actions.push({ type: "CONTINUE_AFTER_REVEAL" });
      break;
    }

    case "revenger_pick": {
      if (state.pendingRevenger === playerId) {
        for (const target of living) {
          if (target.id !== playerId) {
            actions.push({ type: "REVENGER_TARGET", revengerId: playerId, targetId: target.id });
          }
        }
      }
      break;
    }

    case "mr_white_guess": {
      if (state.pendingMrWhiteGuess === playerId) {
        actions.push({ type: "SUBMIT_MR_WHITE_GUESS", playerId, guess: "" });
      }
      break;
    }

    case "game_over":
      break;
  }

  return actions;
}

// ─── getStatus ────────────────────────────────────────────────────────────────

export function getStatus(state: UndercoverState): {
  phase: GamePhaseStatus;
  result?: GameResult;
  currentPlayerId?: string;
  round?: number;
} {
  const living = getLivingPlayers(state.players);
  const activeTurnOrder = state.turnOrder.filter((id) =>
    living.some((p) => p.id === id)
  );

  if (state.phase === "game_over" && state.winCondition) {
    return {
      phase: "finished",
      result: {
        winners: state.winCondition.winnerIds,
        scores: Object.fromEntries(state.players.map((p) => [p.id, p.totalScore])),
        summary: state.winCondition.summary,
      },
      round: state.roundNumber,
    };
  }

  if (state.phase === "lobby") {
    return { phase: "waiting", round: state.roundNumber };
  }

  let currentPlayerId: string | undefined;

  if (state.phase === "clue_phase") {
    currentPlayerId = activeTurnOrder[state.currentClueIndex];
  } else if (state.phase === "voting") {
    if (!state.pendingJudgeDecision) {
      const voterOrder = getVoterOrder(
        state.players,
        state.turnOrder,
        state.settings.specialCharacters.ghost
      );
      currentPlayerId = voterOrder[state.currentVoterIndex];
    }
    // While the Judge breaks a tie, omit currentPlayerId so the Judge's identity stays hidden.
  } else if (state.phase === "revenger_pick") {
    currentPlayerId = state.pendingRevenger ?? undefined;
  } else if (state.phase === "mr_white_guess") {
    currentPlayerId = state.pendingMrWhiteGuess ?? undefined;
  }

  return {
    phase: "playing",
    currentPlayerId,
    round: state.roundNumber,
  };
}
