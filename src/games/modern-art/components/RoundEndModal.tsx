/**
 * RoundEndModal — Shows the round end sequence:
 * 1. Round ended banner
 * 2. Rankings and value tiles
 * 3. Selling summary
 */

"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/cn";
import type { ModernArtState, ArtistRanking } from "../types";
import type { ModernArtAction } from "../actions";
import { ARTISTS } from "../data";
import { ARTIST_ORDER } from "../types";
import { calculateRankings } from "../engine/rankings";
import { paintingValue } from "../engine/rankings";
import { Button } from "@/components/ui/Button";
import { PaintingCard } from "./PaintingCard";

// ─── Round End Phase ──────────────────────────────────────────────────────────

export function RoundEndOverlay({
  state,
  myPlayerId,
  onAction,
}: {
  state: ModernArtState;
  myPlayerId: string;
  onAction: (action: ModernArtAction) => void;
}) {
  const { phase, currentRound, round, players, artistMarket } = state;

  if (phase === "round-end") {
    return (
      <RoundEndBanner
        roundEndCard={currentRound.roundEndCard}
        round={round}
        onContinue={() => onAction({ type: "ACKNOWLEDGE_ROUND_END", playerId: myPlayerId })}
      />
    );
  }

  if (phase === "selling") {
    return (
      <SellingPhase
        state={state}
        myPlayerId={myPlayerId}
        onAction={onAction}
      />
    );
  }

  return null;
}

// ─── Round End Banner ─────────────────────────────────────────────────────────

