/**
 * PWA install prompt state — persisted to localStorage.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface PwaState {
  /** User dismissed the install prompt */
  installPromptDismissed: boolean;
  /** Timestamp when dismissed — used to optionally re-prompt after 30 days */
  installPromptDismissedAt: number | null;

  dismissInstallPrompt: () => void;
  resetInstallPrompt: () => void;
}

const RE_PROMPT_AFTER_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export const usePwaStore = create<PwaState>()(
  persist(
    (set) => ({
      installPromptDismissed: false,
      installPromptDismissedAt: null,

      dismissInstallPrompt: () =>
        set({
          installPromptDismissed: true,
          installPromptDismissedAt: Date.now(),
        }),

      resetInstallPrompt: () =>
        set({
          installPromptDismissed: false,
          installPromptDismissedAt: null,
        }),
    }),
    {
      name: "fandf-pwa",
    }
  )
);

/** Whether the install prompt should be shown (respects dismiss + expiry). */
export function shouldShowInstallPrompt(
  dismissed: boolean,
  dismissedAt: number | null
): boolean {
  if (!dismissed) return true;
  if (dismissedAt === null) return false;
  return Date.now() - dismissedAt > RE_PROMPT_AFTER_MS;
}
