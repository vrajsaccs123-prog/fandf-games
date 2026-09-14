/**
 * Cabo — Card Definitions.
 *
 * The full 50-card Cabo deck:
 * - 4 suits × 12 ranks (2–K, no Aces) = 48 cards
 * - + 2 Jokers
 * = 50 cards total
 *
 * Values: 2-10 face, J=11, Q=12, Black King=13, Red King=0, Joker=-1
 * Abilities: 7/8=LOOK_OWN, 9/10=LOOK_OTHER, J/Q=BLIND_SWAP, Black King=LOOK_SWAP
 */

import type { CardDefinition, CaboCard, CaboAbility } from './types';

// ─── Character & Visual Definitions per Rank ─────────────────────────────────

const RANK_VISUALS: Record<string, {
  character: string; characterIcon: string; description: string; gradient: string; abilityLabel: string | null;
}> = {
  '2': {
    character: 'The Sprite', characterIcon: '✨',
    description: 'A mischievous spirit with a very low score.',
    gradient: 'linear-gradient(135deg, #1565C0 0%, #0D47A1 100%)',
    abilityLabel: null,
  },
  '3': {
    character: 'The Scout', characterIcon: '🏃',
    description: 'Fleet-footed and quick to spot opportunities.',
    gradient: 'linear-gradient(135deg, #2E7D32 0%, #1B5E20 100%)',
    abilityLabel: null,
  },
  '4': {
    character: 'The Guard', characterIcon: '🛡️',
    description: 'Stalwart defender with moderate weight.',
    gradient: 'linear-gradient(135deg, #4527A0 0%, #311B92 100%)',
    abilityLabel: null,
  },
  '5': {
    character: 'The Sage', characterIcon: '📖',
    description: 'Wise and careful, worth a modest price.',
    gradient: 'linear-gradient(135deg, #00695C 0%, #004D40 100%)',
    abilityLabel: null,
  },
  '6': {
    character: 'The Rogue', characterIcon: '🗡️',
    description: 'Cunning trickster lurking in the shadows.',
    gradient: 'linear-gradient(135deg, #558B2F 0%, #33691E 100%)',
    abilityLabel: null,
  },
  '7': {
    character: 'The Seer', characterIcon: '🔮',
    description: 'Grants the power to peek at your own cards.',
    gradient: 'linear-gradient(135deg, #6A1B9A 0%, #4A148C 100%)',
    abilityLabel: 'Peek Own',
  },
  '8': {
    character: 'The Oracle', characterIcon: '👁️',
    description: 'Mystic eyes that reveal hidden truths about yourself.',
    gradient: 'linear-gradient(135deg, #AD1457 0%, #880E4F 100%)',
    abilityLabel: 'Peek Own',
  },
  '9': {
    character: 'The Spy', characterIcon: '🕵️',
    description: 'Secretly views one of an opponent\'s face-down cards.',
    gradient: 'linear-gradient(135deg, #1565C0 0%, #0D47A1 100%)',
    abilityLabel: 'Peek Opponent',
  },
  '10': {
    character: 'The Detective', characterIcon: '🔍',
    description: 'Sharp investigator who uncovers enemy secrets.',
    gradient: 'linear-gradient(135deg, #00838F 0%, #006064 100%)',
    abilityLabel: 'Peek Opponent',
  },
  'J': {
    character: 'The Trickster', characterIcon: '🤹',
    description: 'Blindly swaps one of your cards with an opponent\'s.',
    gradient: 'linear-gradient(135deg, #E65100 0%, #BF360C 100%)',
    abilityLabel: 'Blind Swap',
  },
  'Q': {
    character: 'The Witch', characterIcon: '🧙',
    description: 'Casts a spell to exchange cards without looking.',
    gradient: 'linear-gradient(135deg, #880E4F 0%, #560027 100%)',
    abilityLabel: 'Blind Swap',
  },
  'BK': {
    character: 'The Emperor', characterIcon: '👑',
    description: 'Commands to see and optionally seize an opponent\'s card.',
    gradient: 'linear-gradient(135deg, #212121 0%, #424242 100%)',
    abilityLabel: 'Look & Swap',
  },
  'RK': {
    character: 'The Phantom', characterIcon: '👻',
    description: 'Worth nothing — the most coveted card in the deck.',
    gradient: 'linear-gradient(135deg, #C62828 0%, #8B0000 100%)',
    abilityLabel: null,
  },
  'JOKER': {
    character: 'The Jester', characterIcon: '🃏',
    description: 'A wild card of negative value — incredible luck!',
    gradient: 'linear-gradient(135deg, #7928CA 0%, #FF0080 100%)',
    abilityLabel: null,
  },
};

// ─── Build the full deck ──────────────────────────────────────────────────────

