/**
 * Modern Art — State factory.
 */

import type { GameConfig } from "@/game/core/types";
import { formatPlayerRange, isPlayerCountAllowed } from "@/game/core/rulesFacts";
import { modernArtFacts } from "./rules";
import type { ModernArtState, MAPlayer, RoundState } from "./types";
import { ALL_PAINTINGS, CARDS_PER_ROUND, STARTING_MONEY } from "./data";
import { ARTIST_ORDER } from "./types";
import { createRng, shuffleArray } from "./engine/rng";

export function createInitialState(
  config: GameConfig,
  seed?: string
): ModernArtState {
  const resolvedSeed = seed ?? `modern-art-${Date.now()}`;
  const rng = createRng(resolvedSeed);

  const playerCount = config.players.length;
  if (!isPlayerCountAllowed(modernArtFacts, playerCount)) {
    throw new Error(`Modern Art requires ${formatPlayerRange(modernArtFacts)} players`);
  }

  const mysteryEnabled =
    playerCount === 3 && (config.options?.mysteryPlayer as boolean) === true;

  // Shuffle all 70 cards
  const shuffled = shuffleArray([...ALL_PAINTINGS], rng);

  // Deal initial hands
  const cardsToGive = CARDS_PER_ROUND[playerCount][1];
  const effectivePlayers = mysteryEnabled ? playerCount + 1 : playerCount;
  const totalInitialCards = cardsToGive * effectivePlayers;

  const players: MAPlayer[] = config.players.map((p, i) => ({
    id: p.id,
    name: p.name,
    seat: p.seat ?? i,
    money: STARTING_MONEY,
    hand: shuffled.slice(i * cardsToGive, (i + 1) * cardsToGive),
    purchasedThisRound: [],
  }));

  let mysteryHand: typeof shuffled = [];
  let remainingDeck: typeof shuffled = [];

  if (mysteryEnabled) {
    mysteryHand = shuffled.slice(playerCount * cardsToGive, (playerCount + 1) * cardsToGive);
    remainingDeck = shuffled.slice(totalInitialCards);
  } else {
    remainingDeck = shuffled.slice(totalInitialCards);
  }

  // Starting player: first player in list by default
  // (host can set via options.startingPlayerIndex)
  const startingPlayerIndex =
    typeof config.options?.startingPlayerIndex === "number"
      ? Math.min(
          config.options.startingPlayerIndex as number,
          playerCount - 1
        )
      : 0;

  return {
    gameId: `ma-${resolvedSeed}`,
    phase: "select-painting",
    round: 1,
    players,
    deck: remainingDeck,
    discardPile: [],
    artistMarket: {
      roundValues: [{}, {}, {}, {}],
    },
    currentRound: makeEmptyRoundState(),
    currentPlayerIndex: startingPlayerIndex,
    startingPlayerIndex,
    auction: null,
    doubleAuctionSetup: null,
    mysteryEnabled,
    mystery: mysteryEnabled
      ? { hand: mysteryHand, revealedThisRound: [] }
      : null,
    log: [],
    seed: resolvedSeed,
    lastAuctionResult: null,
    readyPlayerIds: [],
  };
}

export function makeEmptyRoundState(): RoundState {
  const offerCounts = Object.fromEntries(
    ARTIST_ORDER.map((id) => [id, 0])
  ) as RoundState["offerCounts"];
  return {
    offerCounts,
    roundEndCard: null,
    rankings: null,
  };
}
