/**
 * Cabo — Initial State Factory
 */

import type { GameConfig } from '@/game/core/types';
import { createRng } from '@/game/core/random';
import { createCaboDeck, DEFINITIONS_MAP } from './cardDefinitions';
import type { CaboState, CaboPlayer, CaboSlot, CaboCard } from './types';

export const CARDS_PER_PLAYER = 4;
export const DEFAULT_TARGET_SCORE = 50;
export const INITIAL_VISIBLE_SLOTS = 2; // players see slots 0 and 1

export function createInitialState(config: GameConfig, seed?: string): CaboState {
  const resolvedSeed = seed ?? `cabo-${Date.now()}`;
  const rng = createRng(resolvedSeed);

  // Build card instances
  const deckProto = createCaboDeck();
  const shuffledDeck = rng.shuffle(deckProto) as CaboCard[];

  // Build cards record
  const cards: Record<string, CaboCard> = {};
  for (const card of shuffledDeck) {
    cards[card.id] = card;
  }

  const numPlayers = config.players.length;

  // Create players with 4 slots each
  const players: CaboPlayer[] = config.players.map((p) => ({
    id: p.id,
    name: p.name,
    seat: p.seat,
    connected: true,
    slots: [0, 1, 2, 3].map((i) => ({
      id: `p-${p.id}-slot-${i}`,
      ownerId: p.id,
      cardId: null,
    })),
    cumulativeScore: 0,
    roundScore: null,
    hasTakenFinalTurn: false,
    calledCabo: false,
    memoryReady: false,
  }));

  // Deal 4 cards round-robin
  let deckPos = 0;
  for (let slotIdx = 0; slotIdx < CARDS_PER_PLAYER; slotIdx++) {
    for (let pIdx = 0; pIdx < numPlayers; pIdx++) {
      const card = shuffledDeck[deckPos++];
      players[pIdx].slots[slotIdx].cardId = card.id;
    }
  }

  // Remaining cards form the draw pile
  const deck = shuffledDeck.slice(deckPos).map((c) => c.id);

  // Start discard pile with one card from deck
  const firstDiscard = deck.shift()!;
  const discardPile = [firstDiscard];

  // Initial reveals: each player can see their first INITIAL_VISIBLE_SLOTS cards
  const reveals: Record<string, string[]> = {};
  for (const player of players) {
    reveals[player.id] = [];
    for (let i = 0; i < INITIAL_VISIBLE_SLOTS; i++) {
      const cardId = player.slots[i].cardId;
      if (cardId) reveals[player.id].push(cardId);
    }
  }

  return {
    phase: 'INITIAL_MEMORY',
    round: 1,
    players,
    cards,
    definitions: DEFINITIONS_MAP,
    deck,
    discardPile,
    currentPlayerIndex: 0,
    drawnCardId: null,
    drawnFromDiscard: false,
    specialPower: null,
    snapWindow: null,
    caboCallerId: null,
    finalTurnPlayerIds: [],
    finalTurnIndex: 0,
    reveals,
    targetScore: (config.options?.targetScore as number | undefined) ?? DEFAULT_TARGET_SCORE,
    seed: resolvedSeed,
    pausedByDisconnect: null,
    phaseBeforePause: null,
    gameWinner: null,
    roundRevealIndex: 0,
    lastEvent: null,
  };
}

/**
 * Create a fresh round state (preserving scores).
 */
export function createNextRoundState(state: CaboState): CaboState {
  const config: GameConfig = {
    players: state.players.map((p) => ({
      id: p.id,
      name: p.name,
      seat: p.seat,
      isHuman: true,
    })),
    options: { targetScore: state.targetScore },
  };

  const nextSeed = `${state.seed}-r${state.round + 1}`;
  const newState = createInitialState(config, nextSeed);

  // Preserve cumulative scores
  for (const player of newState.players) {
    const old = state.players.find((p) => p.id === player.id);
    if (old) {
      player.cumulativeScore = old.cumulativeScore;
    }
  }

  return {
    ...newState,
    round: state.round + 1,
  };
}
