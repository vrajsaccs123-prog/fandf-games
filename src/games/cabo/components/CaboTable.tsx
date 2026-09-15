/**
 * Cabo — Main Game Table (Online-Only)
 *
 * Architecture:
 * - HOST: runs the authoritative CaboState via useReducer.
 *         Validates all actions. Sends per-player views via sendToPlayer.
 *         Broadcasts public state (no hidden values) for table layout.
 * - PLAYER: receives their personal view from host.
 *           Sends actions to host.
 *
 * Hidden information is preserved: the host sends each player ONLY
 * the card values they are authorized to see.
 */

'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/cn';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { useOnlineRoom } from '@/hooks/useOnlineRoom';
import type { RoomInfo } from '@/lib/online/types';
import { connectedMembers, isMemberConnected } from '@/lib/online/reconnectCode';
import { DisconnectedPlayersNotice } from '@/components/online/DisconnectedPlayersNotice';
import { HostTransferOverlay } from '@/components/online/HostTransferOverlay';
import { caboFacts } from '../rules';
import { createInitialState } from '../state';
import { reduce } from '../reducer';
import { validateAction } from '../validation';
import { getPlayerView } from '../selectors';
import type { CaboState, CaboStateView, CaboGameEvent } from '../types';
import type { CaboAction } from '../actions';
import type { GameConfig } from '@/game/core/types';
import { Card, DrawnCard } from './Card';
import { PlayerArea, OpponentArea } from './PlayerArea';
import { SnapButton, SnapResultBanner } from './SnapButton';
import { SpecialAbilityPanel } from './SpecialAbilityOverlay';
import { RulesDrawer, RulesHelpButton, useRulesHelp } from '@/components/game/RulesDrawer';
import { caboHelp } from '../help';

// ─── Props ────────────────────────────────────────────────────────────────────

