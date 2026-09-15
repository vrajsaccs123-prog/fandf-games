/**
 * AuctionPanel — Displays and controls the current auction.
 * Handles all 5 auction types with appropriate UI for each.
 */

"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/cn";
import type {
  ModernArtState,
  MAPlayer,
  OpenAuctionState,
  OneOfferAuctionState,
  HiddenAuctionState,
  FixedPriceAuctionState,
} from "../types";
import { openAuctionLockRemainingMs } from "../types";
import type { ModernArtAction } from "../actions";
import { PaintingCard, AuctionTypeIcon } from "./PaintingCard";
import { PlayerHand } from "./PlayerHand";
import { AUCTION_TYPE_LABELS, getPainting } from "../data";
import { Button } from "@/components/ui/Button";

// ─── Main AuctionPanel ───────────────────────────────────────────────────────

interface AuctionPanelProps {
  state: ModernArtState;
  myPlayerId: string;
  onAction: (action: ModernArtAction) => void;
}

export function AuctionPanel({ state, myPlayerId, onAction }: AuctionPanelProps) {
  const { phase, auction, players } = state;
  const myPlayer = players.find((p) => p.id === myPlayerId);

  if (!auction || !myPlayer) return null;

  const paintings = auction.paintingIds
    .map((id) => getPainting(id))
    .filter((card): card is NonNullable<typeof card> => Boolean(card));

  const auctioneer = players.find((p) => p.id === auction.auctioneerId);
  const isMyAuction = auction.auctioneerId === myPlayerId;

  return (
    <div className="flex flex-col gap-4">
      {/* Auction header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AuctionTypeIcon type={auction.type} size="md" color="rgb(var(--color-text))" />
          <span className="font-semibold text-[rgb(var(--color-text))]">
            {AUCTION_TYPE_LABELS[auction.type]} Auction
          </span>
        </div>
        <div className="text-xs text-[rgb(var(--color-text-muted))]">
          Auctioneer: <span className="font-medium text-[rgb(var(--color-text))]">{auctioneer?.name}</span>
        </div>
      </div>

      {/* Paintings stay in the center of the table for every player */}
      <div className="flex flex-col items-center gap-2 py-2">
        <div className="text-[10px] uppercase tracking-wide text-[rgb(var(--color-text-muted))]">
          On the easel
        </div>
        <div className="flex gap-3 justify-center items-end">
          {paintings.map((painting) => (
            <PaintingCard key={painting.id} card={painting} size="table" />
          ))}
        </div>
      </div>

      {/* Auction-type specific controls */}
      {phase === "auction-open" && (
        <OpenAuctionControls
          auction={auction as OpenAuctionState}
          myPlayer={myPlayer}
          isAuctioneer={isMyAuction}
          players={players}
          onAction={onAction}
        />
      )}

      {phase === "auction-one-offer" && (
        <OneOfferControls
          auction={auction as OneOfferAuctionState}
          myPlayer={myPlayer}
          players={players}
          onAction={onAction}
        />
      )}

      {phase === "auction-hidden" && (
        <HiddenAuctionControls
          auction={auction as HiddenAuctionState}
          myPlayer={myPlayer}
          isAuctioneer={isMyAuction}
          players={players}
          onAction={onAction}
        />
      )}

      {phase === "auction-fixed-price" && (
        <FixedPriceControls
          auction={auction as FixedPriceAuctionState}
          myPlayer={myPlayer}
          isAuctioneer={isMyAuction}
          players={players}
          onAction={onAction}
        />
      )}

      <PlayerHand
        cards={myPlayer.hand}
        selectedCardId={null}
        onSelectCard={() => {}}
        eligibleCardIds="none"
        disabled
        label="Your Hand"
      />
    </div>
  );
}

// ─── Open Auction Controls ────────────────────────────────────────────────────

