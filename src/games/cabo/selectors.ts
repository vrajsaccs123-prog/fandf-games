/**
 * Cabo — Selectors and Player View
 *
 * getPlayerView() is the critical hidden-information filter.
 * Only cards listed in state.reveals[myPlayerId] are visible to that player.
 */

import type {
  CaboState, CaboPlayer, CaboSlot, CaboCard, CardDefinition,
  CaboCardView, CaboPlayerView, CaboSlotView, CaboStateView,
} from './types';
import type { GamePhaseStatus, GameResult } from '@/game/core/types';
import type { CaboAction } from './actions';

// ─── Low-level lookups ────────────────────────────────────────────────────────

export function getCurrentPlayer(state: CaboState): CaboPlayer {
  return state.players[state.currentPlayerIndex];
}

export function getTopDiscard(state: CaboState): { cardId: string; definitionId: string; value: number } | null {
  if (state.discardPile.length === 0) return null;
  const cardId = state.discardPile[state.discardPile.length - 1];
  const card = state.cards[cardId];
  if (!card) return null;
  const def = state.definitions[card.definitionId];
  if (!def) return null;
  return { cardId, definitionId: card.definitionId, value: def.value };
}

export function getSlotByIdGlobal(
  state: CaboState,
  slotId: string
): { slot: CaboSlot; player: CaboPlayer } | null {
  for (const player of state.players) {
    const slot = player.slots.find((s) => s.id === slotId);
    if (slot) return { slot, player };
  }
  return null;
}

export function getCardDefinition(state: CaboState, cardId: string): CardDefinition | null {
  const card = state.cards[cardId];
  if (!card) return null;
  return state.definitions[card.definitionId] ?? null;
}

export function isPlayerRevealedCard(state: CaboState, playerId: string, cardId: string): boolean {
  return (state.reveals[playerId] ?? []).includes(cardId);
}

