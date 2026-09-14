/**
 * AppShell — the persistent outer chrome wrapping every page.
 *
 * Keeps: the top nav bar, safe-area padding, and the main content slot.
 * The game surface bypasses this shell (games take the full viewport).
 */

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { InstallAppButton } from "@/components/pwa/InstallAppButton";
interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-dvh flex flex-col bg-[rgb(var(--color-background))]">
      <TopNav />
      <main className="flex-1 flex flex-col">{children}</main>
    </div>
  );
}

// ─── Top Navigation ───────────────────────────────────────────────────────────

function TopNav() {
  return (
    <header
      className={cn(
        "sticky top-0 z-[var(--z-sticky)]",
        "bg-[rgb(var(--color-background)/0.92)]",
        "backdrop-blur-md",
        "border-b border-[rgb(var(--color-border))]",
        "pt-safe"
      )}
    >
      <div className="max-w-screen-xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Wordmark */}
        <Link
          href="/games"
          className={cn(
            "font-[family-name:var(--font-display)]",
            "text-lg font-semibold",
            "text-[rgb(var(--color-text))]",
            "hover:text-[rgb(var(--color-primary))]",
            "transition-colors duration-[var(--duration-fast)]"
          )}
        >
          F&amp;F Games
        </Link>

        <nav aria-label="Main navigation" className="flex items-center gap-2">
          <InstallAppButton />
        </nav>
      </div>
    </header>
  );
}
