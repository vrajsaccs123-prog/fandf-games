import type { GameHelpRules } from "@/game/core/types/help";

export const caboHelp: GameHelpRules = {
  sections: [
    {
      title: "Goal",
      text: "Have the lowest total card value when Cabo is called. Lowest cumulative score wins the game.",
    },
    {
      title: "Your Cards",
      text: "You have 4 face-down cards in fixed slots. You peeked at slots 1 and 2 at the start—memorize their positions.",
    },
    {
      title: "On Your Turn",
      text: "Choose one option:",
      items: [
        "Draw from the deck — replace a card or discard (may trigger a special ability).",
        "Take the top discard — swap it with one of your cards.",
        "Call CABO — all other players get one final turn.",
      ],
    },
    {
      title: "Card Values",
      text: "Lower is better.",
      items: [
        "Joker: −1",
        "Red King: 0",
        "2–10: face value",
        "Jack: 11, Queen: 12",
        "Black King: 13",
      ],
    },
    {
      title: "Special Abilities",
      text: "Triggered when you draw from the deck and discard (not when replacing):",
      items: [
        "7 or 8 — Peek at one of your own cards.",
        "9 or 10 — Peek at an opponent's card.",
        "Jack or Queen — Blind swap with an opponent.",
        "Black King — Look at an opponent's card, then optionally swap.",
      ],
    },
    {
      title: "Snapping",
      text: "After any discard, tap SNAP to claim a matching value on the table.",
      items: [
        "Matches on number value only — not suit or ability.",
        "Correct on your card — it is removed.",
        "Correct on opponent's card — removed; you move a card into that slot.",
        "Wrong — you receive a penalty card.",
      ],
    },
    {
      title: "Calling CABO",
      text: "When called, every other player gets exactly one more turn. All cards are then revealed and round scores are added to cumulative totals.",
    },
    {
      title: "Game End",
      text: "The game ends when any player reaches the target score. Lowest cumulative score wins.",
    },
  ],
};