export function getEmptySlot(player: CaboPlayer): CaboSlot | null {
  return player.slots.find((s) => s.cardId === null) ?? null;
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

export function calcRoundScore(state: CaboState, playerId: string): number {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return 0;
  let total = 0;
  for (const slot of player.slots) {
    if (slot.cardId) {
      const def = getCardDefinition(state, slot.cardId);
      if (def) total += def.value;
    }
  }
  return total;
}

export function calcCumulativeScores(state: CaboState): Record<string, number> {
  const result: Record<string, number> = {};
  for (const p of state.players) {
    result[p.id] = p.cumulativeScore + (p.roundScore ?? 0);
  }
  return result;
}

// ─── Game Status ──────────────────────────────────────────────────────────────

export function getGameStatus(state: CaboState): {
  phase: GamePhaseStatus;
  result?: GameResult;
  currentPlayerId?: string;
  round?: number;
} {
  if (state.phase === 'GAME_OVER') {
    return {
      phase: 'finished',
      result: {
        winners: state.gameWinner ? [state.gameWinner] : [],
        scores: Object.fromEntries(state.players.map((p) => [p.id, p.cumulativeScore])),
        summary: `${state.players.find((p) => p.id === state.gameWinner)?.name ?? 'Unknown'} wins!`,
      },
      round: state.round,
    };
  }

  if (state.phase === 'PAUSED_DISCONNECTED') {
    return {
      phase: 'paused',
      currentPlayerId: getCurrentPlayer(state).id,
      round: state.round,
    };
  }

  if (state.phase === 'INITIAL_MEMORY') {
    return { phase: 'setup', round: state.round };
  }

  return {
    phase: 'playing',
    currentPlayerId: getCurrentPlayer(state).id,
    round: state.round,
  };
}

// ─── Available Actions ────────────────────────────────────────────────────────

export function getAvailableActions(state: CaboState, playerId: string): CaboAction[] {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return [];

  const actions: CaboAction[] = [];
  const isCurrentPlayer = getCurrentPlayer(state).id === playerId;

  switch (state.phase) {
    case 'INITIAL_MEMORY':
      if (!player.memoryReady) {
        actions.push({ type: 'MEMORY_READY', playerId });
      }
      break;

    case 'PLAYER_TURN':
      if (isCurrentPlayer) {
        if (state.deck.length > 0 || state.discardPile.length > 1) {
          actions.push({ type: 'DRAW_FROM_DECK', playerId });
        }
        if (state.discardPile.length > 0) {
          for (const slot of player.slots) {
            actions.push({ type: 'TAKE_DISCARD', playerId, slotId: slot.id });
          }
        }
        actions.push({ type: 'CALL_CABO', playerId });
      }
      break;

    case 'CARD_DRAWN':
      if (isCurrentPlayer) {
        for (const slot of player.slots) {
          actions.push({ type: 'REPLACE_CARD', playerId, slotId: slot.id });
        }
        actions.push({ type: 'DISCARD_DRAWN', playerId });
        actions.push({ type: 'CALL_CABO', playerId });
      }
      break;

    case 'SPECIAL_POWER': {
      const sp = state.specialPower;
      if (!sp || sp.actorId !== playerId) break;
      switch (sp.step) {
        case 'LOOK_OWN_SELECT':
          for (const slot of player.slots.filter((s) => s.cardId !== null)) {
            actions.push({ type: 'ABILITY_LOOK_OWN_SELECT', playerId, slotId: slot.id });
          }
          actions.push({ type: 'SKIP_ABILITY', playerId });
          break;
        case 'LOOK_OWN_VIEWING':
          actions.push({ type: 'ABILITY_LOOK_OWN_DONE', playerId });
          break;
        case 'LOOK_OTHER_SELECT_PLAYER':
          for (const opp of state.players.filter((p) => p.id !== playerId)) {
            actions.push({ type: 'ABILITY_LOOK_OTHER_SELECT_PLAYER', playerId, targetPlayerId: opp.id });
          }
          actions.push({ type: 'SKIP_ABILITY', playerId });
          break;
        case 'LOOK_OTHER_SELECT_CARD': {
          const targetP = state.players.find((p) => p.id === sp.targetPlayerId);
          if (targetP) {
            for (const slot of targetP.slots.filter((s) => s.cardId !== null)) {
              actions.push({ type: 'ABILITY_LOOK_OTHER_SELECT_CARD', playerId, targetSlotId: slot.id });
            }
          }
          break;
        }
        case 'LOOK_OTHER_VIEWING':
          actions.push({ type: 'ABILITY_LOOK_OTHER_DONE', playerId });
          break;
        case 'BLIND_SWAP_SELECT_OWN':
          for (const slot of player.slots.filter((s) => s.cardId !== null)) {
            actions.push({ type: 'ABILITY_BLIND_SWAP_SELECT_OWN', playerId, mySlotId: slot.id });
          }
          actions.push({ type: 'SKIP_ABILITY', playerId });
          break;
        case 'BLIND_SWAP_SELECT_TARGET':
          for (const opp of state.players.filter((p) => p.id !== playerId)) {
            for (const slot of opp.slots.filter((s) => s.cardId !== null)) {
              actions.push({ type: 'ABILITY_BLIND_SWAP_SELECT_TARGET', playerId, targetPlayerId: opp.id, targetSlotId: slot.id });
            }
          }
          break;
        case 'BK_SELECT_PLAYER':
          for (const opp of state.players.filter((p) => p.id !== playerId)) {
            actions.push({ type: 'ABILITY_BK_SELECT_PLAYER', playerId, targetPlayerId: opp.id });
          }
          actions.push({ type: 'SKIP_ABILITY', playerId });
          break;
        case 'BK_SELECT_CARD': {
          const targetP2 = state.players.find((p) => p.id === sp.targetPlayerId);
          if (targetP2) {
            for (const slot of targetP2.slots.filter((s) => s.cardId !== null)) {
              actions.push({ type: 'ABILITY_BK_SELECT_CARD', playerId, targetSlotId: slot.id });
            }
          }
          break;
        }
        case 'BK_VIEWING':
        case 'BK_DECIDE':
          for (const slot of player.slots.filter((s) => s.cardId !== null)) {
            actions.push({ type: 'ABILITY_BK_SWAP', playerId, mySlotId: slot.id });
          }
          actions.push({ type: 'ABILITY_BK_SKIP', playerId });
          break;
      }
      break;
    }

    case 'SNAP_WINDOW': {
      const sw = state.snapWindow;
      if (!sw) break;
      if (sw.step === 'OPEN') {
        // Any player can press snap
        actions.push({ type: 'SNAP_PRESS', playerId });
      } else if (sw.step === 'SELECT' && sw.winnerId === playerId) {
        // Winner selects which card to snap
        for (const p of state.players) {
          for (const slot of p.slots.filter((s) => s.cardId !== null)) {
            actions.push({ type: 'SNAP_SELECT_CARD', playerId, slotId: slot.id });
          }
        }
      } else if (sw.step === 'SELECT_OWN_TO_MOVE' && sw.winnerId === playerId) {
        for (const slot of player.slots.filter((s) => s.cardId !== null)) {
          actions.push({ type: 'SNAP_SELECT_OWN_TO_MOVE', playerId, mySlotId: slot.id });
        }
      }
      break;
    }

    case 'FINAL_TURN':
      // The current player in final-turn order gets to play
      if (isCurrentPlayer) {
        if (state.deck.length > 0 || state.discardPile.length > 1) {
          actions.push({ type: 'DRAW_FROM_DECK', playerId });
        }
        if (state.discardPile.length > 0) {
          for (const slot of player.slots) {
            actions.push({ type: 'TAKE_DISCARD', playerId, slotId: slot.id });
          }
        }
      }
      break;

    default:
      break;
  }

  return actions;
}

// ─── Player View Builder ──────────────────────────────────────────────────────

function buildCardView(
  state: CaboState,
  cardId: string | null,
  slotId: string,
  ownerId: string,
  myPlayerId: string,
  alwaysVisible = false
): CaboCardView | null {
  if (cardId === null) return null;
  const card = state.cards[cardId];
  if (!card) return null;

  const visible = alwaysVisible || isPlayerRevealedCard(state, myPlayerId, cardId);
  const def = visible ? state.definitions[card.definitionId] : null;

  return {
    id: cardId,
    slotId,
    ownerId,
    definitionId: def ? card.definitionId : null,
    value: def ? def.value : null,
    character: def ? def.character : null,
    characterIcon: def ? def.characterIcon : null,
    gradient: def ? def.gradient : null,
    ability: def ? def.ability : null,
    color: def ? def.color : null,
    abilityLabel: def ? def.abilityLabel : null,
  };
}

function buildPlayerView(
  state: CaboState,
  player: CaboPlayer,
  myPlayerId: string,
  currentPlayerId: string
): CaboPlayerView {
  const slots: CaboSlotView[] = player.slots.map((slot) => ({
    id: slot.id,
    card: slot.cardId
      ? buildCardView(state, slot.cardId, slot.id, player.id, myPlayerId)
      : null,
  }));

  return {
    id: player.id,
    name: player.name,
    seat: player.seat,
    connected: player.connected,
    slots,
    cumulativeScore: player.cumulativeScore,
    roundScore: player.roundScore,
    hasTakenFinalTurn: player.hasTakenFinalTurn,
    calledCabo: player.calledCabo,
    memoryReady: player.memoryReady,
    isCurrentTurn: player.id === currentPlayerId,
    cardCount: player.slots.filter((s) => s.cardId !== null).length,
  };
}

export function getPlayerView(state: CaboState, myPlayerId: string): CaboStateView {
  const currentPlayer = getCurrentPlayer(state);
  const currentPlayerId = currentPlayer.id;

  // Build all player views
  const allPlayers = [...state.players]
    .sort((a, b) => a.seat - b.seat)
    .map((p) => buildPlayerView(state, p, myPlayerId, currentPlayerId));

  const myPlayerView = allPlayers.find((p) => p.id === myPlayerId) ?? allPlayers[0];
  const opponents = allPlayers.filter((p) => p.id !== myPlayerId);

  // Top discard: always visible
  const topDiscard = getTopDiscard(state);
  let topDiscardCardView: CaboCardView | null = null;
  if (topDiscard) {
    const def = state.definitions[topDiscard.definitionId];
    if (def) {
      topDiscardCardView = {
        id: topDiscard.cardId,
        slotId: 'discard',
        ownerId: 'discard',
        definitionId: topDiscard.definitionId,
        value: def.value,
        character: def.character,
        characterIcon: def.characterIcon,
        gradient: def.gradient,
        ability: def.ability,
        color: def.color,
        abilityLabel: def.abilityLabel,
      };
    }
  }

  // Drawn card: visible to acting player
  let drawnCardView: CaboCardView | null = null;
  if (state.drawnCardId && myPlayerId === currentPlayerId) {
    const card = state.cards[state.drawnCardId];
    if (card) {
      const def = state.definitions[card.definitionId];
      if (def) {
        drawnCardView = {
          id: state.drawnCardId,
          slotId: 'hand',
          ownerId: myPlayerId,
          definitionId: card.definitionId,
          value: def.value,
          character: def.character,
          characterIcon: def.characterIcon,
          gradient: def.gradient,
          ability: def.ability,
          color: def.color,
          abilityLabel: def.abilityLabel,
        };
      }
    }
  }

  const remainingFinalTurnIds = state.finalTurnPlayerIds.slice(state.finalTurnIndex);

  return {
    phase: state.phase,
    round: state.round,
    myPlayerId,
    myPlayer: myPlayerView,
    opponents,
    allPlayers,
    deckSize: state.deck.length,
    topDiscardCard: topDiscardCardView,
    drawnCard: drawnCardView,
    currentPlayerIndex: state.currentPlayerIndex,
    currentPlayerId,
    specialPower: state.specialPower,
    snapWindow: state.snapWindow,
    caboCallerId: state.caboCallerId,
    finalTurnPlayerIds: state.finalTurnPlayerIds,
    finalTurnIndex: state.finalTurnIndex,
    targetScore: state.targetScore,
    pausedByDisconnect: state.pausedByDisconnect,
    gameWinner: state.gameWinner,
    lastEvent: state.lastEvent,
    roundRevealIndex: state.roundRevealIndex,
    remainingFinalTurnIds,
  };
}
