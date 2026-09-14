/**
 * Undercover — pure game reducer.
 *
 * Simplified flow (per rework):
 *   card_reveal → clue_phase → voting → elimination_reveal
 *   → [revenger_pick] → [mr_white_guess] → clue_phase (loop)
 *   → game_over once a win condition is met
 *
 * Key rules:
 *  - Cards are dealt ONCE per game. Words do NOT change between rounds.
 *  - After elimination: go straight back to clue_phase (no round_result screen).
 *  - Online voting: after all votes in, set pendingElimination and stay in
 *    "voting" phase so the UI can show a single confirmation before proceeding.
 *  - Offline: OfflineEliminationPicker has its own confirmation; ADMIN_ELIMINATE
 *    goes straight to elimination_reveal.
 */

import type { UndercoverState, UndercoverPlayer } from "./types";
import type { UndercoverAction } from "./actions";
import { processElimination, processRevengerTarget } from "./engine/elimination";
import { checkWinConditions } from "./engine/winConditions";
import { applyRoundScores } from "./scoring";
import { getLivingPlayers, getVoterOrder, isEligibleVoter } from "./engine/roles";
import { createRng } from "@/game/core/random";

// ─── Reducer ──────────────────────────────────────────────────────────────────

export function reduce(
  state: UndercoverState,
  action: UndercoverAction
): UndercoverState {
  switch (action.type) {
    case "START_GAME":
      return { ...state, phase: "card_reveal" };

    // ── Card Reveal ─────────────────────────────────────────────────────────
    case "REVEAL_CARD":
      return state; // UI-only; card shown via getPlayerView

    case "HIDE_CARD":
      return handleHideCard(state, action.playerId);

    // ── Clue Phase ──────────────────────────────────────────────────────────
    case "SUBMIT_CLUE":
      return handleSubmitClue(state, action.playerId, action.clue);

    // ── Voting ──────────────────────────────────────────────────────────────
    case "SUBMIT_VOTE":
      return handleSubmitVote(state, action.voterId, action.targetId);

    case "ADMIN_ELIMINATE":
      return handleAdminEliminate(state, action.targetId);

    case "CONFIRM_ELIMINATION":
      return handleConfirmElimination(state, action.targetId);

    case "REQUEST_REVOTE":
      return handleRequestRevote(state);

    // ── Elimination Reveal ──────────────────────────────────────────────────
    case "CONTINUE_AFTER_REVEAL":
      return handleContinueAfterReveal(state);

    // ── Revenger ────────────────────────────────────────────────────────────
    case "REVENGER_TARGET":
      return handleRevengerTarget(state, action.revengerId, action.targetId);

    // ── Mr. White Guess ─────────────────────────────────────────────────────
    case "SUBMIT_MR_WHITE_GUESS":
      return handleMrWhiteGuess(state, action.playerId, action.guess);

    // ── Match Control ───────────────────────────────────────────────────────
    case "END_GAME":
      return { ...state, phase: "game_over" };

    default:
      return state;
  }
}

// ─── Card Reveal ──────────────────────────────────────────────────────────────

function handleHideCard(state: UndercoverState, playerId: string): UndercoverState {
  if (state.phase !== "card_reveal") return state;
  // Ignore duplicate confirms so one player cannot advance the phase early
  if (state.cardsRevealed.includes(playerId)) return state;

  const newRevealed = [...state.cardsRevealed, playerId];
  const living = getLivingPlayers(state.players);
  const newRevealIndex = state.cardRevealIndex + 1;

  // Clue phase starts only once every living player has confirmed
  if (newRevealed.length >= living.length) {
    return {
      ...state,
      cardsRevealed: newRevealed,
      cardRevealIndex: newRevealIndex,
      phase: "clue_phase",
      currentClueIndex: 0,
    };
  }

  return { ...state, cardsRevealed: newRevealed, cardRevealIndex: newRevealIndex };
}

// ─── Clue Phase ───────────────────────────────────────────────────────────────

