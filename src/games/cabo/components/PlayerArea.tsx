/**
 * Cabo — Player Area Component
 *
 * Shows a player's card slots in a 2×2 grid (expandable).
 * Stable slot positions — cards never reflow.
 */

'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/cn';
import type { CaboPlayerView, CaboSlotView } from '../types';
import { Card } from './Card';

interface PlayerAreaProps {
  player: CaboPlayerView;
  isMe: boolean;
  isCurrentTurn: boolean;
  selectableSlots?: string[];    // slot IDs that can be clicked
  selectedSlotId?: string | null;
  highlightedSlots?: string[];
  onSlotClick?: (slotId: string) => void;
  compact?: boolean;
  showName?: boolean;
  labelPrefix?: string;
}

export function PlayerArea({
  player,
  isMe,
  isCurrentTurn,
  selectableSlots = [],
  selectedSlotId,
  highlightedSlots = [],
  onSlotClick,
  compact = false,
  showName = true,
}: PlayerAreaProps) {
  const cardSize = compact ? 'sm' : isMe ? 'lg' : 'md';

  // Arrange slots in rows of 4 (stable, no reflow)
  const slotRows: CaboSlotView[][] = [];
  for (let i = 0; i < player.slots.length; i += 4) {
    slotRows.push(player.slots.slice(i, i + 4));
  }

  return (
    <div className={cn('flex flex-col items-center gap-1.5', compact && 'gap-1')}>
      {/* Player header */}
      {showName && (
        <div className="flex items-center gap-2">
          {/* Connection indicator */}
          <div
            className={cn(
              'w-2 h-2 rounded-full flex-shrink-0',
              player.connected ? 'bg-green-400' : 'bg-red-400',
            )}
          />
          <span
            className={cn(
              'text-xs font-semibold truncate max-w-[80px]',
              isCurrentTurn
                ? 'text-[rgb(var(--color-primary))]'
                : 'text-[rgb(var(--color-text-muted))]',
              isMe && 'text-[rgb(var(--color-text))]',
            )}
          >
            {player.name}
            {player.calledCabo && (
              <span className="ml-1 text-yellow-400 font-bold text-[10px]">CABO</span>
            )}
          </span>
          {isCurrentTurn && (
            <motion.div
              className="w-1.5 h-1.5 rounded-full bg-[rgb(var(--color-primary))]"
              animate={{ scale: [1, 1.4, 1], opacity: [1, 0.6, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          )}
        </div>
      )}

      {/* Score */}
      {!compact && (
        <div className="text-[10px] text-[rgb(var(--color-text-muted))]">
          {player.roundScore !== null ? (
            <span>Round: {player.roundScore} · Total: {player.cumulativeScore + player.roundScore}</span>
          ) : (
            <span>{player.cumulativeScore} pts</span>
          )}
        </div>
      )}

      {/* Card slots */}
      <div className="flex flex-col gap-1">
        {slotRows.map((row, rowIdx) => (
          <div key={rowIdx} className="flex gap-1">
            {row.map((slot) => {
              const isSelectable = selectableSlots.includes(slot.id);
              const isSelected = selectedSlotId === slot.id;
              const isHighlighted = highlightedSlots.includes(slot.id);

              return (
                <SlotContainer
                  key={slot.id}
                  slot={slot}
                  cardSize={cardSize}
                  isSelectable={isSelectable}
                  isSelected={isSelected}
                  isHighlighted={isHighlighted}
                  onSlotClick={onSlotClick}
                  isMe={isMe}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Slot Container ───────────────────────────────────────────────────────────

function SlotContainer({
  slot,
  cardSize,
  isSelectable,
  isSelected,
  isHighlighted,
  onSlotClick,
  isMe,
}: {
  slot: CaboSlotView;
  cardSize: 'sm' | 'md' | 'lg';
  isSelectable: boolean;
  isSelected: boolean;
  isHighlighted: boolean;
  onSlotClick?: (slotId: string) => void;
  isMe: boolean;
}) {
  const sizeClasses = {
    sm: 'w-10 h-14',
    md: 'w-14 h-20',
    lg: 'w-16 h-24',
  };

  if (slot.card) {
    return (
      <Card
        card={slot.card}
        size={cardSize}
        isSelectable={isSelectable}
        isSelected={isSelected}
        isHighlighted={isHighlighted}
        onClick={() => onSlotClick?.(slot.id)}
        label={isMe && slot.card.character ? `${slot.card.character} (your card)` : 'Opponent card'}
      />
    );
  }

  // Empty slot
  return (
    <div
      className={cn(
        'rounded-[var(--radius-card)] border-2 border-dashed flex items-center justify-center transition-all',
        sizeClasses[cardSize],
        isSelectable
          ? 'border-[rgb(var(--color-primary))] cursor-pointer hover:bg-[rgb(var(--color-primary))]/10 active:scale-95'
          : 'border-[rgb(var(--color-border))] opacity-30',
        isSelected && 'bg-[rgb(var(--color-primary))]/20 border-[rgb(var(--color-primary))]',
      )}
      onClick={isSelectable ? () => onSlotClick?.(slot.id) : undefined}
      role={isSelectable ? 'button' : undefined}
      aria-label="Empty card slot"
      tabIndex={isSelectable ? 0 : undefined}
    >
      {isSelectable && (
        <span className="text-[rgb(var(--color-primary))] text-xs">+</span>
      )}
    </div>
  );
}

// ─── Compact Opponent Area ────────────────────────────────────────────────────

interface OpponentAreaProps {
  player: CaboPlayerView;
  isCurrentTurn: boolean;
  selectableSlots?: string[];
  highlightedSlots?: string[];
  onSlotClick?: (slotId: string) => void;
  orientation?: 'horizontal' | 'vertical';
}

export function OpponentArea({
  player,
  isCurrentTurn,
  selectableSlots = [],
  highlightedSlots = [],
  onSlotClick,
  orientation = 'horizontal',
}: OpponentAreaProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-1 px-2 py-1.5 rounded-xl transition-all duration-300',
        isCurrentTurn && 'bg-[rgb(var(--color-primary))]/10 ring-1 ring-[rgb(var(--color-primary))]/30',
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-1.5">
        <div className={cn('w-1.5 h-1.5 rounded-full', player.connected ? 'bg-green-400' : 'bg-red-400')} />
        <span className={cn(
          'text-[10px] font-semibold truncate max-w-[64px]',
          isCurrentTurn ? 'text-[rgb(var(--color-primary))]' : 'text-[rgb(var(--color-text-muted))]',
        )}>
          {player.name}
        </span>
        {player.calledCabo && <span className="text-yellow-400 text-[9px] font-bold">C!</span>}
        {isCurrentTurn && (
          <motion.div
            className="w-1 h-1 rounded-full bg-[rgb(var(--color-primary))]"
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}
      </div>

      {/* Cards in a single row (compact) */}
      <div className="flex gap-0.5 flex-wrap justify-center max-w-[80px]">
        {player.slots.map((slot) => {
          const isSelectable = selectableSlots.includes(slot.id);
          const isHighlighted = highlightedSlots.includes(slot.id);

          if (slot.card) {
            return (
              <Card
                key={slot.id}
                card={slot.card}
                size="sm"
                isSelectable={isSelectable}
                isHighlighted={isHighlighted}
                onClick={() => onSlotClick?.(slot.id)}
                label="Opponent card"
              />
            );
          }

          return (
            <div
              key={slot.id}
              className={cn(
                'w-10 h-14 rounded-[var(--radius-card)] border border-dashed',
                isSelectable
                  ? 'border-[rgb(var(--color-primary))] cursor-pointer hover:bg-[rgb(var(--color-primary))]/10'
                  : 'border-[rgb(var(--color-border))]/30',
              )}
              onClick={isSelectable ? () => onSlotClick?.(slot.id) : undefined}
            />
          );
        })}
      </div>

      <span className="text-[9px] text-[rgb(var(--color-text-muted))]">
        {player.cumulativeScore}pts
      </span>
    </div>
  );
}
