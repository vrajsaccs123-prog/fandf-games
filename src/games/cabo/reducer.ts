/**
 * Cabo — Game Reducer (State Machine)
 *
 * Pure function: reduce(state, action) → nextState
 * Must not mutate the input state.
 */

import type { CaboState, CaboPlayer, CaboSlot, SnapWindowState, CaboAbility } from './types';
import type { CaboAction } from './actions';
import { createRng } from '@/game/core/random';
import { createNextRoundState } from './state';
import { calcRoundScore, getSlotByIdGlobal, getTopDiscard } from './selectors';

// ─── Utilities ────────────────────────────────────────────────────────────────

function updatePlayer(state: CaboState, playerId: string, update: Partial<CaboPlayer>): CaboState {
  return {
    ...state,
    players: state.players.map((p) => (p.id === playerId ? { ...p, ...update } : p)),
  };
}

function updateSlot(state: CaboState, playerId: string, slotId: string, update: Partial<CaboSlot>): CaboState {
  return {
    ...state,
    players: state.players.map((p) =>
      p.id !== playerId
        ? p
        : {
            ...p,
            slots: p.slots.map((s) => (s.id === slotId ? { ...s, ...update } : s)),
          }
    ),
  };
}

/** Add a card to a player's reveals (they can see it) */
function addReveal(state: CaboState, playerId: string, cardId: string): CaboState {
  const existing = state.reveals[playerId] ?? [];
  if (existing.includes(cardId)) return state;
  return {
    ...state,
    reveals: { ...state.reveals, [playerId]: [...existing, cardId] },
  };
}

/** Remove a card from a player's reveals */
function removeReveal(state: CaboState, playerId: string, cardId: string): CaboState {
  return {
    ...state,
    reveals: {
      ...state.reveals,
      [playerId]: (state.reveals[playerId] ?? []).filter((id) => id !== cardId),
    },
  };
}

/** Remove a card from ALL players' reveals */
function removeRevealFromAll(state: CaboState, cardId: string): CaboState {
  const newReveals: Record<string, string[]> = {};
  for (const [pid, cards] of Object.entries(state.reveals)) {
    newReveals[pid] = cards.filter((id) => id !== cardId);
  }
  return { ...state, reveals: newReveals };
}

/** Draw top card from deck, reshuffling discard if needed */
function drawFromDeck(state: CaboState): { nextState: CaboState; cardId: string } | null {
  let s = { ...state };

  if (s.deck.length === 0) {
    if (s.discardPile.length <= 1) return null; // truly empty
    // Reshuffle discard (keep top card)
    const top = s.discardPile[s.discardPile.length - 1];
    const toShuffle = s.discardPile.slice(0, s.discardPile.length - 1);
    const rng = createRng(`${s.seed}-reshuffle-${Date.now()}`);
    const shuffled = rng.shuffle(toShuffle);
    s = { ...s, deck: shuffled, discardPile: [top] };
  }

  const cardId = s.deck[0];
  const deck = s.deck.slice(1);
  return { nextState: { ...s, deck }, cardId };
}

/** Add a card to the discard pile */
function discardCard(state: CaboState, cardId: string): CaboState {
  return { ...state, discardPile: [...state.discardPile, cardId] };
}

/** Get next player index in normal turn order */
function nextPlayerIndex(state: CaboState): number {
  return (state.currentPlayerIndex + 1) % state.players.length;
}

/** Advance to next player in normal turn order */
function advanceToNextPlayer(state: CaboState): CaboState {
  return {
    ...state,
    phase: 'PLAYER_TURN',
    currentPlayerIndex: nextPlayerIndex(state),
    drawnCardId: null,
    drawnFromDiscard: false,
    specialPower: null,
    snapWindow: null,
    lastEvent: null,
  };
}

/** Open snap window after a discard */
function openSnapWindow(
  state: CaboState,
  discardValue: number,
  pendingAbility: CaboAbility | null,
  pendingAbilityActorId: string | null
): CaboState {
  return {
    ...state,
    phase: 'SNAP_WINDOW',
    snapWindow: {
      discardValue,
      winnerId: null,
      step: 'OPEN',
      selectedSlotId: null,
      targetPlayerId: null,
      pendingAbility,
      pendingAbilityActorId,
    },
  };
}

