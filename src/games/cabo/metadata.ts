import type { GameMetadata } from '@/game/core/types';
import { catalogueFieldsFromRules } from '@/game/core/rulesFacts';
import { caboFacts } from './rules';

export const caboMetadata: GameMetadata = {
  id: 'cabo',
  name: 'Cabo',
  shortDescription: 'A memory card game of cunning, deception, and perfect recall.',
  description:
    'Cabo is a fast-paced memory card game where players try to have the lowest total card value. You can only see some of your cards — the rest must be memorized. Use special abilities to peek, spy, and swap cards. When you think you have the lowest score, call CABO — but beware, one wrong move can cost you the round!',

  ...catalogueFieldsFromRules(caboFacts),

  difficulty: 'medium',
  durationMinutes: { min: 15, max: 45 },
  categories: ['card', 'party', 'competitive'],
  mechanics: ['hand-management', 'deduction', 'bluffing'],
  image: '/assets/games/cabo/cover.png',
  accent: '#6A1B9A',
  status: 'available',
};