function OpenAuctionControls({
  auction,
  myPlayer,
  isAuctioneer,
  players,
  onAction,
}: {
  auction: OpenAuctionState;
  myPlayer: MAPlayer;
  isAuctioneer: boolean;
  players: MAPlayer[];
  onAction: (action: ModernArtAction) => void;
}) {
  const [customBid, setCustomBid] = React.useState("");
  const [now, setNow] = React.useState(() => Date.now());
  const minBid = auction.currentHighestBid + 1;
  const canBid = myPlayer.money >= minBid;
  const currentLeader = players.find((p) => p.id === auction.currentHighestBidderId);
  const lockMs = openAuctionLockRemainingMs(auction.openedAt, now);
  const canHammer = lockMs <= 0;

  React.useEffect(() => {
    setNow(Date.now());
    if (openAuctionLockRemainingMs(auction.openedAt) <= 0) return;
    const id = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (openAuctionLockRemainingMs(auction.openedAt, t) <= 0) {
        window.clearInterval(id);
      }
    }, 200);
    return () => window.clearInterval(id);
  }, [auction.openedAt]);

  function handleBid(amount: number) {
    onAction({ type: "OPEN_BID", playerId: myPlayer.id, amount });
  }

  function handleCustomBid() {
    const amount = parseInt(customBid, 10);
    if (!isNaN(amount) && amount >= minBid && amount <= myPlayer.money) {
      handleBid(amount);
      setCustomBid("");
    }
  }

  const presets = [minBid, minBid + 5, minBid + 10, minBid + 20, minBid + 50]
    .filter((v) => v <= myPlayer.money)
    .slice(0, 4);

  return (
    <div className="flex flex-col gap-3">
      {/* Current bid display */}
      <div className="flex items-center justify-between bg-[rgb(var(--color-surface))] rounded-xl p-3">
        <div>
          <div className="text-xs text-[rgb(var(--color-text-muted))]">Current Bid</div>
          <motion.div
            key={auction.currentHighestBid}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
            className="text-2xl font-bold text-amber-400"
          >
            {auction.currentHighestBid > 0 ? `$${auction.currentHighestBid}` : "—"}
          </motion.div>
        </div>
        {currentLeader && (
          <div className="text-right">
            <div className="text-xs text-[rgb(var(--color-text-muted))]">Leading</div>
            <div className="font-semibold text-[rgb(var(--color-text))]">{currentLeader.name}</div>
          </div>
        )}
      </div>

      {/* Bid presets */}
      {canBid && (
        <div className="flex gap-2 flex-wrap">
          {presets.map((amount) => (
            <Button
              key={amount}
              variant="secondary"
              size="sm"
              onClick={() => handleBid(amount)}
              className="flex-1 min-w-[4rem]"
            >
              Bid ${amount}
            </Button>
          ))}
        </div>
      )}

      {/* Custom bid */}
      {canBid && (
        <div className="flex gap-2">
          <input
            type="number"
            min={minBid}
            max={myPlayer.money}
            value={customBid}
            onChange={(e) => setCustomBid(e.target.value)}
            placeholder={`Min $${minBid}`}
            className={cn(
              "flex-1 rounded-lg px-3 py-2 text-sm",
              "bg-[rgb(var(--color-surface-raised))] text-[rgb(var(--color-text))]",
              "border border-[rgb(var(--color-border))] focus:border-amber-500/50",
              "outline-none"
            )}
            onKeyDown={(e) => e.key === "Enter" && handleCustomBid()}
          />
          <Button variant="primary" size="sm" onClick={handleCustomBid}>
            Bid
          </Button>
        </div>
      )}

      {!canBid && (
        <p className="text-center text-sm text-[rgb(var(--color-text-muted))] italic">
          Insufficient funds to bid
        </p>
      )}

      {/* Auctioneer close button — locked for the first 10 seconds */}
      {isAuctioneer && (
        <Button
          variant="secondary"
          size="md"
          fullWidth
          disabled={!canHammer}
          onClick={() => {
            if (!canHammer) return;
            onAction({ type: "CLOSE_OPEN_AUCTION", playerId: myPlayer.id });
          }}
          className="border-amber-500/30 text-amber-300"
        >
          {canHammer
            ? "🔨 Hammer Down — Sold!"
            : `🔨 Hammer Down — ${Math.ceil(lockMs / 1000)}s`}
        </Button>
      )}
    </div>
  );
}

// ─── One Offer Controls ───────────────────────────────────────────────────────