/** Close snap window and proceed (to special ability or next turn) */
function closeSnapWindowAndProceed(state: CaboState): CaboState {
  const sw = state.snapWindow;
  const noSnap = { ...state, snapWindow: null };

  if (sw?.pendingAbility && sw.pendingAbilityActorId) {
    // Trigger special ability
    return triggerSpecialAbility(noSnap, sw.pendingAbility, sw.pendingAbilityActorId);
  }

  // Check if cabo was called / final turn logic
  if (state.caboCallerId) {
    return checkFinalTurnAdvance(noSnap);
  }

  return advanceToNextPlayer(noSnap);
}

/** Begin special ability flow */
function triggerSpecialAbility(state: CaboState, ability: CaboAbility, actorId: string): CaboState {
  switch (ability) {
    case 'LOOK_OWN':
      return { ...state, phase: 'SPECIAL_POWER', specialPower: { step: 'LOOK_OWN_SELECT', actorId } };
    case 'LOOK_OTHER':
      return { ...state, phase: 'SPECIAL_POWER', specialPower: { step: 'LOOK_OTHER_SELECT_PLAYER', actorId } };
    case 'BLIND_SWAP':
      return { ...state, phase: 'SPECIAL_POWER', specialPower: { step: 'BLIND_SWAP_SELECT_OWN', actorId } };
    case 'LOOK_SWAP':
      return { ...state, phase: 'SPECIAL_POWER', specialPower: { step: 'BK_SELECT_PLAYER', actorId } };
  }
}

/** After a snap or final-turn action, check if we should continue final turns or end round */
function checkFinalTurnAdvance(state: CaboState): CaboState {
  if (!state.caboCallerId) return advanceToNextPlayer(state);

  const nextFinalIndex = state.finalTurnIndex + 1;
  if (nextFinalIndex >= state.finalTurnPlayerIds.length) {
    // All final turns done — reveal round
    return startRoundReveal(state);
  }

  // Advance to next final-turn player
  const nextPlayerId = state.finalTurnPlayerIds[nextFinalIndex];
  const nextPlayerIdx = state.players.findIndex((p) => p.id === nextPlayerId);

  return {
    ...state,
    phase: 'FINAL_TURN',
    finalTurnIndex: nextFinalIndex,
    currentPlayerIndex: nextPlayerIdx,
    drawnCardId: null,
    drawnFromDiscard: false,
    specialPower: null,
    snapWindow: null,
  };
}

/** Start the round reveal phase */
function startRoundReveal(state: CaboState): CaboState {
  // Reveal ALL cards to ALL players
  const allReveals: Record<string, string[]> = {};
  const allCardIds: string[] = [];

  for (const player of state.players) {
    for (const slot of player.slots) {
      if (slot.cardId) allCardIds.push(slot.cardId);
    }
  }

  for (const player of state.players) {
    allReveals[player.id] = [...allCardIds];
  }

  return {
    ...state,
    phase: 'ROUND_REVEAL',
    reveals: allReveals,
    roundRevealIndex: 0,
    lastEvent: { type: 'ROUND_ENDED' },
  };
}

/** Add a new slot to a player (when they need more than 4) */
function addSlotToPlayer(state: CaboState, playerId: string, cardId: string): CaboState {
  return {
    ...state,
    players: state.players.map((p) => {
      if (p.id !== playerId) return p;
      const maxIdx = p.slots.reduce((max, s) => {
        const match = s.id.match(/-slot-(\d+)$/);
        return match ? Math.max(max, parseInt(match[1], 10)) : max;
      }, -1);
      const newSlot: CaboSlot = {
        id: `p-${p.id}-slot-${maxIdx + 1}`,
        ownerId: p.id,
        cardId,
      };
      return { ...p, slots: [...p.slots, newSlot] };
    }),
  };
}

/** Place card in empty slot or create new slot */
function placeCardForPlayer(state: CaboState, playerId: string, cardId: string): {
  nextState: CaboState;
  slotId: string;
} {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) throw new Error('Player not found');

  const emptySlot = player.slots.find((s) => s.cardId === null);
  if (emptySlot) {
    const s = updateSlot(state, playerId, emptySlot.id, { cardId });
    return { nextState: s, slotId: emptySlot.id };
  }

  // Create new slot
  const s = addSlotToPlayer(state, playerId, cardId);
  const updated = s.players.find((p) => p.id === playerId);
  const newSlot = updated!.slots[updated!.slots.length - 1];
  return { nextState: s, slotId: newSlot.id };
}

