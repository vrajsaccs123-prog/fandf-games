"use client";

import { cn } from "@/lib/cn";

export function HostTransferOverlay({
  visible,
  message,
}: {
  visible: boolean;
  message?: string | null;
}) {
  if (!visible) return null;
  return (
    <div
      className={cn(
        "fixed inset-0 z-[60] flex items-center justify-center",
        "bg-black/70 px-6"
      )}
      role="status"
    >
      <div className="max-w-sm w-full rounded-2xl bg-[rgb(var(--color-surface))] border border-[rgb(var(--color-border))] p-6 text-center shadow-lg">
        <div className="text-3xl mb-3">🔄</div>
        <h2 className="text-lg font-bold text-[rgb(var(--color-text))]">
          Passing the host
        </h2>
        <p className="text-sm text-[rgb(var(--color-text-muted))] mt-2">
          {message ||
            "The host left. Another player is taking over the room so the game can continue."}
        </p>
        <div className="flex justify-center gap-1.5 mt-4">
          <span className="w-2 h-2 rounded-full bg-[rgb(var(--color-primary))] animate-bounce" style={{ animationDelay: "0ms" }} />
          <span className="w-2 h-2 rounded-full bg-[rgb(var(--color-primary))] animate-bounce" style={{ animationDelay: "150ms" }} />
          <span className="w-2 h-2 rounded-full bg-[rgb(var(--color-primary))] animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </div>
  );
}