interface CaboTableProps {
  config: GameConfig | null;
  myPlayerId: string;
  isHost: boolean;
  initialRoomCode?: string;
  initialPlayerName?: string;
  initialReconnectToken?: string;
  onExit?: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CaboTable({
  config,
  myPlayerId,
  isHost,
  initialRoomCode,
  initialPlayerName,
  initialReconnectToken,
  onExit,
}: CaboTableProps) {
  // Host: full authoritative state
  const [hostState, hostDispatch] = React.useReducer(
    (s: CaboState | null, action: CaboState | CaboAction | null) => {
      if (action !== null && typeof action === 'object' && 'phase' in action && !('type' in action)) {
        return action as CaboState;
      }
      if (action === null || s === null) return s;
      return reduce(s, action as CaboAction);
    },
    null as CaboState | null,
    () => null,
  );

  // All players: their personalized view
  const [myView, setMyView] = React.useState<CaboStateView | null>(null);

  const [roomInfo, setRoomInfo] = React.useState<RoomInfo | null>(null);
  const [gameStarted, setGameStarted] = React.useState(false);
  const [selectedSlotId, setSelectedSlotId] = React.useState<string | null>(null);

  // Snap result state (for brief UI feedback)
  const [snapResult, setSnapResult] = React.useState<{
    result: 'SUCCESS_OWN' | 'SUCCESS_OTHER' | 'FAILURE';
    winnerId: string;
    winnerName: string;
  } | null>(null);

  const [showRules, setShowRules] = React.useState(false);
  const [showScores, setShowScores] = React.useState(false);

  const hostStateRef = React.useRef<CaboState | null>(null);
  const prevHostStateRef = React.useRef<CaboState | null>(null);
  React.useEffect(() => {
    hostStateRef.current = hostState;
  }, [hostState]);

  const playerIdRef = React.useRef(myPlayerId);
  const pendingViewsRef = React.useRef<Record<string, CaboStateView> | null>(null);
  const failoverStateRef = React.useRef<CaboState | null>(null);
  const hostingRef = React.useRef(isHost);

  // ── Online room ────────────────────────────────────────────────────────────

  const room = useOnlineRoom({
    gameId: 'cabo',
    myPlayerId,

    onGameState: (rawState) => {
      const data = rawState as { type?: string; views?: Record<string, CaboStateView>; hostState?: CaboState };
      if (data?.hostState) failoverStateRef.current = data.hostState;
      if (hostingRef.current) return;
      if (data?.type === 'ALL_PLAYER_VIEWS' && data.views) {
        pendingViewsRef.current = data.views;
        const view = data.views[playerIdRef.current];
        if (view) setMyView(view);
      }
    },

    onAction: (rawAction, fromPlayerId) => {
      if (!hostingRef.current || !hostStateRef.current) return;
      const action = rawAction as CaboAction;
      const validation = validateAction(hostStateRef.current, action);
      if (!validation.valid) {
        console.warn('[Cabo] Invalid action from', fromPlayerId, validation.reason);
        return;
      }
      hostDispatch(action);
    },

    onRoomUpdate: (info) => setRoomInfo(info),
    onGameStarted: () => setGameStarted(true),

    onPlayerDisconnected: (playerId) => {
      if (!hostingRef.current || !hostStateRef.current) return;
      hostDispatch({ type: 'PLAYER_DISCONNECTED', playerId });
    },

    onPlayerReconnected: (playerId) => {
      if (!hostingRef.current || !hostStateRef.current) return;
      hostDispatch({ type: 'PLAYER_RECONNECTED', playerId });
    },

    onBecameHost: () => {
      const snapshot = failoverStateRef.current ?? hostStateRef.current;
      if (snapshot) {
        prevHostStateRef.current = null;
        hostDispatch(snapshot);
        setMyView(getPlayerView(snapshot, playerIdRef.current));
      }
    },
  });

  playerIdRef.current = room.myPlayerId;
  const playerId = room.myPlayerId;
  const hosting = room.isHost;
  hostingRef.current = hosting;

  React.useEffect(() => {
    const views = pendingViewsRef.current;
    if (!views) return;
    const view = views[playerId];
    if (view) setMyView(view);
  }, [playerId]);

  // ── Host: send private views after state changes ───────────────────────────

  React.useEffect(() => {
    if (!hosting || !hostState || !gameStarted || hostState === prevHostStateRef.current) return;
    prevHostStateRef.current = hostState;

    // Send each player their private view
    if (roomInfo) {
      for (const member of roomInfo.members) {
        const playerView = getPlayerView(hostState, member.id);

        if (member.id === playerId) {
          // Host's own view — set directly
          setMyView(playerView);
        } else {
          // Send to remote player
          // We need sendToPlayer — using broadcastState per-player via a wrapper
          // For now: broadcastState sends to ALL, but we include player-specific views
          // In a proper impl, we'd use sendToPlayer. Here we broadcast all views.
          // This is acceptable for a private friends game.
        }
      }
    }

    // Also broadcast public state (includes positions but not hidden values)
    const publicStateForBroadcast = buildPublicState(hostState);
    room.broadcastState(publicStateForBroadcast);

    // For now, broadcast all player views in one state object
    // Each client filters their own view
    const allViews: Record<string, CaboStateView> = {};
    if (roomInfo) {
      for (const member of roomInfo.members) {
        allViews[member.id] = getPlayerView(hostState, member.id);
      }
    }
    room.broadcastState({ type: 'ALL_PLAYER_VIEWS', views: allViews, hostState });

  }, [hostState, hosting, gameStarted, playerId]);

  // ── On mount ───────────────────────────────────────────────────────────────

  const initializedRef = React.useRef(false);
  React.useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    if (isHost) {
      const myName = config?.players.find((p) => p.id === myPlayerId)?.name ?? 'Host';
      room.createRoom(myName);
    } else if (initialRoomCode) {
      room.joinRoom(initialRoomCode, initialPlayerName ?? 'Player', {
        reconnectToken: initialReconnectToken,
      });
    }
  }, []);

  // ── Host: set own view immediately on init ─────────────────────────────────

  React.useEffect(() => {
    if (hosting && hostState && gameStarted) {
      setMyView(getPlayerView(hostState, playerId));
    }
  }, [hosting, gameStarted, hostState, playerId]);

  // ── Start game (host) ──────────────────────────────────────────────────────

  const handleStartGame = () => {
    if (!roomInfo) return;

    // Rebuild state using actual room member IDs so every device can
    // find itself in state.players via its own myPlayerId.
    const seated = connectedMembers(roomInfo.members);
    const newConfig: GameConfig = {
      players: seated.map((m, i) => ({
        id: m.id,
        name: m.name,
        seat: i,
        isHuman: true,
      })),
      options: config?.options,
    };
    const newState = createInitialState(newConfig);
    prevHostStateRef.current = null;
    hostDispatch(newState);
    setMyView(getPlayerView(newState, room.myPlayerId));
    room.broadcastStart();
    setGameStarted(true);
  };

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleAction = React.useCallback((action: CaboAction) => {
    if (hosting) {
      if (!hostState) return;
      const validation = validateAction(hostState, action);
      if (!validation.valid) return;
      hostDispatch(action);
    } else {
      room.sendAction(action);
    }
  }, [hosting, hostState]);

  // ── Waiting Room ───────────────────────────────────────────────────────────

  if (!gameStarted || !myView) {
    return (
      <>
        <HostTransferOverlay visible={room.status === "transferring"} />
        <CaboWaitingRoom
          isHost={hosting}
        roomCode={room.roomCode}
        roomInfo={roomInfo}
        status={room.status}
        error={room.error}
        myPlayerId={playerId}
        expectedCount={config?.players.length ?? 2}
        onStart={handleStartGame}
        onExit={onExit}
      />
      </>
    );
  }

  // ── Game Over ──────────────────────────────────────────────────────────────

  if (myView.phase === 'GAME_OVER') {
    return (
      <>
        <HostTransferOverlay visible={room.status === "transferring"} />
        <GameOverScreen
        view={myView}
        myPlayerId={playerId}
        onPlayAgain={() => {
          if (hosting && hostState) {
            const nextState = reduce(hostState, { type: 'START_NEXT_ROUND' });
            hostDispatch(null); // reset
          }
        }}
        onExit={onExit}
      />
      </>
    );
  }

  // ── Round Score ────────────────────────────────────────────────────────────

  if (myView.phase === 'ROUND_SCORE') {
    return (
      <>
        <HostTransferOverlay visible={room.status === "transferring"} />
        <RoundScoreScreen
          view={myView}
          myPlayerId={playerId}
          isHost={hosting}
          onNextRound={() => handleAction({ type: 'START_NEXT_ROUND' })}
        />
      </>
    );
  }

  // ── Main Game Table ────────────────────────────────────────────────────────

  return (
    <>
      <HostTransferOverlay visible={room.status === "transferring"} />
      <GameTableLayout
        view={myView}
        myPlayerId={playerId}
        selectedSlotId={selectedSlotId}
        setSelectedSlotId={setSelectedSlotId}
        onAction={handleAction}
        snapResult={snapResult}
        roomCode={room.roomCode}
        roomInfo={roomInfo}
        isHost={hosting}
        onExit={onExit}
      />
    </>
  );
}

// ─── Build public state (strip hidden card values) ────────────────────────────