function RoundEndBanner({
  roundEndCard,
  round,
  onContinue,
}: {
  roundEndCard: ModernArtState["currentRound"]["roundEndCard"];
  round: number;
  onContinue: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 p-6"
    >
      <motion.div
        initial={{ scale: 0.8, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", bounce: 0.4 }}
        className="bg-[rgb(var(--color-surface-raised))] rounded-2xl p-6 max-w-sm w-full text-center flex flex-col gap-4 shadow-modal"
      >
        <div className="text-4xl">🏛️</div>
        <div>
          <h2 className="text-2xl font-[family-name:var(--font-display)] font-bold text-[rgb(var(--color-text))]">
            The Market Has Closed
          </h2>
          <p className="text-[rgb(var(--color-text-muted))] text-sm mt-1">
            Round {round} — 5th painting reached
          </p>
        </div>

        {roundEndCard && (
          <div className="flex flex-col items-center gap-2">
            <p className="text-xs text-[rgb(var(--color-text-muted))]">
              Final painting (not auctioned):
            </p>
            <PaintingCard card={roundEndCard} size="table" isRoundEnder />
          </div>
        )}

        <Button variant="primary" size="lg" fullWidth onClick={onContinue}>
          View Market Rankings →
        </Button>
      </motion.div>
    </motion.div>
  );
}

// ─── Selling Phase ────────────────────────────────────────────────────────────

function SellingPhase({
  state,
  myPlayerId,
  onAction,
}: {
  state: ModernArtState;
  myPlayerId: string;
  onAction: (action: ModernArtAction) => void;
}) {
  const [rankingsShown, setRankingsShown] = React.useState(false);
  const { players, currentRound, round, artistMarket } = state;
  const rankings = currentRound.rankings ?? [];
  const myPlayer = players.find((p) => p.id === myPlayerId)!;

  // Calculate earnings for each player
  const earnings = players.map((player) => {
    let total = 0;
    for (const card of player.purchasedThisRound) {
      total += paintingValue(card.artistId, rankings);
    }
    return { player, earnings: total };
  });

  const myEarnings = earnings.find((e) => e.player.id === myPlayerId)?.earnings ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex flex-col items-center bg-black/80 p-4 overflow-y-auto"
    >
      <div className="max-w-lg w-full mt-4 flex flex-col gap-4">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center"
        >
          <h2 className="text-2xl font-[family-name:var(--font-display)] font-bold text-[rgb(var(--color-text))]">
            Round {round} Results
          </h2>
        </motion.div>

        {/* Artist Rankings */}
        <div className="bg-[rgb(var(--color-surface-raised))] rounded-2xl p-4 flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-[rgb(var(--color-text-muted))] uppercase tracking-wide">
            Artist Rankings
          </h3>
          <div className="flex flex-col gap-2">
            {rankings
              .filter((r) => r.rank !== null)
              .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99))
              .map((ranking, i) => (
                <RankingRow key={ranking.artistId} ranking={ranking} index={i} />
              ))}
            {rankings.filter((r) => r.rank === null).length > 0 && (
              <div className="border-t border-[rgb(var(--color-border))] pt-2 mt-1">
                <p className="text-xs text-[rgb(var(--color-text-muted))] mb-1">Not ranked this round:</p>
                {rankings
                  .filter((r) => r.rank === null)
                  .map((r) => {
                    const artist = ARTISTS[r.artistId];
                    return (
                      <div key={r.artistId} className="flex items-center gap-2 text-xs text-[rgb(var(--color-text-muted))] py-0.5">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: artist.accent }} />
                        {artist.name} — {r.offerCount} offered — paintings worth $0
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>

        {/* My paintings sold */}
        <div className="bg-[rgb(var(--color-surface-raised))] rounded-2xl p-4 flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-[rgb(var(--color-text-muted))] uppercase tracking-wide">
            Your Paintings Sold
          </h3>
          {myPlayer.purchasedThisRound.length === 0 ? (
            <p className="text-sm text-[rgb(var(--color-text-muted))] italic">
              You purchased no paintings this round.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {myPlayer.purchasedThisRound.map((card) => {
                const value = paintingValue(card.artistId, rankings);
                const artist = ARTISTS[card.artistId];
                return (
                  <motion.div
                    key={card.id}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    className="flex items-center gap-3"
                  >
                    <PaintingCard card={card} size="mini" className="shadow-none" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[rgb(var(--color-text))] truncate">
                        {card.artworkName}
                      </div>
                      <div className="text-xs text-[rgb(var(--color-text-muted))]">
                        {artist.name}
                      </div>
                    </div>
                    <div
                      className={cn(
                        "text-lg font-bold",
                        value > 0 ? "text-amber-400" : "text-[rgb(var(--color-text-muted))]"
                      )}
                    >
                      {value > 0 ? `+$${value}` : "$0"}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Total earnings */}
          <div className="border-t border-[rgb(var(--color-border))] pt-3 flex items-center justify-between">
            <span className="text-sm font-medium text-[rgb(var(--color-text))]">
              Round Earnings
            </span>
            <span className="text-xl font-bold text-amber-400">+${myEarnings}</span>
          </div>
        </div>

        <ReadyForNextRound
          state={state}
          myPlayerId={myPlayerId}
          onAction={onAction}
        />
      </div>
    </motion.div>
  );
}

function ReadyForNextRound({
  state,
  myPlayerId,
  onAction,
}: {
  state: ModernArtState;
  myPlayerId: string;
  onAction: (action: ModernArtAction) => void;
}) {
  const { players, round, readyPlayerIds } = state;
  const iAmReady = readyPlayerIds.includes(myPlayerId);
  const waiting = players.filter((p) => !readyPlayerIds.includes(p.id));
  const nextLabel = round < 4 ? `Round ${round + 1}` : "Final Results";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <p className="text-[10px] uppercase tracking-wide text-[rgb(var(--color-text-muted))] text-center">
          Everyone must confirm before {nextLabel} begins
        </p>
        <div className="flex flex-wrap justify-center gap-1.5">
          {players.map((player) => {
            const ready = readyPlayerIds.includes(player.id);
            return (
              <div
                key={player.id}
                className={cn(
                  "px-2 py-0.5 rounded-full text-[10px] font-medium",
                  ready
                    ? "bg-emerald-500/20 text-emerald-300"
                    : "bg-[rgb(var(--color-surface-sunken))] text-[rgb(var(--color-text-muted))]"
                )}
              >
                {ready ? "✓ " : "… "}
                {player.id === myPlayerId ? "You" : player.name}
              </div>
            );
          })}
        </div>
      </div>

      {iAmReady ? (
        <div className="rounded-xl border border-[rgb(var(--color-border))] px-3 py-3 text-center">
          <p className="text-sm text-[rgb(var(--color-text))] font-medium">You are ready</p>
          <p className="text-xs text-[rgb(var(--color-text-muted))] mt-1">
            Waiting for {waiting.map((p) => p.name).join(", ")}
          </p>
        </div>
      ) : (
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={() => onAction({ type: "ACKNOWLEDGE_SELLING", playerId: myPlayerId })}
        >
          {round < 4 ? `Ready for Round ${round + 1}` : "Ready for Final Results"}
        </Button>
      )}
    </div>
  );
}

function RankingRow({ ranking, index }: { ranking: ArtistRanking; index: number }) {
  const artist = ARTISTS[ranking.artistId];
  const medalEmojis = ["🥇", "🥈", "🥉"];

  return (
    <motion.div
      initial={{ x: -30, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ delay: index * 0.1 }}
      className={cn(
        "flex items-center gap-3 p-2 rounded-xl",
        index === 0 ? "bg-amber-500/10 ring-1 ring-amber-500/30" :
        index === 1 ? "bg-sky-500/10 ring-1 ring-sky-500/20" :
        "bg-emerald-500/10 ring-1 ring-emerald-500/20"
      )}
    >
      <span className="text-xl">{medalEmojis[index]}</span>
      <div
        className="w-3 h-3 rounded-full shrink-0"
        style={{ backgroundColor: artist.accent }}
      />
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm text-[rgb(var(--color-text))]">{artist.name}</div>
        <div className="text-xs text-[rgb(var(--color-text-muted))]">
          {ranking.offerCount} paintings offered
        </div>
      </div>
      <div className="text-right">
        <div className="text-sm font-bold text-amber-300">
          +${ranking.valueThisRound}
        </div>
        <div className="text-xs text-[rgb(var(--color-text-muted))]">
          Total: ${ranking.cumulativeValue}
        </div>
      </div>
    </motion.div>
  );
}