/** Swap cards between two slots */
function swapSlots(
  state: CaboState,
  slotIdA: string,
  slotIdB: string
): CaboState {
  const foundA = getSlotByIdGlobal(state, slotIdA);
  const foundB = getSlotByIdGlobal(state, slotIdB);
  if (!foundA || !foundB) return state;

  const cardA = foundA.slot.cardId;
  const cardB = foundB.slot.cardId;

  let s = updateSlot(state, foundA.player.id, slotIdA, { cardId: cardB });
  s = updateSlot(s, foundB.player.id, slotIdB, { cardId: cardA });
  return s;
}

// ─── Main Reducer ─────────────────────────────────────────────────────────────

export function reduce(state: CaboState, action: CaboAction): CaboState {
  switch (action.type) {

    // ── System Events ────────────────────────────────────────────────────────

    case 'PLAYER_DISCONNECTED': {
      const s = updatePlayer(state, action.playerId, { connected: false });
      return {
        ...s,
        phase: 'PAUSED_DISCONNECTED',
        phaseBeforePause: state.phase === 'PAUSED_DISCONNECTED' ? state.phaseBeforePause : state.phase,
        pausedByDisconnect: action.playerId,
        lastEvent: { type: 'PLAYER_DISCONNECTED', playerId: action.playerId },
      };
    }

    case 'PLAYER_RECONNECTED': {
      const s = updatePlayer(state, action.playerId, { connected: true });
      return {
        ...s,
        phase: s.phaseBeforePause ?? 'PLAYER_TURN',
        phaseBeforePause: null,
        pausedByDisconnect: null,
        lastEvent: { type: 'PLAYER_RECONNECTED', playerId: action.playerId },
      };
    }

    // ── Memory Phase ─────────────────────────────────────────────────────────

    case 'MEMORY_READY': {
      let s = updatePlayer(state, action.playerId, { memoryReady: true });
      // When all players are ready, start the game
      const allReady = s.players.every((p) => p.memoryReady);
      if (allReady) {
        // Clear all initial reveals (memory game — you must remember now)
        s = { ...s, reveals: {}, phase: 'PLAYER_TURN' };
      }
      return s;
    }

    // ── Draw from Deck ────────────────────────────────────────────────────────

    case 'DRAW_FROM_DECK': {
      const result = drawFromDeck(state);
      if (!result) return state;

      const { nextState, cardId } = result;
      // Current player can see the drawn card
      let s = addReveal(nextState, action.playerId, cardId);
      s = {
        ...s,
        phase: 'CARD_DRAWN',
        drawnCardId: cardId,
        drawnFromDiscard: false,
        lastEvent: { type: 'CARD_DRAWN', playerId: action.playerId },
      };
      return s;
    }

    // ── Take from Discard ─────────────────────────────────────────────────────

    case 'TAKE_DISCARD': {
      if (state.discardPile.length === 0) return state;

      const topDiscardId = state.discardPile[state.discardPile.length - 1];
      const discardPile = state.discardPile.slice(0, -1);

      // Find the target slot
      const player = state.players.find((p) => p.id === action.playerId)!;
      const slot = player.slots.find((s) => s.id === action.slotId);
      if (!slot) return state;

      const oldCardId = slot.cardId;

      // Place taken card in slot
      let s: CaboState = { ...state, discardPile };
      s = updateSlot(s, action.playerId, action.slotId, { cardId: topDiscardId });

      // Old card (if any) goes to discard
      const discardedCardId = oldCardId;
      if (oldCardId) {
        s = { ...s, discardPile: [...s.discardPile, oldCardId] };
        s = removeRevealFromAll(s, oldCardId);
      }

      // The newly discarded card's value for snap
      let snapDiscardValue = 0;
      const pendingAbility: CaboAbility | null = null;
      if (discardedCardId) {
        const card = s.cards[discardedCardId];
        const def = card ? s.definitions[card.definitionId] : null;
        if (def) {
          snapDiscardValue = def.value;
          // No ability triggered from TAKE_DISCARD
        }
      }

      s = {
        ...s,
        lastEvent: { type: 'CARD_TAKEN_FROM_DISCARD', playerId: action.playerId, slotId: action.slotId },
      };

      if (discardedCardId) {
        return openSnapWindow(s, snapDiscardValue, pendingAbility, null);
      }

      // If old slot was empty: no snap needed, just advance
      if (state.caboCallerId) return checkFinalTurnAdvance(s);
      return advanceToNextPlayer(s);
    }

    // ── Replace Card with Drawn Card ──────────────────────────────────────────

    case 'REPLACE_CARD': {
      if (!state.drawnCardId) return state;

      const player = state.players.find((p) => p.id === action.playerId)!;
      const slot = player.slots.find((s) => s.id === action.slotId);
      if (!slot) return state;

      const oldCardId = slot.cardId;
      const drawnCardId = state.drawnCardId;

      // Remove drawn card from reveals
      let s = removeReveal(state, action.playerId, drawnCardId);

      // Place drawn card in slot
      s = updateSlot(s, action.playerId, action.slotId, { cardId: drawnCardId });

      // Old card goes to discard
      s = { ...s, discardPile: [...s.discardPile, ...(oldCardId ? [oldCardId] : [])] };
      if (oldCardId) s = removeRevealFromAll(s, oldCardId);

      s = { ...s, drawnCardId: null, drawnFromDiscard: false };

      // The discarded old card triggers snap window
      if (oldCardId) {
        const card = s.cards[oldCardId];
        const def = card ? s.definitions[card.definitionId] : null;
        const discardValue = def ? def.value : 0;
        // No ability from discarded old card (ability only from DISCARD_DRAWN of drawn card)
        s = {
          ...s,
          lastEvent: { type: 'CARD_REPLACED', playerId: action.playerId, slotId: action.slotId },
        };
        return openSnapWindow(s, discardValue, null, null);
      }

      // Empty slot replace — no snap
      if (state.caboCallerId) return checkFinalTurnAdvance(s);
      return advanceToNextPlayer(s);
    }

    // ── Discard the Drawn Card (may trigger ability) ───────────────────────────

    case 'DISCARD_DRAWN': {
      if (!state.drawnCardId) return state;

      const drawnCardId = state.drawnCardId;
      const card = state.cards[drawnCardId];
      const def = card ? state.definitions[card.definitionId] : null;

      // Move drawn card to discard
      let s = discardCard(state, drawnCardId);
      s = removeReveal(s, action.playerId, drawnCardId);
      s = { ...s, drawnCardId: null, drawnFromDiscard: false };

      const discardValue = def ? def.value : 0;
      const ability = def ? def.ability : null;
      const actorId = action.playerId;

      s = {
        ...s,
        lastEvent: { type: 'CARD_DISCARDED', definitionId: card?.definitionId ?? '', value: discardValue },
      };

      return openSnapWindow(s, discardValue, ability, ability ? actorId : null);
    }

    // ── Call Cabo ─────────────────────────────────────────────────────────────

    case 'CALL_CABO': {
      // If there's a drawn card, discard it
      let s = state;
      const drawnId = s.drawnCardId;
      if (drawnId) {
        s = discardCard(s, drawnId);
        s = removeReveal(s, action.playerId, drawnId);
        s = { ...s, drawnCardId: null };
      }

      const caboPlayer = s.players.find((p) => p.id === action.playerId)!;

      // Mark cabo caller
      s = updatePlayer(s, action.playerId, { calledCabo: true });
      s = { ...s, caboCallerId: action.playerId };

      // Set up final turn order: all OTHER players in turn order starting after caller
      const callerIdx = s.players.findIndex((p) => p.id === action.playerId);
      const finalTurnPlayerIds: string[] = [];
      for (let i = 1; i < s.players.length; i++) {
        const idx = (callerIdx + i) % s.players.length;
        finalTurnPlayerIds.push(s.players[idx].id);
      }

      const firstFinalPlayer = finalTurnPlayerIds[0];
      const firstFinalIdx = s.players.findIndex((p) => p.id === firstFinalPlayer);

      s = {
        ...s,
        phase: 'FINAL_TURN',
        finalTurnPlayerIds,
        finalTurnIndex: 0,
        currentPlayerIndex: firstFinalIdx,
        lastEvent: { type: 'CABO_CALLED', callerId: action.playerId },
      };

      return s;
    }

    // ── Skip Special Ability ──────────────────────────────────────────────────

    case 'SKIP_ABILITY': {
      const s = { ...state, specialPower: null };
      if (state.caboCallerId) return checkFinalTurnAdvance(s);
      return advanceToNextPlayer(s);
    }

    // ── Look at Own Card ──────────────────────────────────────────────────────

    case 'ABILITY_LOOK_OWN_SELECT': {
      const sp = state.specialPower;
      if (!sp || sp.step !== 'LOOK_OWN_SELECT') return state;
      const found = getSlotByIdGlobal(state, action.slotId);
      if (!found || !found.slot.cardId) return state;
      const cardId = found.slot.cardId;
      let s = addReveal(state, action.playerId, cardId);
      s = {
        ...s,
        specialPower: { step: 'LOOK_OWN_VIEWING', actorId: action.playerId, targetSlotId: action.slotId, cardId },
        lastEvent: { type: 'SPECIAL_LOOK', actorId: action.playerId, targetPlayerId: action.playerId, targetSlotId: action.slotId },
      };
      return s;
    }

    case 'ABILITY_LOOK_OWN_DONE': {
      const sp = state.specialPower;
      if (!sp || sp.step !== 'LOOK_OWN_VIEWING') return state;
      const cardId = sp.cardId;
      let s = removeReveal(state, action.playerId, cardId);
      s = { ...s, specialPower: null };
      if (state.caboCallerId) return checkFinalTurnAdvance(s);
      return advanceToNextPlayer(s);
    }

    // ── Look at Opponent Card ─────────────────────────────────────────────────

    case 'ABILITY_LOOK_OTHER_SELECT_PLAYER': {
      const sp = state.specialPower;
      if (!sp || sp.step !== 'LOOK_OTHER_SELECT_PLAYER') return state;
      return {
        ...state,
        specialPower: { step: 'LOOK_OTHER_SELECT_CARD', actorId: action.playerId, targetPlayerId: action.targetPlayerId },
      };
    }

    case 'ABILITY_LOOK_OTHER_SELECT_CARD': {
      const sp = state.specialPower;
      if (!sp || sp.step !== 'LOOK_OTHER_SELECT_CARD') return state;
      const found = getSlotByIdGlobal(state, action.targetSlotId);
      if (!found || !found.slot.cardId) return state;
      const cardId = found.slot.cardId;
      let s = addReveal(state, action.playerId, cardId);
      s = {
        ...s,
        specialPower: {
          step: 'LOOK_OTHER_VIEWING',
          actorId: action.playerId,
          targetPlayerId: sp.targetPlayerId,
          targetSlotId: action.targetSlotId,
          cardId,
        },
        lastEvent: {
          type: 'SPECIAL_LOOK',
          actorId: action.playerId,
          targetPlayerId: found.player.id,
          targetSlotId: action.targetSlotId,
        },
      };
      return s;
    }

    case 'ABILITY_LOOK_OTHER_DONE': {
      const sp = state.specialPower;
      if (!sp || sp.step !== 'LOOK_OTHER_VIEWING') return state;
      let s = removeReveal(state, action.playerId, sp.cardId);
      s = { ...s, specialPower: null };
      if (state.caboCallerId) return checkFinalTurnAdvance(s);
      return advanceToNextPlayer(s);
    }

    // ── Blind Swap ────────────────────────────────────────────────────────────

    case 'ABILITY_BLIND_SWAP_SELECT_OWN': {
      const sp = state.specialPower;
      if (!sp || sp.step !== 'BLIND_SWAP_SELECT_OWN') return state;
      return {
        ...state,
        specialPower: { step: 'BLIND_SWAP_SELECT_TARGET', actorId: action.playerId, mySlotId: action.mySlotId },
      };
    }

    case 'ABILITY_BLIND_SWAP_SELECT_TARGET': {
      const sp = state.specialPower;
      if (!sp || sp.step !== 'BLIND_SWAP_SELECT_TARGET') return state;

      const foundA = getSlotByIdGlobal(state, sp.mySlotId);
      const foundB = getSlotByIdGlobal(state, action.targetSlotId);
      if (!foundA || !foundB) return state;

      let s = swapSlots(state, sp.mySlotId, action.targetSlotId);
      s = { ...s, specialPower: null };

      // Emit swap event
      s = {
        ...s,
        lastEvent: {
          type: 'SPECIAL_SWAP',
          actorId: action.playerId,
          mySlotId: sp.mySlotId,
          targetPlayerId: foundB.player.id,
          targetSlotId: action.targetSlotId,
        },
      };

      if (state.caboCallerId) return checkFinalTurnAdvance(s);
      return advanceToNextPlayer(s);
    }

    // ── Black King: Look & Optional Swap ──────────────────────────────────────

    case 'ABILITY_BK_SELECT_PLAYER': {
      const sp = state.specialPower;
      if (!sp || sp.step !== 'BK_SELECT_PLAYER') return state;
      return {
        ...state,
        specialPower: { step: 'BK_SELECT_CARD', actorId: action.playerId, targetPlayerId: action.targetPlayerId },
      };
    }

    case 'ABILITY_BK_SELECT_CARD': {
      const sp = state.specialPower;
      if (!sp || sp.step !== 'BK_SELECT_CARD') return state;
      const found = getSlotByIdGlobal(state, action.targetSlotId);
      if (!found || !found.slot.cardId) return state;
      const cardId = found.slot.cardId;
      let s = addReveal(state, action.playerId, cardId);
      s = {
        ...s,
        specialPower: {
          step: 'BK_VIEWING',
          actorId: action.playerId,
          targetPlayerId: sp.targetPlayerId,
          targetSlotId: action.targetSlotId,
          cardId,
        },
        lastEvent: {
          type: 'SPECIAL_LOOK',
          actorId: action.playerId,
          targetPlayerId: found.player.id,
          targetSlotId: action.targetSlotId,
        },
      };
      return s;
    }

    case 'ABILITY_BK_SWAP': {
      const sp = state.specialPower;
      if (!sp || (sp.step !== 'BK_VIEWING' && sp.step !== 'BK_DECIDE')) return state;

      let s = swapSlots(state, action.mySlotId, sp.targetSlotId);
      s = removeReveal(s, action.playerId, sp.cardId);
      s = { ...s, specialPower: null };

      s = {
        ...s,
        lastEvent: {
          type: 'SPECIAL_SWAP',
          actorId: action.playerId,
          mySlotId: action.mySlotId,
          targetPlayerId: sp.targetPlayerId,
          targetSlotId: sp.targetSlotId,
        },
      };

      if (state.caboCallerId) return checkFinalTurnAdvance(s);
      return advanceToNextPlayer(s);
    }

    case 'ABILITY_BK_SKIP': {
      const sp = state.specialPower;
      if (!sp || (sp.step !== 'BK_VIEWING' && sp.step !== 'BK_DECIDE')) return state;
      let s = removeReveal(state, action.playerId, sp.cardId);
      s = { ...s, specialPower: null };
      if (state.caboCallerId) return checkFinalTurnAdvance(s);
      return advanceToNextPlayer(s);
    }

    // ── Snapping ──────────────────────────────────────────────────────────────

    case 'SNAP_PRESS': {
      const sw = state.snapWindow;
      if (!sw || sw.step !== 'OPEN' || sw.winnerId !== null) return state;
      return {
        ...state,
        snapWindow: { ...sw, winnerId: action.playerId, step: 'SELECT' },
      };
    }

    case 'SNAP_SELECT_CARD': {
      const sw = state.snapWindow;
      if (!sw || sw.step !== 'SELECT' || sw.winnerId !== action.playerId) return state;

      const found = getSlotByIdGlobal(state, action.slotId);
      if (!found || !found.slot.cardId) return state;

      const cardId = found.slot.cardId;
      const card = state.cards[cardId];
      const def = card ? state.definitions[card.definitionId] : null;
      const cardValue = def ? def.value : null;

      // Check if snap is correct
      const isCorrect = cardValue !== null && cardValue === sw.discardValue;

      if (isCorrect) {
        const isOwn = found.player.id === action.playerId;

        if (isOwn) {
          // Correct own-card snap: remove card, leave empty slot
          let s = updateSlot(state, action.playerId, action.slotId, { cardId: null });
          s = discardCard(s, cardId);
          s = removeRevealFromAll(s, cardId);
          s = {
            ...s,
            snapWindow: null,
            lastEvent: { type: 'SNAP_SELF_SUCCESS', winnerId: action.playerId, slotId: action.slotId },
          };
          return closeSnapWindowAndProceed(s);
        } else {
          // Correct other-player snap: remove their card, winner picks own card to move
          // Step 1: remove target card
          const targetPlayerId = found.player.id;
          let s = updateSlot(state, targetPlayerId, action.slotId, { cardId: null });
          s = discardCard(s, cardId);
          s = removeRevealFromAll(s, cardId);
          s = {
            ...s,
            snapWindow: {
              ...sw,
              step: 'SELECT_OWN_TO_MOVE',
              selectedSlotId: action.slotId,
              targetPlayerId,
            },
            lastEvent: { type: 'SNAP_ATTEMPTED', winnerId: action.playerId, slotId: action.slotId, correct: true },
          };
          return s;
        }
      } else {
        // Incorrect snap: give winner one card
        const drawResult = drawFromDeck(state);
        if (!drawResult) {
          // No cards to give — just close
          const s = {
            ...state,
            snapWindow: null,
            lastEvent: { type: 'SNAP_ATTEMPTED' as const, winnerId: action.playerId, slotId: action.slotId, correct: false },
          };
          return closeSnapWindowAndProceed(s);
        }

        const { nextState: drawnState, cardId: penaltyCardId } = drawResult;
        const { nextState: placedState, slotId: penaltySlotId } = placeCardForPlayer(
          drawnState,
          action.playerId,
          penaltyCardId
        );

        const s = {
          ...placedState,
          snapWindow: null,
          lastEvent: { type: 'SNAP_FAILURE' as const, loserId: action.playerId, penaltySlotId },
        };

        return closeSnapWindowAndProceed(s);
      }
    }

    case 'SNAP_SELECT_OWN_TO_MOVE': {
      const sw = state.snapWindow;
      if (!sw || sw.step !== 'SELECT_OWN_TO_MOVE' || sw.winnerId !== action.playerId) return state;

      const targetPlayerId = sw.targetPlayerId!;
      const targetSlotId = sw.selectedSlotId!;

      // Move winner's card from their slot into the target slot (vacated)
      const winnerPlayer = state.players.find((p) => p.id === action.playerId)!;
      const winnerSlot = winnerPlayer.slots.find((s) => s.id === action.mySlotId);
      if (!winnerSlot) return state;

      const cardToMove = winnerSlot.cardId;

      let s = updateSlot(state, action.playerId, action.mySlotId, { cardId: null });
      s = updateSlot(s, targetPlayerId, targetSlotId, { cardId: cardToMove });

      s = {
        ...s,
        snapWindow: null,
        lastEvent: {
          type: 'SNAP_OTHER_SUCCESS',
          winnerId: action.playerId,
          mySlotId: action.mySlotId,
          targetPlayerId,
          targetSlotId,
        },
      };

      return closeSnapWindowAndProceed(s);
    }

    // ── Round Reveal ──────────────────────────────────────────────────────────

    case 'ADVANCE_ROUND_REVEAL': {
      const nextIdx = state.roundRevealIndex + 1;
      // Count total cards in play
      const totalCards = state.players.reduce((sum, p) => sum + p.slots.filter((s) => s.cardId !== null).length, 0);

      if (nextIdx >= totalCards) {
        // All revealed — go to scoring
        return { ...state, phase: 'ROUND_SCORE', roundRevealIndex: nextIdx };
      }
      return { ...state, roundRevealIndex: nextIdx };
    }

    // ── Start Next Round ──────────────────────────────────────────────────────

    case 'START_NEXT_ROUND': {
      // Calculate round scores and add to cumulative
      let s = { ...state };
      for (const player of s.players) {
        const roundScore = calcRoundScore(s, player.id);
        s = updatePlayer(s, player.id, {
          cumulativeScore: player.cumulativeScore + roundScore,
          roundScore,
        });
      }

      // Check if anyone has reached/exceeded target score → game over (highest score wins... wait, LOWEST wins)
      // Lowest cumulative score wins. Game ends when ANYONE reaches/exceeds targetScore.
      const anyOverTarget = s.players.some((p) => p.cumulativeScore >= s.targetScore);

      if (anyOverTarget) {
        // Game over: lowest cumulative score wins
        const winner = [...s.players].sort((a, b) => a.cumulativeScore - b.cumulativeScore)[0];
        return { ...s, phase: 'GAME_OVER', gameWinner: winner.id };
      }

      // Start next round
      return createNextRoundState(s);
    }

    default:
      return state;
  }
}
