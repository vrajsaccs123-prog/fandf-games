"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import {
  formatRejoinCode,
  isMemberConnected,
} from "@/lib/online/reconnectCode";

interface DisconnectedPlayersNoticeProps {
  members:
    | Array<{
        id: string;
        name: string;
        role?: string;
        connected?: boolean;
        reconnectCode?: string;
      }>
    | undefined;
  roomCode: string | null;
  /** Compact banner for in-game overlays vs. the waiting-room card */
  compact?: boolean;
  className?: string;
}

export function DisconnectedPlayersNotice({
  members,
  roomCode,
  compact = false,
  className,
}: DisconnectedPlayersNoticeProps) {
  const disconnected = (members ?? []).filter(
    (m) => !isMemberConnected(m) && m.role !== "host"
  );
  if (disconnected.length === 0) return null;

  return (
    <div
      className={cn(
        "w-full rounded-xl border border-amber-500/40 bg-amber-950/80 text-amber-50 shadow-lg",
        compact ? "px-3 py-2" : "px-4 py-3",
        className
      )}
      role="status"
    >
      <p className={cn("font-semibold", compact ? "text-xs" : "text-sm")}>
        {disconnected.length === 1
          ? `${disconnected[0].name} disconnected`
          : `${disconnected.length} players disconnected`}
      </p>
      <p className={cn("text-amber-100/80 mt-0.5", compact ? "text-[11px]" : "text-xs")}>
        Share a rejoin code so they can sit back down in the same seat.
      </p>
      <div className={cn("flex flex-col", compact ? "mt-2 gap-1.5" : "mt-3 gap-2")}>
        {disconnected.map((m) => (
          <RejoinCodeRow
            key={m.id}
            name={m.name}
            roomCode={roomCode}
            seatCode={m.reconnectCode}
            compact={compact}
          />
        ))}
      </div>
    </div>
  );
}

function RejoinCodeRow({
  name,
  roomCode,
  seatCode,
  compact,
}: {
  name: string;
  roomCode: string | null;
  seatCode: string | undefined;
  compact: boolean;
}) {
  const [copied, setCopied] = React.useState(false);
  const code =
    roomCode && seatCode ? formatRejoinCode(roomCode, seatCode) : null;

  async function copy() {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard may be unavailable */
    }
  }

  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          "truncate text-amber-100/90",
          compact ? "text-[11px] max-w-[7rem]" : "text-xs max-w-[8rem]"
        )}
      >
        {name}
      </span>
      {code ? (
        <button
          type="button"
          onClick={copy}
          className={cn(
            "flex-1 font-mono font-bold tracking-widest rounded-lg border border-amber-400/40 bg-black/30 hover:bg-black/50 transition-colors",
            compact ? "text-xs px-2 py-1" : "text-sm px-3 py-1.5"
          )}
        >
          {copied ? "Copied!" : code}
        </button>
      ) : (
        <span className="flex-1 text-[11px] text-amber-100/60">
          Waiting for host…
        </span>
      )}
    </div>
  );
}

export function ConnectionDot({ connected }: { connected: boolean }) {
  return (
    <span
      className={cn(
        "inline-block w-2 h-2 rounded-full shrink-0",
        connected ? "bg-emerald-400" : "bg-red-400"
      )}
      title={connected ? "Connected" : "Disconnected"}
      aria-label={connected ? "Connected" : "Disconnected"}
    />
  );
}
