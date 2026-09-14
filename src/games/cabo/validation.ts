/**
 * Cabo — Validation
 */

import type { CaboState } from './types';
import type { CaboAction } from './actions';
import type { ValidationResult } from '@/game/core/types';
import { getCurrentPlayer, getSlotByIdGlobal } from './selectors';

export function validateAction(state: CaboState, action: CaboAction): ValidationResult {
  const { phase } = state;

  // System events bypass normal validation
  if (action.type === 'PLAYER_DISCONNECTED' || action.type === 'PLAYER_RECONNECTED') {
    return { valid: true };
  }
  if (action.type === 'ADVANCE_ROUND_REVEAL' || action.type === 'START_NEXT_ROUND') {
    return { valid: true };
  }

  // Find player
  const player = state.players.find((p) => p.id === action.playerId);
  if (!player) return { valid: false, reason: 'Player not found' };

  const currentPlayer = getCurrentPlayer(state);
  const isCurrentPlayer = currentPlayer.id === action.playerId;

  switch (action.type) {
    case 'MEMORY_READY':
      if (phase !== 'INITIAL_MEMORY') return { valid: false, reason: 'Not in memory phase' };
      if (player.memoryReady) return { valid: false, reason: 'Already ready' };
      return { valid: true };

    case 'DRAW_FROM_DECK':
      if (phase !== 'PLAYER_TURN' && phase !== 'FINAL_TURN') return { valid: false, reason: 'Wrong phase' };
      if (!isCurrentPlayer) return { valid: false, reason: 'Not your turn' };
      if (state.deck.length === 0 && state.discardPile.length <= 1) {
        return { valid: false, reason: 'No cards to draw' };
      }
      return { valid: true };

    case 'TAKE_DISCARD': {
      if (phase !== 'PLAYER_TURN' && phase !== 'FINAL_TURN') return { valid: false, reason: 'Wrong phase' };
      if (!isCurrentPlayer) return { valid: false, reason: 'Not your turn' };
      if (state.discardPile.length === 0) return { valid: false, reason: 'Discard pile empty' };
      const slot = player.slots.find((s) => s.id === action.slotId);
      if (!slot) return { valid: false, reason: 'Slot not found' };
      return { valid: true };
    }

    case 'REPLACE_CARD': {
      if (phase !== 'CARD_DRAWN') return { valid: false, reason: 'Wrong phase' };
      if (!isCurrentPlayer) return { valid: false, reason: 'Not your turn' };
      if (!state.drawnCardId) return { valid: false, reason: 'No drawn card' };
      const slot = player.slots.find((s) => s.id === action.slotId);
      if (!slot) return { valid: false, reason: 'Slot not found' };
      return { valid: true };
    }

    case 'DISCARD_DRAWN':
      if (phase !== 'CARD_DRAWN') return { valid: false, reason: 'Wrong phase' };
      if (!isCurrentPlayer) return { valid: false, reason: 'Not your turn' };
      if (!state.drawnCardId) return { valid: false, reason: 'No drawn card' };
      return { valid: true };

    case 'CALL_CABO':
      if (phase !== 'PLAYER_TURN' && phase !== 'CARD_DRAWN') return { valid: false, reason: 'Wrong phase' };
      if (!isCurrentPlayer) return { valid: false, reason: 'Not your turn' };
      if (state.caboCallerId) return { valid: false, reason: 'Cabo already called' };
      return { valid: true };

    case 'SKIP_ABILITY':
      if (phase !== 'SPECIAL_POWER') return { valid: false, reason: 'Wrong phase' };
      if (!state.specialPower || state.specialPower.actorId !== action.playerId) {
        return { valid: false, reason: 'Not your ability' };
      }
      return { valid: true };

    case 'ABILITY_LOOK_OWN_SELECT': {
      if (phase !== 'SPECIAL_POWER') return { valid: false, reason: 'Wrong phase' };
      const sp = state.specialPower;
      if (!sp || sp.step !== 'LOOK_OWN_SELECT' || sp.actorId !== action.playerId) {
        return { valid: false, reason: 'Invalid ability state' };
      }
      const slot = player.slots.find((s) => s.id === action.slotId);
      if (!slot || !slot.cardId) return { valid: false, reason: 'Slot not found or empty' };
      return { valid: true };
    }

    case 'ABILITY_LOOK_OWN_DONE': {
      if (phase !== 'SPECIAL_POWER') return { valid: false, reason: 'Wrong phase' };
      const sp = state.specialPower;
      if (!sp || sp.step !== 'LOOK_OWN_VIEWING' || sp.actorId !== action.playerId) {
        return { valid: false, reason: 'Invalid ability state' };
      }
      return { valid: true };
    }

    case 'ABILITY_LOOK_OTHER_SELECT_PLAYER': {
      if (phase !== 'SPECIAL_POWER') return { valid: false, reason: 'Wrong phase' };
      const sp = state.specialPower;
      if (!sp || sp.step !== 'LOOK_OTHER_SELECT_PLAYER' || sp.actorId !== action.playerId) {
        return { valid: false, reason: 'Invalid ability state' };
      }
      if (action.targetPlayerId === action.playerId) return { valid: false, reason: 'Cannot target yourself' };
      if (!state.players.find((p) => p.id === action.targetPlayerId)) {
        return { valid: false, reason: 'Target player not found' };
      }
      return { valid: true };
    }

    case 'ABILITY_LOOK_OTHER_SELECT_CARD': {
      if (phase !== 'SPECIAL_POWER') return { valid: false, reason: 'Wrong phase' };
      const sp = state.specialPower;
      if (!sp || sp.step !== 'LOOK_OTHER_SELECT_CARD' || sp.actorId !== action.playerId) {
        return { valid: false, reason: 'Invalid ability state' };
      }
      const found = getSlotByIdGlobal(state, action.targetSlotId);
      if (!found || !found.slot.cardId) return { valid: false, reason: 'Target slot empty' };
      if (found.player.id === action.playerId) return { valid: false, reason: 'Cannot target own card' };
      return { valid: true };
    }

    case 'ABILITY_LOOK_OTHER_DONE': {
      if (phase !== 'SPECIAL_POWER') return { valid: false, reason: 'Wrong phase' };
      const sp = state.specialPower;
      if (!sp || sp.step !== 'LOOK_OTHER_VIEWING' || sp.actorId !== action.playerId) {
        return { valid: false, reason: 'Invalid ability state' };
      }
      return { valid: true };
    }

    case 'ABILITY_BLIND_SWAP_SELECT_OWN': {
      if (phase !== 'SPECIAL_POWER') return { valid: false, reason: 'Wrong phase' };
      const sp = state.specialPower;
      if (!sp || sp.step !== 'BLIND_SWAP_SELECT_OWN' || sp.actorId !== action.playerId) {
        return { valid: false, reason: 'Invalid ability state' };
      }
      const slot = player.slots.find((s) => s.id === action.mySlotId);
      if (!slot) return { valid: false, reason: 'Slot not found' };
      // Can select even empty slot (for flexibility)
      return { valid: true };
    }

    case 'ABILITY_BLIND_SWAP_SELECT_TARGET': {
      if (phase !== 'SPECIAL_POWER') return { valid: false, reason: 'Wrong phase' };
      const sp = state.specialPower;
      if (!sp || sp.step !== 'BLIND_SWAP_SELECT_TARGET' || sp.actorId !== action.playerId) {
        return { valid: false, reason: 'Invalid ability state' };
      }
      const found = getSlotByIdGlobal(state, action.targetSlotId);
      if (!found) return { valid: false, reason: 'Target slot not found' };
      if (found.player.id === action.playerId) return { valid: false, reason: 'Cannot swap with own card' };
      return { valid: true };
    }

    case 'ABILITY_BK_SELECT_PLAYER': {
      if (phase !== 'SPECIAL_POWER') return { valid: false, reason: 'Wrong phase' };
      const sp = state.specialPower;
      if (!sp || sp.step !== 'BK_SELECT_PLAYER' || sp.actorId !== action.playerId) {
        return { valid: false, reason: 'Invalid ability state' };
      }
      if (action.targetPlayerId === action.playerId) return { valid: false, reason: 'Cannot target yourself' };
      return { valid: true };
    }

    case 'ABILITY_BK_SELECT_CARD': {
      if (phase !== 'SPECIAL_POWER') return { valid: false, reason: 'Wrong phase' };
      const sp = state.specialPower;
      if (!sp || sp.step !== 'BK_SELECT_CARD' || sp.actorId !== action.playerId) {
        return { valid: false, reason: 'Invalid ability state' };
      }
      const found = getSlotByIdGlobal(state, action.targetSlotId);
      if (!found || !found.slot.cardId) return { valid: false, reason: 'Target slot empty' };
      return { valid: true };
    }

    case 'ABILITY_BK_SWAP': {
      if (phase !== 'SPECIAL_POWER') return { valid: false, reason: 'Wrong phase' };
      const sp = state.specialPower;
      if (!sp || (sp.step !== 'BK_VIEWING' && sp.step !== 'BK_DECIDE') || sp.actorId !== action.playerId) {
        return { valid: false, reason: 'Invalid ability state' };
      }
      const slot = player.slots.find((s) => s.id === action.mySlotId);
      if (!slot) return { valid: false, reason: 'Own slot not found' };
      return { valid: true };
    }

    case 'ABILITY_BK_SKIP': {
      if (phase !== 'SPECIAL_POWER') return { valid: false, reason: 'Wrong phase' };
      const sp = state.specialPower;
      if (!sp || (sp.step !== 'BK_VIEWING' && sp.step !== 'BK_DECIDE') || sp.actorId !== action.playerId) {
        return { valid: false, reason: 'Invalid ability state' };
      }
      return { valid: true };
    }

    case 'SNAP_PRESS': {
      if (phase !== 'SNAP_WINDOW') return { valid: false, reason: 'Not in snap window' };
      const sw = state.snapWindow;
      if (!sw || sw.step !== 'OPEN') return { valid: false, reason: 'Snap window not open' };
      if (sw.winnerId !== null) return { valid: false, reason: 'Snap already claimed' };
      return { valid: true };
    }

    case 'SNAP_SELECT_CARD': {
      if (phase !== 'SNAP_WINDOW') return { valid: false, reason: 'Not in snap window' };
      const sw = state.snapWindow;
      if (!sw || sw.step !== 'SELECT') return { valid: false, reason: 'Not in select step' };
      if (sw.winnerId !== action.playerId) return { valid: false, reason: 'Not the snap winner' };
      const found = getSlotByIdGlobal(state, action.slotId);
      if (!found || !found.slot.cardId) return { valid: false, reason: 'Slot empty' };
      return { valid: true };
    }

    case 'SNAP_SELECT_OWN_TO_MOVE': {
      if (phase !== 'SNAP_WINDOW') return { valid: false, reason: 'Not in snap window' };
      const sw = state.snapWindow;
      if (!sw || sw.step !== 'SELECT_OWN_TO_MOVE') return { valid: false, reason: 'Not in move step' };
      if (sw.winnerId !== action.playerId) return { valid: false, reason: 'Not the snap winner' };
      const slot = player.slots.find((s) => s.id === action.mySlotId);
      if (!slot || !slot.cardId) return { valid: false, reason: 'Slot empty' };
      return { valid: true };
    }

    default:
      return { valid: true };
  }
}