function handleSubmitClue(
  state: UndercoverState,
  playerId: string,
  clue: string
): UndercoverState {
  if (state.phase !== "clue_phase") return state;

  const trimmedClue = clue.trim();
  if (!trimmedClue) return state;

  if (state.clues.some((c) => c.playerId === playerId && c.roundNumber === state.roundNumber)) {
    return state;
  }

  const player = state.players.find((p) => p.id === playerId);
  if (!player) return state;

  const newClue = {
    playerId,
    playerName: player.name,
    clue: trimmedClue,
    roundNumber: state.roundNumber,
    turnIndex: state.currentClueIndex,
  };

  const newClues = [...state.clues, newClue];
  const newClueIndex = state.currentClueIndex + 1;

  const livingIds = new Set(getLivingPlayers(state.players).map((p) => p.id));
  const activeTurnOrder = state.turnOrder.filter((id) => livingIds.has(id));

  if (newClueIndex >= activeTurnOrder.length) {
    // All clues given — move to voting
    return {
      ...state,
      clues: newClues,
      currentClueIndex: newClueIndex,
      phase: "voting",
      currentVoterIndex: 0,
      votes: {},
      pendingElimination: null,
      voteResult: null,
    };
  }

  return { ...state, clues: newClues, currentClueIndex: newClueIndex };
}

// ─── Voting ───────────────────────────────────────────────────────────────────

function handleSubmitVote(
  state: UndercoverState,
  voterId: string,
  targetId: string
): UndercoverState {
  if (state.phase !== "voting") return state;
  if (state.pendingElimination) return state;
  if (voterId === targetId) return state;
  if (state.votes[voterId] !== undefined) return state;

  const ghostEnabled = state.settings.specialCharacters.ghost;
  const voter = state.players.find((p) => p.id === voterId);
  if (!isEligibleVoter(voter, ghostEnabled)) return state;

  const target = state.players.find((p) => p.id === targetId);
  if (!target || target.isEliminated) return state;

  // Online: only the current voter in sequence may lock in a vote
  const voterOrder = getVoterOrder(state.players, state.turnOrder, ghostEnabled);
  if (state.mode === "online") {
    if (voterOrder[state.currentVoterIndex] !== voterId) return state;
  }

  const newVotes = { ...state.votes, [voterId]: targetId };
  const newVoterIndex = state.currentVoterIndex + 1;

  if (Object.keys(newVotes).length >= voterOrder.length) {
    // All votes in — calculate winner and set pendingElimination.
    // Stay in "voting" phase so the host can confirm or call a revote.
    return calculateAndSetElimination({
      ...state,
      votes: newVotes,
      currentVoterIndex: newVoterIndex,
    });
  }

  return { ...state, votes: newVotes, currentVoterIndex: newVoterIndex };
}

/** Host throws out the tally and everyone votes again this round. */
function handleRequestRevote(state: UndercoverState): UndercoverState {
  if (state.phase !== "voting" || !state.pendingElimination) return state;
  return {
    ...state,
    votes: {},
    voteResult: null,
    pendingElimination: null,
    currentVoterIndex: 0,
  };
}

/** Tally votes, resolve ties randomly, set pendingElimination. Stays in voting phase. */
function calculateAndSetElimination(state: UndercoverState): UndercoverState {
  const totals: Record<string, number> = {};
  for (const targetId of Object.values(state.votes)) {
    totals[targetId] = (totals[targetId] ?? 0) + 1;
  }

  const maxVotes = Math.max(0, ...Object.values(totals));
  const leaders = Object.entries(totals)
    .filter(([, count]) => count === maxVotes)
    .map(([id]) => id);

  const voteResult = { totals, maxVotes, leaders, isTie: leaders.length > 1 };

  // Tie → seeded random selection (no judge mechanic in simplified flow)
  let pendingElimination: string;
  if (leaders.length > 1) {
    const rng = createRng(state.seed + "-tiebreak-" + state.roundNumber);
    pendingElimination = rng.pick(leaders) as string;
  } else {
    pendingElimination = leaders[0];
  }

  return { ...state, voteResult, pendingElimination };
  // Phase stays "voting"; UI detects pendingElimination to show confirmation.
}

/** Offline: host picked someone directly — go straight to elimination_reveal. */
function handleAdminEliminate(state: UndercoverState, targetId: string): UndercoverState {
  if (state.phase !== "voting") return state;
  return processEliminationAndReveal(state, targetId);
}

/** Online: user confirmed the pending elimination. */
function handleConfirmElimination(state: UndercoverState, targetId: string): UndercoverState {
  if (state.phase !== "voting" || !state.pendingElimination) return state;
  return processEliminationAndReveal(state, targetId);
}

