/**
 * ModernArtGame — Pure view component for the Modern Art game surface.
 *
 * Receives fully-managed state from outside (e.g. ModernArtTableOnline).
 * Dispatches typed actions via `onAction`.
 * Renders the appropriate UI based on the current game phase.
 *
 * This component owns NO state — it is a controlled component.
 */

"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/cn";
import type { ModernArtState, MAPlayer } from "../types";
import type { ModernArtAction } from "../actions";
import { ArtistMarket } from "./ArtistMarket";
import { AuctionPanel } from "./AuctionPanel";
import { DoubleAuctionSetup } from "./DoubleAuctionSetup";
import { PlayerHand } from "./PlayerHand";
import { RoundEndOverlay } from "./RoundEndModal";
import { GameOverScreen } from "./GameOverScreen";
import { PaintingCard, AuctionTypeIcon } from "./PaintingCard";
import { ARTISTS } from "../data";
import type { AuctionType } from "../types";
import { Button } from "@/components/ui/Button";
import { RulesDrawer, RulesHelpButton, useRulesHelp } from "@/components/game/RulesDrawer";
import { modernArtHelp } from "../help";

// ─── Props ────────────────────────────────────────────────────────────────────

export interface ModernArtGameProps {
  state: ModernArtState;
  myPlayerId: string;
  onAction: (action: ModernArtAction) => void;
  onExit?: () => void;
  onRematch?: () => void;
}

/** Cream badge + artist-style accent — matches the mark on painting cards. */
const LEGEND_ICON_COLOR = "#2d6a9f";

const AUCTION_ICON_KEYS = new Set<AuctionType>([
  "open",
  "one-offer",
  "hidden",
  "fixed-price",
  "double",
]);

function AuctionTypeBadge({ type }: { type: AuctionType }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded p-0.5"
      style={{
        width: 20,
        height: 20,
        background: "#f4ead6",
        color: LEGEND_ICON_COLOR,
        boxShadow:
          "0 1px 2px rgb(0 0 0 / 0.2), inset 0 1px 0 rgb(255 255 255 / 0.65)",
      }}
      aria-hidden="true"
    >
      <AuctionTypeIcon type={type} color={LEGEND_ICON_COLOR} />
    </span>
  );
}

function modernArtSectionPrefix(section: { iconKey?: string }) {
  if (!section.iconKey || !AUCTION_ICON_KEYS.has(section.iconKey as AuctionType)) {
    return undefined;
  }
  return <AuctionTypeBadge type={section.iconKey as AuctionType} />;
}

// ─── Player Info Strip ────────────────────────────────────────────────────────

