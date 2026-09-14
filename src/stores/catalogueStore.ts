/**
 * Catalogue store — manages the user's active filters and search state.
 *
 * NOT persisted: filters are session-level UX state, not preferences.
 */

import { create } from "zustand";
import {
  type CatalogueFilters,
  DEFAULT_FILTERS,
  hasActiveFilters,
} from "@/catalogue/filters";
import type { GameCategory, GameDifficulty, GameMechanic, GameMode } from "@/game/core/types";
import type { DurationBucket } from "@/catalogue/filters";

interface CatalogueState {
  filters: CatalogueFilters;
  isFilterDrawerOpen: boolean;

  setSearch: (query: string) => void;
  setPlayerCount: (count: number | undefined) => void;
  toggleDifficulty: (difficulty: GameDifficulty) => void;
  toggleDuration: (bucket: DurationBucket) => void;
  toggleCategory: (category: GameCategory) => void;
  toggleMechanic: (mechanic: GameMechanic) => void;
  toggleMode: (mode: GameMode) => void;
  clearFilters: () => void;
  openFilterDrawer: () => void;
  closeFilterDrawer: () => void;

  hasActiveFilters: boolean;
}

export const useCatalogueStore = create<CatalogueState>()((set, get) => ({
  filters: DEFAULT_FILTERS,
  isFilterDrawerOpen: false,

  get hasActiveFilters() {
    return hasActiveFilters(get().filters);
  },

  setSearch: (query) =>
    set((s) => ({ filters: { ...s.filters, search: query } })),

  setPlayerCount: (count) =>
    set((s) => ({ filters: { ...s.filters, playerCount: count } })),

  toggleDifficulty: (difficulty) =>
    set((s) => {
      const current = s.filters.difficulty ?? [];
      const next = current.includes(difficulty)
        ? current.filter((d) => d !== difficulty)
        : [...current, difficulty];
      return { filters: { ...s.filters, difficulty: next } };
    }),

  toggleDuration: (bucket) =>
    set((s) => {
      const current = s.filters.duration ?? [];
      const next = current.includes(bucket)
        ? current.filter((b) => b !== bucket)
        : [...current, bucket];
      return { filters: { ...s.filters, duration: next } };
    }),

  toggleCategory: (category) =>
    set((s) => {
      const current = s.filters.categories ?? [];
      const next = current.includes(category)
        ? current.filter((c) => c !== category)
        : [...current, category];
      return { filters: { ...s.filters, categories: next } };
    }),

  toggleMechanic: (mechanic) =>
    set((s) => {
      const current = s.filters.mechanics ?? [];
      const next = current.includes(mechanic)
        ? current.filter((m) => m !== mechanic)
        : [...current, mechanic];
      return { filters: { ...s.filters, mechanics: next } };
    }),

  toggleMode: (mode) =>
    set((s) => {
      const current = s.filters.modes ?? [];
      const next = current.includes(mode)
        ? current.filter((m) => m !== mode)
        : [...current, mode];
      return { filters: { ...s.filters, modes: next } };
    }),

  clearFilters: () => set({ filters: DEFAULT_FILTERS }),

  openFilterDrawer: () => set({ isFilterDrawerOpen: true }),
  closeFilterDrawer: () => set({ isFilterDrawerOpen: false }),
}));
