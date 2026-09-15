/**
 * Codenames — action union type.
 *
 * Every possible player action in the game.
 */

export type CodenamesAction =
  /** Spymaster gives a one-word clue + count */
  | { type: "GIVE_CLUE"; playerId: string; clueWord: string; count: number }
  /** Operative reveals a card on the board */
  | { type: "GUESS_CARD"; playerId: string; cardId: number }
  /** Operative chooses to end their team's turn early */
  | { type: "END_TURN"; playerId: string }
  /** Round timer ran out — skip to the other team's clue-giving turn */
  | { type: "TIMER_EXPIRED" };
