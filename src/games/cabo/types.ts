/**
 * Cabo — Complete TypeScript type system.
 *
 * Key design principles:
 * - Stable slot IDs: cards NEVER automatically move between slots.
 * - Hidden information: card values are only visible through the reveals map.
 * - Server-authoritative: CaboState is the full truth; CaboStateView is per-player.
 */

// ─── Card Types ───────────────────────────────────────────────────────────────

export type CardSuit = 'hearts' | 'diamonds' | 'clubs' | 'spades' | 'joker';
export type CardRank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 'J' | 'Q' | 'BK' | 'RK' | 'JOKER';

export type CaboAbility = 'LOOK_OWN' | 'LOOK_OTHER' | 'BLIND_SWAP' | 'LOOK_SWAP';

export interface CardDefinition {
  id: string;            // e.g. 'RK-hearts', 'J-clubs', 'JOKER-1'
  rank: CardRank;
  suit: CardSuit;
  value: number;         // scoring: Joker=-1, RK=0, 2-10=face, J=11, Q=12, BK=13
  ability: CaboAbility | null;
  character: string;     // e.g. 'The Phantom'
  characterIcon: string; // emoji
  description: string;   // one-line card description
  color: 'red' | 'black' | 'special';
  abilityLabel: string | null;
  gradient: string;      // CSS gradient for card background
}

// Card instance (a specific physical card in the game)
export interface CaboCard {
  id: string;          // unique e.g. 'card-7'
  definitionId: string;
}

// ─── Slot System ──────────────────────────────────────────────────────────────

/**
 * A slot is a persistent position in a player's area.
 * Slots NEVER move. Empty slots remain visible.
 */
export interface CaboSlot {
  id: string;          // e.g. 'p-player1-slot-0'
  ownerId: string;     // player ID
  cardId: string | null;
}

// ─── Player ───────────────────────────────────────────────────────────────────

export interface CaboPlayer {
  id: string;
  name: string;
  seat: number;
  connected: boolean;
  slots: CaboSlot[];
  cumulativeScore: number;
  roundScore: number | null;
  hasTakenFinalTurn: boolean;
  calledCabo: boolean;
  memoryReady: boolean;
}

// ─── Special Power States ─────────────────────────────────────────────────────

export type SpecialPowerState =
  | { step: 'LOOK_OWN_SELECT'; actorId: string }
  | { step: 'LOOK_OWN_VIEWING'; actorId: string; targetSlotId: string; cardId: string }
  | { step: 'LOOK_OTHER_SELECT_PLAYER'; actorId: string }
  | { step: 'LOOK_OTHER_SELECT_CARD'; actorId: string; targetPlayerId: string }
  | { step: 'LOOK_OTHER_VIEWING'; actorId: string; targetPlayerId: string; targetSlotId: string; cardId: string }
  | { step: 'BLIND_SWAP_SELECT_OWN'; actorId: string }
  | { step: 'BLIND_SWAP_SELECT_TARGET'; actorId: string; mySlotId: string }
  | { step: 'BK_SELECT_PLAYER'; actorId: string }
  | { step: 'BK_SELECT_CARD'; actorId: string; targetPlayerId: string }
  | { step: 'BK_VIEWING'; actorId: string; targetPlayerId: string; targetSlotId: string; cardId: string }
  | { step: 'BK_DECIDE'; actorId: string; targetPlayerId: string; targetSlotId: string; cardId: string };

// ─── Snap State ───────────────────────────────────────────────────────────────

export interface SnapWindowState {
  discardValue: number;
  winnerId: string | null;
  step: 'OPEN' | 'SELECT' | 'SELECT_OWN_TO_MOVE';
  selectedSlotId: string | null;           // slot being snapped
  targetPlayerId: string | null;           // owner of selected slot (for cross-player snap)
  pendingAbility: CaboAbility | null;      // ability to trigger after snap closes
  pendingAbilityActorId: string | null;    // who should use the ability
}

// ─── Game Events ──────────────────────────────────────────────────────────────

