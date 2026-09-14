/**
 * DoubleAuctionSetup — UI for resolving who plays the second Double card.
 */

"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import type { ModernArtState } from "../types";
import type { ModernArtAction } from "../actions";
import { PaintingCard } from "./PaintingCard";
import { PlayerHand } from "./PlayerHand";
import { ARTISTS, getPainting } from "../data";
import { Button } from "@/components/ui/Button";

interface DoubleAuctionSetupProps {
  state: ModernArtState;
  myPlayerId: string;
  onAction: (action: ModernArtAction) => void;
}

export function DoubleAuctionSetup({ state, myPlayerId, onAction }: DoubleAuctionSetupProps) {
  const [selectedCardId, setSelectedCardId] = React.useState<string | null>(null);
  const setup = state.doubleAuctionSetup;
  if (!setup) return null;

  const originalCard = getPainting(setup.originalPaintingId);

  const myPlayer = state.players.find((p) => p.id === myPlayerId)!;
  const askingPlayer = state.players.find((p) => p.id === setup.currentAskingPlayerId)!;
  const originalAuctioneer = state.players.find((p) => p.id === setup.originalAuctioneerId)!;
  const artist = ARTISTS[setup.artistId];

  const isMyTurn = setup.currentAskingPlayerId === myPlayerId;
  const myEligibleCards = myPlayer.hand.filter(
    (c) => c.artistId === setup.artistId && c.auctionType !== "double"
  );

  // Track declined players (shown in turn-order display)
  const declinedPlayerIds = setup.declinedPlayerIds;

  function handleSupply() {
    if (!selectedCardId) return;
    onAction({ type: "SUPPLY_DOUBLE_SECOND", playerId: myPlayerId, cardId: selectedCardId });
  }

  function handleDecline() {
    onAction({ type: "DECLINE_DOUBLE_SECOND", playerId: myPlayerId });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="text-center">
        <div className="text-sm font-semibold text-rose-400 mb-1">✌️ Double Auction</div>
        <p className="text-xs text-[rgb(var(--color-text-muted))]">
          A second {artist.name} painting is needed to run the auction.
        </p>
      </div>

      {/* Original card */}
      {originalCard && (
        <div className="flex flex-col items-center gap-1">
          <div className="text-xs text-[rgb(var(--color-text-muted))]">Original painting:</div>
          <PaintingCard card={originalCard} size="table" />
          <div className="text-xs text-[rgb(var(--color-text-muted))]">
            Played by {originalAuctioneer.name}
          </div>
        </div>
      )}

      {/* Progress */}
      <div className="flex gap-1 flex-wrap justify-center">
        {state.players.map((p) => {
          const isCurrent = p.id === setup.currentAskingPlayerId;
          return (
            <div
              key={p.id}
              className={cn(
                "px-2 py-0.5 rounded text-xs",
                isCurrent ? "bg-rose-500/20 text-rose-300 ring-1 ring-rose-500/40" :
                declinedPlayerIds.includes(p.id) ? "bg-[rgb(var(--color-surface-raised))] text-[rgb(var(--color-text-muted))] line-through" :
                "bg-[rgb(var(--color-surface))] text-[rgb(var(--color-text-muted))]"
              )}
            >
              {p.name}
              {p.id === setup.originalAuctioneerId ? " ⚡" : ""}
              {declinedPlayerIds.includes(p.id) ? " ✗" : ""}
              {isCurrent ? " ?" : ""}
            </div>
          );
        })}
      </div>

      {/* My turn controls */}
      {isMyTurn && (
        <div className="flex flex-col gap-3 bg-[rgb(var(--color-surface-raised))] rounded-xl p-3 border border-rose-500/20">
          <div className="text-sm font-medium text-[rgb(var(--color-text))]">
            {askingPlayer.name === myPlayer.name ? "Your turn" : askingPlayer.name}: Supply a second card?
          </div>

          {myEligibleCards.length > 0 ? (
            <>
              <p className="text-xs text-[rgb(var(--color-text-muted))]">
                Choose a {artist.name} painting (not another Double) to run the auction.
                You become the Auctioneer and receive any payment.
              </p>
              <PlayerHand
                cards={myPlayer.hand}
                selectedCardId={selectedCardId}
                onSelectCard={setSelectedCardId}
                eligibleCardIds={myEligibleCards.map((c) => c.id)}
                label={`Choose a ${artist.shortName} card`}
              />
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="md"
                  className="flex-1"
                  onClick={handleDecline}
                >
                  Decline
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  className="flex-1"
                  disabled={!selectedCardId}
                  onClick={handleSupply}
                >
                  Supply Card
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-xs text-[rgb(var(--color-text-muted))]">
                You have no eligible {artist.name} paintings to supply.
              </p>
              <Button variant="secondary" size="md" fullWidth onClick={handleDecline}>
                Decline
              </Button>
            </>
          )}
        </div>
      )}

      {!isMyTurn && (
        <>
          <p className="text-center text-sm text-[rgb(var(--color-text-muted))] italic">
            Waiting for {askingPlayer.name} to decide...
          </p>
          <PlayerHand
            cards={myPlayer.hand}
            selectedCardId={null}
            onSelectCard={() => {}}
            eligibleCardIds="none"
            disabled
            label="Your Hand"
          />
        </>
      )}
    </div>
  );
}
