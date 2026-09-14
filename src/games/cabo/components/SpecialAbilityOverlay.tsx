/**
 * Cabo — Special Ability Overlay
 *
 * Guides the acting player through special ability steps.
 * Other players see a "player X is using ability Y" message.
 */

'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/cn';
import type { SpecialPowerState, CaboStateView, CaboPlayerView } from '../types';
import type { CaboAction } from '../actions';

interface SpecialAbilityPanelProps {
  view: CaboStateView;
  myPlayerId: string;
  onAction: (action: CaboAction) => void;
}

export function SpecialAbilityPanel({ view, myPlayerId, onAction }: SpecialAbilityPanelProps) {
  const sp = view.specialPower;
  if (!sp) return null;

  const isActor = sp.actorId === myPlayerId;
  const actorPlayer = view.allPlayers.find((p) => p.id === sp.actorId);
  const actorName = actorPlayer?.name ?? 'Someone';

  // ── Spectator view ────────────────────────────────────────────────────────

  if (!isActor) {
    let spectatorMsg = '';
    switch (sp.step) {
      case 'LOOK_OWN_SELECT':
      case 'LOOK_OWN_VIEWING':
        spectatorMsg = `${actorName} is peeking at one of their own cards...`;
        break;
      case 'LOOK_OTHER_SELECT_PLAYER':
      case 'LOOK_OTHER_SELECT_CARD':
      case 'LOOK_OTHER_VIEWING':
        spectatorMsg = `${actorName} is spying on someone's card...`;
        break;
      case 'BLIND_SWAP_SELECT_OWN':
      case 'BLIND_SWAP_SELECT_TARGET':
        spectatorMsg = `${actorName} is performing a blind swap...`;
        break;
      case 'BK_SELECT_PLAYER':
      case 'BK_SELECT_CARD':
      case 'BK_VIEWING':
      case 'BK_DECIDE':
        spectatorMsg = `${actorName} is using the Emperor's power...`;
        break;
    }
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className="flex items-center gap-2 px-4 py-2.5 bg-[rgb(var(--color-surface-raised))] rounded-xl border border-[rgb(var(--color-border))]"
      >
        <span className="text-xl">👁️</span>
        <span className="text-xs text-[rgb(var(--color-text-muted))] italic">{spectatorMsg}</span>
      </motion.div>
    );
  }

  // ── Actor view ────────────────────────────────────────────────────────────

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="w-full max-w-xs mx-auto px-4 py-3 bg-[rgb(var(--color-surface-raised))] rounded-2xl border border-[rgb(var(--color-border-strong))] shadow-high flex flex-col gap-3"
    >
      <AbilityInstructions sp={sp} myPlayerId={myPlayerId} view={view} onAction={onAction} />
    </motion.div>
  );
}

