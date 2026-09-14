/**
 * Blackjack — Action union type.
 *
 * Every possible player input is modelled as an explicit action.
 * These are serializable and can be replayed for debugging.
 */

export type BlackjackAction =
  | { type: "PLACE_BET"; playerId: string; amount: number }
  | { type: "START_ROUND" }
  | { type: "HIT"; playerId: string }
  | { type: "STAND"; playerId: string }
  | { type: "DOUBLE_DOWN"; playerId: string }
  | { type: "NEXT_ROUND" };
