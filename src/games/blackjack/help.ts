import type { GameHelpRules } from "@/game/core/types/help";

export const blackjackHelp: GameHelpRules = {
  sections: [
    {
      title: "Goal",
      text: "Beat the dealer by getting closer to 21 without going over. You compete against the dealer, not other players.",
    },
    {
      title: "Card Values",
      text: "Number cards = face value. Jack, Queen, King = 10. Ace = 11, or 1 if 11 would bust you.",
    },
    {
      title: "Natural Blackjack",
      text: "Ace + 10-value card on your first two cards wins automatically at 3:2 payout—unless the dealer also has blackjack (push).",
    },
    {
      title: "Your Actions",
      text: "On your turn:",
      items: [
        "Hit — draw one more card.",
        "Stand — lock in your total.",
        "Double Down — on first two cards only: double bet, draw one card, then stand.",
      ],
    },
    {
      title: "Dealer Rules",
      text: "After all players act, the dealer reveals the hole card. Dealer must hit on 16 or less and stand on 17 or more.",
    },
    {
      title: "Payouts",
      text: "Win = 1:1 payout. Natural blackjack = 3:2. Push = bet returned. Bust or lose to dealer = forfeit bet.",
    },
  ],
};