export type CaboGameEvent =
  | { type: 'CARD_DRAWN'; playerId: string }
  | { type: 'CARD_DISCARDED'; definitionId: string; value: number }
  | { type: 'CARD_REPLACED'; playerId: string; slotId: string }
  | { type: 'CARD_TAKEN_FROM_DISCARD'; playerId: string; slotId: string }
  | { type: 'SPECIAL_LOOK'; actorId: string; targetPlayerId: string; targetSlotId: string }
  | { type: 'SPECIAL_SWAP'; actorId: string; mySlotId: string; targetPlayerId: string; targetSlotId: string }
  | { type: 'SNAP_ATTEMPTED'; winnerId: string; slotId: string; correct: boolean }
  | { type: 'SNAP_SELF_SUCCESS'; winnerId: string; slotId: string }
  | { type: 'SNAP_OTHER_SUCCESS'; winnerId: string; mySlotId: string; targetPlayerId: string; targetSlotId: string }
  | { type: 'SNAP_FAILURE'; loserId: string; penaltySlotId: string }
  | { type: 'CABO_CALLED'; callerId: string }
  | { type: 'ROUND_ENDED' }
  | { type: 'PLAYER_DISCONNECTED'; playerId: string }
  | { type: 'PLAYER_RECONNECTED'; playerId: string };

// ─── Game Phase ───────────────────────────────────────────────────────────────

export type CaboPhase =
  | 'INITIAL_MEMORY'
  | 'PLAYER_TURN'
  | 'CARD_DRAWN'
  | 'SPECIAL_POWER'
  | 'SNAP_WINDOW'
  | 'CABO_CALLED'
  | 'FINAL_TURN'
  | 'ROUND_REVEAL'
  | 'ROUND_SCORE'
  | 'GAME_OVER'
  | 'PAUSED_DISCONNECTED';

// ─── Full Authoritative State ─────────────────────────────────────────────────

export interface CaboState {
  phase: CaboPhase;
  round: number;
  players: CaboPlayer[];

  cards: Record<string, CaboCard>;
  definitions: Record<string, CardDefinition>;

  deck: string[];        // cardIds, index 0 = top
  discardPile: string[]; // cardIds, last = top

  currentPlayerIndex: number;
  drawnCardId: string | null;
  drawnFromDiscard: boolean;

  specialPower: SpecialPowerState | null;
  snapWindow: SnapWindowState | null;

  caboCallerId: string | null;
  finalTurnPlayerIds: string[];
  finalTurnIndex: number;

  // playerId → array of cardIds currently visible to that player
  reveals: Record<string, string[]>;

  targetScore: number;
  seed: string;

  pausedByDisconnect: string | null;
  phaseBeforePause: CaboPhase | null;

  gameWinner: string | null;
  roundRevealIndex: number;

  lastEvent: CaboGameEvent | null;
}

// ─── Player View Types ────────────────────────────────────────────────────────

export interface CaboCardView {
  id: string;
  slotId: string;
  ownerId: string;
  definitionId: string | null;   // null = hidden
  value: number | null;
  character: string | null;
  characterIcon: string | null;
  gradient: string | null;
  ability: CaboAbility | null;
  color: 'red' | 'black' | 'special' | null;
  abilityLabel: string | null;
}

export interface CaboSlotView {
  id: string;
  card: CaboCardView | null;
}

export interface CaboPlayerView {
  id: string;
  name: string;
  seat: number;
  connected: boolean;
  slots: CaboSlotView[];
  cumulativeScore: number;
  roundScore: number | null;
  hasTakenFinalTurn: boolean;
  calledCabo: boolean;
  memoryReady: boolean;
  isCurrentTurn: boolean;
  cardCount: number;
}

export interface CaboStateView {
  phase: CaboPhase;
  round: number;
  myPlayerId: string;
  myPlayer: CaboPlayerView;
  opponents: CaboPlayerView[];
  allPlayers: CaboPlayerView[];
  deckSize: number;
  topDiscardCard: CaboCardView | null;
  drawnCard: CaboCardView | null;
  currentPlayerIndex: number;
  currentPlayerId: string;
  specialPower: SpecialPowerState | null;
  snapWindow: SnapWindowState | null;
  caboCallerId: string | null;
  finalTurnPlayerIds: string[];
  finalTurnIndex: number;
  targetScore: number;
  pausedByDisconnect: string | null;
  gameWinner: string | null;
  lastEvent: CaboGameEvent | null;
  roundRevealIndex: number;
  // convenience: which players have not yet taken final turn
  remainingFinalTurnIds: string[];
}
