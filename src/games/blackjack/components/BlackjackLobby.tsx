/**
 * BlackjackLobby — mode selection and player setup.
 *
 * OFFLINE  — All players share one device. Players pass the phone to each
 *            other during the betting phase (each player places their own bet
 *            privately). During play, all hands are visible on screen as
 *            in a physical Blackjack table — this is normal for the game.
 *
 * ONLINE   — Each player uses their own phone.
 *   • Create: host gets a room code; other players enter it.
 *   • Join:   enter the code to connect and play.
 *
 * In online mode, each player only sees actions for their own hand. The
 * dealer is controlled automatically by the host.
 */

"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import type { GameConfig } from "@/game/core/types";
import { blackjackFacts } from "../rules";
import { playerCountOptions } from "@/game/core/rulesFacts";
import { normalizeRoomCode, isValidRoomCode } from "@/lib/online/roomCode";
import { useGameSessionStore } from "@/stores/gameSessionStore";

// ─── Types ────────────────────────────────────────────────────────────────────

type Screen =
  | "pick-mode"
  | "offline-setup"
  | "online-create-setup"
  | "online-join-setup";

interface BlackjackLobbyProps {
  onStart?: (config: GameConfig) => void;
}

const DEFAULT_NAMES = ["Alice", "Bob", "Charlie", "Dana", "Eve", "Frank"];

// ─── Component ────────────────────────────────────────────────────────────────