function AbilityInstructions({
  sp,
  myPlayerId,
  view,
  onAction,
}: {
  sp: SpecialPowerState;
  myPlayerId: string;
  view: CaboStateView;
  onAction: (action: CaboAction) => void;
}) {
  switch (sp.step) {
    case 'LOOK_OWN_SELECT':
      return (
        <>
          <AbilityHeader icon="🔮" title="Peek Own" desc="Tap one of your cards to peek at it." />
          <SkipButton onAction={onAction} playerId={myPlayerId} />
        </>
      );

    case 'LOOK_OWN_VIEWING':
      return (
        <>
          <AbilityHeader icon="🔮" title="Peeking..." desc="Memorize this card. Tap Done when ready." />
          <button
            onClick={() => onAction({ type: 'ABILITY_LOOK_OWN_DONE', playerId: myPlayerId })}
            className="px-4 py-2 bg-[rgb(var(--color-primary))] text-black text-sm font-bold rounded-lg"
          >
            Done
          </button>
        </>
      );

    case 'LOOK_OTHER_SELECT_PLAYER':
      return (
        <>
          <AbilityHeader icon="🕵️" title="Spy on Opponent" desc="Choose a player to spy on." />
          <div className="flex flex-wrap gap-1.5">
            {view.opponents.map((opp) => (
              <button
                key={opp.id}
                onClick={() => onAction({ type: 'ABILITY_LOOK_OTHER_SELECT_PLAYER', playerId: myPlayerId, targetPlayerId: opp.id })}
                className="px-3 py-1.5 bg-[rgb(var(--color-border))] text-sm font-medium rounded-lg hover:bg-[rgb(var(--color-border-strong))] transition-colors"
              >
                {opp.name}
              </button>
            ))}
          </div>
          <SkipButton onAction={onAction} playerId={myPlayerId} />
        </>
      );

    case 'LOOK_OTHER_SELECT_CARD':
      return (
        <>
          <AbilityHeader icon="🕵️" title="Select Card" desc="Tap an opponent's card to spy on it." />
          <SkipButton onAction={onAction} playerId={myPlayerId} />
        </>
      );

    case 'LOOK_OTHER_VIEWING':
      return (
        <>
          <AbilityHeader icon="🕵️" title="Spying..." desc="Memorize their card position. Tap Done when ready." />
          <button
            onClick={() => onAction({ type: 'ABILITY_LOOK_OTHER_DONE', playerId: myPlayerId })}
            className="px-4 py-2 bg-[rgb(var(--color-primary))] text-black text-sm font-bold rounded-lg"
          >
            Done
          </button>
        </>
      );

    case 'BLIND_SWAP_SELECT_OWN':
      return (
        <>
          <AbilityHeader icon="🤹" title="Blind Swap" desc="Choose one of YOUR cards to swap." />
          <SkipButton onAction={onAction} playerId={myPlayerId} />
        </>
      );

    case 'BLIND_SWAP_SELECT_TARGET':
      return (
        <>
          <AbilityHeader icon="🤹" title="Select Opponent Card" desc="Now tap an opponent's card to swap with." />
        </>
      );

    case 'BK_SELECT_PLAYER':
      return (
        <>
          <AbilityHeader icon="👑" title="Emperor's Gaze" desc="Choose a player to look at." />
          <div className="flex flex-wrap gap-1.5">
            {view.opponents.map((opp) => (
              <button
                key={opp.id}
                onClick={() => onAction({ type: 'ABILITY_BK_SELECT_PLAYER', playerId: myPlayerId, targetPlayerId: opp.id })}
                className="px-3 py-1.5 bg-[rgb(var(--color-border))] text-sm font-medium rounded-lg hover:bg-[rgb(var(--color-border-strong))] transition-colors"
              >
                {opp.name}
              </button>
            ))}
          </div>
          <SkipButton onAction={onAction} playerId={myPlayerId} />
        </>
      );

    case 'BK_SELECT_CARD':
      return (
        <>
          <AbilityHeader icon="👑" title="Select Their Card" desc="Tap their card to reveal it to you." />
        </>
      );

    case 'BK_VIEWING':
    case 'BK_DECIDE':
      return (
        <>
          <AbilityHeader icon="👑" title="Swap?" desc="You can see this card. Swap it with one of yours, or skip." />
          <p className="text-xs text-[rgb(var(--color-text-muted))]">Tap one of your cards to swap, or:</p>
          <button
            onClick={() => onAction({ type: 'ABILITY_BK_SKIP', playerId: myPlayerId })}
            className="px-4 py-2 bg-[rgb(var(--color-surface))] border border-[rgb(var(--color-border))] text-sm rounded-lg hover:bg-[rgb(var(--color-border))] transition-colors"
          >
            Skip (don&apos;t swap)
          </button>
        </>
      );

    default:
      return null;
  }
}

function AbilityHeader({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-2xl">{icon}</span>
      <div>
        <p className="text-sm font-bold text-[rgb(var(--color-text))]">{title}</p>
        <p className="text-xs text-[rgb(var(--color-text-muted))]">{desc}</p>
      </div>
    </div>
  );
}

function SkipButton({ onAction, playerId }: { onAction: (a: CaboAction) => void; playerId: string }) {
  return (
    <button
      onClick={() => onAction({ type: 'SKIP_ABILITY', playerId })}
      className="text-xs text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-text))] transition-colors underline"
    >
      Skip ability
    </button>
  );
}
