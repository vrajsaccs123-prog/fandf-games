/**
 * Cabo — Action Types
 */

export type CaboAction =
  // ─── Setup ───────────────────────────────────────────────────────────────
  | { type: 'MEMORY_READY'; playerId: string }         // player done viewing initial cards

  // ─── Turn Actions ─────────────────────────────────────────────────────────
  | { type: 'DRAW_FROM_DECK'; playerId: string }
  | { type: 'TAKE_DISCARD'; playerId: string; slotId: string }  // take top discard, replace slot
  | { type: 'REPLACE_CARD'; playerId: string; slotId: string }  // place drawn card in slot
  | { type: 'DISCARD_DRAWN'; playerId: string }                 // discard the drawn card
  | { type: 'CALL_CABO'; playerId: string }                     // call cabo (ends round)

  // ─── Special Abilities ────────────────────────────────────────────────────
  | { type: 'SKIP_ABILITY'; playerId: string }
  | { type: 'ABILITY_LOOK_OWN_SELECT'; playerId: string; slotId: string }
  | { type: 'ABILITY_LOOK_OWN_DONE'; playerId: string }
  | { type: 'ABILITY_LOOK_OTHER_SELECT_PLAYER'; playerId: string; targetPlayerId: string }
  | { type: 'ABILITY_LOOK_OTHER_SELECT_CARD'; playerId: string; targetSlotId: string }
  | { type: 'ABILITY_LOOK_OTHER_DONE'; playerId: string }
  | { type: 'ABILITY_BLIND_SWAP_SELECT_OWN'; playerId: string; mySlotId: string }
  | { type: 'ABILITY_BLIND_SWAP_SELECT_TARGET'; playerId: string; targetPlayerId: string; targetSlotId: string }
  | { type: 'ABILITY_BK_SELECT_PLAYER'; playerId: string; targetPlayerId: string }
  | { type: 'ABILITY_BK_SELECT_CARD'; playerId: string; targetSlotId: string }
  | { type: 'ABILITY_BK_SWAP'; playerId: string; mySlotId: string }
  | { type: 'ABILITY_BK_SKIP'; playerId: string }

  // ─── Snapping ─────────────────────────────────────────────────────────────
  | { type: 'SNAP_PRESS'; playerId: string }
  | { type: 'SNAP_SELECT_CARD'; playerId: string; slotId: string }
  | { type: 'SNAP_SELECT_OWN_TO_MOVE'; playerId: string; mySlotId: string }

  // ─── Round/Game Management ────────────────────────────────────────────────
  | { type: 'ADVANCE_ROUND_REVEAL' }
  | { type: 'START_NEXT_ROUND' }

  // ─── System ───────────────────────────────────────────────────────────────
  | { type: 'PLAYER_DISCONNECTED'; playerId: string }
  | { type: 'PLAYER_RECONNECTED'; playerId: string };