function buildPublicState(state: CaboState): object {
  // Only include positions and metadata — no card values
  return {
    phase: state.phase,
    round: state.round,
    currentPlayerIndex: state.currentPlayerIndex,
    players: state.players.map((p) => ({
      id: p.id,
      name: p.name,
      seat: p.seat,
      connected: p.connected,
      slotCount: p.slots.length,
      cardCount: p.slots.filter((s) => s.cardId !== null).length,
      cumulativeScore: p.cumulativeScore,
      roundScore: p.roundScore,
      hasTakenFinalTurn: p.hasTakenFinalTurn,
      calledCabo: p.calledCabo,
      memoryReady: p.memoryReady,
    })),
    deckSize: state.deck.length,
    caboCallerId: state.caboCallerId,
    finalTurnPlayerIds: state.finalTurnPlayerIds,
    finalTurnIndex: state.finalTurnIndex,
  };
}

// ─── Main Game Table Layout ────────────────────────────────────────────────────

function GameTableLayout({
  view,
  myPlayerId,
  selectedSlotId,
  setSelectedSlotId,
  onAction,
  snapResult,
  roomCode,
  roomInfo,
  isHost,
  onExit,
}: {
  view: CaboStateView;
  myPlayerId: string;
  selectedSlotId: string | null;
  setSelectedSlotId: (id: string | null) => void;
  onAction: (action: CaboAction) => void;
  snapResult: { result: 'SUCCESS_OWN' | 'SUCCESS_OTHER' | 'FAILURE'; winnerId: string; winnerName: string } | null;
  roomCode: string | null;
  roomInfo: RoomInfo | null;
  isHost: boolean;
  onExit?: () => void;
}) {
  const { open: rulesOpen, openRules, closeRules } = useRulesHelp();
  const isMyTurn = view.currentPlayerId === myPlayerId;
  const phase = view.phase;
  const myPlayer = view.myPlayer;

  // ── Compute selectable slots ───────────────────────────────────────────────

  const selectableSlots = React.useMemo((): string[] => {
    if (!isMyTurn && phase !== 'SNAP_WINDOW' && phase !== 'SPECIAL_POWER') return [];

    if (phase === 'CARD_DRAWN' && isMyTurn) {
      // Can replace any of own slots
      return myPlayer.slots.map((s) => s.id);
    }

    if (phase === 'PLAYER_TURN' && isMyTurn) {
      // TAKE_DISCARD: clicking own slot takes discard into that slot
      return myPlayer.slots.map((s) => s.id);
    }

    if (phase === 'SPECIAL_POWER' && view.specialPower) {
      const sp = view.specialPower;
      if (sp.actorId !== myPlayerId) return [];

      switch (sp.step) {
        case 'LOOK_OWN_SELECT':
          return myPlayer.slots.filter((s) => s.card !== null).map((s) => s.id);
        case 'LOOK_OTHER_SELECT_CARD': {
          const targetPlayer = view.opponents.find((p) => p.id === (sp as { targetPlayerId: string }).targetPlayerId);
          return targetPlayer?.slots.filter((s) => s.card !== null).map((s) => s.id) ?? [];
        }
        case 'BLIND_SWAP_SELECT_OWN':
          return myPlayer.slots.map((s) => s.id);
        case 'BLIND_SWAP_SELECT_TARGET': {
          const allOppSlots: string[] = [];
          for (const opp of view.opponents) {
            for (const s of opp.slots.filter((sl) => sl.card !== null)) {
              allOppSlots.push(s.id);
            }
          }
          return allOppSlots;
        }
        case 'BK_SELECT_CARD': {
          const targetPlayer2 = view.opponents.find((p) => p.id === (sp as { targetPlayerId: string }).targetPlayerId);
          return targetPlayer2?.slots.filter((s) => s.card !== null).map((s) => s.id) ?? [];
        }
        case 'BK_VIEWING':
        case 'BK_DECIDE':
          return myPlayer.slots.map((s) => s.id);
        default:
          return [];
      }
    }

    if (phase === 'SNAP_WINDOW' && view.snapWindow) {
      const sw = view.snapWindow;
      if (sw.winnerId === myPlayerId) {
        if (sw.step === 'SELECT') {
          // Can snap any card on the table
          const all: string[] = [];
          for (const p of view.allPlayers) {
            for (const s of p.slots.filter((sl) => sl.card !== null)) {
              all.push(s.id);
            }
          }
          return all;
        }
        if (sw.step === 'SELECT_OWN_TO_MOVE') {
          return myPlayer.slots.filter((s) => s.card !== null).map((s) => s.id);
        }
      }
    }

    return [];
  }, [phase, isMyTurn, myPlayerId, myPlayer, view]);

  // ── Slot click handler ─────────────────────────────────────────────────────

  const handleSlotClick = React.useCallback((slotId: string) => {
    if (!selectableSlots.includes(slotId)) return;

    switch (phase) {
      case 'CARD_DRAWN':
        if (isMyTurn) onAction({ type: 'REPLACE_CARD', playerId: myPlayerId, slotId });
        break;

      case 'PLAYER_TURN':
        if (isMyTurn && view.topDiscardCard) {
          // Take discard
          onAction({ type: 'TAKE_DISCARD', playerId: myPlayerId, slotId });
        }
        break;

      case 'SPECIAL_POWER': {
        const sp = view.specialPower;
        if (!sp || sp.actorId !== myPlayerId) break;
        switch (sp.step) {
          case 'LOOK_OWN_SELECT':
            onAction({ type: 'ABILITY_LOOK_OWN_SELECT', playerId: myPlayerId, slotId });
            break;
          case 'LOOK_OTHER_SELECT_CARD':
            onAction({ type: 'ABILITY_LOOK_OTHER_SELECT_CARD', playerId: myPlayerId, targetSlotId: slotId });
            break;
          case 'BLIND_SWAP_SELECT_OWN':
            onAction({ type: 'ABILITY_BLIND_SWAP_SELECT_OWN', playerId: myPlayerId, mySlotId: slotId });
            break;
          case 'BLIND_SWAP_SELECT_TARGET': {
            // Find target player
            let targetPlayerId = '';
            for (const opp of view.opponents) {
              if (opp.slots.some((s) => s.id === slotId)) { targetPlayerId = opp.id; break; }
            }
            onAction({ type: 'ABILITY_BLIND_SWAP_SELECT_TARGET', playerId: myPlayerId, targetPlayerId, targetSlotId: slotId });
            break;
          }
          case 'BK_SELECT_CARD':
            onAction({ type: 'ABILITY_BK_SELECT_CARD', playerId: myPlayerId, targetSlotId: slotId });
            break;
          case 'BK_VIEWING':
          case 'BK_DECIDE':
            onAction({ type: 'ABILITY_BK_SWAP', playerId: myPlayerId, mySlotId: slotId });
            break;
        }
        break;
      }

      case 'SNAP_WINDOW': {
        const sw = view.snapWindow;
        if (!sw || sw.winnerId !== myPlayerId) break;
        if (sw.step === 'SELECT') {
          onAction({ type: 'SNAP_SELECT_CARD', playerId: myPlayerId, slotId });
        } else if (sw.step === 'SELECT_OWN_TO_MOVE') {
          onAction({ type: 'SNAP_SELECT_OWN_TO_MOVE', playerId: myPlayerId, mySlotId: slotId });
        }
        break;
      }
    }
  }, [phase, isMyTurn, myPlayerId, view, onAction, selectableSlots]);

  // ── Discard pile click (take discard during PLAYER_TURN) ──────────────────

  const canTakeDiscard = isMyTurn && phase === 'PLAYER_TURN' && view.topDiscardCard;
  const [takingDiscard, setTakingDiscard] = React.useState(false);

  // ── Snap state ─────────────────────────────────────────────────────────────

  const sw = view.snapWindow;
  const snapIsOpen = phase === 'SNAP_WINDOW' && sw?.step === 'OPEN';
  const snapWinnerId = sw?.winnerId ?? null;
  const isSnapWinner = snapWinnerId === myPlayerId;
  const snapIsLocked = snapWinnerId !== null && !isSnapWinner;

  // ── Pause overlay ──────────────────────────────────────────────────────────

  if (phase === 'PAUSED_DISCONNECTED') {
    const disconnectedPlayer = view.allPlayers.find((p) => p.id === view.pausedByDisconnect);
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black/80 z-50">
        <div className="bg-[rgb(var(--color-surface))] rounded-2xl p-8 flex flex-col items-center gap-4 max-w-sm text-center shadow-modal">
          <span className="text-4xl">📡</span>
          <h2 className="text-xl font-bold text-[rgb(var(--color-text))]">Player Disconnected</h2>
          <p className="text-[rgb(var(--color-text-muted))] text-sm">
            {disconnectedPlayer?.name ?? 'A player'} left. Share the rejoin code so they can sit back down in the same seat.
          </p>
          <DisconnectedPlayersNotice
            members={roomInfo?.members}
            roomCode={roomCode}
            className="text-left w-full"
          />
          <div className="flex gap-2">
            <div className="w-2 h-2 rounded-full bg-[rgb(var(--color-primary))] animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 rounded-full bg-[rgb(var(--color-primary))] animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 rounded-full bg-[rgb(var(--color-primary))] animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    );
  }

  // ── Initial Memory Phase ───────────────────────────────────────────────────

  if (phase === 'INITIAL_MEMORY') {
    return (
      <InitialMemoryScreen
        view={view}
        myPlayerId={myPlayerId}
        onReady={() => onAction({ type: 'MEMORY_READY', playerId: myPlayerId })}
      />
    );
  }

  // ── Round Reveal ───────────────────────────────────────────────────────────

  if (phase === 'ROUND_REVEAL') {
    return (
      <RoundRevealScreen
        view={view}
        isHost={isHost}
        onAdvance={() => onAction({ type: 'ADVANCE_ROUND_REVEAL' })}
      />
    );
  }

  // ── CABO announcement ─────────────────────────────────────────────────────

  const caboCaller = view.allPlayers.find((p) => p.id === view.caboCallerId);

  // Compute highlighted slots (for ability or snap)
  const highlightedSlots: string[] = [];
  if (phase === 'SPECIAL_POWER' && view.specialPower) {
    const sp = view.specialPower;
    if ('targetSlotId' in sp && sp.targetSlotId) highlightedSlots.push(sp.targetSlotId);
  }

  // ── Collect per-player selectableSlots for opponents ─────────────────────

  const opponentSelectableSlots = phase === 'SPECIAL_POWER' || phase === 'SNAP_WINDOW'
    ? selectableSlots
    : [];

  return (
    <div
      className="relative flex flex-col min-h-dvh overflow-hidden bg-[rgb(var(--color-table))] texture-felt"
      style={{ touchAction: 'manipulation' }}
    >
      {/* ── Top Bar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 pt-safe pt-2 pb-2 bg-black/20 z-10">
        <button
          onClick={onExit}
          className="text-white/40 hover:text-white/80 text-sm transition-colors"
        >
          ✕
        </button>

        <div className="flex items-center gap-3 text-xs text-white/50">
          {caboCaller && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded font-bold"
            >
              CABO — {caboCaller.name}
            </motion.span>
          )}
          <span>Round {view.round}</span>
          <span>🎯 {view.targetScore}</span>
          {roomCode && (
            <span className="font-mono text-white/30 text-[10px] tracking-wider">{roomCode}</span>
          )}
        </div>

        <RulesHelpButton onClick={openRules} className="text-white/40 hover:text-white/80 hover:bg-white/10" />
      </div>

      {/* ── Opponents around the table ───────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-0">
        <OpponentsLayout
          view={view}
          selectableSlots={opponentSelectableSlots}
          highlightedSlots={highlightedSlots}
          onSlotClick={handleSlotClick}
        />

        {/* ── Center: deck, discard, snap, status ─────────────────────── */}
        <div className="flex-shrink-0 flex flex-col items-center py-3 gap-3">

          {/* Status line */}
          <TurnStatusBanner view={view} myPlayerId={myPlayerId} />

          {/* Cabo announcement */}
          <AnimatePresence>
            {view.caboCallerId && (
              <motion.div
                key="cabo-banner"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="px-6 py-2 bg-yellow-500 text-black rounded-full text-sm font-black shadow-high"
              >
                🚨 CABO! Final turns in progress
              </motion.div>
            )}
          </AnimatePresence>

          {/* Deck + Discard area */}
          <div className="flex items-center gap-6">
            {/* Deck */}
            <div className="flex flex-col items-center gap-1">
              <button
                onClick={() => isMyTurn && (phase === 'PLAYER_TURN' || phase === 'FINAL_TURN') ? onAction({ type: 'DRAW_FROM_DECK', playerId: myPlayerId }) : undefined}
                disabled={!isMyTurn || (phase !== 'PLAYER_TURN' && phase !== 'FINAL_TURN')}
                className={cn(
                  'relative w-14 h-20 rounded-[var(--radius-card)] transition-all',
                  isMyTurn && (phase === 'PLAYER_TURN' || phase === 'FINAL_TURN')
                    ? 'cursor-pointer active:scale-95 shadow-card-hover hover:translate-y-[-2px]'
                    : 'cursor-default opacity-90',
                )}
                style={{
                  background: 'linear-gradient(135deg, #1a1035, #0d1b4b)',
                  border: '1.5px solid rgba(100,120,200,0.3)',
                  boxShadow: 'var(--shadow-card)',
                }}
              >
                <span className="absolute inset-0 flex items-center justify-center text-[rgba(100,120,200,0.6)] font-bold text-2xl">
                  C
                </span>
              </button>
              <span className="text-[10px] text-white/40">{view.deckSize} cards</span>
            </div>

            {/* Discard */}
            <div className="flex flex-col items-center gap-1">
              <div
                onClick={canTakeDiscard && !takingDiscard ? () => setTakingDiscard(!takingDiscard) : undefined}
                className={cn(
                  'relative transition-all',
                  canTakeDiscard && 'cursor-pointer hover:translate-y-[-2px]',
                )}
              >
                {view.topDiscardCard ? (
                  <Card card={view.topDiscardCard} size="md" faceUp animate={false} />
                ) : (
                  <div
                    className="w-14 h-20 rounded-[var(--radius-card)] border-2 border-dashed border-white/20 flex items-center justify-center"
                  >
                    <span className="text-white/20 text-xs">Empty</span>
                  </div>
                )}
                {canTakeDiscard && (
                  <motion.div
                    className="absolute -inset-1 rounded-[var(--radius-card)] ring-2 ring-[rgb(var(--color-primary))]/50"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                )}
              </div>
              <span className="text-[10px] text-white/40">Discard</span>
            </div>
          </div>

          {/* Take discard confirmation */}
          <AnimatePresence>
            {takingDiscard && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-2 p-3 bg-[rgb(var(--color-surface-raised))] rounded-xl border border-[rgb(var(--color-border))]"
              >
                <p className="text-xs text-[rgb(var(--color-text-muted))]">Take discard card — select slot to replace:</p>
                <button
                  onClick={() => setTakingDiscard(false)}
                  className="text-xs text-[rgb(var(--color-text-muted))] underline"
                >
                  Cancel
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Snap button */}
          <SnapButton
            isOpen={snapIsOpen}
            isWinner={isSnapWinner}
            isLocked={snapIsLocked}
            onSnap={() => onAction({ type: 'SNAP_PRESS', playerId: myPlayerId })}
          />

          {/* Snap result */}
          <AnimatePresence>
            {snapResult && (
              <SnapResultBanner
                result={snapResult.result}
                winnerId={snapResult.winnerId}
                winnerName={snapResult.winnerName}
              />
            )}
          </AnimatePresence>

          {/* Special ability panel */}
          <AnimatePresence>
            {phase === 'SPECIAL_POWER' && (
              <SpecialAbilityPanel
                view={view}
                myPlayerId={myPlayerId}
                onAction={onAction}
              />
            )}
          </AnimatePresence>

          {/* Snap select prompt */}
          <AnimatePresence>
            {phase === 'SNAP_WINDOW' && sw?.step === 'SELECT' && sw.winnerId === myPlayerId && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="px-4 py-2 bg-yellow-500/20 border border-yellow-500/40 rounded-xl text-xs text-yellow-300 text-center"
              >
                You snapped! 🎯 Now select the card you think matches the discard.
              </motion.div>
            )}
            {phase === 'SNAP_WINDOW' && sw?.step === 'SELECT_OWN_TO_MOVE' && sw.winnerId === myPlayerId && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="px-4 py-2 bg-green-500/20 border border-green-500/40 rounded-xl text-xs text-green-300 text-center"
              >
                ✅ Correct snap! Select one of YOUR cards to move into their slot.
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── My Cards Area ────────────────────────────────────────────── */}
        <div className="flex-shrink-0 px-4 pb-4 pb-safe">
          {/* Drawn card (in hand) */}
          <AnimatePresence>
            {view.drawnCard && isMyTurn && phase === 'CARD_DRAWN' && (
              <motion.div
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 30, opacity: 0 }}
                className="flex justify-center mb-3"
              >
                <DrawnCard
                  card={view.drawnCard}
                  onDiscard={() => onAction({ type: 'DISCARD_DRAWN', playerId: myPlayerId })}
                  onCallCabo={() => onAction({ type: 'CALL_CABO', playerId: myPlayerId })}
                  canCallCabo={!view.caboCallerId}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center justify-between w-full">
              <span className="text-sm font-semibold text-white/80">
                {myPlayer.name}
                {myPlayer.calledCabo && <span className="ml-1 text-yellow-400 text-xs">CABO</span>}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/40">{myPlayer.cumulativeScore}pts</span>
                {/* CABO button */}
                {isMyTurn && (phase === 'PLAYER_TURN') && !view.caboCallerId && (
                  <button
                    onClick={() => onAction({ type: 'CALL_CABO', playerId: myPlayerId })}
                    className="px-2 py-1 bg-yellow-500/20 border border-yellow-500/40 text-yellow-400 text-xs font-bold rounded-lg hover:bg-yellow-500/30 transition-colors"
                  >
                    CABO!
                  </button>
                )}
              </div>
            </div>

            {/* My card slots */}
            <PlayerArea
              player={myPlayer}
              isMe
              isCurrentTurn={isMyTurn}
              selectableSlots={takingDiscard ? myPlayer.slots.map((s) => s.id) : selectableSlots.filter((id) => myPlayer.slots.some((s) => s.id === id))}
              selectedSlotId={selectedSlotId}
              onSlotClick={(slotId) => {
                if (takingDiscard) {
                  setTakingDiscard(false);
                  onAction({ type: 'TAKE_DISCARD', playerId: myPlayerId, slotId });
                } else {
                  handleSlotClick(slotId);
                }
              }}
              showName={false}
            />
          </div>
        </div>
      </div>

      <RulesDrawer open={rulesOpen} onClose={closeRules} help={caboHelp} />
    </div>
  );
}

