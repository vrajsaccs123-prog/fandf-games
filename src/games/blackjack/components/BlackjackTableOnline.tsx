/**
 * BlackjackTableOnline — Online game surface for multi-device play.
 *
 * Architecture (mirrors UnoTableOnline):
 * ───────────────────────────────────────
 * • HOST    — owns the authoritative BlackjackState via useReducer.
 *             Validates all actions (including remote ones from other players).
 *             Broadcasts full state to all peers after each change.
 *             Controls the dealer turn automatically.
 *
 * • PLAYER  — holds a read-only copy of BlackjackState received from the host.
 *             Sends BET, HIT, STAND, DOUBLE_DOWN actions to the host.
 *             Sees only their own betting / action controls (not other players').
 *
 * In both cases:
 *  - All players see the dealer's hand.
 *  - All players see other players' hands (standard Blackjack rules — you can
 *    see everyone's cards at the table, which informs your decisions).
 *  - Only your bet controls and action bar are active (when it's your turn).
 */

"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import {
  createInitialState,
  type BlackjackState,
  type BlackjackPlayer,
  MINIMUM_BET,
} from "../state";
import { reduce } from "../reducer";
import { validateAction } from "../validation";
import type { BlackjackAction } from "../actions";
import type { GameConfig } from "@/game/core/types";
import Link from "next/link";
import { DealerArea } from "./DealerArea";
import { PlayerArea } from "./PlayerArea";
import { useOnlineRoom } from "@/hooks/useOnlineRoom";
import type { RoomInfo } from "@/lib/online/types";
import { RulesDrawer, RulesHelpButton, useRulesHelp } from "@/components/game/RulesDrawer";
import { blackjackHelp } from "../help";

// ─── Props ────────────────────────────────────────────────────────────────────

interface BlackjackTableOnlineProps {
  config: GameConfig | null;
  seed?: string;
  myPlayerId: string;
  isHost: boolean;
  initialRoomCode?: string;
  initialPlayerName?: string;
  onExit?: () => void;
}

const BET_PRESETS = [10, 25, 50, 100, 200];

// ─── Component ────────────────────────────────────────────────────────────────

