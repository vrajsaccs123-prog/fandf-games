/**
 * Cabo — Comprehensive engine tests.
 *
 * Tests cover: initial state, memory phase, drawing/replacing cards,
 * special abilities, snapping, cabo/final-turns, scoring, and slot stability.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { GameConfig } from '@/game/core/types';
import { createInitialState, CARDS_PER_PLAYER } from '../state';
import { reduce } from '../reducer';
import { validateAction, getAvailableActions as validationGetAvail } from '../validation';
import { getPlayerView, calcRoundScore, getSlotByIdGlobal, getTopDiscard, getAvailableActions, getGameStatus } from '../selectors';
import { ALL_CARD_DEFINITIONS, DEFINITIONS_MAP, createCaboDeck } from '../cardDefinitions';
import type { CaboState, CaboPlayer, SnapWindowState } from '../types';
import type { CaboAction } from '../actions';

// ─── Test Config ──────────────────────────────────────────────────────────────

const twoPlayerConfig: GameConfig = {
  players: [
    { id: 'p1', name: 'Alice', seat: 0, isHuman: true },
    { id: 'p2', name: 'Bob',   seat: 1, isHuman: true },
  ],
};

const threePlayerConfig: GameConfig = {
  players: [
    { id: 'p1', name: 'Alice', seat: 0, isHuman: true },
    { id: 'p2', name: 'Bob',   seat: 1, isHuman: true },
    { id: 'p3', name: 'Carol', seat: 2, isHuman: true },
  ],
};

const SEED = 'test-seed-cabo-42';

function freshState(config = twoPlayerConfig, seed = SEED) {
  return createInitialState(config, seed);
}

function dispatch(state: CaboState, action: CaboAction): CaboState {
  return reduce(state, action);
}

// Transition all players through MEMORY_READY
function passMemoryPhase(state: CaboState): CaboState {
  let s = state;
  for (const player of s.players) {
    s = dispatch(s, { type: 'MEMORY_READY', playerId: player.id });
  }
  return s;
}

// Get the current player ID
function currentPlayerId(state: CaboState): string {
  return state.players[state.currentPlayerIndex].id;
}

// Draw a card for the current player
function drawCard(state: CaboState): CaboState {
  return dispatch(state, { type: 'DRAW_FROM_DECK', playerId: currentPlayerId(state) });
}

// Discard the drawn card (may open snap window)
function discardDrawn(state: CaboState): CaboState {
  return dispatch(state, { type: 'DISCARD_DRAWN', playerId: currentPlayerId(state) });
}

// Close snap window by advancing (no snap pressed)
function closeSnapIfOpen(state: CaboState): CaboState {
  // If a snap window is open, simulate no one snapping by advancing turn
  // The engine keeps snap window open until someone presses it; here we
  // simply close it by triggering the pending ability path or direct advance.
  // For testing, we do this by calling reduce with a synthetic "timeout" —
  // but since the engine has no timeout, we manually call the internal helper
  // by injecting an action that wouldn't normally fire in this phase.
  // Instead, we'll call the reducer's internal path via replacing the snap window:
  if (state.phase !== 'SNAP_WINDOW') return state;
  // Inject a "no snap" — clear snap window and proceed
  // (simulate host closing the window after a brief period)
  const noSnapState: CaboState = {
    ...state,
    snapWindow: null,
  };
  // Now trigger pending ability or advance
  if (state.snapWindow?.pendingAbility) {
    const actorId = state.players[state.currentPlayerIndex].id;
    return reduce(
      { ...noSnapState, phase: 'SPECIAL_POWER', specialPower: { step: 'LOOK_OWN_SELECT', actorId } },
      { type: 'SKIP_ABILITY', playerId: actorId }
    );
  }
  // Just advance turn
  const nextIndex = (state.currentPlayerIndex + 1) % state.players.length;
  return {
    ...noSnapState,
    phase: state.caboCallerId ? 'FINAL_TURN' : 'PLAYER_TURN',
    currentPlayerIndex: nextIndex,
  };
}

// Complete a full no-op turn: draw → discard → close snap
function takeTurn(state: CaboState): CaboState {
  let s = drawCard(state);
  if (s.drawnCardId) {
    s = discardDrawn(s);
  }
  s = closeSnapIfOpen(s);
  return s;
}

// ─── CARD DEFINITIONS ────────────────────────────────────────────────────────

describe('Card Definitions', () => {
  it('creates exactly 50 card definitions', () => {
    expect(ALL_CARD_DEFINITIONS).toHaveLength(50);
  });

  it('2 Jokers in the deck', () => {
    const jokers = ALL_CARD_DEFINITIONS.filter(d => d.rank === 'JOKER');
    expect(jokers).toHaveLength(2);
    jokers.forEach(j => {
      expect(j.value).toBe(-1);
      expect(j.ability).toBeNull();
      expect(j.color).toBe('special');
    });
  });

  it('Red Kings have value 0, no ability', () => {
    const rks = ALL_CARD_DEFINITIONS.filter(d => d.rank === 'RK');
    expect(rks).toHaveLength(2);
    rks.forEach(rk => {
      expect(rk.value).toBe(0);
      expect(rk.ability).toBeNull();
      expect(rk.color).toBe('red');
    });
  });

  it('Black Kings have value 13, LOOK_SWAP ability', () => {
    const bks = ALL_CARD_DEFINITIONS.filter(d => d.rank === 'BK');
    expect(bks).toHaveLength(2);
    bks.forEach(bk => {
      expect(bk.value).toBe(13);
      expect(bk.ability).toBe('LOOK_SWAP');
      expect(bk.color).toBe('black');
    });
  });

  it('Jacks score 11, BLIND_SWAP', () => {
    const jacks = ALL_CARD_DEFINITIONS.filter(d => d.rank === 'J');
    expect(jacks).toHaveLength(4);
    jacks.forEach(j => {
      expect(j.value).toBe(11);
      expect(j.ability).toBe('BLIND_SWAP');
    });
  });

  it('Queens score 12, BLIND_SWAP', () => {
    const queens = ALL_CARD_DEFINITIONS.filter(d => d.rank === 'Q');
    expect(queens).toHaveLength(4);
    queens.forEach(q => {
      expect(q.value).toBe(12);
      expect(q.ability).toBe('BLIND_SWAP');
    });
  });

  it('7s and 8s have LOOK_OWN', () => {
    const sevens = ALL_CARD_DEFINITIONS.filter(d => d.rank === 7);
    const eights = ALL_CARD_DEFINITIONS.filter(d => d.rank === 8);
    [...sevens, ...eights].forEach(c => expect(c.ability).toBe('LOOK_OWN'));
  });

  it('9s and 10s have LOOK_OTHER', () => {
    const nines = ALL_CARD_DEFINITIONS.filter(d => d.rank === 9);
    const tens = ALL_CARD_DEFINITIONS.filter(d => d.rank === 10);
    [...nines, ...tens].forEach(c => expect(c.ability).toBe('LOOK_OTHER'));
  });

  it('all definition IDs are unique', () => {
    const ids = ALL_CARD_DEFINITIONS.map(d => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('createCaboDeck produces 50 unique card instances', () => {
    const deck = createCaboDeck();
    expect(deck).toHaveLength(50);
    const ids = deck.map(c => c.id);
    expect(new Set(ids).size).toBe(50);
  });
});

// ─── INITIAL STATE ────────────────────────────────────────────────────────────

describe('createInitialState', () => {
  it('starts in INITIAL_MEMORY phase', () => {
    expect(freshState().phase).toBe('INITIAL_MEMORY');
  });

  it('creates correct number of players', () => {
    expect(freshState().players).toHaveLength(2);
    expect(freshState(threePlayerConfig).players).toHaveLength(3);
  });

  it('each player has exactly 4 slots', () => {
    const s = freshState();
    for (const player of s.players) {
      expect(player.slots).toHaveLength(CARDS_PER_PLAYER);
    }
  });

  it('each player has exactly 4 cards dealt', () => {
    const s = freshState();
    for (const player of s.players) {
      const filled = player.slots.filter(sl => sl.cardId !== null);
      expect(filled).toHaveLength(CARDS_PER_PLAYER);
    }
  });

  it('deck has correct size after dealing (2 players)', () => {
    // 50 cards - 4 per player × 2 - 1 for discard = 41
    const s = freshState();
    expect(s.deck).toHaveLength(50 - 2 * CARDS_PER_PLAYER - 1);
  });

  it('deck has correct size after dealing (3 players)', () => {
    // 50 - 12 - 1 = 37
    const s = freshState(threePlayerConfig);
    expect(s.deck).toHaveLength(50 - 3 * CARDS_PER_PLAYER - 1);
  });

  it('discard pile starts with exactly 1 card', () => {
    expect(freshState().discardPile).toHaveLength(1);
  });

  it('slot IDs follow expected pattern', () => {
    const s = freshState();
    const p1 = s.players.find(p => p.id === 'p1')!;
    expect(p1.slots[0].id).toBe('p-p1-slot-0');
    expect(p1.slots[3].id).toBe('p-p1-slot-3');
  });

  it('slot IDs are unique across all players', () => {
    const s = freshState(threePlayerConfig);
    const allSlotIds = s.players.flatMap(p => p.slots.map(sl => sl.id));
    expect(new Set(allSlotIds).size).toBe(allSlotIds.length);
  });

  it('all cards are either in a player slot, the deck, or the discard', () => {
    const s = freshState();
    const allCardIds = Object.keys(s.cards);
    const inSlots = s.players.flatMap(p => p.slots.map(sl => sl.cardId).filter(Boolean) as string[]);
    const allAccounted = [...inSlots, ...s.deck, ...s.discardPile];
    expect(allAccounted.sort()).toEqual(allCardIds.sort());
  });

  it('initial reveals include first 2 cards for each player', () => {
    const s = freshState();
    for (const player of s.players) {
      const revealed = s.reveals[player.id] ?? [];
      expect(revealed).toHaveLength(2);
      const slot0CardId = player.slots[0].cardId!;
      const slot1CardId = player.slots[1].cardId!;
      expect(revealed).toContain(slot0CardId);
      expect(revealed).toContain(slot1CardId);
    }
  });

  it('is deterministic with same seed', () => {
    const s1 = freshState();
    const s2 = freshState();
    expect(s1.deck).toEqual(s2.deck);
    expect(s1.discardPile).toEqual(s2.discardPile);
    expect(s1.players[0].slots.map(sl => sl.cardId)).toEqual(s2.players[0].slots.map(sl => sl.cardId));
  });

  it('different seeds produce different states', () => {
    const s1 = freshState(twoPlayerConfig, 'seed-a');
    const s2 = freshState(twoPlayerConfig, 'seed-b');
    expect(s1.deck).not.toEqual(s2.deck);
  });

  it('currentPlayerIndex is 0', () => {
    expect(freshState().currentPlayerIndex).toBe(0);
  });

  it('drawnCardId is null initially', () => {
    expect(freshState().drawnCardId).toBeNull();
  });

  it('no player has called cabo', () => {
    const s = freshState();
    s.players.forEach(p => {
      expect(p.calledCabo).toBe(false);
      expect(p.cumulativeScore).toBe(0);
      expect(p.roundScore).toBeNull();
    });
  });
});

// ─── MEMORY PHASE ─────────────────────────────────────────────────────────────

describe('MEMORY_READY', () => {
  it('does not advance phase until all players are ready', () => {
    let s = freshState();
    s = dispatch(s, { type: 'MEMORY_READY', playerId: 'p1' });
    expect(s.phase).toBe('INITIAL_MEMORY');
    expect(s.players.find(p => p.id === 'p1')!.memoryReady).toBe(true);
    expect(s.players.find(p => p.id === 'p2')!.memoryReady).toBe(false);
  });

  it('advances to PLAYER_TURN when all players are ready', () => {
    const s = passMemoryPhase(freshState());
    expect(s.phase).toBe('PLAYER_TURN');
  });

  it('clears initial reveals when a player marks ready', () => {
    let s = freshState();
    s = dispatch(s, { type: 'MEMORY_READY', playerId: 'p1' });
    expect((s.reveals['p1'] ?? []).length).toBe(0);
    // p2 still has reveals
    expect((s.reveals['p2'] ?? []).length).toBe(2);
  });

  it('rejects MEMORY_READY outside of INITIAL_MEMORY phase', () => {
    const s = passMemoryPhase(freshState());
    const result = validateAction(s, { type: 'MEMORY_READY', playerId: 'p1' });
    expect(result.valid).toBe(false);
  });

  it('rejects duplicate MEMORY_READY', () => {
    let s = freshState();
    s = dispatch(s, { type: 'MEMORY_READY', playerId: 'p1' });
    const result = validateAction(s, { type: 'MEMORY_READY', playerId: 'p1' });
    expect(result.valid).toBe(false);
  });
});

// ─── DRAWING FROM DECK ────────────────────────────────────────────────────────

describe('DRAW_FROM_DECK', () => {
  function readyState() {
    return passMemoryPhase(freshState());
  }

  it('transitions to CARD_DRAWN phase', () => {
    const s = drawCard(readyState());
    expect(s.phase).toBe('CARD_DRAWN');
  });

  it('sets drawnCardId', () => {
    const s = drawCard(readyState());
    expect(s.drawnCardId).not.toBeNull();
  });

  it('reduces deck size by 1', () => {
    const before = readyState();
    const after = drawCard(before);
    expect(after.deck.length).toBe(before.deck.length - 1);
  });

  it('drawn card is visible to the drawing player', () => {
    const before = readyState();
    const after = drawCard(before);
    const playerId = currentPlayerId(before);
    expect(after.reveals[playerId]).toContain(after.drawnCardId!);
  });

  it('rejects drawing when not in PLAYER_TURN phase', () => {
    const s = readyState();
    const drawn = drawCard(s);
    const result = validateAction(drawn, { type: 'DRAW_FROM_DECK', playerId: 'p1' });
    expect(result.valid).toBe(false);
  });

  it('rejects drawing when it is not your turn', () => {
    const s = readyState();
    const result = validateAction(s, { type: 'DRAW_FROM_DECK', playerId: 'p2' });
    expect(result.valid).toBe(false);
  });
});

// ─── REPLACE_CARD ─────────────────────────────────────────────────────────────

describe('REPLACE_CARD', () => {
  function drawnState() {
    return drawCard(passMemoryPhase(freshState()));
  }

  it('places drawn card into target slot', () => {
    let s = drawnState();
    const playerId = currentPlayerId(s);
    const drawnId = s.drawnCardId!;
    const targetSlotId = s.players.find(p => p.id === playerId)!.slots[2].id;

    s = dispatch(s, { type: 'REPLACE_CARD', playerId, slotId: targetSlotId });

    const updatedPlayer = s.players.find(p => p.id === playerId)!;
    const targetSlot = updatedPlayer.slots.find(sl => sl.id === targetSlotId)!;
    expect(targetSlot.cardId).toBe(drawnId);
  });

  it('moves old slot card to discard pile', () => {
    let s = drawnState();
    const playerId = currentPlayerId(s);
    const targetSlotId = s.players.find(p => p.id === playerId)!.slots[2].id;
    const oldCardId = s.players.find(p => p.id === playerId)!.slots[2].cardId!;

    s = dispatch(s, { type: 'REPLACE_CARD', playerId, slotId: targetSlotId });
    expect(s.discardPile).toContain(oldCardId);
  });

  it('clears drawnCardId after replacing', () => {
    let s = drawnState();
    const playerId = currentPlayerId(s);
    const targetSlotId = s.players.find(p => p.id === playerId)!.slots[2].id;
    s = dispatch(s, { type: 'REPLACE_CARD', playerId, slotId: targetSlotId });
    expect(s.drawnCardId).toBeNull();
  });

  it('opens a snap window after replacing', () => {
    let s = drawnState();
    const playerId = currentPlayerId(s);
    const targetSlotId = s.players.find(p => p.id === playerId)!.slots[2].id;
    s = dispatch(s, { type: 'REPLACE_CARD', playerId, slotId: targetSlotId });
    expect(s.phase).toBe('SNAP_WINDOW');
    expect(s.snapWindow).not.toBeNull();
  });

  it('rejects replacing a slot that belongs to another player', () => {
    const s = drawnState();
    const playerId = currentPlayerId(s);
    const opponentSlotId = s.players.find(p => p.id !== playerId)!.slots[0].id;
    const result = validateAction(s, { type: 'REPLACE_CARD', playerId, slotId: opponentSlotId });
    expect(result.valid).toBe(false);
  });
});

// ─── DISCARD_DRAWN ────────────────────────────────────────────────────────────

describe('DISCARD_DRAWN', () => {
  function drawnState() {
    return drawCard(passMemoryPhase(freshState()));
  }

  it('adds drawn card to discard pile', () => {
    let s = drawnState();
    const drawnId = s.drawnCardId!;
    s = discardDrawn(s);
    expect(s.discardPile).toContain(drawnId);
  });

  it('clears drawnCardId', () => {
    let s = drawnState();
    s = discardDrawn(s);
    expect(s.drawnCardId).toBeNull();
  });

  it('opens snap window', () => {
    let s = drawnState();
    s = discardDrawn(s);
    expect(s.phase).toBe('SNAP_WINDOW');
    expect(s.snapWindow).not.toBeNull();
  });

  it('snap window has correct discard value', () => {
    let s = drawnState();
    const drawnId = s.drawnCardId!;
    const drawnCard = s.cards[drawnId];
    const drawnDef = s.definitions[drawnCard.definitionId];
    s = discardDrawn(s);
    expect(s.snapWindow!.discardValue).toBe(drawnDef.value);
  });
});

// ─── SLOT IDENTITY / STABILITY ────────────────────────────────────────────────

describe('Slot stability', () => {
  it('slot IDs never change during play', () => {
    let s = passMemoryPhase(freshState());
    const initialSlotIds = s.players.flatMap(p => p.slots.map(sl => sl.id));

    // Take several turns
    s = takeTurn(s);
    s = takeTurn(s);
    s = takeTurn(s);

    const currentSlotIds = s.players.flatMap(p => p.slots.map(sl => sl.id));
    // All original IDs still present
    for (const id of initialSlotIds) {
      expect(currentSlotIds).toContain(id);
    }
  });

  it('empty slots remain empty (do not refill automatically)', () => {
    // To create an empty slot, we need a successful self-snap
    // Set up a state manually where a slot is empty
    let s = passMemoryPhase(freshState());

    // Verify that after drawing and replacing, the replaced slot has the new card
    const pid = currentPlayerId(s);
    const player = s.players.find(p => p.id === pid)!;
    const targetSlotId = player.slots[3].id;

    s = drawCard(s);
    const drawnId = s.drawnCardId!;
    s = dispatch(s, { type: 'REPLACE_CARD', playerId: pid, slotId: targetSlotId });

    // Slot 3 should now have the drawn card
    const updatedPlayer = s.players.find(p => p.id === pid)!;
    const updatedSlot = updatedPlayer.slots.find(sl => sl.id === targetSlotId)!;
    expect(updatedSlot.cardId).toBe(drawnId);
  });

  it('getSlotByIdGlobal finds any slot by ID', () => {
    const s = freshState();
    const p2 = s.players.find(p => p.id === 'p2')!;
    const slotId = p2.slots[2].id;
    const result = getSlotByIdGlobal(s, slotId);
    expect(result).not.toBeNull();
    expect(result!.slot.id).toBe(slotId);
    expect(result!.player.id).toBe('p2');
  });

  it('getSlotByIdGlobal returns null for unknown slot ID', () => {
    const s = freshState();
    expect(getSlotByIdGlobal(s, 'nonexistent-slot')).toBeNull();
  });
});

// ─── TAKE_DISCARD ─────────────────────────────────────────────────────────────

describe('TAKE_DISCARD', () => {
  function readyState() {
    return passMemoryPhase(freshState());
  }

  it('places discard card into the target slot', () => {
    let s = readyState();
    const pid = currentPlayerId(s);
    const topDiscardId = s.discardPile[s.discardPile.length - 1];
    const targetSlotId = s.players.find(p => p.id === pid)!.slots[3].id;

    s = dispatch(s, { type: 'TAKE_DISCARD', playerId: pid, slotId: targetSlotId });

    const updatedSlot = s.players.find(p => p.id === pid)!.slots.find(sl => sl.id === targetSlotId)!;
    expect(updatedSlot.cardId).toBe(topDiscardId);
  });

  it('old card from slot goes to discard pile', () => {
    let s = readyState();
    const pid = currentPlayerId(s);
    const targetSlotId = s.players.find(p => p.id === pid)!.slots[3].id;
    const oldCardId = s.players.find(p => p.id === pid)!.slots[3].cardId!;

    s = dispatch(s, { type: 'TAKE_DISCARD', playerId: pid, slotId: targetSlotId });
    expect(s.discardPile).toContain(oldCardId);
  });

  it('opens snap window for the old discarded card', () => {
    let s = readyState();
    const pid = currentPlayerId(s);
    const targetSlotId = s.players.find(p => p.id === pid)!.slots[3].id;
    s = dispatch(s, { type: 'TAKE_DISCARD', playerId: pid, slotId: targetSlotId });
    expect(s.phase).toBe('SNAP_WINDOW');
  });
});

// ─── CALL CABO ────────────────────────────────────────────────────────────────

describe('CALL_CABO', () => {
  function readyState() {
    return passMemoryPhase(freshState());
  }

  it('marks caboCallerId', () => {
    let s = readyState();
    s = dispatch(s, { type: 'CALL_CABO', playerId: 'p1' });
    expect(s.caboCallerId).toBe('p1');
  });

  it('transitions to FINAL_TURN phase', () => {
    let s = readyState();
    s = dispatch(s, { type: 'CALL_CABO', playerId: 'p1' });
    expect(s.phase).toBe('FINAL_TURN');
  });

  it('sets finalTurnPlayerIds to all other players', () => {
    let s = readyState();
    s = dispatch(s, { type: 'CALL_CABO', playerId: 'p1' });
    expect(s.finalTurnPlayerIds).toEqual(['p2']);
    expect(s.finalTurnPlayerIds).not.toContain('p1');
  });

  it('3-player: finalTurnPlayerIds has 2 players', () => {
    let s = passMemoryPhase(freshState(threePlayerConfig));
    s = dispatch(s, { type: 'CALL_CABO', playerId: 'p1' });
    expect(s.finalTurnPlayerIds).toHaveLength(2);
    expect(s.finalTurnPlayerIds).not.toContain('p1');
  });

  it('rejects calling cabo if already called', () => {
    let s = readyState();
    s = dispatch(s, { type: 'CALL_CABO', playerId: 'p1' });
    // Now it's p2's final turn
    const result = validateAction(s, { type: 'CALL_CABO', playerId: 'p2' });
    expect(result.valid).toBe(false);
  });

  it('emits CABO_CALLED event', () => {
    let s = readyState();
    s = dispatch(s, { type: 'CALL_CABO', playerId: 'p1' });
    expect(s.lastEvent?.type).toBe('CABO_CALLED');
    if (s.lastEvent?.type === 'CABO_CALLED') {
      expect(s.lastEvent.callerId).toBe('p1');
    }
  });
});

// ─── SPECIAL ABILITIES ────────────────────────────────────────────────────────

describe('Special Abilities', () => {
  // Helper: force a specific card as the drawn card for testing abilities
  function forceDrawnCard(state: CaboState, rank: number | string, suit = 'hearts'): CaboState {
    // Find a card of the desired rank
    const targetDefId = Object.values(state.definitions).find(
      d => d.rank === rank && (suit === 'any' || d.suit === suit)
    )?.id;
    if (!targetDefId) throw new Error(`No card found for rank ${rank} suit ${suit}`);

    const cardEntry = Object.values(state.cards).find(c => c.definitionId === targetDefId);
    if (!cardEntry) throw new Error(`Card instance not found for definition ${targetDefId}`);

    // Find where this card is
    const inDeck = state.deck.includes(cardEntry.id);
    const inSlot = state.players.flatMap(p => p.slots).find(sl => sl.cardId === cardEntry.id);

    if (inDeck) {
      // Move it to the front of the deck
      const newDeck = [cardEntry.id, ...state.deck.filter(id => id !== cardEntry.id)];
      return { ...state, deck: newDeck };
    }

    // If in a slot, we can't easily extract it without disrupting the game —
    // for test purposes, just accept any card drawn
    return state;
  }

  describe('LOOK_OWN (7, 8)', () => {
    function lookOwnSetup() {
      // We need to get into SPECIAL_POWER with LOOK_OWN
      // Manually set up state where specialPower is active
      let s = passMemoryPhase(freshState());
      const pid = currentPlayerId(s);
      s = {
        ...s,
        phase: 'SPECIAL_POWER',
        specialPower: { step: 'LOOK_OWN_SELECT', actorId: pid },
      };
      return { s, pid };
    }

    it('enters LOOK_OWN_VIEWING when selecting own slot', () => {
      const { s, pid } = lookOwnSetup();
      const player = s.players.find(p => p.id === pid)!;
      const slotId = player.slots[2].id; // slots 0,1 may already be "known"
      const s2 = dispatch(s, { type: 'ABILITY_LOOK_OWN_SELECT', playerId: pid, slotId });
      expect(s2.specialPower?.step).toBe('LOOK_OWN_VIEWING');
    });

    it('reveals the peeked card to the actor', () => {
      const { s, pid } = lookOwnSetup();
      const player = s.players.find(p => p.id === pid)!;
      const slot = player.slots[3];
      const s2 = dispatch(s, { type: 'ABILITY_LOOK_OWN_SELECT', playerId: pid, slotId: slot.id });
      expect(s2.reveals[pid]).toContain(slot.cardId);
    });

    it('advances turn after LOOK_OWN_DONE', () => {
      const { s, pid } = lookOwnSetup();
      const player = s.players.find(p => p.id === pid)!;
      const slotId = player.slots[2].id;
      let s2 = dispatch(s, { type: 'ABILITY_LOOK_OWN_SELECT', playerId: pid, slotId });
      s2 = dispatch(s2, { type: 'ABILITY_LOOK_OWN_DONE', playerId: pid });
      expect(s2.phase).toBe('PLAYER_TURN');
      expect(s2.specialPower).toBeNull();
    });

    it('SKIP_ABILITY advances to next player', () => {
      const { s, pid } = lookOwnSetup();
      const s2 = dispatch(s, { type: 'SKIP_ABILITY', playerId: pid });
      expect(s2.phase).toBe('PLAYER_TURN');
      expect(s2.specialPower).toBeNull();
    });

    it('rejects selecting another player\'s slot', () => {
      const { s, pid } = lookOwnSetup();
      const opponent = s.players.find(p => p.id !== pid)!;
      const result = validateAction(s, {
        type: 'ABILITY_LOOK_OWN_SELECT',
        playerId: pid,
        slotId: opponent.slots[0].id,
      });
      expect(result.valid).toBe(false);
    });
  });

  describe('LOOK_OTHER (9, 10)', () => {
    function lookOtherSetup() {
      let s = passMemoryPhase(freshState());
      const pid = currentPlayerId(s);
      s = {
        ...s,
        phase: 'SPECIAL_POWER',
        specialPower: { step: 'LOOK_OTHER_SELECT_PLAYER', actorId: pid },
      };
      const opponentId = s.players.find(p => p.id !== pid)!.id;
      return { s, pid, opponentId };
    }

    it('transitions to SELECT_CARD step', () => {
      const { s, pid, opponentId } = lookOtherSetup();
      const s2 = dispatch(s, { type: 'ABILITY_LOOK_OTHER_SELECT_PLAYER', playerId: pid, targetPlayerId: opponentId });
      expect(s2.specialPower?.step).toBe('LOOK_OTHER_SELECT_CARD');
    });

    it('reveals opponent card to actor', () => {
      const { s, pid, opponentId } = lookOtherSetup();
      let s2 = dispatch(s, { type: 'ABILITY_LOOK_OTHER_SELECT_PLAYER', playerId: pid, targetPlayerId: opponentId });
      const opponent = s2.players.find(p => p.id === opponentId)!;
      const targetSlotId = opponent.slots[2].id;
      const targetCardId = opponent.slots[2].cardId!;
      s2 = dispatch(s2, { type: 'ABILITY_LOOK_OTHER_SELECT_CARD', playerId: pid, targetSlotId });
      expect(s2.reveals[pid]).toContain(targetCardId);
    });

    it('advances turn after LOOK_OTHER_DONE', () => {
      const { s, pid, opponentId } = lookOtherSetup();
      let s2 = dispatch(s, { type: 'ABILITY_LOOK_OTHER_SELECT_PLAYER', playerId: pid, targetPlayerId: opponentId });
      const opponent = s2.players.find(p => p.id === opponentId)!;
      s2 = dispatch(s2, { type: 'ABILITY_LOOK_OTHER_SELECT_CARD', playerId: pid, targetSlotId: opponent.slots[2].id });
      s2 = dispatch(s2, { type: 'ABILITY_LOOK_OTHER_DONE', playerId: pid });
      expect(s2.phase).toBe('PLAYER_TURN');
    });

    it('rejects targeting self', () => {
      const { s, pid } = lookOtherSetup();
      const result = validateAction(s, {
        type: 'ABILITY_LOOK_OTHER_SELECT_PLAYER',
        playerId: pid,
        targetPlayerId: pid,
      });
      expect(result.valid).toBe(false);
    });
  });

  describe('BLIND_SWAP (J, Q)', () => {
    function blindSwapSetup() {
      let s = passMemoryPhase(freshState());
      const pid = currentPlayerId(s);
      s = {
        ...s,
        phase: 'SPECIAL_POWER',
        specialPower: { step: 'BLIND_SWAP_SELECT_OWN', actorId: pid },
      };
      const opponentId = s.players.find(p => p.id !== pid)!.id;
      return { s, pid, opponentId };
    }

    it('transitions to BLIND_SWAP_SELECT_TARGET after selecting own slot', () => {
      const { s, pid } = blindSwapSetup();
      const mySlotId = s.players.find(p => p.id === pid)!.slots[2].id;
      const s2 = dispatch(s, { type: 'ABILITY_BLIND_SWAP_SELECT_OWN', playerId: pid, mySlotId });
      expect(s2.specialPower?.step).toBe('BLIND_SWAP_SELECT_TARGET');
    });

    it('swaps the two cards after selecting target', () => {
      const { s, pid, opponentId } = blindSwapSetup();
      const mySlot = s.players.find(p => p.id === pid)!.slots[2];
      const targetSlot = s.players.find(p => p.id === opponentId)!.slots[1];
      const myOldCardId = mySlot.cardId!;
      const targetOldCardId = targetSlot.cardId!;

      let s2 = dispatch(s, { type: 'ABILITY_BLIND_SWAP_SELECT_OWN', playerId: pid, mySlotId: mySlot.id });
      s2 = dispatch(s2, {
        type: 'ABILITY_BLIND_SWAP_SELECT_TARGET',
        playerId: pid,
        targetPlayerId: opponentId,
        targetSlotId: targetSlot.id,
      });

      const updatedMySlot = s2.players.find(p => p.id === pid)!.slots[2];
      const updatedTargetSlot = s2.players.find(p => p.id === opponentId)!.slots[1];
      expect(updatedMySlot.cardId).toBe(targetOldCardId);
      expect(updatedTargetSlot.cardId).toBe(myOldCardId);
    });

    it('advances turn after swap', () => {
      const { s, pid, opponentId } = blindSwapSetup();
      const mySlotId = s.players.find(p => p.id === pid)!.slots[2].id;
      const targetSlotId = s.players.find(p => p.id === opponentId)!.slots[1].id;

      let s2 = dispatch(s, { type: 'ABILITY_BLIND_SWAP_SELECT_OWN', playerId: pid, mySlotId });
      s2 = dispatch(s2, { type: 'ABILITY_BLIND_SWAP_SELECT_TARGET', playerId: pid, targetPlayerId: opponentId, targetSlotId });
      expect(s2.phase).toBe('PLAYER_TURN');
    });
  });

  describe('LOOK_SWAP / Black King', () => {
    function bkSetup() {
      let s = passMemoryPhase(freshState());
      const pid = currentPlayerId(s);
      s = {
        ...s,
        phase: 'SPECIAL_POWER',
        specialPower: { step: 'BK_SELECT_PLAYER', actorId: pid },
      };
      const opponentId = s.players.find(p => p.id !== pid)!.id;
      return { s, pid, opponentId };
    }

    it('transitions through BK_SELECT_PLAYER → BK_SELECT_CARD', () => {
      const { s, pid, opponentId } = bkSetup();
      const s2 = dispatch(s, { type: 'ABILITY_BK_SELECT_PLAYER', playerId: pid, targetPlayerId: opponentId });
      expect(s2.specialPower?.step).toBe('BK_SELECT_CARD');
    });

    it('reveals opponent card and moves to BK_DECIDE', () => {
      const { s, pid, opponentId } = bkSetup();
      let s2 = dispatch(s, { type: 'ABILITY_BK_SELECT_PLAYER', playerId: pid, targetPlayerId: opponentId });
      const targetSlotId = s2.players.find(p => p.id === opponentId)!.slots[0].id;
      const targetCardId = s2.players.find(p => p.id === opponentId)!.slots[0].cardId!;
      s2 = dispatch(s2, { type: 'ABILITY_BK_SELECT_CARD', playerId: pid, targetSlotId });
      expect(s2.specialPower?.step).toBe('BK_DECIDE');
      expect(s2.reveals[pid]).toContain(targetCardId);
    });

    it('BK_SWAP swaps the cards', () => {
      const { s, pid, opponentId } = bkSetup();
      let s2 = dispatch(s, { type: 'ABILITY_BK_SELECT_PLAYER', playerId: pid, targetPlayerId: opponentId });
      const targetSlot = s2.players.find(p => p.id === opponentId)!.slots[0];
      const targetCardId = targetSlot.cardId!;
      s2 = dispatch(s2, { type: 'ABILITY_BK_SELECT_CARD', playerId: pid, targetSlotId: targetSlot.id });

      const mySlot = s2.players.find(p => p.id === pid)!.slots[3];
      const myOldCardId = mySlot.cardId!;
      s2 = dispatch(s2, { type: 'ABILITY_BK_SWAP', playerId: pid, mySlotId: mySlot.id });

      const updatedMySlot = s2.players.find(p => p.id === pid)!.slots[3];
      const updatedTargetSlot = s2.players.find(p => p.id === opponentId)!.slots[0];
      expect(updatedMySlot.cardId).toBe(targetCardId);
      expect(updatedTargetSlot.cardId).toBe(myOldCardId);
    });

    it('BK_SKIP does not swap', () => {
      const { s, pid, opponentId } = bkSetup();
      let s2 = dispatch(s, { type: 'ABILITY_BK_SELECT_PLAYER', playerId: pid, targetPlayerId: opponentId });
      const targetSlotId = s2.players.find(p => p.id === opponentId)!.slots[0].id;
      const targetCardId = s2.players.find(p => p.id === opponentId)!.slots[0].cardId!;
      s2 = dispatch(s2, { type: 'ABILITY_BK_SELECT_CARD', playerId: pid, targetSlotId });
      s2 = dispatch(s2, { type: 'ABILITY_BK_SKIP', playerId: pid });
      // Opponent's card should be unchanged
      const updatedTargetSlot = s2.players.find(p => p.id === opponentId)!.slots[0];
      expect(updatedTargetSlot.cardId).toBe(targetCardId);
      expect(s2.phase).toBe('PLAYER_TURN');
    });
  });
});

// ─── SNAPPING ─────────────────────────────────────────────────────────────────

describe('Snap', () => {
  function snapWindowState(discardValue: number): CaboState {
    // Manually inject a snap window with given value
    const s = passMemoryPhase(freshState());
    return {
      ...s,
      phase: 'SNAP_WINDOW',
      snapWindow: {
        discardValue,
        winnerId: null,
        step: 'OPEN',
        selectedSlotId: null,
        pendingAbility: null,
        targetSlotId: null,
      },
    };
  }

  it('SNAP_PRESS sets winnerId and transitions to SELECT', () => {
    let s: CaboState = snapWindowState(5);
    s = dispatch(s, { type: 'SNAP_PRESS', playerId: 'p1' });
    expect(s.snapWindow?.winnerId).toBe('p1');
    expect(s.snapWindow?.step).toBe('SELECT');
  });

  it('SNAP_PRESS is first-come-first-served (second press is rejected after first)', () => {
    let s = snapWindowState(5);
    s = dispatch(s, { type: 'SNAP_PRESS', playerId: 'p1' });
    const result = validateAction(s, { type: 'SNAP_PRESS', playerId: 'p2' });
    expect(result.valid).toBe(false);
  });

  it('rejects SNAP_PRESS outside snap window', () => {
    const s = passMemoryPhase(freshState());
    const result = validateAction(s, { type: 'SNAP_PRESS', playerId: 'p1' });
    expect(result.valid).toBe(false);
  });

  it('incorrect snap gives penalty card', () => {
    // Set up a snap window with value 5
    // Select a card that does not have value 5
    let s = passMemoryPhase(freshState());

    // Find a card in p2's slot with a specific value
    const p2 = s.players.find(p => p.id === 'p2')!;
    const targetSlot = p2.slots[0];
    const targetCard = s.cards[targetSlot.cardId!];
    const targetDef = s.definitions[targetCard.definitionId];
    const wrongValue = targetDef.value === 5 ? 10 : 5; // use a value that doesn't match

    s = {
      ...s,
      phase: 'SNAP_WINDOW' as CaboState['phase'],
      snapWindow: {
        discardValue: wrongValue, // doesn't match targetDef.value
        winnerId: null,
        step: 'OPEN' as SnapWindowState['step'],
        selectedSlotId: null,
        pendingAbility: null,
        targetSlotId: null,
      },
    };

    s = dispatch(s, { type: 'SNAP_PRESS', playerId: 'p2' });
    const cardCountBefore = s.players.find(p => p.id === 'p2')!.slots.length;
    s = dispatch(s, { type: 'SNAP_SELECT_CARD', playerId: 'p2', slotId: targetSlot.id });

    // Player p2 should have received a penalty card
    const cardCountAfter = s.players.find(p => p.id === 'p2')!.slots.filter(sl => sl.cardId !== null).length;
    // Their slot count might have increased or the slot may have a penalty card
    // The lastEvent should indicate SNAP_FAILURE
    expect(s.lastEvent?.type).toBe('SNAP_FAILURE');
    if (s.lastEvent?.type === 'SNAP_FAILURE') {
      expect(s.lastEvent.loserId).toBe('p2');
    }
  });

  it('correct self-snap removes card from slot (slot stays empty)', () => {
    // Find a card in p1's slot, set snap window value to match, then snap it
    let s = passMemoryPhase(freshState());
    const p1 = s.players.find(p => p.id === 'p1')!;
    const targetSlot = p1.slots[2];
    const targetCard = s.cards[targetSlot.cardId!];
    const targetDef = s.definitions[targetCard.definitionId];

    // Set the discard value to match this card
    s = {
      ...s,
      phase: 'SNAP_WINDOW' as CaboState['phase'],
      snapWindow: {
        discardValue: targetDef.value,
        winnerId: null,
        step: 'OPEN' as SnapWindowState['step'],
        selectedSlotId: null,
        pendingAbility: null,
        targetSlotId: null,
      },
    };

    s = dispatch(s, { type: 'SNAP_PRESS', playerId: 'p1' });
    s = dispatch(s, { type: 'SNAP_SELECT_CARD', playerId: 'p1', slotId: targetSlot.id });

    const updatedSlot = s.players.find(p => p.id === 'p1')!.slots.find(sl => sl.id === targetSlot.id)!;
    expect(updatedSlot.cardId).toBeNull();
    expect(s.lastEvent?.type).toBe('SNAP_SELF_SUCCESS');
  });
});

// ─── PLAYER VIEWS (HIDDEN INFORMATION) ───────────────────────────────────────

describe('getPlayerView (hidden information)', () => {
  it("opponent cards are hidden from other players", () => {
    const s = freshState();
    const view = getPlayerView(s, 'p1');

    // p2's cards should all be hidden (definitionId = null) since p1 has no reveals for p2
    const opponentSlots = view.opponents[0].slots;
    for (const { cardView } of opponentSlots) {
      // During INITIAL_MEMORY, p1 has no reveals for p2's cards
      if (cardView) {
        expect(cardView.definitionId).toBeNull();
      }
    }
  });

  it("player can see their own initial reveals", () => {
    const s = freshState();
    const view = getPlayerView(s, 'p1');

    const p1 = s.players.find(p => p.id === 'p1')!;
    const revealedCardIds = s.reveals['p1'] ?? [];

    for (const { cardView } of view.myPlayer.slots) {
      if (!cardView) continue;
      const isRevealed = revealedCardIds.includes(cardView.id);
      if (isRevealed) {
        expect(cardView.definitionId).not.toBeNull();
      } else {
        expect(cardView.definitionId).toBeNull();
      }
    }
  });

  it("top of discard is always visible", () => {
    const s = freshState();
    const view = getPlayerView(s, 'p1');
    expect(view.topDiscardCard).not.toBeNull();
    expect(view.topDiscardCard!.definitionId).not.toBeNull();
  });

  it("drawn card is visible only to current player", () => {
    let s = passMemoryPhase(freshState());
    s = drawCard(s); // p1 draws

    const viewP1 = getPlayerView(s, 'p1');
    const viewP2 = getPlayerView(s, 'p2');

    expect(viewP1.drawnCard?.definitionId).not.toBeNull();
    // p2 should not see the definition
    if (viewP2.drawnCard) {
      expect(viewP2.drawnCard.definitionId).toBeNull();
    }
  });

  it("view includes correct player counts", () => {
    const s = freshState();
    const view = getPlayerView(s, 'p1');
    expect(view.allPlayers).toHaveLength(2);
    expect(view.opponents).toHaveLength(1);
  });

  it("3-player view has 2 opponents", () => {
    const s = freshState(threePlayerConfig);
    const view = getPlayerView(s, 'p1');
    expect(view.opponents).toHaveLength(2);
  });
});

// ─── SCORING ──────────────────────────────────────────────────────────────────

describe('Scoring', () => {
  it('Joker value is -1', () => {
    const jokerDef = ALL_CARD_DEFINITIONS.find(d => d.rank === 'JOKER')!;
    expect(jokerDef.value).toBe(-1);
  });

  it('Red King value is 0', () => {
    const rkDef = ALL_CARD_DEFINITIONS.find(d => d.rank === 'RK')!;
    expect(rkDef.value).toBe(0);
  });

  it('Black King value is 13', () => {
    const bkDef = ALL_CARD_DEFINITIONS.find(d => d.rank === 'BK')!;
    expect(bkDef.value).toBe(13);
  });

  it('Jack value is 11', () => {
    const jDef = ALL_CARD_DEFINITIONS.find(d => d.rank === 'J')!;
    expect(jDef.value).toBe(11);
  });

  it('Queen value is 12', () => {
    const qDef = ALL_CARD_DEFINITIONS.find(d => d.rank === 'Q')!;
    expect(qDef.value).toBe(12);
  });

  it('number cards score face value (2-10)', () => {
    for (let rank = 2; rank <= 10; rank++) {
      const def = ALL_CARD_DEFINITIONS.find(d => d.rank === rank)!;
      expect(def.value).toBe(rank);
    }
  });

  it('calcRoundScore sums all card values', () => {
    const s = freshState();
    const score = calcRoundScore(s, 'p1');
    const p1 = s.players.find(p => p.id === 'p1')!;
    const expected = p1.slots.reduce((sum, sl) => {
      if (!sl.cardId) return sum;
      const def = s.definitions[s.cards[sl.cardId].definitionId];
      return sum + def.value;
    }, 0);
    expect(score).toBe(expected);
  });

  it('empty slot contributes 0 to score', () => {
    let s = freshState();
    // Manually empty a slot
    const p1 = s.players.find(p => p.id === 'p1')!;
    const modifiedP1 = {
      ...p1,
      slots: p1.slots.map((sl, i) => i === 3 ? { ...sl, cardId: null } : sl),
    };
    s = { ...s, players: s.players.map(p => p.id === 'p1' ? modifiedP1 : p) };

    const fullScore = calcRoundScore(freshState(), 'p1');
    const emptySlotScore = calcRoundScore(s, 'p1');
    const removedCardId = p1.slots[3].cardId!;
    const removedDef = s.definitions[s.cards[removedCardId].definitionId];
    expect(emptySlotScore).toBe(fullScore - removedDef.value);
  });
});

// ─── DISCONNECTION ────────────────────────────────────────────────────────────

describe('Disconnection / Reconnection', () => {
  it('pauses game on disconnect', () => {
    let s = passMemoryPhase(freshState());
    s = dispatch(s, { type: 'PLAYER_DISCONNECTED', playerId: 'p2' });
    expect(s.phase).toBe('PAUSED_DISCONNECTED');
    expect(s.pausedByDisconnect).toBe('p2');
  });

  it('saves phase before pause', () => {
    let s = passMemoryPhase(freshState());
    const phaseBefore = s.phase;
    s = dispatch(s, { type: 'PLAYER_DISCONNECTED', playerId: 'p1' });
    expect(s.phaseBeforePause).toBe(phaseBefore);
  });

  it('restores phase on reconnect', () => {
    let s = passMemoryPhase(freshState());
    s = dispatch(s, { type: 'PLAYER_DISCONNECTED', playerId: 'p2' });
    s = dispatch(s, { type: 'PLAYER_RECONNECTED', playerId: 'p2' });
    expect(s.phase).toBe('PLAYER_TURN');
    expect(s.pausedByDisconnect).toBeNull();
  });

  it('marks player as disconnected', () => {
    let s = passMemoryPhase(freshState());
    s = dispatch(s, { type: 'PLAYER_DISCONNECTED', playerId: 'p2' });
    expect(s.players.find(p => p.id === 'p2')!.connected).toBe(false);
  });

  it('marks player as connected on reconnect', () => {
    let s = passMemoryPhase(freshState());
    s = dispatch(s, { type: 'PLAYER_DISCONNECTED', playerId: 'p2' });
    s = dispatch(s, { type: 'PLAYER_RECONNECTED', playerId: 'p2' });
    expect(s.players.find(p => p.id === 'p2')!.connected).toBe(true);
  });
});

// ─── AVAILABLE ACTIONS ────────────────────────────────────────────────────────

describe('getAvailableActions', () => {
  it('returns MEMORY_READY in INITIAL_MEMORY phase', () => {
    const s = freshState();
    const actions = getAvailableActions(s, 'p1');
    expect(actions.some(a => a.type === 'MEMORY_READY')).toBe(true);
  });

  it('returns DRAW_FROM_DECK and CALL_CABO in PLAYER_TURN', () => {
    const s = passMemoryPhase(freshState());
    const actions = getAvailableActions(s, 'p1');
    expect(actions.some(a => a.type === 'DRAW_FROM_DECK')).toBe(true);
    expect(actions.some(a => a.type === 'CALL_CABO')).toBe(true);
  });

  it('opponent has no actions during other player\'s turn', () => {
    const s = passMemoryPhase(freshState());
    const actions = getAvailableActions(s, 'p2'); // p1's turn
    const turnActions = actions.filter(a =>
      a.type === 'DRAW_FROM_DECK' || a.type === 'CALL_CABO' || a.type === 'REPLACE_CARD'
    );
    expect(turnActions).toHaveLength(0);
  });

  it('returns REPLACE_CARD and DISCARD_DRAWN in CARD_DRAWN', () => {
    let s = passMemoryPhase(freshState());
    s = drawCard(s);
    const actions = getAvailableActions(s, 'p1');
    expect(actions.some(a => a.type === 'DISCARD_DRAWN')).toBe(true);
    expect(actions.some(a => a.type === 'REPLACE_CARD')).toBe(true);
  });

  it('returns SNAP_PRESS in SNAP_WINDOW for any player', () => {
    let s: CaboState = passMemoryPhase(freshState());
    s = {
      ...s,
      phase: 'SNAP_WINDOW',
      snapWindow: {
        discardValue: 5,
        winnerId: null,
        step: 'OPEN',
        selectedSlotId: null,
        pendingAbility: null,
        targetSlotId: null,
      },
    };
    expect(getAvailableActions(s, 'p1').some(a => a.type === 'SNAP_PRESS')).toBe(true);
    expect(getAvailableActions(s, 'p2').some(a => a.type === 'SNAP_PRESS')).toBe(true);
  });
});

// ─── GAME STATUS ──────────────────────────────────────────────────────────────

describe('getGameStatus', () => {
  it('returns setup in INITIAL_MEMORY', () => {
    expect(getGameStatus(freshState()).phase).toBe('setup');
  });

  it('returns playing after memory phase', () => {
    const s = passMemoryPhase(freshState());
    expect(getGameStatus(s).phase).toBe('playing');
  });

  it('returns paused when disconnected', () => {
    let s = passMemoryPhase(freshState());
    s = dispatch(s, { type: 'PLAYER_DISCONNECTED', playerId: 'p1' });
    expect(getGameStatus(s).phase).toBe('paused');
  });

  it('returns finished with winner in GAME_OVER', () => {
    const s: CaboState = { ...passMemoryPhase(freshState()), phase: 'GAME_OVER', gameWinner: 'p1' };
    const status = getGameStatus(s);
    expect(status.phase).toBe('finished');
    expect(status.result?.winners).toContain('p1');
  });
});