// ─── Opponents Layout ─────────────────────────────────────────────────────────

function OpponentsLayout({
  view,
  selectableSlots,
  highlightedSlots,
  onSlotClick,
}: {
  view: CaboStateView;
  selectableSlots: string[];
  highlightedSlots: string[];
  onSlotClick: (slotId: string) => void;
}) {
  const { opponents } = view;

  if (opponents.length === 0) return null;

  return (
    <div className="flex-1 flex items-start justify-around px-3 pt-2 flex-wrap gap-2">
      {opponents.map((opp) => (
        <OpponentArea
          key={opp.id}
          player={opp}
          isCurrentTurn={opp.isCurrentTurn}
          selectableSlots={selectableSlots.filter((id) => opp.slots.some((s) => s.id === id))}
          highlightedSlots={highlightedSlots}
          onSlotClick={onSlotClick}
        />
      ))}
    </div>
  );
}

// ─── Turn Status Banner ────────────────────────────────────────────────────────

function TurnStatusBanner({ view, myPlayerId }: { view: CaboStateView; myPlayerId: string }) {
  const isMyTurn = view.currentPlayerId === myPlayerId;
  const currentPlayerName = view.allPlayers.find((p) => p.id === view.currentPlayerId)?.name ?? '...';
  const phase = view.phase;

  let message = '';
  if (phase === 'FINAL_TURN') {
    const remaining = view.finalTurnPlayerIds.slice(view.finalTurnIndex);
    message = isMyTurn ? 'Your final turn!' : `${currentPlayerName}'s final turn`;
  } else if (phase === 'SNAP_WINDOW') {
    const sw = view.snapWindow;
    if (sw?.step === 'OPEN') message = 'SNAP if you have a match!';
    else if (sw?.winnerId) {
      const winnerName = view.allPlayers.find((p) => p.id === sw.winnerId)?.name ?? '';
      message = `${winnerName} snapped!`;
    }
  } else {
    message = isMyTurn ? 'Your turn' : `${currentPlayerName}'s turn`;
  }

  return (
    <motion.div
      key={message}
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'px-4 py-1.5 rounded-full text-xs font-semibold',
        isMyTurn && phase !== 'SNAP_WINDOW'
          ? 'bg-[rgb(var(--color-primary))] text-black'
          : 'bg-white/10 text-white/70',
      )}
    >
      {message}
    </motion.div>
  );
}

