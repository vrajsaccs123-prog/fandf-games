/**
 * Cabo — Snap Button
 *
 * Large, prominent SNAP button that appears during SNAP_WINDOW phase.
 * First player to press wins the snap.
 */

'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/cn';

interface SnapButtonProps {
  isOpen: boolean;         // snap window is open
  isWinner: boolean;       // this player won the snap
  isLocked: boolean;       // someone already snapped (not us)
  onSnap: () => void;
  className?: string;
}

export function SnapButton({ isOpen, isWinner, isLocked, onSnap, className }: SnapButtonProps) {
  const [pressed, setPressed] = React.useState(false);

  const handleSnap = () => {
    if (isLocked || pressed) return;
    setPressed(true);
    onSnap();
    // Haptic feedback
    if ('vibrate' in navigator) navigator.vibrate(50);
  };

  // Reset pressed state when snap window closes
  React.useEffect(() => {
    if (!isOpen) setPressed(false);
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && !isLocked && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className={cn('flex flex-col items-center gap-2', className)}
        >
          <motion.button
            className={cn(
              'relative w-20 h-20 rounded-full',
              'flex items-center justify-center',
              'text-black font-black text-lg tracking-tight',
              'shadow-[0_0_30px_rgba(255,200,0,0.5)]',
              'transition-all duration-75 select-none',
              pressed
                ? 'bg-yellow-600 scale-90'
                : 'bg-gradient-to-br from-yellow-300 to-yellow-500 hover:from-yellow-200 hover:to-yellow-400',
            )}
            onClick={handleSnap}
            whileTap={{ scale: 0.85 }}
            animate={!pressed ? {
              boxShadow: [
                '0 0 20px rgba(255,200,0,0.4)',
                '0 0 40px rgba(255,200,0,0.7)',
                '0 0 20px rgba(255,200,0,0.4)',
              ],
            } : {}}
            transition={{ duration: 0.8, repeat: Infinity }}
          >
            SNAP!
            {/* Pulse rings */}
            {!pressed && (
              <>
                <motion.div
                  className="absolute inset-0 rounded-full bg-yellow-400/30"
                  animate={{ scale: [1, 1.4, 1.4], opacity: [0.6, 0, 0] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: 0 }}
                />
                <motion.div
                  className="absolute inset-0 rounded-full bg-yellow-400/20"
                  animate={{ scale: [1, 1.6, 1.6], opacity: [0.4, 0, 0] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: 0.3 }}
                />
              </>
            )}
          </motion.button>

          <span className="text-[10px] text-yellow-400/70 font-medium">
            First to snap wins!
          </span>
        </motion.div>
      )}

      {/* Someone else snapped */}
      {isLocked && !isWinner && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="text-xs text-[rgb(var(--color-text-muted))] font-medium px-4 py-2 bg-[rgb(var(--color-surface-raised))] rounded-full"
        >
          Snap taken!
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Snap Result Banner ───────────────────────────────────────────────────────

interface SnapResultBannerProps {
  result: 'SUCCESS_OWN' | 'SUCCESS_OTHER' | 'FAILURE' | null;
  winnerId: string;
  winnerName: string;
  onDismiss?: () => void;
}

export function SnapResultBanner({ result, winnerName, onDismiss }: SnapResultBannerProps) {
  if (!result) return null;

  const config = {
    SUCCESS_OWN: {
      text: `${winnerName} snapped their own card!`,
      sub: 'Card removed — slot stays empty.',
      bg: 'bg-green-900/80 border-green-600',
      icon: '✅',
    },
    SUCCESS_OTHER: {
      text: `${winnerName} snapped an opponent's card!`,
      sub: 'Choosing which card to move in...',
      bg: 'bg-green-900/80 border-green-600',
      icon: '🎯',
    },
    FAILURE: {
      text: `Wrong snap by ${winnerName}!`,
      sub: '+1 penalty card',
      bg: 'bg-red-900/80 border-red-600',
      icon: '❌',
    },
  }[result];

  return (
    <motion.div
      initial={{ y: -30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -30, opacity: 0 }}
      className={cn(
        'px-4 py-3 rounded-xl border flex items-center gap-3',
        config.bg,
      )}
    >
      <span className="text-2xl">{config.icon}</span>
      <div>
        <p className="text-sm font-bold text-white">{config.text}</p>
        <p className="text-xs text-white/60">{config.sub}</p>
      </div>
    </motion.div>
  );
}
