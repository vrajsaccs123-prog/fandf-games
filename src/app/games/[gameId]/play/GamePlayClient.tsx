/**
 * GamePlayClient — renders the appropriate game table for the active session.
 *
 * Reads the pending session from gameSessionStore (set by the lobby).
 * If no session exists (e.g. direct URL access) it redirects back to the lobby.
 *
 * Game modules are lazy-loaded so the homepage catalogue stays fast.
 */

"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useGameSessionStore } from "@/stores/gameSessionStore";
import { getPlayerView } from "@/games/undercover/selectors";
import { reduce } from "@/games/undercover/reducer";
import type { UndercoverState } from "@/games/undercover/types";
import type { UndercoverAction } from "@/games/undercover/actions";

// ─── Lazy-loaded game tables ──────────────────────────────────────────────────

const BlackjackTable = dynamic(
  () =>
    import("@/games/blackjack/components/BlackjackTable").then((m) => ({
      default: m.BlackjackTable,
    })),
  { loading: () => <GameLoading /> }
);

const BlackjackTableOnline = dynamic(
  () =>
    import("@/games/blackjack/components/BlackjackTableOnline").then((m) => ({
      default: m.BlackjackTableOnline,
    })),
  { loading: () => <GameLoading /> }
);

const UndercoverGame = dynamic(
  () =>
    import("@/games/undercover/components/UndercoverGame").then((m) => ({
      default: m.UndercoverGame,
    })),
  { loading: () => <GameLoading /> }
);

const ModernArtTableOnline = dynamic(
  () =>
    import("@/games/modern-art/components/ModernArtTableOnline").then((m) => ({
      default: m.ModernArtTableOnline,
    })),
  { loading: () => <GameLoading /> }
);

const CaboTable = dynamic(
  () =>
    import("@/games/cabo/components/CaboTable").then((m) => ({
      default: m.CaboTable,
    })),
  { loading: () => <GameLoading /> }
);

function GameLoading() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[rgb(var(--color-surface-sunken))]">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-[rgb(var(--color-primary))] border-t-transparent"
        role="status"
        aria-label="Loading game"
      />
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface GamePlayClientProps {
  gameId: string;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function GamePlayClient({ gameId }: GamePlayClientProps) {
  const router = useRouter();
  const { blackjack, undercover, modernArt, cabo, setBlackjack, setUndercover, setModernArt, setCabo } =
    useGameSessionStore();

  // Derive active session for this game
  const hasSession =
    (gameId === "blackjack" && blackjack !== null) ||
    (gameId === "undercover" && undercover !== null) ||
    (gameId === "modern-art" && modernArt !== null) ||
    (gameId === "cabo" && cabo !== null);

  // If no session found, redirect back to the lobby page
  React.useEffect(() => {
    if (!hasSession) {
      router.replace(`/games/${gameId}`);
    }
  }, [hasSession, gameId, router]);

  function handleExit() {
    // Clear session then go back to the lobby
    if (gameId === "blackjack") setBlackjack(null);
    else if (gameId === "undercover") setUndercover(null);
    else if (gameId === "modern-art") setModernArt(null);
    else if (gameId === "cabo") setCabo(null);
    router.push(`/games/${gameId}`);
  }

  if (!hasSession) {
    // Render nothing while the redirect fires
    return null;
  }

  // ── Blackjack ──────────────────────────────────────────────────────────────
  if (gameId === "blackjack" && blackjack) {
    if (blackjack.type === "offline") {
      return (
        <BlackjackTable
          config={blackjack.config}
          mode="offline"
          onExit={handleExit}
        />
      );
    }
    if (blackjack.type === "online-host") {
      return (
        <BlackjackTableOnline
          config={blackjack.config}
          myPlayerId="player-1"
          isHost
          onExit={handleExit}
        />
      );
    }
    if (blackjack.type === "online-join") {
      return (
        <BlackjackTableOnline
          config={null}
          myPlayerId={blackjack.playerId}
          isHost={false}
          initialRoomCode={blackjack.roomCode}
          initialPlayerName={blackjack.playerName}
          initialReconnectToken={blackjack.reconnectToken}
          onExit={handleExit}
        />
      );
    }
  }

  // ── Undercover ─────────────────────────────────────────────────────────────
  if (gameId === "undercover" && undercover) {
    return (
      <UndercoverController
        initialState={undercover.initialState}
        myPlayerId={undercover.myPlayerId}
        onExit={handleExit}
      />
    );
  }

  // ── Modern Art ─────────────────────────────────────────────────────────────
  if (gameId === "modern-art" && modernArt) {
    if (modernArt.type === "online-host") {
      return (
        <ModernArtTableOnline
          isHost
          hostName={modernArt.hostName}
          myPlayerId={modernArt.playerId}
          onExit={handleExit}
        />
      );
    }
    if (modernArt.type === "online-join") {
      return (
        <ModernArtTableOnline
          isHost={false}
          myPlayerId={modernArt.playerId}
          initialRoomCode={modernArt.roomCode}
          initialPlayerName={modernArt.playerName}
          initialReconnectToken={modernArt.reconnectToken}
          onExit={handleExit}
        />
      );
    }
  }

  // ── Cabo ───────────────────────────────────────────────────────────────────
  if (gameId === "cabo" && cabo) {
    if (cabo.type === "online-host") {
      return (
        <CaboTable
          config={cabo.config}
          myPlayerId={cabo.myPlayerId}
          isHost
          onExit={handleExit}
        />
      );
    }
    if (cabo.type === "online-join") {
      return (
        <CaboTable
          config={null}
          myPlayerId={cabo.playerId}
          isHost={false}
          initialRoomCode={cabo.roomCode}
          initialPlayerName={cabo.playerName}
          initialReconnectToken={cabo.reconnectToken}
          onExit={handleExit}
        />
      );
    }
  }

  return null;
}

// ─── Undercover state controller ──────────────────────────────────────────────
//
// UndercoverGame is a pure view component: it receives a derived view and
// dispatches actions.  We own the authoritative state here.

interface UndercoverControllerProps {
  initialState: UndercoverState;
  myPlayerId: string;
  onExit: () => void;
}

function UndercoverController({
  initialState,
  myPlayerId,
  onExit,
}: UndercoverControllerProps) {
  const [gameState, setGameState] = React.useState<UndercoverState>(initialState);

  function handleAction(action: UndercoverAction) {
    setGameState((prev) => reduce(prev, action));
  }

  const view = getPlayerView(gameState, myPlayerId);

  return (
    <div className="fixed inset-0 z-[var(--z-game)] bg-[rgb(var(--color-surface-sunken))] overflow-y-auto">
      <UndercoverGame view={view} onAction={handleAction} onExit={onExit} />
    </div>
  );
}