function OneOfferControls({
  auction,
  myPlayer,
  players,
  onAction,
}: {
  auction: OneOfferAuctionState;
  myPlayer: MAPlayer;
  players: MAPlayer[];
  onAction: (action: ModernArtAction) => void;
}) {
  const [customBid, setCustomBid] = React.useState("");
  const currentTurnId = auction.turnOrder[auction.currentTurnIndex];
  const isMyTurn = currentTurnId === myPlayer.id;
  const minBid = auction.currentHighestBid + 1;
  const canBid = myPlayer.money >= minBid;
  const currentLeader = players.find((p) => p.id === auction.currentHighestBidderId);
  const currentTurnPlayer = players.find((p) => p.id === currentTurnId);

  function handleBid(amount: number) {
    onAction({ type: "ONE_OFFER_BID", playerId: myPlayer.id, amount });
  }

  function handleCustomBid() {
    const amount = parseInt(customBid, 10);
    if (!isNaN(amount) && amount >= minBid && amount <= myPlayer.money) {
      handleBid(amount);
      setCustomBid("");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Turn indicator */}
      <div className="flex items-center justify-between bg-[rgb(var(--color-surface))] rounded-xl p-3">
        <div>
          <div className="text-xs text-[rgb(var(--color-text-muted))]">Current Bid</div>
          <div className="text-2xl font-bold text-amber-400">
            {auction.currentHighestBid > 0 ? `$${auction.currentHighestBid}` : "—"}
          </div>
          {currentLeader && (
            <div className="text-xs text-[rgb(var(--color-text-muted))] mt-0.5">
              Leading: {currentLeader.name}
            </div>
          )}
        </div>
        <div className="text-right">
          <div className="text-xs text-[rgb(var(--color-text-muted))]">
            {isMyTurn ? "Your offer" : "Waiting for"}
          </div>
          <div className="font-semibold text-[rgb(var(--color-text))]">
            {isMyTurn ? "You" : currentTurnPlayer?.name}
          </div>
          <div className="text-xs text-[rgb(var(--color-text-muted))] mt-0.5">
            {auction.currentTurnIndex + 1} / {auction.turnOrder.length}
          </div>
        </div>
      </div>

      {/* Turn order */}
      <div className="flex gap-1 flex-wrap">
        {auction.turnOrder.map((playerId, i) => {
          const p = players.find((pl) => pl.id === playerId);
          const isDone = i < auction.currentTurnIndex;
          const isCurrent = i === auction.currentTurnIndex;
          return (
            <div
              key={playerId}
              className={cn(
                "px-2 py-0.5 rounded text-xs",
                isCurrent ? "bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/40" :
                isDone ? "bg-[rgb(var(--color-surface-raised))] text-[rgb(var(--color-text-muted))] line-through" :
                "bg-[rgb(var(--color-surface))] text-[rgb(var(--color-text-muted))]"
              )}
            >
              {p?.name ?? playerId}
              {playerId === auction.auctioneerId ? " ⚡" : ""}
            </div>
          );
        })}
      </div>

      {/* Controls (only when it's my turn) */}
      {isMyTurn && (
        <div className="flex flex-col gap-2">
          {canBid && (
            <>
              <div className="flex gap-2">
                <input
                  type="number"
                  min={minBid}
                  max={myPlayer.money}
                  value={customBid}
                  onChange={(e) => setCustomBid(e.target.value)}
                  placeholder={`Min $${minBid}`}
                  className={cn(
                    "flex-1 rounded-lg px-3 py-2 text-sm",
                    "bg-[rgb(var(--color-surface-raised))] text-[rgb(var(--color-text))]",
                    "border border-[rgb(var(--color-border))] focus:border-amber-500/50",
                    "outline-none"
                  )}
                  onKeyDown={(e) => e.key === "Enter" && handleCustomBid()}
                />
                <Button variant="primary" size="sm" onClick={handleCustomBid}>
                  Offer
                </Button>
              </div>
            </>
          )}
          <Button
            variant="secondary"
            size="md"
            fullWidth
            onClick={() => onAction({ type: "ONE_OFFER_PASS", playerId: myPlayer.id })}
          >
            Pass
          </Button>
        </div>
      )}

      {!isMyTurn && (
        <p className="text-center text-sm text-[rgb(var(--color-text-muted))] italic">
          Waiting for {currentTurnPlayer?.name}...
        </p>
      )}
    </div>
  );
}

// ─── Hidden Auction Controls ──────────────────────────────────────────────────