function PlayerStrip({
  players,
  currentPlayerIndex,
  myPlayerId,
  auctioneerId,
}: {
  players: MAPlayer[];
  currentPlayerIndex: number;
  myPlayerId: string;
  auctioneerId: string | null;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {players.map((player, i) => {
        const isCurrent = i === currentPlayerIndex;
        const isAuctioneer = player.id === auctioneerId;
        const isMe = player.id === myPlayerId;
        return (
          <div
            key={player.id}
            className={cn(
              "flex flex-col items-center gap-1 shrink-0 rounded-xl px-2 py-1.5 min-w-[4.5rem]",
              isCurrent ? "bg-amber-500/15 ring-1 ring-amber-500/40" : "bg-[rgb(var(--color-surface))]"
            )}
          >
            <div className="relative">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                style={{ backgroundColor: `hsl(${(player.seat * 60 + 30) % 360}, 50%, 35%)` }}
              >
                {player.name[0].toUpperCase()}
              </div>
              {isAuctioneer && (
                <span className="absolute -top-1 -right-1 text-xs">🔨</span>
              )}
            </div>
            <div className="text-[10px] text-[rgb(var(--color-text-muted))] truncate max-w-[4.5rem] text-center">
              {isMe ? "You" : player.name}
            </div>
            <div className="text-[9px] text-[rgb(var(--color-text-muted))]">
              {player.hand.length}🃏
            </div>
            <div className="flex gap-0.5 min-h-[1.5rem] items-end justify-center">
              {player.purchasedThisRound.length === 0 ? (
                <span className="text-[8px] text-[rgb(var(--color-text-muted))]/60">no buys</span>
              ) : (
                player.purchasedThisRound.map((card) => (
                  <PaintingCard
                    key={card.id}
                    card={card}
                    size="mini"
                    className="shadow-none"
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Select Painting Phase ────────────────────────────────────────────────────

function SelectPaintingView({
  state,
  myPlayerId,
  onAction,
}: {
  state: ModernArtState;
  myPlayerId: string;
  onAction: (action: ModernArtAction) => void;
}) {
  const [selectedCardId, setSelectedCardId] = React.useState<string | null>(null);
  const currentPlayer = state.players[state.currentPlayerIndex];
  const isMyTurn = currentPlayer.id === myPlayerId;
  const myPlayer = state.players.find((p) => p.id === myPlayerId)!;

  function handleOffer() {
    if (!selectedCardId || !isMyTurn) return;
    onAction({ type: "OFFER_PAINTING", playerId: myPlayerId, cardId: selectedCardId });
    setSelectedCardId(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="text-center">
        {isMyTurn ? (
          <p className="text-sm text-[rgb(var(--color-text-muted))]">
            Your turn — select a painting to auction
          </p>
        ) : (
          <p className="text-sm text-[rgb(var(--color-text-muted))]">
            Waiting for <span className="font-semibold text-[rgb(var(--color-text))]">{currentPlayer.name}</span> to offer a painting…
          </p>
        )}
      </div>

      <AnimatePresence>
        {selectedCardId && (() => {
          const card = myPlayer.hand.find((c) => c.id === selectedCardId);
          if (!card) return null;
          return (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center gap-3"
            >
              <PaintingCard card={card} size="table" />
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => setSelectedCardId(null)}>
                  Cancel
                </Button>
                <Button variant="primary" size="md" onClick={handleOffer}>
                  🔨 Offer for Auction
                </Button>
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      <PlayerHand
        cards={myPlayer.hand}
        selectedCardId={isMyTurn ? selectedCardId : null}
        onSelectCard={isMyTurn ? setSelectedCardId : () => {}}
        eligibleCardIds={isMyTurn ? "all" : "none"}
        disabled={!isMyTurn}
        label={isMyTurn ? "Choose a painting to offer" : "Your Hand"}
      />

      {myPlayer.hand.length === 0 && (
        <div className="text-center py-4">
          <p className="text-[rgb(var(--color-text-muted))] text-sm italic">
            You have no paintings left to auction this round.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Mystery Optional Phase ───────────────────────────────────────────────────

function MysteryOptionalView({
  state,
  myPlayerId,
  onAction,
}: {
  state: ModernArtState;
  myPlayerId: string;
  onAction: (action: ModernArtAction) => void;
}) {
  const currentPlayer = state.players[state.currentPlayerIndex];
  const isMyTurn = currentPlayer.id === myPlayerId;
  const hasMystery = (state.mystery?.hand.length ?? 0) > 0;
  const myPlayer = state.players.find((p) => p.id === myPlayerId);

  return (
    <div className="flex flex-col gap-3">
      {isMyTurn ? (
        <div className="bg-[rgb(var(--color-surface-raised))] rounded-xl p-4 border border-violet-500/20 flex flex-col gap-3">
          <div className="text-sm font-medium text-[rgb(var(--color-text))]">
            🎭 Mystery Player Option
          </div>
          <p className="text-xs text-[rgb(var(--color-text-muted))]">
            {hasMystery
              ? "Reveal a random Mystery painting? It counts toward artist rankings but is NOT auctioned."
              : "The Mystery hand is empty."}
          </p>
          <div className="flex gap-2">
            {hasMystery && (
              <Button
                variant="secondary"
                size="sm"
                className="flex-1 border-violet-500/30 text-violet-300"
                onClick={() => onAction({ type: "MYSTERY_REVEAL", playerId: myPlayerId })}
              >
                Reveal Mystery Card
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              className="flex-1"
              onClick={() => onAction({ type: "MYSTERY_SKIP", playerId: myPlayerId })}
            >
              Skip
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-center py-2 text-[rgb(var(--color-text-muted))] text-sm">
          Waiting for {currentPlayer.name}…
        </p>
      )}

      {myPlayer && (
        <PlayerHand
          cards={myPlayer.hand}
          selectedCardId={null}
          onSelectCard={() => {}}
          eligibleCardIds="none"
          disabled
          label="Your Hand"
        />
      )}
    </div>
  );
}

// ─── Offer Count Strip ────────────────────────────────────────────────────────

function OfferCountStrip({ offerCounts }: { offerCounts: Record<string, number> }) {
  return (
    <div>
      <div className="text-[9px] text-[rgb(var(--color-text-muted))] mb-1 font-medium uppercase tracking-wide">
        Paintings Offered This Round
      </div>
      <div className="flex gap-1 flex-wrap">
        {Object.entries(ARTISTS).map(([artistId, artist]) => {
          const count = offerCounts[artistId] ?? 0;
          const isFull = count >= 5;
          return (
            <div
              key={artistId}
              className={cn(
                "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs",
                isFull
                  ? "bg-red-500/20 text-red-300 ring-1 ring-red-500/30"
                  : count > 0
                  ? "bg-[rgb(var(--color-surface-raised))] text-[rgb(var(--color-text))]"
                  : "bg-[rgb(var(--color-surface))] text-[rgb(var(--color-text-muted))]"
              )}
            >
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: artist.accent }} />
              <span>{artist.shortName}</span>
              <span className="font-bold">{count}/5</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ModernArtGame({
  state,
  myPlayerId,
  onAction,
  onExit,
  onRematch,
}: ModernArtGameProps) {
  const { open: rulesOpen, openRules, closeRules } = useRulesHelp();

  const { phase, players, currentPlayerIndex, auction, round } = state;
  const currentPlayer = players[currentPlayerIndex];
  const auctioneerId = auction?.auctioneerId ?? currentPlayer?.id ?? null;
  const myPlayer = players.find((p) => p.id === myPlayerId);

  // Game over
  if (phase === "game-over") {
    return (
      <GameOverScreen
        state={state}
        onRematch={onRematch ?? (() => {})}
        onExit={onExit ?? (() => {})}
      />
    );
  }

  const showRoundOverlay = phase === "round-end" || phase === "selling";

  return (
    <div className="flex flex-col min-h-screen bg-[rgb(var(--color-background))]">
      {/* ── Top bar ── */}
      <header className="flex items-center justify-between px-3 py-2 bg-[rgb(var(--color-surface))] border-b border-[rgb(var(--color-border))]">
        <div className="flex items-center gap-2">
          <button
            onClick={onExit}
            className="text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-text))] text-sm"
          >
            ← Exit
          </button>
        </div>
        <div className="text-center">
          <div className="text-xs font-[family-name:var(--font-display)] font-bold text-[rgb(var(--color-text))]">
            Modern Art
          </div>
          <div className="text-[10px] text-[rgb(var(--color-text-muted))]">
            Round {round} / 4
          </div>
        </div>
        <RulesHelpButton onClick={openRules} />
      </header>

      {/* ── Paintings offered this round (always at top) ── */}
      <div className="px-3 py-1.5 border-b border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface-sunken))]">
        <OfferCountStrip offerCounts={state.currentRound.offerCounts} />
      </div>

      {/* ── Player strip + purchased collections ── */}
      <div className="px-3 py-2 border-b border-[rgb(var(--color-border))]">
        <PlayerStrip
          players={players}
          currentPlayerIndex={currentPlayerIndex}
          myPlayerId={myPlayerId}
          auctioneerId={auctioneerId}
        />
      </div>

      {/* ── My money ── */}
      {myPlayer && (
        <div className="px-3 py-1 bg-[rgb(var(--color-surface-sunken))] border-b border-[rgb(var(--color-border))] flex items-center justify-between">
          <span className="text-xs text-[rgb(var(--color-text-muted))]">Your Balance</span>
          <span className="font-bold text-amber-400 text-sm">${myPlayer.money}</span>
        </div>
      )}

      {/* ── Last auction result banner ── */}
      <AnimatePresence>
        {state.lastAuctionResult && (
          <motion.div
            key={JSON.stringify(state.lastAuctionResult)}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mx-3 mt-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-3 py-2 text-xs text-emerald-300"
          >
            {state.lastAuctionResult.wasFree
              ? "Painting acquired for free"
              : `Sold for $${state.lastAuctionResult.amount}`}
            {state.lastAuctionResult.winnerId && (
              <> → {players.find((p) => p.id === state.lastAuctionResult!.winnerId)?.name}</>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-y-auto p-3 flex flex-col gap-4 min-h-0">
        {(phase === "select-painting" || phase === "mystery-optional") && (
          <>
            {phase === "select-painting" && (
              <SelectPaintingView state={state} myPlayerId={myPlayerId} onAction={onAction} />
            )}
            {phase === "mystery-optional" && (
              <MysteryOptionalView state={state} myPlayerId={myPlayerId} onAction={onAction} />
            )}
          </>
        )}

        {phase === "double-second-select" && (
          <DoubleAuctionSetup state={state} myPlayerId={myPlayerId} onAction={onAction} />
        )}

        {(phase === "auction-open" ||
          phase === "auction-one-offer" ||
          phase === "auction-hidden" ||
          phase === "auction-fixed-price") && (
          <AuctionPanel state={state} myPlayerId={myPlayerId} onAction={onAction} />
        )}
      </main>

      {/* ── Persistent dock: market (left) + auction history (right) ── */}
      <footer className="border-t border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))]">
        <div className="grid grid-cols-2 gap-2 px-2 py-1.5 h-[9.25rem]">
          <div className="min-w-0 overflow-hidden">
            <div className="text-[9px] uppercase tracking-wide text-[rgb(var(--color-text-muted))] mb-0.5 font-medium">
              Market
            </div>
            <ArtistMarket
              market={state.artistMarket}
              currentRound={round}
              offerCounts={state.currentRound.offerCounts}
              rankings={state.currentRound.rankings}
              compact
              hideOfferCount
            />
          </div>
          <div className="min-w-0 flex flex-col overflow-hidden border-l border-[rgb(var(--color-border))] pl-2">
            <div className="text-[9px] uppercase tracking-wide text-[rgb(var(--color-text-muted))] mb-0.5 font-medium">
              Auction History
            </div>
            <div className="flex-1 overflow-y-auto pr-0.5">
              {state.log.length === 0 && (
                <p className="text-[9px] text-[rgb(var(--color-text-muted))] italic">No events yet.</p>
              )}
              {[...state.log].reverse().slice(0, 24).map((entry) => (
                <div
                  key={entry.id}
                  className="text-[9px] leading-tight text-[rgb(var(--color-text-muted))] py-0.5 border-b border-[rgb(var(--color-border)/0.4)]"
                >
                  <span className="text-[rgb(var(--color-text))]">R{entry.round}</span> {entry.message}
                </div>
              ))}
            </div>
          </div>
        </div>
      </footer>

      {/* ── Round end / selling overlays ── */}
      {showRoundOverlay && (
        <RoundEndOverlay state={state} myPlayerId={myPlayerId} onAction={onAction} />
      )}

      <RulesDrawer
        open={rulesOpen}
        onClose={closeRules}
        help={modernArtHelp}
        getSectionPrefix={modernArtSectionPrefix}
      />
    </div>
  );
}