export function BlackjackTableOnline({
  config,
  seed,
  myPlayerId,
  isHost,
  initialRoomCode,
  initialPlayerName,
  onExit,
}: BlackjackTableOnlineProps) {
  const { open: rulesOpen, openRules, closeRules } = useRulesHelp();

  // ── Authoritative state (host writes; players read-only) ───────────────────

  const [state, dispatch] = React.useReducer(
    (s: BlackjackState | null, action: BlackjackState | BlackjackAction) => {
      if ("phase" in action && !("type" in action)) return action as BlackjackState;
      if (s === null) return null;
      return reduce(s, action as BlackjackAction);
    },
    null as BlackjackState | null,
    () => (isHost && config ? createInitialState(config, seed) : null)
  );

  const [roomInfo, setRoomInfo] = React.useState<RoomInfo | null>(null);
  const [gameStarted, setGameStarted] = React.useState(false);

  // ── Online room ────────────────────────────────────────────────────────────

  const room = useOnlineRoom({
    gameId: "blackjack",
    myPlayerId,

    onGameState: (rawState) => {
      dispatch(rawState as BlackjackState);
    },

    onAction: (rawAction, fromPlayerId) => {
      if (!isHost || !state) return;
      const action = rawAction as BlackjackAction;
      // Validate that the action comes from the correct player
      const result = validateAction(state, action);
      if (!result.valid) {
        console.warn("[BJ:online] Invalid action from", fromPlayerId, result.reason);
        return;
      }
      dispatch(action);
    },

    onRoomUpdate: (info) => setRoomInfo(info),
    onGameStarted: () => setGameStarted(true),
  });

  // ── Broadcast state after each change (host) ──────────────────────────────

  const prevStateRef = React.useRef<BlackjackState | null>(null);
  React.useEffect(() => {
    if (!isHost || !state || state === prevStateRef.current) return;
    prevStateRef.current = state;
    room.broadcastState(state);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, isHost]);

  // ── Init room on mount ─────────────────────────────────────────────────────

  const initializedRef = React.useRef(false);
  React.useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    if (isHost) {
      const myName = config?.players.find((p) => p.id === myPlayerId)?.name ?? "Host";
      room.createRoom(myName);
    } else if (initialRoomCode) {
      room.joinRoom(initialRoomCode, initialPlayerName ?? "Player");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleAction = React.useCallback(
    (action: BlackjackAction) => {
      if (isHost) {
        if (!state) return;
        const result = validateAction(state, action);
        if (!result.valid) return;
        dispatch(action);
      } else {
        room.sendAction(action);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isHost, state]
  );

  // ─── Waiting room ──────────────────────────────────────────────────────────

  // ── Host: auto-start round when all players have placed their bets ──────────

  React.useEffect(() => {
    if (!isHost || !state || state.phase !== "betting") return;
    const allReady = state.players
      .filter((p) => p.status !== "eliminated")
      .every((p) => p.status === "waiting");
    if (allReady) {
      const result = validateAction(state, { type: "START_ROUND" });
      if (result.valid) dispatch({ type: "START_ROUND" });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, state]);

  if (!gameStarted || !state) {
    return (
      <BlackjackWaitingRoom
        isHost={isHost}
        roomCode={room.roomCode}
        roomInfo={roomInfo}
        status={room.status}
        error={room.error}
        expectedCount={config?.players.length ?? 2}
        onStart={() => {
          if (!roomInfo) return;
          // Rebuild state using actual room member IDs so every device can
          // find itself in state.players via its own myPlayerId.
          const newConfig: GameConfig = {
            players: roomInfo.members.map((m, i) => ({
              id: m.id,
              name: m.name,
              seat: i,
              isHuman: true,
            })),
          };
          const newState = createInitialState(newConfig, seed);
          dispatch(newState as unknown as BlackjackAction);
          room.broadcastStart();
          room.broadcastState(newState);
          setGameStarted(true);
        }}
        onExit={onExit}
      />
    );
  }

  // ─── Derive this player's data ─────────────────────────────────────────────

  const myPlayer = state.players.find((p) => p.id === myPlayerId);
  const cardScale = 0.8;
  const isMyTurn =
    state.phase === "playing" &&
    state.players[state.currentPlayerIndex]?.id === myPlayerId;
  const allEliminated = state.players.every((p) => p.status === "eliminated");

  return (
    <div
      className={cn(
        "relative min-h-dvh flex flex-col",
        "bg-table texture-felt overflow-hidden"
      )}
      role="main"
      aria-label="Blackjack table (online)"
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-safe pt-3 pb-2">
        <Link href="/games/blackjack">
          <button onClick={onExit} aria-label="Exit" className="text-white/40 hover:text-white/80 transition-colors text-sm">
            ← Exit
          </button>
        </Link>
        <div className="flex items-center gap-3 text-xs text-white/40">
          <span>Round {state.round}</span>
          {room.roomCode && (
            <span className="font-mono text-[10px] tracking-wider">{room.roomCode}</span>
          )}
        </div>
        <RulesHelpButton onClick={openRules} className="text-white/40 hover:text-white/80 hover:bg-white/10" />
      </div>

      {/* Dealer */}
      <div className="flex-shrink-0 flex justify-center pt-4 pb-6">
        <DealerArea dealer={state.dealer} cardScale={cardScale} />
      </div>

      <div className="w-4/5 mx-auto h-px bg-white/10" />

      {/* Main area */}
      <div className="flex-1 flex flex-col">
        {/* ── Betting phase ── */}
        {state.phase === "betting" && (
          <OnlineBettingPhase
            players={state.players}
            myPlayerId={myPlayerId}
            myPlayer={myPlayer ?? null}
            isHost={isHost}
            onBet={(amount) => {
              if (myPlayer) handleAction({ type: "PLACE_BET", playerId: myPlayerId, amount });
            }}
            onStartRound={() => handleAction({ type: "START_ROUND" })}
          />
        )}

        {/* ── Playing / round-over ── */}
        {state.phase !== "betting" && (
          <div className="flex flex-col items-center gap-6 pt-6 pb-36">
            {/* All players visible (standard Blackjack) */}
            <div
              className={cn(
                "flex gap-4 flex-wrap justify-center px-4",
                state.players.length <= 2 ? "flex-col items-center" : "flex-row"
              )}
            >
              {state.players.map((player) => (
                <PlayerArea
                  key={player.id}
                  player={player}
                  isCurrentPlayer={player.id === myPlayerId && isMyTurn}
                  cardScale={cardScale}
                />
              ))}
            </div>

            {/* Round over */}
            {state.phase === "round-over" && (
              <div className="flex flex-col items-center gap-3 mt-4">
                {isHost && !allEliminated && (
                  <Button size="lg" onClick={() => handleAction({ type: "NEXT_ROUND" })}>
                    Next round
                  </Button>
                )}
                {isHost && allEliminated && (
                  <div className="flex flex-col items-center gap-3 text-center">
                    <p className="text-white/60 text-sm">All players have been eliminated.</p>
                    <Link href="/games/blackjack">
                      <Button variant="secondary" onClick={onExit}>Back to lobby</Button>
                    </Link>
                  </div>
                )}
                {!isHost && (
                  <p className="text-white/50 text-sm">Waiting for host to start next round…</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action bar — only show for this player during their turn */}
      {state.phase === "playing" && isMyTurn && myPlayer && (
        <OnlineActionBar player={myPlayer} onAction={handleAction} />
      )}

      {/* Spectating indicator — when others are playing */}
      {state.phase === "playing" && !isMyTurn && myPlayer && (
        <div className="fixed bottom-0 left-0 right-0 pb-safe pb-4 flex justify-center pointer-events-none">
          <div className="bg-black/70 backdrop-blur-sm px-4 py-2 rounded-full text-white/50 text-sm">
            Waiting — {state.players[state.currentPlayerIndex]?.name}&apos;s turn
          </div>
        </div>
      )}

      <RulesDrawer open={rulesOpen} onClose={closeRules} help={blackjackHelp} />
    </div>
  );
}

// ─── Online Betting Phase ─────────────────────────────────────────────────────
// Each player places their own bet on their own phone.
// The host sees all player statuses and can deal when ready.

interface OnlineBettingPhaseProps {
  players: BlackjackPlayer[];
  myPlayerId: string;
  myPlayer: BlackjackPlayer | null;
  isHost: boolean;
  onBet: (amount: number) => void;
  onStartRound: () => void;
}

function OnlineBettingPhase({
  players,
  myPlayerId,
  myPlayer,
  isHost,
  onBet,
  onStartRound,
}: OnlineBettingPhaseProps) {
  const [bet, setBet] = React.useState(MINIMUM_BET);

  const clamp = (val: number) => {
    const max = myPlayer?.chips ?? 1000;
    return Math.max(MINIMUM_BET, Math.min(max, val));
  };

  const myBetPlaced = myPlayer?.status === "waiting";
  const allBetsPlaced = players.filter((p) => p.status !== "eliminated").every((p) => p.status === "waiting");

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-lg mx-auto px-4 py-6">
      <h2 className="text-white font-[family-name:var(--font-display)] text-xl font-semibold">
        Place your bet
      </h2>

      {/* All players status (visible to everyone) */}
      <div className="flex flex-wrap gap-2 justify-center w-full">
        {players.map((p) => (
          <div key={p.id} className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs",
            p.id === myPlayerId ? "bg-yellow-500/20 border border-yellow-500/30" : "bg-white/10"
          )}>
            <div className={cn("w-2 h-2 rounded-full", p.status === "waiting" ? "bg-green-400" : "bg-zinc-500")} />
            <span className="text-white/70">{p.name}</span>
            {p.status === "waiting" && <span className="text-green-400">✓</span>}
            {p.id === myPlayerId && <span className="text-yellow-400 font-semibold">you</span>}
          </div>
        ))}
      </div>

      {/* Bet panel for this player */}
      {myPlayer && !myBetPlaced && myPlayer.status !== "eliminated" && (
        <div className="w-full flex flex-col gap-3 px-4 py-4 rounded-xl bg-white/10 border border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-white font-semibold">{myPlayer.name}</span>
            <span className="text-white/60 text-sm">{myPlayer.chips.toLocaleString()} chips</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              aria-label="Decrease bet"
              onClick={() => setBet(clamp(bet - 10))}
              className="w-10 h-10 rounded-full bg-white/10 text-white text-xl flex items-center justify-center hover:bg-white/20 active:scale-95 transition-all"
            >
              −
            </button>
            <div className="flex-1 text-center">
              <span className="text-2xl font-bold text-yellow-400 tabular-nums">{bet}</span>
              <span className="text-white/50 text-sm ml-1">chips</span>
            </div>
            <button
              aria-label="Increase bet"
              onClick={() => setBet(clamp(bet + 10))}
              className="w-10 h-10 rounded-full bg-white/10 text-white text-xl flex items-center justify-center hover:bg-white/20 active:scale-95 transition-all"
            >
              +
            </button>
          </div>

          <div className="flex gap-2 flex-wrap">
            {BET_PRESETS.map((preset) => (
              <button
                key={preset}
                disabled={preset > (myPlayer?.chips ?? 0)}
                onClick={() => setBet(clamp(preset))}
                className={cn(
                  "flex-1 min-w-[48px] py-1.5 rounded-lg text-xs font-semibold",
                  "border transition-all",
                  bet === preset ? "bg-yellow-500 border-yellow-400 text-black" : "bg-white/10 border-white/10 text-white/80",
                  "disabled:opacity-30 disabled:cursor-not-allowed"
                )}
              >
                {preset}
              </button>
            ))}
            <button
              onClick={() => setBet(myPlayer.chips)}
              className={cn(
                "flex-1 min-w-[48px] py-1.5 rounded-lg text-xs font-semibold border transition-all",
                bet === myPlayer.chips ? "bg-red-500 border-red-400 text-white" : "bg-white/10 border-white/10 text-white/80"
              )}
            >
              All in
            </button>
          </div>

          <Button size="md" fullWidth onClick={() => onBet(bet)}>
            Confirm bet
          </Button>
        </div>
      )}

      {/* Waiting message after bet placed */}
      {myBetPlaced && (
        <div className="flex flex-col items-center gap-2 py-4">
          <div className="text-3xl">✅</div>
          <p className="text-white/60 text-sm">Bet placed — waiting for others…</p>
        </div>
      )}

      {/* Eliminated */}
      {myPlayer?.status === "eliminated" && (
        <p className="text-white/40 text-sm">You&apos;ve been eliminated this session.</p>
      )}

      {/* All bets in — host will auto-deal */}
      {isHost && allBetsPlaced && (
        <p className="text-white/50 text-sm animate-pulse">Dealing cards…</p>
      )}
    </div>
  );
}

// ─── Online Action Bar ────────────────────────────────────────────────────────
// Shown only for THIS player when it's their turn.

function OnlineActionBar({
  player,
  onAction,
}: {
  player: BlackjackPlayer;
  onAction: (action: BlackjackAction) => void;
}) {
  const canDouble = player.hand.length === 2 && player.chips >= player.bet * 2;

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0",
        "pb-safe bg-gradient-to-t from-black/80 to-transparent",
        "pt-8 px-4 pb-6 flex gap-3 justify-center"
      )}
    >
      <Button
        size="lg"
        variant="secondary"
        onClick={() => onAction({ type: "STAND", playerId: player.id })}
        className="flex-1 max-w-[140px] border-white/20 text-white hover:bg-white/10"
      >
        Stand
      </Button>
      <Button
        size="lg"
        onClick={() => onAction({ type: "HIT", playerId: player.id })}
        className="flex-1 max-w-[140px]"
      >
        Hit
      </Button>
      {canDouble && (
        <Button
          size="lg"
          variant="secondary"
          onClick={() => onAction({ type: "DOUBLE_DOWN", playerId: player.id })}
          className="flex-1 max-w-[140px] border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/10"
        >
          Double
        </Button>
      )}
    </div>
  );
}

// ─── Waiting Room ─────────────────────────────────────────────────────────────

interface BlackjackWaitingRoomProps {
  isHost: boolean;
  roomCode: string | null;
  roomInfo: RoomInfo | null;
  status: string;
  error: string | null;
  expectedCount: number;
  onStart: () => void;
  onExit?: () => void;
}

function BlackjackWaitingRoom({
  isHost,
  roomCode,
  roomInfo,
  status,
  error,
  expectedCount,
  onStart,
  onExit,
}: BlackjackWaitingRoomProps) {
  const joinedCount = roomInfo?.members.length ?? 0;
  const canStart = isHost && joinedCount >= 2;

  return (
    <div className="min-h-dvh flex flex-col bg-zinc-950 text-white">
      <div className="flex items-center justify-between px-4 pt-safe pt-4 pb-2">
        <button onClick={onExit} className="text-white/40 hover:text-white/80 text-sm transition-colors">
          ← Exit
        </button>
        <span className="text-white/30 text-xs">Blackjack Online</span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 gap-8">
        {isHost && roomCode && (
          <div className="flex flex-col items-center gap-3">
            <p className="text-zinc-400 text-sm text-center">Share this code with friends:</p>
            <div className="bg-zinc-800 border border-zinc-700 rounded-2xl px-8 py-5 text-center">
              <span className="text-4xl font-mono font-black tracking-[0.3em] text-yellow-400">
                {roomCode}
              </span>
            </div>
            <p className="text-zinc-600 text-xs text-center">
              Each player opens this app → Blackjack → Join room
            </p>
          </div>
        )}

        {!isHost && (
          <div className="flex flex-col items-center gap-3">
            <div className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center text-xl",
              status === "connected" ? "bg-green-500/20" : "bg-zinc-800"
            )}>
              {status === "joining" ? "⏳" : status === "connected" ? "✅" : "❌"}
            </div>
            <p className="text-zinc-400 text-sm text-center">
              {status === "joining" ? "Connecting…" : status === "connected" ? "Connected! Waiting for host…" : error ?? "Error"}
            </p>
          </div>
        )}

        {roomInfo && roomInfo.members.length > 0 && (
          <div className="w-full max-w-xs flex flex-col gap-2">
            <p className="text-zinc-500 text-xs uppercase tracking-wider text-center">
              Players ({joinedCount}/{expectedCount})
            </p>
            {roomInfo.members.map((m) => (
              <div key={m.id} className="flex items-center gap-3 px-4 py-3 bg-zinc-800 rounded-xl">
                <div className="w-2 h-2 rounded-full bg-green-400" />
                <span className="text-sm font-medium text-white flex-1">{m.name}</span>
                {m.role === "host" && (
                  <span className="text-[10px] text-zinc-500 bg-zinc-700 px-2 py-0.5 rounded-full">host</span>
                )}
              </div>
            ))}
          </div>
        )}

        {isHost && (
          <div className="w-full max-w-xs flex flex-col gap-2">
            <Button size="lg" fullWidth onClick={onStart} disabled={!canStart}>
              {canStart ? `Start game (${joinedCount} players)` : "Waiting for players…"}
            </Button>
            {joinedCount < 2 && (
              <p className="text-zinc-600 text-xs text-center">At least 2 players needed</p>
            )}
          </div>
        )}

        {error && (
          <div className="w-full max-w-xs bg-red-900/30 border border-red-800 rounded-xl px-4 py-3">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