function HiddenAuctionControls({
  auction,
  myPlayer,
  isAuctioneer,
  players,
  onAction,
}: {
  auction: HiddenAuctionState;
  myPlayer: MAPlayer;
  isAuctioneer: boolean;
  players: MAPlayer[];
  onAction: (action: ModernArtAction) => void;
}) {
  const [bidAmount, setBidAmount] = React.useState("");
  const [submitted, setSubmitted] = React.useState(
    auction.bids[myPlayer.id] !== null && auction.bids[myPlayer.id] !== undefined
  );

  // Re-sync submitted state if the auction prop changes
  React.useEffect(() => {
    setSubmitted(
      auction.bids[myPlayer.id] !== null && auction.bids[myPlayer.id] !== undefined
    );
  }, [auction.bids, myPlayer.id]);

  const submittedCount = Object.values(auction.bids).filter(
    (v) => v !== null && v !== undefined
  ).length;
  const totalPlayers = players.length;

  function handleSubmit() {
    const amount = parseInt(bidAmount, 10);
    if (!isNaN(amount) && amount >= 0 && amount <= myPlayer.money) {
      onAction({ type: "HIDDEN_SUBMIT_BID", playerId: myPlayer.id, amount });
      setSubmitted(true);
    }
  }

  function handleNoBid() {
    onAction({ type: "HIDDEN_SUBMIT_BID", playerId: myPlayer.id, amount: 0 });
    setSubmitted(true);
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Progress */}
      <div className="bg-[rgb(var(--color-surface))] rounded-xl p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-[rgb(var(--color-text))]">
            Secret Bids
          </span>
          <span className="text-xs text-[rgb(var(--color-text-muted))]">
            {submittedCount} / {totalPlayers} submitted
          </span>
        </div>
        <div className="flex gap-1">
          {players.map((p) => {
            const hasBid =
              auction.bids[p.id] !== null && auction.bids[p.id] !== undefined;
            return (
              <div
                key={p.id}
                className={cn(
                  "flex-1 h-1.5 rounded-full transition-all duration-300",
                  hasBid ? "bg-violet-500" : "bg-[rgb(var(--color-border))]"
                )}
                title={hasBid ? `${p.name} has bid` : `${p.name} hasn't bid yet`}
              />
            );
          })}
        </div>
      </div>

      {/* My bid input */}
      {!submitted ? (
        <div className="flex flex-col gap-2 bg-[rgb(var(--color-surface-raised))] rounded-xl p-3 border border-violet-500/20">
          <div className="text-sm font-medium text-[rgb(var(--color-text))]">
            🤫 Your Secret Bid
          </div>
          <p className="text-xs text-[rgb(var(--color-text-muted))]">
            Your bid is hidden until all players have submitted.
          </p>
          <div className="flex gap-2">
            <input
              type="number"
              min={0}
              max={myPlayer.money}
              value={bidAmount}
              onChange={(e) => setBidAmount(e.target.value)}
              placeholder="Enter amount"
              className={cn(
                "flex-1 rounded-lg px-3 py-2 text-sm",
                "bg-[rgb(var(--color-surface))] text-[rgb(var(--color-text))]",
                "border border-[rgb(var(--color-border))] focus:border-violet-500/50",
                "outline-none"
              )}
            />
            <Button variant="primary" size="sm" onClick={handleSubmit}>
              Lock Bid
            </Button>
          </div>
          <Button variant="secondary" size="sm" onClick={handleNoBid}>
            No Bid (Pass)
          </Button>
        </div>
      ) : (
        <div className="bg-[rgb(var(--color-surface))] rounded-xl p-3 text-center text-sm text-[rgb(var(--color-text-muted))] border border-violet-500/20">
          ✓ Bid locked. Waiting for others...
        </div>
      )}

      {/* Reveal button (auctioneer only, after all submitted) */}
      {isAuctioneer && auction.allSubmitted && (
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={() => onAction({ type: "HIDDEN_REVEAL", playerId: myPlayer.id })}
          className="bg-violet-600 hover:bg-violet-700"
        >
          ✨ Reveal All Bids
        </Button>
      )}
    </div>
  );
}

// ─── Fixed Price Controls ─────────────────────────────────────────────────────

