/**
 * Cabo — Card Component
 *
 * Renders a single Cabo card with custom character artwork.
 * Shows face-up (value revealed) or face-down (back shown).
 */

'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/cn';
import type { CaboCardView } from '../types';
import { getDisplayRank, getSuitSymbol, getDefinition } from '../cardDefinitions';
import { DEFINITIONS_MAP } from '../cardDefinitions';

interface CardProps {
  card: CaboCardView | null;  // null = empty slot
  size?: 'sm' | 'md' | 'lg';
  isSelected?: boolean;
  isHighlighted?: boolean;
  isSelectable?: boolean;
  isDisabled?: boolean;
  faceUp?: boolean;           // override: force face-up (for reveal phase)
  onClick?: () => void;
  className?: string;
  animate?: boolean;
  label?: string;             // accessibility label
}

const SIZE_CLASSES = {
  sm: 'w-10 h-14',
  md: 'w-14 h-20',
  lg: 'w-16 h-24',
};

const SIZE_TEXT = {
  sm: { rank: 'text-sm', icon: 'text-base', char: 'text-[9px]' },
  md: { rank: 'text-lg', icon: 'text-xl', char: 'text-[10px]' },
  lg: { rank: 'text-xl', icon: 'text-2xl', char: 'text-xs' },
};

// ─── Card Back ────────────────────────────────────────────────────────────────

function CardBack({ size }: { size: 'sm' | 'md' | 'lg' }) {
  return (
    <div
      className={cn(
        'relative flex items-center justify-center rounded-[var(--radius-card)] overflow-hidden select-none',
        SIZE_CLASSES[size],
      )}
      style={{
        background: 'linear-gradient(135deg, #1a1035 0%, #0d1b4b 50%, #1a1035 100%)',
        boxShadow: 'var(--shadow-card)',
        border: '1.5px solid rgba(100,120,200,0.3)',
      }}
    >
      {/* Pattern */}
      <div
        className="absolute inset-[3px] rounded-[6px] flex items-center justify-center"
        style={{
          background: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 6px)',
          border: '1px solid rgba(100,120,200,0.15)',
        }}
      />
      <span
        className="relative z-10 text-[rgba(100,120,200,0.6)] font-bold select-none"
        style={{ fontSize: size === 'sm' ? '14px' : size === 'md' ? '18px' : '22px' }}
      >
        C
      </span>
    </div>
  );
}

// ─── Card Face ────────────────────────────────────────────────────────────────

function CardFace({ card, size }: { card: CaboCardView; size: 'sm' | 'md' | 'lg' }) {
  if (!card.definitionId) return <CardBack size={size} />;

  const def = DEFINITIONS_MAP[card.definitionId];
  if (!def) return <CardBack size={size} />;

  const t = SIZE_TEXT[size];
  const displayRank = getDisplayRank(def);
  const suitSymbol = getSuitSymbol(def);
  const isRed = def.color === 'red';
  const isSpecial = def.color === 'special';

  return (
    <div
      className={cn(
        'relative flex flex-col items-center justify-between rounded-[var(--radius-card)] overflow-hidden select-none cursor-default',
        SIZE_CLASSES[size],
        'p-1',
      )}
      style={{
        background: def.gradient,
        boxShadow: 'var(--shadow-card)',
        border: '1.5px solid rgba(255,255,255,0.15)',
      }}
    >
      {/* Top-left rank + suit */}
      <div className="self-start flex flex-col items-center leading-none">
        <span
          className={cn('font-bold text-white', t.rank)}
          style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}
        >
          {displayRank}
        </span>
        <span
          className={cn('leading-none', t.char, isRed || isSpecial ? 'text-red-300' : 'text-gray-300')}
        >
          {suitSymbol}
        </span>
      </div>

      {/* Center character icon */}
      <div className="flex flex-col items-center gap-0.5">
        <span className={cn(t.icon)}>{def.characterIcon}</span>
        {size !== 'sm' && (
          <span className="text-[7px] text-white/70 leading-none text-center font-medium max-w-[52px] truncate">
            {def.character}
          </span>
        )}
      </div>

      {/* Bottom-right rank (rotated) */}
      <div className="self-end flex flex-col items-center leading-none rotate-180">
        <span className={cn('font-bold text-white', t.rank)} style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
          {displayRank}
        </span>
        <span className={cn('leading-none', t.char, isRed || isSpecial ? 'text-red-300' : 'text-gray-300')}>
          {suitSymbol}
        </span>
      </div>

      {/* Ability badge */}
      {def.abilityLabel && size !== 'sm' && (
        <div
          className="absolute bottom-1 left-0 right-0 mx-1 text-[6px] text-white/80 bg-black/30 rounded text-center py-px leading-none"
          style={{ fontSize: '6px' }}
        >
          {def.abilityLabel}
        </div>
      )}
    </div>
  );
}