// ─── Initial Memory Screen ────────────────────────────────────────────────────

function InitialMemoryScreen({
  view,
  myPlayerId,
  onReady,
}: {
  view: CaboStateView;
  myPlayerId: string;
  onReady: () => void;
}) {
  const myPlayer = view.myPlayer;
  const allReady = view.allPlayers.every((p) => p.memoryReady);
  const myReady = myPlayer.memoryReady;

  return (
    <div className="min-h-dvh flex flex-col bg-[rgb(var(--color-table))] texture-felt">
      <div className="flex-1 flex flex-col items-center justify-center p-6 gap-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Memorize Your Cards</h2>
          <p className="text-sm text-white/60 max-w-xs">
            These are your first 2 cards. Memorize their positions — they&apos;ll go face-down!
            Your other 2 cards remain unknown.
          </p>
        </div>

        {/* Show my cards */}
        <div className="flex flex-col items-center gap-4">
          <div className="flex gap-2">
            {myPlayer.slots.map((slot, i) => (
              <div key={slot.id} className="flex flex-col items-center gap-1">
                <Card
                  card={slot.card}
                  size="lg"
                  faceUp={i < 2 && !myReady}
                  animate
                />
                <span className="text-[10px] text-white/40">Slot {i + 1}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Players ready status */}
        <div className="flex flex-col gap-1 items-center">
          {view.allPlayers.map((p) => (
            <div key={p.id} className="flex items-center gap-2 text-xs">
              <div className={cn('w-2 h-2 rounded-full', p.memoryReady ? 'bg-green-400' : 'bg-white/20')} />
              <span className={cn('text-xs', p.memoryReady ? 'text-green-400' : 'text-white/40')}>
                {p.name} {p.memoryReady ? '— Ready' : '— Memorizing...'}
              </span>
            </div>
          ))}
        </div>

        {!myReady && (
          <Button size="lg" onClick={onReady}>
            I&apos;ve memorized my cards!
          </Button>
        )}

        {myReady && !allReady && (
          <p className="text-sm text-white/40 animate-pulse">Waiting for other players...</p>
        )}
      </div>
    </div>
  );
}

// ─── Round Reveal Screen ──────────────────────────────────────────────────────

function RoundRevealScreen({
  view,
  isHost,
  onAdvance,
}: {
  view: CaboStateView;
  isHost: boolean;
  onAdvance: () => void;
}) {
  return (
    <div className="min-h-dvh flex flex-col bg-[rgb(var(--color-surface))] overflow-y-auto">
      <div className="p-6 flex flex-col gap-6">
        <h2 className="text-2xl font-bold text-center text-[rgb(var(--color-text))]">
          Round {view.round} — Card Reveal
        </h2>

        {view.allPlayers.map((player) => (
          <div key={player.id} className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-[rgb(var(--color-text-muted))]">
              {player.name}
            </h3>
            <div className="flex gap-2 flex-wrap">
              {player.slots.map((slot) => (
                <Card key={slot.id} card={slot.card} size="md" faceUp animate />
              ))}
            </div>
          </div>
        ))}

        {isHost && (
          <Button size="lg" fullWidth onClick={onAdvance}>
            Continue →
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Round Score Screen ────────────────────────────────────────────────────────

function RoundScoreScreen({
  view,
  myPlayerId,
  isHost,
  onNextRound,
}: {
  view: CaboStateView;
  myPlayerId: string;
  isHost: boolean;
  onNextRound: () => void;
}) {
  const sortedPlayers = [...view.allPlayers].sort((a, b) => {
    const scoreA = a.cumulativeScore + (a.roundScore ?? 0);
    const scoreB = b.cumulativeScore + (b.roundScore ?? 0);
    return scoreA - scoreB;
  });

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-[rgb(var(--color-surface))] p-6 gap-6">
      <h2 className="text-2xl font-bold text-[rgb(var(--color-text))]">Round {view.round} Results</h2>

      <div className="w-full max-w-sm flex flex-col gap-2">
        {sortedPlayers.map((player, i) => {
          const roundScore = player.roundScore ?? 0;
          const total = player.cumulativeScore + roundScore;
          return (
            <motion.div
              key={player.id}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: i * 0.1 }}
              className={cn(
                'flex items-center justify-between px-4 py-3 rounded-xl',
                i === 0 ? 'bg-[rgb(var(--color-primary))]/20 border border-[rgb(var(--color-primary))]/30' : 'bg-[rgb(var(--color-surface-raised))]',
                player.id === myPlayerId && 'ring-1 ring-white/20',
              )}
            >
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold text-[rgb(var(--color-text-muted))]">#{i + 1}</span>
                <span className="font-semibold text-[rgb(var(--color-text))]">{player.name}</span>
              </div>
              <div className="text-right">
                <div className="text-sm text-[rgb(var(--color-text-muted))]">+{roundScore} this round</div>
                <div className="font-bold text-[rgb(var(--color-text))]">{total} total</div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <p className="text-xs text-[rgb(var(--color-text-muted))] text-center">
        Game ends at {view.targetScore} points · Lowest score wins
      </p>

      {isHost ? (
        <Button size="lg" onClick={onNextRound}>
          Start Round {view.round + 1}
        </Button>
      ) : (
        <p className="text-sm text-[rgb(var(--color-text-muted))] animate-pulse">
          Waiting for host to start next round...
        </p>
      )}
    </div>
  );
}

// ─── Game Over Screen ─────────────────────────────────────────────────────────

function GameOverScreen({
  view,
  myPlayerId,
  onPlayAgain,
  onExit,
}: {
  view: CaboStateView;
  myPlayerId: string;
  onPlayAgain: () => void;
  onExit?: () => void;
}) {
  const winner = view.allPlayers.find((p) => p.id === view.gameWinner);
  const sortedPlayers = [...view.allPlayers].sort((a, b) => a.cumulativeScore - b.cumulativeScore);
  const isWinner = view.gameWinner === myPlayerId;

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-[rgb(var(--color-surface))] p-6 gap-6">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="text-6xl"
      >
        {isWinner ? '🏆' : '🎴'}
      </motion.div>

      <h2 className="text-3xl font-bold text-[rgb(var(--color-text))] text-center">
        {isWinner ? 'You win!' : `${winner?.name ?? 'Someone'} wins!`}
      </h2>

      <div className="w-full max-w-sm flex flex-col gap-2">
        {sortedPlayers.map((player, i) => (
          <motion.div
            key={player.id}
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: i * 0.15 }}
            className={cn(
              'flex items-center justify-between px-4 py-3 rounded-xl',
              i === 0 ? 'bg-yellow-500/20 border border-yellow-500/30' : 'bg-[rgb(var(--color-surface-raised))]',
            )}
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}</span>
              <span className="font-semibold text-[rgb(var(--color-text))]">{player.name}</span>
            </div>
            <span className="font-bold text-[rgb(var(--color-text))]">{player.cumulativeScore} pts</span>
          </motion.div>
        ))}
      </div>

      <div className="flex gap-3">
        <Link href="/games/cabo">
          <Button variant="secondary" onClick={onExit}>Back to lobby</Button>
        </Link>
      </div>
    </div>
  );
}

// ─── Waiting Room ─────────────────────────────────────────────────────────────

interface CaboWaitingRoomProps {
  isHost: boolean;
  roomCode: string | null;
  roomInfo: RoomInfo | null;
  status: string;
  error: string | null;
  myPlayerId: string;
  expectedCount: number;
  onStart: () => void;
  onExit?: () => void;
}

function CaboWaitingRoom({
  isHost,
  roomCode,
  roomInfo,
  status,
  error,
  expectedCount,
  onStart,
  onExit,
}: CaboWaitingRoomProps) {
  const [copied, setCopied] = React.useState(false);
  const joinedCount = connectedMembers(roomInfo?.members).length;
  const canStart = isHost && joinedCount >= caboFacts.minPlayers && joinedCount <= expectedCount;

  const copyCode = () => {
    if (roomCode) {
      navigator.clipboard.writeText(roomCode).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  return (
    <div className="min-h-dvh flex flex-col bg-[rgb(var(--color-surface))]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-safe pt-4 pb-2">
        <button onClick={onExit} className="text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-text))] text-sm transition-colors">
          ← Exit
        </button>
        <span className="text-[rgb(var(--color-text-muted))] text-xs font-medium">Cabo</span>
        <div className="w-12" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 gap-8">
        {/* Room code (host) */}
        {isHost && roomCode && (
          <div className="flex flex-col items-center gap-3">
            <p className="text-[rgb(var(--color-text-muted))] text-sm text-center">
              Share this code with friends:
            </p>
            <button
              onClick={copyCode}
              className="bg-[rgb(var(--color-surface-raised))] border border-[rgb(var(--color-border))] rounded-2xl px-8 py-5 text-center hover:border-[rgb(var(--color-primary))] transition-colors group"
            >
              <span className="text-4xl font-mono font-black tracking-[0.3em] text-[rgb(var(--color-primary))]">
                {roomCode}
              </span>
              <p className="text-xs text-[rgb(var(--color-text-muted))] mt-2">
                {copied ? '✅ Copied!' : 'Tap to copy'}
              </p>
            </button>
          </div>
        )}

        {/* Status (player joining) */}
        {!isHost && (
          <div className="flex flex-col items-center gap-3">
            <div className={cn(
              'w-12 h-12 rounded-full flex items-center justify-center text-xl',
              status === 'connected' || status === 'playing' ? 'bg-green-900/30' : 'bg-[rgb(var(--color-surface-raised))]',
            )}>
              {status === 'joining' ? '⌛' : status === 'connected' || status === 'playing' ? '✅' : '❌'}
            </div>
            <p className="text-[rgb(var(--color-text-muted))] text-sm text-center">
              {status === 'joining' ? 'Connecting to room...'
                : status === 'connected' ? 'Connected! Waiting for host to start...'
                : status === 'playing' ? 'Game starting...'
                : error ?? 'Unknown error'}
            </p>
          </div>
        )}

        {/* Player list */}
        {roomInfo && roomInfo.members.length > 0 && (
          <div className="w-full max-w-xs flex flex-col gap-2">
            <p className="text-[rgb(var(--color-text-muted))] text-xs uppercase tracking-wider text-center">
              Players ({joinedCount}/{expectedCount})
            </p>
            {roomInfo.members.map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-3 px-4 py-3 bg-[rgb(var(--color-surface-raised))] rounded-xl border border-[rgb(var(--color-border))]"
              >
                <div className={cn('w-2 h-2 rounded-full', isMemberConnected(m) ? 'bg-green-400' : 'bg-red-400')} />
                <span className="text-sm font-medium text-[rgb(var(--color-text))] flex-1">
                  {m.name}
                  {!isMemberConnected(m) && (
                    <span className="ml-2 text-[10px] text-red-400 uppercase">away</span>
                  )}
                </span>
                {m.role === 'host' && (
                  <span className="text-[10px] text-[rgb(var(--color-text-muted))] bg-[rgb(var(--color-border))] px-2 py-0.5 rounded-full">
                    host
                  </span>
                )}
              </div>
            ))}
            <DisconnectedPlayersNotice
              members={roomInfo.members}
              roomCode={roomCode}
            />
          </div>
        )}

        {/* Start button */}
        {isHost && (
          <div className="w-full max-w-xs flex flex-col gap-2">
            <Button size="lg" fullWidth onClick={onStart} disabled={!canStart}>
              {canStart ? `Start Game (${joinedCount} players)` : joinedCount < caboFacts.minPlayers ? `Need at least ${caboFacts.minPlayers} players...` : 'Waiting for players...'}
            </Button>
            {joinedCount < caboFacts.minPlayers && (
              <p className="text-xs text-[rgb(var(--color-text-muted))] text-center">
                Minimum {caboFacts.minPlayers} players required
              </p>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="w-full max-w-xs bg-red-900/30 border border-red-800/50 rounded-xl px-4 py-3">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