function getAbilityForRank(rank: string): CaboAbility | null {
  if (rank === '7' || rank === '8') return 'LOOK_OWN';
  if (rank === '9' || rank === '10') return 'LOOK_OTHER';
  if (rank === 'J' || rank === 'Q') return 'BLIND_SWAP';
  if (rank === 'BK') return 'LOOK_SWAP';
  return null;
}

function getValueForRank(rank: string, suit: string): number {
  if (rank === 'JOKER') return -1;
  if (rank === 'RK') return 0;
  if (rank === 'BK') return 13;
  if (rank === 'Q') return 12;
  if (rank === 'J') return 11;
  return parseInt(rank, 10);
}

function getColorForSuit(suit: string, rank: string): 'red' | 'black' | 'special' {
  if (rank === 'JOKER') return 'special';
  if (suit === 'hearts' || suit === 'diamonds') return 'red';
  return 'black';
}

const SUITS: Array<{ suit: string; suitSymbol: string }> = [
  { suit: 'hearts', suitSymbol: '♥' },
  { suit: 'diamonds', suitSymbol: '♦' },
  { suit: 'clubs', suitSymbol: '♣' },
  { suit: 'spades', suitSymbol: '♠' },
];

const REGULAR_RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q'];

export const ALL_CARD_DEFINITIONS: CardDefinition[] = [];

// Regular cards: 2-Q for all 4 suits (44 cards)
for (const { suit } of SUITS) {
  for (const rank of REGULAR_RANKS) {
    const id = `${rank}-${suit}`;
    const visuals = RANK_VISUALS[rank];
    ALL_CARD_DEFINITIONS.push({
      id,
      rank: (isNaN(Number(rank)) ? rank : Number(rank)) as CardDefinition['rank'],
      suit: suit as CardDefinition['suit'],
      value: getValueForRank(rank, suit),
      ability: getAbilityForRank(rank),
      character: visuals.character,
      characterIcon: visuals.characterIcon,
      description: visuals.description,
      color: getColorForSuit(suit, rank),
      abilityLabel: visuals.abilityLabel,
      gradient: visuals.gradient,
    });
  }
}

// Kings: Red Kings (hearts/diamonds) = 0, Black Kings (clubs/spades) = 13
for (const { suit } of SUITS) {
  const isRed = suit === 'hearts' || suit === 'diamonds';
  const rank = isRed ? 'RK' : 'BK';
  const id = `K-${suit}`;
  const visuals = RANK_VISUALS[rank];
  ALL_CARD_DEFINITIONS.push({
    id,
    rank: rank as CardDefinition['rank'],
    suit: suit as CardDefinition['suit'],
    value: getValueForRank(rank, suit),
    ability: getAbilityForRank(rank),
    character: visuals.character,
    characterIcon: visuals.characterIcon,
    description: visuals.description,
    color: getColorForSuit(suit, rank),
    abilityLabel: visuals.abilityLabel,
    gradient: visuals.gradient,
  });
}

// 2 Jokers
for (let i = 1; i <= 2; i++) {
  const visuals = RANK_VISUALS['JOKER'];
  ALL_CARD_DEFINITIONS.push({
    id: `JOKER-${i}`,
    rank: 'JOKER',
    suit: 'joker',
    value: -1,
    ability: null,
    character: visuals.character,
    characterIcon: visuals.characterIcon,
    description: visuals.description,
    color: 'special',
    abilityLabel: null,
    gradient: visuals.gradient,
  });
}

// Total: 44 + 4 + 2 = 50 cards ✓

export const DEFINITIONS_MAP: Record<string, CardDefinition> = {};
for (const def of ALL_CARD_DEFINITIONS) {
  DEFINITIONS_MAP[def.id] = def;
}

// ─── Helper functions ─────────────────────────────────────────────────────────

export function getDefinition(definitionId: string): CardDefinition {
  const def = DEFINITIONS_MAP[definitionId];
  if (!def) throw new Error(`Unknown card definition: ${definitionId}`);
  return def;
}

export function getCardValue(definitionId: string): number {
  return getDefinition(definitionId).value;
}

export function getCardAbility(definitionId: string): CaboAbility | null {
  return getDefinition(definitionId).ability;
}

/**
 * Create 50 CaboCard instances (one per definition).
 */
export function createCaboDeck(): CaboCard[] {
  return ALL_CARD_DEFINITIONS.map((def, i) => ({
    id: `card-${i}`,
    definitionId: def.id,
  }));
}

// Display rank label (for UI)
export function getDisplayRank(def: CardDefinition): string {
  const r = def.rank;
  if (r === 'JOKER') return 'JKR';
  if (r === 'RK' || r === 'BK') return 'K';
  if (r === 'J') return 'J';
  if (r === 'Q') return 'Q';
  return String(r);
}

// Suit symbol
export function getSuitSymbol(def: CardDefinition): string {
  switch (def.suit) {
    case 'hearts': return '♥';
    case 'diamonds': return '♦';
    case 'clubs': return '♣';
    case 'spades': return '♠';
    case 'joker': return '★';
  }
}