export function BlackjackLobby({ onStart }: BlackjackLobbyProps) {
  const router = useRouter();
  const { setBlackjack } = useGameSessionStore();
  const [screen, setScreen] = React.useState<Screen>("pick-mode");

  // Offline state
  const [playerCount, setPlayerCount] = React.useState(2);
  const [names, setNames] = React.useState<string[]>(DEFAULT_NAMES);

  // Online-create state
  const [hostName, setHostName] = React.useState("");
  const [onlinePlayerCount, setOnlinePlayerCount] = React.useState(3);

  // Online-join state
  const [joinName, setJoinName] = React.useState("");
  const [joinCode, setJoinCode] = React.useState("");

  // ─── Handlers ────────────────────────────────────────────────────────────────

  function handleOfflineStart() {
    const players = Array.from({ length: playerCount }, (_, i) => ({
      id: `player-${i + 1}`,
      name: names[i]?.trim() || DEFAULT_NAMES[i],
      seat: i,
      isHuman: true,
    }));
    const config: GameConfig = { players };
    setBlackjack({ type: "offline", config });
    onStart?.(config);
    router.push("/games/blackjack/play");
  }

  function handleOnlineCreate() {
    const trimmed = hostName.trim() || "Host";
    const players = Array.from({ length: onlinePlayerCount }, (_, i) => ({
      id: `player-${i + 1}`,
      name: i === 0 ? trimmed : `Player ${i + 1}`,
      seat: i,
      isHuman: true,
    }));
    const config: GameConfig = { players };
    setBlackjack({ type: "online-host", config });
    onStart?.(config);
    router.push("/games/blackjack/play");
  }

  function handleOnlineJoin() {
    const code = normalizeRoomCode(joinCode);
    if (!isValidRoomCode(code)) return;
    const pid = `player-join-${Date.now()}`;
    setBlackjack({
      type: "online-join",
      playerId: pid,
      roomCode: code,
      playerName: joinName.trim() || "Guest",
    });
    router.push("/games/blackjack/play");
  }

  // ─── Mode picker ─────────────────────────────────────────────────────────────

  if (screen === "pick-mode") {
    return (
      <div className="flex flex-col gap-4 w-full">
        <p className="text-sm text-[rgb(var(--color-text-muted))] text-center">
          How do you want to play?
        </p>

        {blackjackFacts.supportsLocal && (
          <ModeCard
            icon="📱"
            title="Same device"
            description="Pass the phone to place bets privately. All hands visible during play."
            onClick={() => setScreen("offline-setup")}
          />
        )}
        {blackjackFacts.supportsOnline && (
          <>
            <ModeCard
              icon="🌐"
              title="Online — Create room"
              description="Share a code with friends. Each player bets and plays on their own phone."
              onClick={() => setScreen("online-create-setup")}
            />
            <ModeCard
              icon="🔗"
              title="Online — Join room"
              description="Enter the 6-letter code from the host."
              onClick={() => setScreen("online-join-setup")}
            />
          </>
        )}
      </div>
    );
  }

  // ─── Offline setup ────────────────────────────────────────────────────────────

  if (screen === "offline-setup") {
    return (
      <div className="flex flex-col gap-6 w-full">
        <BackButton onClick={() => setScreen("pick-mode")} />

        <div className="flex flex-col gap-3">
          <label className="text-sm font-medium text-[rgb(var(--color-text-muted))]">
            Number of players
          </label>
          <div className="flex gap-2">
            {playerCountOptions(blackjackFacts).map((n) => (
              <CountButton
                key={n}
                n={n}
                active={n === playerCount}
                onClick={() => setPlayerCount(n)}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-[rgb(var(--color-text-muted))]">
            Player names
          </label>
          <div className="flex flex-col gap-2">
            {Array.from({ length: playerCount }, (_, i) => (
              <NameInput
                key={i}
                placeholder={DEFAULT_NAMES[i]}
                value={names[i] || ""}
                onChange={(v) => {
                  const updated = [...names];
                  updated[i] = v;
                  setNames(updated);
                }}
              />
            ))}
          </div>
        </div>

        <Button size="lg" fullWidth onClick={handleOfflineStart}>
          Start game
        </Button>
      </div>
    );
  }

  // ─── Online create setup ──────────────────────────────────────────────────────

  if (screen === "online-create-setup") {
    return (
      <div className="flex flex-col gap-6 w-full">
        <BackButton onClick={() => setScreen("pick-mode")} />

        <div className="flex flex-col gap-3">
          <label className="text-sm font-medium text-[rgb(var(--color-text-muted))]">
            Your name
          </label>
          <NameInput placeholder="Your name" value={hostName} onChange={setHostName} />
        </div>

        <div className="flex flex-col gap-3">
          <label className="text-sm font-medium text-[rgb(var(--color-text-muted))]">
            Expected number of players
          </label>
          <div className="flex flex-wrap gap-2">
            {playerCountOptions(blackjackFacts).map((n) => (
              <CountButton
                key={n}
                n={n}
                active={n === onlinePlayerCount}
                onClick={() => setOnlinePlayerCount(n)}
              />
            ))}
          </div>
          <p className="text-xs text-[rgb(var(--color-text-muted))]">
            Players 2–{onlinePlayerCount} will enter the code on their own phones.
          </p>
        </div>

        <Button size="lg" fullWidth onClick={handleOnlineCreate} disabled={!hostName.trim()}>
          Create room
        </Button>
      </div>
    );
  }

  // ─── Online join setup ────────────────────────────────────────────────────────

  if (screen === "online-join-setup") {
    const codeValid = isValidRoomCode(normalizeRoomCode(joinCode));

    return (
      <div className="flex flex-col gap-6 w-full">
        <BackButton onClick={() => setScreen("pick-mode")} />

        <div className="flex flex-col gap-3">
          <label className="text-sm font-medium text-[rgb(var(--color-text-muted))]">
            Your name
          </label>
          <NameInput placeholder="Your name" value={joinName} onChange={setJoinName} />
        </div>

        <div className="flex flex-col gap-3">
          <label className="text-sm font-medium text-[rgb(var(--color-text-muted))]">
            Room code
          </label>
          <input
            type="text"
            placeholder="e.g. A3K7P2"
            value={joinCode}
            onChange={(e) => setJoinCode(normalizeRoomCode(e.target.value))}
            maxLength={6}
            className={cn(
              "h-12 px-3 text-center text-xl font-mono tracking-widest uppercase",
              "bg-[rgb(var(--color-surface))]",
              "border border-[rgb(var(--color-border))]",
              "rounded-[var(--radius-md)]",
              "text-[rgb(var(--color-text))]",
              "placeholder:text-[rgb(var(--color-text-muted))] placeholder:normal-case placeholder:text-sm placeholder:tracking-normal",
              "focus:outline-none focus:border-[rgb(var(--color-primary))]",
              "transition-colors"
            )}
          />
        </div>

        <Button size="lg" fullWidth onClick={handleOnlineJoin} disabled={!codeValid || !joinName.trim()}>
          Join room
        </Button>
      </div>
    );
  }

  return null;
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function ModeCard({ icon, title, description, onClick }: {
  icon: string; title: string; description: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-start gap-4 w-full text-left",
        "px-4 py-4 rounded-[var(--radius-lg)]",
        "bg-[rgb(var(--color-surface))]",
        "border border-[rgb(var(--color-border))]",
        "hover:bg-[rgb(var(--color-surface-raised))] hover:border-[rgb(var(--color-border-strong))]",
        "transition-all duration-150 active:scale-[0.98]"
      )}
    >
      <span className="text-2xl mt-0.5">{icon}</span>
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-semibold text-[rgb(var(--color-text))]">{title}</span>
        <span className="text-xs text-[rgb(var(--color-text-muted))]">{description}</span>
      </div>
      <span className="ml-auto text-[rgb(var(--color-text-muted))] self-center text-lg">→</span>
    </button>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-sm text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-text))] flex items-center gap-1 transition-colors">
      ← Back
    </button>
  );
}

function CountButton({ n, active, onClick }: { n: number; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "h-11 w-11 rounded-[var(--radius-md)]",
        "text-sm font-semibold",
        "border transition-all duration-150",
        active
          ? "bg-[rgb(var(--color-primary))] text-[rgb(var(--color-primary-foreground))] border-transparent"
          : "bg-transparent text-[rgb(var(--color-text-muted))] border-[rgb(var(--color-border-strong))] hover:bg-[rgb(var(--color-surface-raised))]"
      )}
    >
      {n}
    </button>
  );
}

function NameInput({ placeholder, value, onChange }: { placeholder: string; value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      maxLength={20}
      className={cn(
        "h-11 px-3",
        "bg-[rgb(var(--color-surface))]",
        "border border-[rgb(var(--color-border))]",
        "rounded-[var(--radius-md)]",
        "text-sm text-[rgb(var(--color-text))]",
        "placeholder:text-[rgb(var(--color-text-muted))]",
        "focus:outline-none focus:border-[rgb(var(--color-primary))]",
        "transition-colors"
      )}
    />
  );
}

