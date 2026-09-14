/**
 * CatalogueClient — the client-side half of the catalogue page.
 *
 * Handles: filter state, search, and the game grid.
 * Receives the full game list from the server; filtering happens client-side.
 */

"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import { GameCard } from "@/components/ui/GameCard";
import { Button } from "@/components/ui/Button";
import { BottomSheet } from "@/components/overlays/BottomSheet";
import { useCatalogueStore } from "@/stores/catalogueStore";
import { filterGames } from "@/catalogue/gameRegistry";
import {
  CATEGORY_LABELS,
  DIFFICULTY_LABELS,
  DIFFICULTY_ORDER,
  DURATION_BUCKET_LABELS,
  hasActiveFilters,
  type CatalogueFilters,
  type DurationBucket,
} from "@/catalogue/filters";
import type { GameMetadata, GameCategory, GameDifficulty } from "@/game/core/types";

interface CatalogueClientProps {
  initialGames: GameMetadata[];
}

export function CatalogueClient({ initialGames }: CatalogueClientProps) {
  const {
    filters,
    isFilterDrawerOpen,
    setSearch,
    clearFilters,
    openFilterDrawer,
    closeFilterDrawer,
    toggleCategory,
    toggleDifficulty,
    toggleDuration,
  } = useCatalogueStore();

  const filteredGames = React.useMemo(
    () => filterGames(initialGames, filters),
    [initialGames, filters]
  );

  const activeFilterCount = [
    filters.playerCount !== undefined ? 1 : 0,
    filters.difficulty?.length ?? 0,
    filters.duration?.length ?? 0,
    filters.categories?.length ?? 0,
    filters.mechanics?.length ?? 0,
    filters.modes?.length ?? 0,
  ].reduce((a, b) => a + b, 0);

  return (
    <div className="flex-1 flex flex-col max-w-screen-xl mx-auto w-full px-4 py-6 gap-6">
      {/* Page header */}
      <header className="flex flex-col gap-1">
        <h1 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-semibold text-[rgb(var(--color-text))]">
          Games
        </h1>
        <p className="text-sm text-[rgb(var(--color-text-muted))]">
          {filteredGames.length === initialGames.length
            ? `${initialGames.length} game${initialGames.length !== 1 ? "s" : ""}`
            : `${filteredGames.length} of ${initialGames.length} games`}
        </p>
      </header>

      {/* Search + filter bar */}
      <div className="flex gap-3 items-center">
        {/* Search */}
        <div className="flex-1 relative">
          <span
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[rgb(var(--color-text-muted))]"
            aria-hidden="true"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M10.5 10.5L13 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </span>
          <input
            type="search"
            placeholder="Search games…"
            value={filters.search ?? ""}
            onChange={(e) => setSearch(e.target.value)}
            className={cn(
              "w-full h-11 pl-9 pr-4",
              "bg-[rgb(var(--color-surface))]",
              "border border-[rgb(var(--color-border))]",
              "rounded-[var(--radius-lg)]",
              "text-sm text-[rgb(var(--color-text))]",
              "placeholder:text-[rgb(var(--color-text-muted))]",
              "focus:outline-none focus:border-[rgb(var(--color-primary))]",
              "transition-colors duration-[var(--duration-fast)]"
            )}
            aria-label="Search games"
          />
        </div>

        {/* Filter button */}
        <Button
          variant="secondary"
          size="md"
          onClick={openFilterDrawer}
          aria-expanded={isFilterDrawerOpen}
          aria-label={`Filters${activeFilterCount > 0 ? ` (${activeFilterCount} active)` : ""}`}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M2 4h12M4 8h8M6 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          Filters
          {activeFilterCount > 0 && (
            <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-[rgb(var(--color-primary))] text-[rgb(var(--color-primary-foreground))] text-xs font-semibold">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </div>

      {/* Active filter chips */}
      {hasActiveFilters(filters) && (
        <div className="flex flex-wrap gap-2 items-center">
          {filters.categories?.map((cat) => (
            <FilterChip
              key={cat}
              label={CATEGORY_LABELS[cat]}
              onRemove={() => toggleCategory(cat)}
            />
          ))}
          {filters.difficulty?.map((d) => (
            <FilterChip
              key={d}
              label={DIFFICULTY_LABELS[d]}
              onRemove={() => toggleDifficulty(d)}
            />
          ))}
          {filters.duration?.map((b) => (
            <FilterChip
              key={b}
              label={DURATION_BUCKET_LABELS[b]}
              onRemove={() => toggleDuration(b)}
            />
          ))}
          <button
            onClick={clearFilters}
            className="text-xs text-[rgb(var(--color-text-muted))] underline underline-offset-2 hover:text-[rgb(var(--color-text))] transition-colors"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Game grid */}
      {filteredGames.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredGames.map((game, i) => (
            <GameCard key={game.id} game={game} index={i} />
          ))}
        </div>
      ) : (
        <EmptyState onClear={clearFilters} />
      )}

      {/* Filter drawer */}
      <FilterDrawer
        open={isFilterDrawerOpen}
        onClose={closeFilterDrawer}
        filters={filters}
        onToggleCategory={toggleCategory}
        onToggleDifficulty={toggleDifficulty}
        onToggleDuration={toggleDuration}
        onClear={clearFilters}
      />
    </div>
  );
}

// ─── Filter Chip ─────────────────────────────────────────────────────────────

function FilterChip({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <button
      onClick={onRemove}
      className={cn(
        "inline-flex items-center gap-1.5",
        "px-3 py-1",
        "text-xs font-medium",
        "bg-[rgb(var(--color-primary)/0.1)]",
        "text-[rgb(var(--color-primary))]",
        "border border-[rgb(var(--color-primary)/0.2)]",
        "rounded-full",
        "hover:bg-[rgb(var(--color-primary)/0.2)]",
        "transition-colors duration-[var(--duration-fast)]"
      )}
      aria-label={`Remove filter: ${label}`}
    >
      {label}
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
        <path d="M7.5 2.5L2.5 7.5M2.5 2.5L7.5 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </button>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────

function EmptyState({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
      <span className="text-5xl" aria-hidden="true">🔍</span>
      <div className="flex flex-col gap-1">
        <p className="text-base font-medium text-[rgb(var(--color-text))]">
          No games match your filters
        </p>
        <p className="text-sm text-[rgb(var(--color-text-muted))]">
          Try adjusting your filters or search term.
        </p>
      </div>
      <Button variant="secondary" size="sm" onClick={onClear}>
        Clear filters
      </Button>
    </div>
  );
}

// ─── Filter Drawer ────────────────────────────────────────────────────────────

interface FilterDrawerProps {
  open: boolean;
  onClose: () => void;
  filters: CatalogueFilters;
  onToggleCategory: (c: GameCategory) => void;
  onToggleDifficulty: (d: GameDifficulty) => void;
  onToggleDuration: (b: DurationBucket) => void;
  onClear: () => void;
}

function FilterDrawer({
  open,
  onClose,
  filters,
  onToggleCategory,
  onToggleDifficulty,
  onToggleDuration,
  onClear,
}: FilterDrawerProps) {
  return (
    <BottomSheet open={open} onClose={onClose} title="Filter games" height="auto">
      <div className="flex flex-col gap-6">
        {/* Categories */}
        <FilterSection title="Type">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(CATEGORY_LABELS) as GameCategory[]).map((cat) => (
              <ToggleChip
                key={cat}
                label={CATEGORY_LABELS[cat]}
                active={filters.categories?.includes(cat) ?? false}
                onClick={() => onToggleCategory(cat)}
              />
            ))}
          </div>
        </FilterSection>

        {/* Difficulty */}
        <FilterSection title="Difficulty">
          <div className="flex gap-2">
            {DIFFICULTY_ORDER.map((d) => (
              <ToggleChip
                key={d}
                label={DIFFICULTY_LABELS[d]}
                active={filters.difficulty?.includes(d) ?? false}
                onClick={() => onToggleDifficulty(d)}
              />
            ))}
          </div>
        </FilterSection>

        {/* Duration */}
        <FilterSection title="Duration">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(DURATION_BUCKET_LABELS) as DurationBucket[]).map(
              (b) => (
                <ToggleChip
                  key={b}
                  label={DURATION_BUCKET_LABELS[b]}
                  active={filters.duration?.includes(b) ?? false}
                  onClick={() => onToggleDuration(b)}
                />
              )
            )}
          </div>
        </FilterSection>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button variant="ghost" size="md" onClick={onClear} fullWidth>
            Clear all
          </Button>
          <Button variant="primary" size="md" onClick={onClose} fullWidth>
            Show results
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
}

function FilterSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-[rgb(var(--color-text))]">
        {title}
      </h3>
      {children}
    </div>
  );
}

function ToggleChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "px-3 py-1.5 text-sm rounded-full",
        "border transition-all duration-[var(--duration-fast)]",
        "touch-target",
        active
          ? "bg-[rgb(var(--color-primary))] text-[rgb(var(--color-primary-foreground))] border-transparent"
          : "bg-transparent text-[rgb(var(--color-text-muted))] border-[rgb(var(--color-border-strong))] hover:bg-[rgb(var(--color-surface-raised))]"
      )}
    >
      {label}
    </button>
  );
}
