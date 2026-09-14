/**
 * 404 — Not found page.
 */

import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <AppShell>
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4 text-center">
        <span className="text-6xl" aria-hidden="true">🃏</span>
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold text-[rgb(var(--color-text))]">
            Page not found
          </h1>
          <p className="text-[rgb(var(--color-text-muted))]">
            That page doesn&apos;t exist. Try browsing the game catalogue.
          </p>
        </div>
        <Link href="/games">
          <Button>Browse games</Button>
        </Link>
      </div>
    </AppShell>
  );
}
