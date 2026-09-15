/**
 * Cabo — Rules content
 */

import type { GameRules, GameRulesFacts } from '@/game/core/types';
import { formatPlayerCountLabel } from '@/game/core/rulesFacts';

export const caboFacts: GameRulesFacts = {
  minPlayers: 2,
  maxPlayers: 6,
  recommendedPlayers: [3, 4],
  supportsLocal: false,
  supportsOffline: false,
  supportsOnline: true,
};

export function getCaboRules(): GameRules {
  return {
    facts: caboFacts,
    overview:
      `Cabo is a memory card game for ${formatPlayerCountLabel(caboFacts)}. Each player has 4 face-down cards. You can only peek at some of them at the start — the rest you must memorize. On your turn, draw or take from the discard pile. When you think you have the lowest total score, call CABO to trigger the final turns. Lowest score wins the round.`,
    objective:
      'Have the lowest total card value when Cabo is called. The game ends when a player\'s cumulative score reaches or exceeds the target score. The player with the lowest cumulative score wins.',
    setup: [
      {
        title: 'Starting the game',
        content: 'Each player receives 4 face-down cards placed in stable slots. At the start, every player secretly peeks at their first 2 cards (slots 1 and 2). Once you have seen them, you must memorize their positions — they go face down and you cannot look again unless you use a special ability.',
      },
      {
        title: 'Card values',
        content: 'Cards score as follows:',
        items: [
          '2–10: face value',
          'Jack (J): 11 points',
          'Queen (Q): 12 points',
          'Black King (Clubs/Spades): 13 points',
          'Red King (Hearts/Diamonds): 0 points — the best card!',
          'Joker: −1 point',
        ],
      },
    ],
    gameplay: [
      {
        title: 'On your turn',
        content: 'Choose one of three options:',
        items: [
          '1. Draw from the deck: Take the top deck card. You may then replace one of your face-down cards with it (old card goes to discard), or discard the drawn card (may trigger a special ability).',
          '2. Take the top discard: Exchange the top discard card for one of your own cards. Your old card goes to discard.',
          '3. Call CABO: End the round trigger. All other players each get one final turn.',
        ],
      },
      {
        title: 'Special abilities (triggered by discarding)',
        content: 'When you draw a special card from the deck and discard it (not replace), you may use its ability:',
        items: [
          '7 or 8 — Peek Own: Look at one of your own face-down cards.',
          '9 or 10 — Peek Opponent: Look at one face-down card belonging to another player.',
          'Jack or Queen — Blind Swap: Swap one of your face-down cards with one of another player\'s, without looking.',
          'Black King — Look & Swap: Look at one of another player\'s face-down cards. Then optionally swap it with one of your own cards.',
        ],
      },
      {
        title: 'Snapping',
        content: 'After any card is discarded, any player may instantly SNAP by pressing the SNAP button. The first player to snap wins the snap reaction.',
        items: [
          'Snapping works on NUMERICAL VALUE only — not character, suit, color, or ability.',
          'After snapping, select any card on the table you believe matches the discarded card\'s value.',
          'Correct — Own card: The card is removed from your slot (slot stays empty).',
          'Correct — Opponent\'s card: Their card is removed, and you move one of your cards into that vacated slot.',
          'Incorrect: You receive one additional card as a penalty.',
        ],
      },
    ],
    endCondition: [
      {
        title: 'Calling CABO',
        content: 'Any player may call CABO at the start of their turn instead of drawing. This announces they believe they have the lowest total. All other players then get exactly one final turn each (in turn order). Snapping remains available during final turns.',
      },
      {
        title: 'Round scoring',
        content: 'After all final turns, all cards are revealed. Each player totals the values of all their remaining cards. These scores are added to cumulative totals.',
      },
      {
        title: 'Game end',
        content: 'The game continues across multiple rounds until any player\'s cumulative score reaches or exceeds the target score (set by the host). The player with the lowest cumulative score wins.',
      },
    ],
    scoring: [
      {
        title: 'Score summary',
        content: 'Lower is better!',
        items: [
          'Joker: −1 (negative! Great to have)',
          'Red King: 0 (the best regular card)',
          '2–10: face value',
          'Jack: 11',
          'Queen: 12',
          'Black King: 13 (worst card)',
        ],
      },
    ],
    specialRules: [
      {
        title: 'Stable card positions',
        content: 'Card positions (slots) are permanent. If a card is removed from a slot, that slot stays empty — cards never automatically shuffle together. Remember WHERE each card is, not just what you have.',
      },
      {
        title: 'Disconnection',
        content: 'If a player disconnects, the game pauses. Remaining players see a rejoin code they can share so that person can sit back down in the same seat. No automatic play occurs.',
      },
    ],
    glossary: [
      { term: 'CABO', definition: 'The announcement that triggers final turns for all other players.' },
      { term: 'Snap', definition: 'A reaction mechanic allowing any player to claim a matching card value after any discard.' },
      { term: 'Slot', definition: 'A permanent position in a player\'s hand. Slots do not move or collapse when empty.' },
      { term: 'Peek', definition: 'Temporarily seeing the face value of a face-down card.' },
      { term: 'Blind Swap', definition: 'Exchanging cards without looking at either card\'s face.' },
    ],
  };
}
