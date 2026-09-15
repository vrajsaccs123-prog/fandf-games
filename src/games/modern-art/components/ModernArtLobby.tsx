/**
 * ModernArtLobby — Online-only setup screen for Modern Art.
 *
 * Two modes:
 *   CREATE ROOM  — host enters their name; navigates to /play with an online-host session.
 *   JOIN ROOM    — player enters a 6-letter room code + name; navigates to /play with an online-join session.
 */

"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { useGameSessionStore } from "@/stores/gameSessionStore";
import { modernArtFacts } from "../rules";
import { formatPlayerRange } from "@/game/core/rulesFacts";
import {
  formatJoinCodeInput,
  joinPayloadFromInput,
} from "@/lib/online/reconnectCode";

// ─── Stable per-device player ID ─────────────────────────────────────────────
//
// Stored in sessionStorage so it survives re-renders but resets on new tabs/sessions.

function getOrCreatePlayerId(): string {
  if (typeof window === "undefined") return "ssr-player";
  const key = "modern-art-player-id";
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = `ma-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    sessionStorage.setItem(key, id);
  }
  return id;
}

// ─── Shared input styles ──────────────────────────────────────────────────────

const inputCls = cn(
  "w-full rounded-xl px-4 py-3 text-sm",
  "bg-[rgb(var(--color-surface-sunken))] text-[rgb(var(--color-text))]",
  "border border-[rgb(var(--color-border))]",
  "focus:border-[rgb(var(--color-primary)/0.6)] focus:outline-none",
  "transition-colors placeholder:text-[rgb(var(--color-text-muted))]"
);

// ─── Main Lobby ───────────────────────────────────────────────────────────────

export function ModernArtLobby() {
  const router = useRouter();
  const setModernArt = useGameSessionStore((s) => s.setModernArt);

  const [tab, setTab] = React.useState<"create" | "join">("create");
  const [name, setName] = React.useState("");
  const [roomCode, setRoomCode] = React.useState("");
  const [error, setError] = React.useState("");

  const playerId = React.useMemo(() => getOrCreatePlayerId(), []);

  // ── Create Room ──────────────────────────────────────────────────────────

  function handleCreate() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Please enter your name.");
      return;
    }
    setError("");
    setModernArt({ type: "online-host", hostName: trimmedName, playerId });
    router.push("/games/modern-art/play");
  }

  // ── Join Room ────────────────────────────────────────────────────────────

  function handleJoin() {
    const trimmedName = name.trim();
    const payload = joinPayloadFromInput(roomCode);
    const isRejoin = Boolean(payload?.reconnectToken);
    if (!isRejoin && !trimmedName) {
      setError("Please enter your name.");
      return;
    }
    if (!payload) {
      setError("Enter a 6-letter room code, or a rejoin code if you got disconnected.");
      return;
    }
    setError("");
    setModernArt({
      type: "online-join",
      playerId,
      roomCode: payload.roomCode,
      playerName: trimmedName || "Guest",
      reconnectToken: payload.reconnectToken,
    });
    router.push("/games/modern-art/play");
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Tab switcher */}
      <div className="flex gap-1 p-1 bg-[rgb(var(--color-surface-sunken))] rounded-xl">
        <button
          onClick={() => { setTab("create"); setError(""); }}
          className={cn(
            "flex-1 py-2 rounded-lg text-sm font-semibold transition-all",
            tab === "create"
              ? "bg-[rgb(var(--color-surface-raised))] text-[rgb(var(--color-text))] shadow-sm"
              : "text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-text))]"
          )}
        >
          Create Room
        </button>
        <button
          onClick={() => { setTab("join"); setError(""); }}
          className={cn(
            "flex-1 py-2 rounded-lg text-sm font-semibold transition-all",
            tab === "join"
              ? "bg-[rgb(var(--color-surface-raised))] text-[rgb(var(--color-text))] shadow-sm"
              : "text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-text))]"
          )}
        >
          Join Room
        </button>
      </div>

      {/* Your name (shared between both tabs) */}
      <div>
        <label className="text-xs font-medium text-[rgb(var(--color-text-muted))] uppercase tracking-wide block mb-2">
          Your Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => { setName(e.target.value); setError(""); }}
          onKeyDown={(e) => e.key === "Enter" && (tab === "create" ? handleCreate() : handleJoin())}
          placeholder="Enter your name…"
          maxLength={20}
          className={inputCls}
          autoFocus
        />
      </div>

      {/* Room code (join only) */}
      {tab === "join" && (
        <div>
          <label className="text-xs font-medium text-[rgb(var(--color-text-muted))] uppercase tracking-wide block mb-2">
            Room or Rejoin Code
          </label>
          <input
            type="text"
            value={roomCode}
            onChange={(e) => { setRoomCode(formatJoinCodeInput(e.target.value)); setError(""); }}
            onKeyDown={(e) => e.key === "Enter" && handleJoin()}
            placeholder="A3K7P2 or A3K7P2-K9M4"
            maxLength={11}
            className={cn(inputCls, "font-mono tracking-[0.2em] text-center text-lg")}
          />
        </div>
      )}

      {/* Error message */}
      {error && (
        <p className="text-red-400 text-xs text-center">{error}</p>
      )}

      {/* Info blurb */}
      <div className="text-xs text-[rgb(var(--color-text-muted))] text-center leading-relaxed">
        {tab === "create"
          ? `You'll receive a 6-letter room code to share. You decide when to start (${formatPlayerRange(modernArtFacts)} players needed).`
          : "Ask the host for the room code. Got disconnected? Paste the rejoin code your friends share to reclaim your seat."}
      </div>

      {/* Action button */}
      {tab === "create" ? (
        <Button variant="primary" size="lg" fullWidth onClick={handleCreate}>
          🎨 Create Room
        </Button>
      ) : (
        <Button variant="primary" size="lg" fullWidth onClick={handleJoin}>
          {joinPayloadFromInput(roomCode)?.reconnectToken ? "🔄 Rejoin Game" : "🚪 Join Room"}
        </Button>
      )}
    </div>
  );
}