// ─── Main Card Component ──────────────────────────────────────────────────────

export function Card({
  card,
  size = 'md',
  isSelected = false,
  isHighlighted = false,
  isSelectable = false,
  isDisabled = false,
  faceUp = false,
  onClick,
  className,
  animate = true,
  label,
}: CardProps) {
  const isVisible = faceUp || (card?.definitionId != null);

  const variants = {
    initial: { scale: 0.8, opacity: 0, rotateY: 90 },
    animate: { scale: 1, opacity: 1, rotateY: 0 },
    exit: { scale: 0.8, opacity: 0, rotateY: -90 },
    hover: { scale: isSelectable ? 1.08 : 1.0, y: isSelectable ? -4 : 0 },
    selected: { scale: 1.1, y: -6 },
    highlighted: { scale: 1.05, y: -3 },
  };

  const currentVariant = isSelected ? 'selected' : isHighlighted ? 'highlighted' : 'animate';

  return (
    <motion.div
      className={cn(
        'relative cursor-default select-none',
        isSelectable && !isDisabled && 'cursor-pointer',
        isDisabled && 'opacity-50',
        className,
      )}
      initial={animate ? 'initial' : false}
      animate={currentVariant}
      variants={variants}
      whileHover={isSelectable && !isDisabled ? 'hover' : undefined}
      whileTap={isSelectable && !isDisabled ? { scale: 0.95 } : undefined}
      onClick={isSelectable && !isDisabled ? onClick : undefined}
      role={isSelectable ? 'button' : undefined}
      aria-label={label ?? (isVisible && card?.character ? card.character : 'Face-down card')}
      tabIndex={isSelectable && !isDisabled ? 0 : undefined}
      onKeyDown={(e) => {
        if (isSelectable && !isDisabled && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      {/* Selection ring */}
      {isSelected && (
        <div className="absolute -inset-1 rounded-[var(--radius-card)] ring-2 ring-[rgb(var(--color-primary))] ring-offset-1 ring-offset-transparent z-10 pointer-events-none" />
      )}
      {isHighlighted && (
        <motion.div
          className="absolute -inset-0.5 rounded-[var(--radius-card)] ring-2 ring-yellow-400 z-10 pointer-events-none"
          animate={{ opacity: [1, 0.5, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
        />
      )}

      {/* The card itself */}
      {card && isVisible ? (
        <CardFace card={card} size={size} />
      ) : (
        <CardBack size={size} />
      )}
    </motion.div>
  );
}

// ─── Drawn Card (in hand, prominent) ─────────────────────────────────────────

interface DrawnCardProps {
  card: CaboCardView;
  onReplace: (slotId: string) => void;  // trigger slot selection
  onDiscard: () => void;
  onCallCabo: () => void;
  canCallCabo: boolean;
}

export function DrawnCard({ card, onDiscard, onCallCabo, canCallCabo }: {
  card: CaboCardView;
  onDiscard: () => void;
  onCallCabo: () => void;
  canCallCabo: boolean;
}) {
  return (
    <motion.div
      className="flex flex-col items-center gap-2"
      initial={{ y: 20, opacity: 0, scale: 0.9 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    >
      <p className="text-xs text-[rgb(var(--color-text-muted))] font-medium uppercase tracking-wider">
        Drawn Card
      </p>
      <Card card={card} size="lg" faceUp animate={false} />
      <p className="text-[10px] text-[rgb(var(--color-text-muted))] text-center">
        Tap a slot to replace · or:
      </p>
      <div className="flex gap-2">
        <button
          onClick={onDiscard}
          className={cn(
            'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
            'bg-[rgb(var(--color-surface-raised))] text-[rgb(var(--color-text))]',
            'hover:bg-[rgb(var(--color-border-strong))] active:scale-95',
            'border border-[rgb(var(--color-border))]',
          )}
        >
          Discard{card.ability ? ' + Use Ability' : ''}
        </button>
        {canCallCabo && (
          <button
            onClick={onCallCabo}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
              'bg-[rgb(var(--color-primary))] text-black',
              'hover:opacity-90 active:scale-95',
            )}
          >
            Call CABO!
          </button>
        )}
      </div>
    </motion.div>
  );
}