// ─── Shared Elimination Processing ───────────────────────────────────────────

function processEliminationAndReveal(
  state: UndercoverState,
  targetId: string
): UndercoverState {
  const result = processElimination(
    state.players,
    targetId,
    "vote",
    state.settings.specialCharacters
  );

  const updatedPlayers: UndercoverPlayer[] = result.players.map((p) => {
    if (result.eliminatedIds.includes(p.id) && p.eliminationRound === undefined) {
      return { ...p, eliminationRound: state.roundNumber };
    }
    return p;
  });

  let newState: UndercoverState = {
    ...state,
    players: updatedPlayers,
    eliminatedThisRound: [...state.eliminatedThisRound, ...result.eliminatedIds],
    pendingElimination: null,
    voteResult: null,
    events: [
      ...state.events,
      ...result.events.map((e) => ({
        type: "PLAYER_ELIMINATED" as const,
        payload: { playerId: e.playerId, reason: e.type, data: e.data },
        roundNumber: state.roundNumber,
        timestamp: Date.now(),
      })),
    ],
  };

  // Joy Fool check — bonus if eliminated in Round 1
  if (state.roundNumber === 1) {
    for (const eliminatedId of result.eliminatedIds) {
      const player = updatedPlayers.find((p) => p.id === eliminatedId);
      if (player?.specialCharacters.includes("joy_fool") && player.joyFoolActive) {
        newState = {
          ...newState,
          players: newState.players.map((p) =>
            p.id === eliminatedId
              ? { ...p, totalScore: parseFloat((p.totalScore + 4).toFixed(2)) }
              : p
          ),
        };
      }
    }
  }

  // Build elimination reveal (faction + role only — word is NOT shown mid-game)
  const eliminationReveal = result.eliminatedIds.map((id) => {
    const p = newState.players.find((pl) => pl.id === id)!;
    return {
      id: p.id,
      name: p.name,
      faction: p.faction,
      word: null as string | null, // word hidden until game_over
      specialCharacters: p.specialCharacters,
    };
  });

  return {
    ...newState,
    eliminationReveal,
    phase: "elimination_reveal",
    pendingRevenger: result.pendingRevengerId ?? null,
    pendingMrWhiteGuess: result.pendingMrWhiteIds[0] ?? null,
  };
}

// ─── Elimination Reveal → Next Phase ─────────────────────────────────────────

function handleContinueAfterReveal(state: UndercoverState): UndercoverState {
  if (state.phase !== "elimination_reveal") return state;

  const cleared: UndercoverState = { ...state, eliminationReveal: null };

  // Special character chains take priority
  if (cleared.pendingRevenger) return { ...cleared, phase: "revenger_pick" };
  if (cleared.pendingMrWhiteGuess) return { ...cleared, phase: "mr_white_guess" };

  return checkAndFinalize(cleared);
}

// ─── Revenger ─────────────────────────────────────────────────────────────────

function handleRevengerTarget(
  state: UndercoverState,
  revengerId: string,
  targetId: string
): UndercoverState {
  if (state.phase !== "revenger_pick") return state;
  if (state.pendingRevenger !== revengerId) return state;

  const result = processRevengerTarget(
    state.players,
    targetId,
    state.settings.specialCharacters
  );

  const updatedPlayers: UndercoverPlayer[] = result.players.map((p) => {
    if (result.eliminatedIds.includes(p.id) && p.eliminationRound === undefined) {
      return { ...p, eliminationRound: state.roundNumber };
    }
    return p;
  });

  const eliminationReveal = result.eliminatedIds.map((id) => {
    const p = updatedPlayers.find((pl) => pl.id === id)!;
    return {
      id: p.id,
      name: p.name,
      faction: p.faction,
      word: null as string | null,
      specialCharacters: p.specialCharacters,
    };
  });

  const newState: UndercoverState = {
    ...state,
    players: updatedPlayers,
    eliminatedThisRound: [...state.eliminatedThisRound, ...result.eliminatedIds],
    pendingRevenger: null,
    pendingMrWhiteGuess: result.pendingMrWhiteIds[0] ?? null,
    eliminationReveal,
    phase: "elimination_reveal",
    events: [
      ...state.events,
      {
        type: "REVENGER_TRIGGERED" as const,
        payload: { revengerId, targetId },
        roundNumber: state.roundNumber,
        timestamp: Date.now(),
      },
    ],
  };

  return newState;
}