function FixedPriceControls({
  auction,
  myPlayer,
  isAuctioneer,
  players,
  onAction,
}: {
  auction: FixedPriceAuctionState;
  myPlayer: MAPlayer;
  isAuctioneer: boolean;
  players: MAPlayer[];
  onAction: (action: ModernArtAction) => void;
}) {
  const [price, setPrice] = React.useState("");
  const currentTurnId = auction.price !== null ? auction.turnOrder[auction.currentTurnIndex] : null;
  const isMyTurn = currentTurnId === myPlayer.id;
  const currentTurnPlayer = players.find((p) => p.id === currentTurnId);

  function handleSetPrice() {
    const p = parseInt(price, 10);
    if (!isNaN(p) && p > 0 && p <= myPlayer.money) {
      onAction({ type: "FIXED_PRICE_SET", playerId: myPlayer.id, price: p });
      setPrice("");
    }
  }

  const presets = [5, 10, 20, 30, 50].filter((v) => v <= myPlayer.money);

  return (
    <div className="flex flex-col gap-3">
      {/* Setting price (auctioneer, before price is set) */}
      {isAuctioneer && auction.price === null && (
        <div className="bg-[rgb(var(--color-surface-raised))] rounded-xl p-3 border border-sky-500/20">
          <div className="text-sm font-medium text-[rgb(var(--color-text))] mb-2">
            🏷️ Set Your Price
          </div>
          <p className="text-xs text-[rgb(var(--color-text-muted))] mb-3">
            Choose a fixed price. If nobody buys, you must purchase it yourself.
          </p>
          <div className="flex gap-2 flex-wrap mb-2">
            {presets.map((v) => (
              <Button
                key={v}
                variant="secondary"
                size="sm"
                onClick={() => onAction({ type: "FIXED_PRICE_SET", playerId: myPlayer.id, price: v })}
              >
                ${v}
              </Button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="number"
              min={1}
              max={myPlayer.money}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Custom price"
              className={cn(
                "flex-1 rounded-lg px-3 py-2 text-sm",
                "bg-[rgb(var(--color-surface))] text-[rgb(var(--color-text))]",
                "border border-[rgb(var(--color-border))] focus:border-sky-500/50",
                "outline-none"
              )}
              onKeyDown={(e) => e.key === "Enter" && handleSetPrice()}
            />
            <Button variant="primary" size="sm" onClick={handleSetPrice}>
              Set
            </Button>
          </div>
        </div>
      )}

      {/* Price is set — show it */}
      {auction.price !== null && (
        <div className="bg-[rgb(var(--color-surface))] rounded-xl p-3 flex items-center justify-between">
          <div>
            <div className="text-xs text-[rgb(var(--color-text-muted))]">Fixed Price</div>
            <div className="text-3xl font-bold text-sky-400">${auction.price}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-[rgb(var(--color-text-muted))]">
              {isMyTurn ? "Your decision" : "Waiting for"}
            </div>
            <div className="font-semibold text-[rgb(var(--color-text))]">
              {isMyTurn ? "You" : currentTurnPlayer?.name}
            </div>
          </div>
        </div>
      )}

      {/* Turn order */}
      {auction.price !== null && (
        <div className="flex gap-1 flex-wrap">
          {auction.turnOrder.map((playerId, i) => {
            const p = players.find((pl) => pl.id === playerId);
            const isDone = i < auction.currentTurnIndex;
            const isCurrent = i === auction.currentTurnIndex;
            return (
              <div
                key={playerId}
                className={cn(
                  "px-2 py-0.5 rounded text-xs",
                  isCurrent ? "bg-sky-500/20 text-sky-300 ring-1 ring-sky-500/40" :
                  isDone ? "bg-[rgb(var(--color-surface-raised))] text-[rgb(var(--color-text-muted))] line-through" :
                  "bg-[rgb(var(--color-surface))] text-[rgb(var(--color-text-muted))]"
                )}
              >
                {p?.name ?? playerId}
                {playerId === auction.auctioneerId ? " ⚡" : ""}
              </div>
            );
          })}
        </div>
      )}

      {/* Buy/Pass buttons */}
      {auction.price !== null && isMyTurn && (
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="md"
            className="flex-1"
            onClick={() => onAction({ type: "FIXED_PRICE_PASS", playerId: myPlayer.id })}
          >
            Pass
          </Button>
          {myPlayer.money >= auction.price && (
            <Button
              variant="primary"
              size="md"
              className="flex-1"
              onClick={() => onAction({ type: "FIXED_PRICE_BUY", playerId: myPlayer.id })}
            >
              Buy ${auction.price}
            </Button>
          )}
          {myPlayer.money < auction.price && (
            <Button variant="primary" size="md" className="flex-1 opacity-50" disabled>
              Cannot Afford
            </Button>
          )}
        </div>
      )}

      {auction.price !== null && !isMyTurn && (
        <p className="text-center text-sm text-[rgb(var(--color-text-muted))] italic">
          Waiting for {currentTurnPlayer?.name}...
        </p>
      )}
    </div>
  );
}
