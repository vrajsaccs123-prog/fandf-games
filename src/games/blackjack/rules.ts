import type { GameRules, GameRulesFacts } from "@/game/core/types";
import { formatPlayerCountLabel } from "@/game/core/rulesFacts";

export const blackjackFacts: GameRulesFacts = {
  minPlayers: 1,
  maxPlayers: 6,
  recommendedPlayers: [2, 3, 4],
  supportsLocal: true,
  supportsOffline: true,
  supportsOnline: true,
};

export const blackjackRules: GameRules = {
  facts: blackjackFacts,

  overview:
    `Blackjack is a classic casino card game for ${formatPlayerCountLabel(blackjackFacts)}. Each player competes against the dealer — not each other. Try to get your hand as close to 21 as possible without going over.`,

  objective:
    "Have a hand value higher than the dealer's without exceeding 21. If you go over 21, you 'bust' and lose your bet immediately.",

  setup: [
    {
      title: "Starting chips",
      content: "Each player starts with 1,000 chips.",
    },
    {
      title: "Placing bets",
      content:
        "Before cards are dealt, each player places a bet of at least 10 chips, up to their full chip stack.",
    },
    {
      title: "Dealing",
      content:
        "Two cards are dealt face-up to each player. The dealer receives one card face-up and one card face-down (the 'hole card').",
    },
  ],

  gameplay: [
    {
      title: "Card values",
      content:
        "Number cards (2–10) are worth their face value. Jack, Queen, and King are worth 10. Aces are worth 11, unless that would bust your hand — then they count as 1.",
    },
    {
      title: "Natural Blackjack",
      content:
        "If your first two cards total 21 (an Ace plus a 10-value card), you have a natural blackjack! You win automatically unless the dealer also has blackjack (in which case it's a push).",
    },
    {
      title: "Hit",
      content:
        "Draw one more card. You can hit as many times as you like until you stand, bust, or reach 21.",
    },
    {
      title: "Stand",
      content: "End your turn and lock in your current hand total.",
    },
    {
      title: "Double Down",
      content:
        "On your first two cards only: double your bet and receive exactly one more card, then automatically stand.",
    },
    {
      title: "Dealer's turn",
      content:
        "After all players have acted, the dealer reveals the hole card. The dealer must hit on any hand totalling 16 or less, and must stand on 17 or more.",
    },
  ],

  endCondition: [
    {
      title: "Round result",
      content:
        "After the dealer stands or busts, outcomes are determined for each player.",
      items: [
        "Your total beats the dealer → Win (1:1 payout)",
        "Dealer total beats yours → Lose (forfeit bet)",
        "Equal totals → Push (bet returned)",
        "Natural blackjack → Win at 3:2 payout",
        "Dealer busts → All non-busted players win",
      ],
    },
    {
      title: "Session end",
      content:
        "Play continues for as many rounds as you like. A player with 0 chips is eliminated. The session ends when all players are eliminated or the group decides to stop.",
    },
  ],

  scoring: [
    {
      title: "Payouts",
      content: "Bets are settled at the end of each round.",
      items: [
        "Win: receive double your bet (bet back + equal winnings)",
        "Natural blackjack: receive 2.5× your bet",
        "Push: receive your bet back",
        "Lose: forfeit your bet",
      ],
    },
  ],

  glossary: [
    { term: "Bust", definition: "A hand that exceeds 21 — an automatic loss." },
    {
      term: "Natural blackjack",
      definition: "An Ace plus any 10-value card on the first two cards.",
    },
    {
      term: "Hole card",
      definition: "The dealer's face-down card, revealed after all players act.",
    },
    {
      term: "Push",
      definition: "A tie between player and dealer — the bet is returned.",
    },
    {
      term: "Soft hand",
      definition: "A hand containing an Ace counted as 11.",
    },
    {
      term: "Double down",
      definition:
        "Doubling your bet on the first two cards in exchange for exactly one more card.",
    },
  ],
};