// ─── Mr. White Guess ──────────────────────────────────────────────────────────

function handleMrWhiteGuess(
  state: UndercoverState,
  playerId: string,
  guess: string
): UndercoverState {
  if (state.phase !== "mr_white_guess") return state;
  if (state.pendingMrWhiteGuess !== playerId) return state;

  const civilianWord = state.civilianWord ?? "";
  const correct =
    guess.trim().toLowerCase() === civilianWord.trim().toLowerCase();

  if (correct) {
    const winCondition = {
      faction: "mr_white" as const,
      winnerIds: [playerId],
      summary: `Mr. White correctly guessed the Civilian word: "${civilianWord}"!`,
    };
    const { players: updatedPlayers, roundScores } = applyRoundScores(
      state.players,
      winCondition,
      [playerId],
      state.roundNumber
    );
    return {
      ...state,
      players: updatedPlayers,
      pendingMrWhiteGuess: null,
      winCondition,
      roundScores,
      phase: "game_over",
      events: [
        ...state.events,
        {
          type: "MR_WHITE_GUESS_CORRECT" as const,
          payload: { playerId, guess, civilianWord },
          roundNumber: state.roundNumber,
          timestamp: Date.now(),
        },
        {
          type: "WIN_CONDITION_MET" as const,
          payload: { faction: "mr_white", winnerId: playerId },
          roundNumber: state.roundNumber,
          timestamp: Date.now(),
        },
      ],
    };
  }

  // Incorrect — continue game
  return checkAndFinalize({ ...state, pendingMrWhiteGuess: null });
}

// ─── Win Check & Finalization ─────────────────────────────────────────────────

function checkAndFinalize(state: UndercoverState): UndercoverState {
  const winCondition = checkWinConditions(state.players);

  if (winCondition) {
    const survMrWhites = state.players
      .filter((p) => p.faction === "mr_white" && !p.isEliminated)
      .map((p) => p.id);
    const { players: updatedPlayers, roundScores } = applyRoundScores(
      state.players,
      winCondition,
      survMrWhites,
      state.roundNumber
    );
    return {
      ...state,
      players: updatedPlayers,
      winCondition,
      roundScores,
      phase: "game_over",
      events: [
        ...state.events,
        {
          type: "WIN_CONDITION_MET" as const,
          payload: { faction: winCondition.faction, winnerIds: winCondition.winnerIds },
          roundNumber: state.roundNumber,
          timestamp: Date.now(),
        },
      ],
    };
  }

  // No winner yet — advance to next round keeping same word pair
  return advanceRoundInPlace(state);
}

// ─── Round Advancement (same words, new turn order) ───────────────────────────

/**
 * Advances to the next round without changing the word pair.
 * Cards were dealt once at the start; players keep the same words.
 */
function advanceRoundInPlace(state: UndercoverState): UndercoverState {
  const newRound = state.roundNumber + 1;
  const rng = createRng(state.seed + "-round-" + newRound);

  const livingIds = state.players
    .filter((p) => !p.isEliminated)
    .map((p) => p.id);
  const shuffledIds = rng.shuffle(livingIds) as string[];

  // Deactivate Joy Fool if they survived Round 1
  const updatedPlayers = state.players.map((p) => {
    if (
      p.specialCharacters.includes("joy_fool") &&
      p.joyFoolActive &&
      !p.isEliminated &&
      newRound === 2
    ) {
      return { ...p, joyFoolActive: false };
    }
    return p;
  });

  return {
    ...state,
    roundNumber: newRound,
    phase: "clue_phase",       // Go straight to clue phase — no card_reveal, no round_result
    turnOrder: shuffledIds,
    players: updatedPlayers,
    currentClueIndex: 0,
    currentVoterIndex: 0,
    // clues are kept so later rounds can show previous-round history
    votes: {},
    voteResult: null,
    pendingElimination: null,
    eliminatedThisRound: [],
    pendingRevenger: null,
    pendingMrWhiteGuess: null,
    eliminationReveal: null,
    roundScores: [],
    // civilianWord, undercoverWord, currentWordPair, wordDeck — unchanged
    events: [
      ...state.events,
      {
        type: "ROUND_STARTED" as const,
        payload: { roundNumber: newRound },
        roundNumber: newRound,
        timestamp: Date.now(),
      },
    ],
  };
}
