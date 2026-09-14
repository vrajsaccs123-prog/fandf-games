/**
 * User preferences store — persisted to localStorage.
 *
 * Covers: audio, reduced motion override.
 * These should survive page reloads but never contain sensitive game data.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface PreferencesState {
  audioEnabled: boolean;
  /** User-level motion override (null = respect OS setting) */
  reducedMotion: boolean | null;

  setAudioEnabled: (enabled: boolean) => void;
  setReducedMotion: (reduced: boolean | null) => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      audioEnabled: true,
      reducedMotion: null,

      setAudioEnabled: (audioEnabled) => set({ audioEnabled }),
      setReducedMotion: (reducedMotion) => set({ reducedMotion }),
    }),
    {
      name: "fandf-preferences",
    }
  )
);
