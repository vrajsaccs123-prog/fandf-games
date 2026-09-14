import Link from "next/link";
import { createPageMetadata } from "@/lib/metadata";
import { Button } from "@/components/ui/Button";
import { RetryButton } from "./RetryButton";

export const metadata = createPageMetadata({
  title: "Offline",
  description: "You are currently offline. Reconnect to browse and play games.",
  path: "/offline",
});

export default function OfflinePage() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 py-12 text-center bg-[rgb(var(--color-background))]">
      <div className="max-w-md flex flex-col items-center gap-6">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center bg-[rgb(var(--color-surface-raised))] border border-[rgb(var(--color-border))]"
          aria-hidden="true"
        >
          <svg
            width="36"
            height="36"
            viewBox="0 0 24 24"
            fill="none"
            className="text-[rgb(var(--color-text-muted))]"
          >
            <path
              d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-2h2v2h-2zm0-4V7h2v6h-2z"
              fill="currentColor"
            />
          </svg>
        </div>

        <div className="flex flex-col gap-2">
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[rgb(var(--color-text))]">
            You&apos;re offline
          </h1>
          <p className="text-[rgb(var(--color-text-muted))] leading-relaxed">
            F&amp;F Games needs an internet connection to load new pages. Cached
            games and pages may still be available.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <RetryButton />
          <Link href="/games" className="w-full">
            <Button variant="secondary" fullWidth>
              Browse catalogue
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
