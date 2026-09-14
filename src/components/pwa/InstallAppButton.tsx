/**
 * InstallAppButton — subtle PWA install affordance in the top nav.
 *
 * - Chromium: uses the deferred beforeinstallprompt event
 * - iOS Safari: opens instructions for Add to Home Screen
 * - Hidden when already installed or permanently dismissed
 */

"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { BottomSheet } from "@/components/overlays/BottomSheet";
import {
  getInstallPlatform,
  isBeforeInstallPromptEvent,
  isIosSafari,
  isStandaloneMode,
  supportsNativeInstallPrompt,
  type BeforeInstallPromptEvent,
} from "@/lib/pwa/install";
import {
  shouldShowInstallPrompt,
  usePwaStore,
} from "@/stores/pwaStore";

/** Catalogue and per-game lobby pages only — never during active gameplay. */
function isInstallAllowedPath(pathname: string): boolean {
  if (pathname === "/games") return true;
  // /games/[gameId] lobby/detail, but not /games/[gameId]/play
  return /^\/games\/[^/]+$/.test(pathname);
}

export function InstallAppButton() {
  const pathname = usePathname();
  const { installPromptDismissed, installPromptDismissedAt, dismissInstallPrompt } =
    usePwaStore();

  const [mounted, setMounted] = React.useState(false);
  const [installed, setInstalled] = React.useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    React.useState<BeforeInstallPromptEvent | null>(null);
  const [showIosSheet, setShowIosSheet] = React.useState(false);
  const [installing, setInstalling] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    setInstalled(isStandaloneMode());
  }, []);

  React.useEffect(() => {
    if (!mounted || !supportsNativeInstallPrompt()) return;

    const handler = (event: Event) => {
      event.preventDefault();
      if (isBeforeInstallPromptEvent(event)) {
        setDeferredPrompt(event);
      }
    };

    window.addEventListener("beforeinstallprompt", handler);

    const onInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [mounted]);

  if (!mounted || installed || !isInstallAllowedPath(pathname)) return null;

  const canShow = shouldShowInstallPrompt(
    installPromptDismissed,
    installPromptDismissedAt
  );
  if (!canShow) return null;

  const showIosInstructions = isIosSafari();
  const showNativeInstall = deferredPrompt !== null;
  const showButton = showIosInstructions || showNativeInstall;

  if (!showButton) return null;

  async function handleInstallClick() {
    if (showIosInstructions) {
      setShowIosSheet(true);
      return;
    }

    if (!deferredPrompt) return;

    setInstalling(true);
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setInstalled(true);
      } else {
        dismissInstallPrompt();
      }
    } finally {
      setDeferredPrompt(null);
      setInstalling(false);
    }
  }

  function handleCloseSheet() {
    setShowIosSheet(false);
  }

  function handleDismissPermanently() {
    setShowIosSheet(false);
    dismissInstallPrompt();
  }

  const label = showIosInstructions ? "Add to Home Screen" : "Install App";

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        loading={installing}
        onClick={handleInstallClick}
        className={cn(
          "hidden sm:inline-flex",
          "text-[rgb(var(--color-text-muted))]",
          "hover:text-[rgb(var(--color-primary))]"
        )}
        aria-label={label}
      >
        <DownloadIcon />
        <span className="hidden md:inline">{label}</span>
      </Button>

      {/* Compact icon-only button on small screens */}
      <Button
        variant="icon"
        size="sm"
        loading={installing}
        onClick={handleInstallClick}
        className="sm:hidden text-[rgb(var(--color-text-muted))]"
        aria-label={label}
      >
        <DownloadIcon />
      </Button>

      <BottomSheet
        open={showIosSheet}
        onClose={() => setShowIosSheet(false)}
        title="Add to Home Screen"
        height="auto"
      >
        <IosInstallInstructions
          onClose={handleCloseSheet}
          onDismissPermanently={handleDismissPermanently}
          platform={getInstallPlatform()}
        />
      </BottomSheet>
    </>
  );
}

function DownloadIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M8 2v8m0 0l3-3m-3 3L5 7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3 12h10"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IosInstallInstructions({
  onClose,
  onDismissPermanently,
  platform,
}: {
  onClose: () => void;
  onDismissPermanently: () => void;
  platform: ReturnType<typeof getInstallPlatform>;
}) {
  const steps =
    platform === "ios"
      ? [
          'Tap the Share button at the bottom of Safari (square with an arrow pointing up).',
          'Scroll down and tap "Add to Home Screen".',
          'Tap "Add" in the top-right corner.',
        ]
      : [
          "Open your browser menu (usually three dots).",
          'Select "Install app" or "Add to Home Screen".',
          "Confirm to add F&F Games to your device.",
        ];

  return (
    <div className="flex flex-col gap-5 pb-2">
      <p className="text-sm text-[rgb(var(--color-text-muted))] leading-relaxed">
        Install F&amp;F Games for a full-screen app experience with quick access
        from your home screen.
      </p>

      <ol className="flex flex-col gap-3">
        {steps.map((step, index) => (
          <li key={step} className="flex gap-3 text-sm">
            <span
              className={cn(
                "flex-shrink-0 w-6 h-6 rounded-full",
                "bg-[rgb(var(--color-primary))]",
                "text-[rgb(var(--color-primary-foreground))]",
                "text-xs font-bold flex items-center justify-center"
              )}
            >
              {index + 1}
            </span>
            <span className="text-[rgb(var(--color-text))] pt-0.5">{step}</span>
          </li>
        ))}
      </ol>

      <div className="flex flex-col gap-2 pt-2">
        <Button variant="primary" fullWidth onClick={onClose}>
          Got it
        </Button>
        <Button variant="ghost" fullWidth onClick={onDismissPermanently}>
          Don&apos;t show again
        </Button>
      </div>
    </div>
  );
}
