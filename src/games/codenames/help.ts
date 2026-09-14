import type { GameHelpRules } from "@/game/core/types/help";

export const codenamesHelp: GameHelpRules = {
  sections: [
    {
      title: "Goal",
      text: "Be the first team to reveal all of your word cards. Avoid the Assassin — touching it means instant defeat.",
    },
    {
      title: "Teams",
      text: "Red and Blue compete. Each team has one Spymaster who knows all card identities and gives clues.",
    },
    {
      title: "Spymaster's Clue",
      text: "Give exactly one word plus a number. The number tells teammates how many board words relate to the clue.",
      items: [
        "The clue word must not appear on the board.",
        "Use 0 or ∞ for unlimited guesses.",
      ],
    },
    {
      title: "Guessing",
      text: "Teammates tap one card at a time. You may guess up to clue number + 1 cards, or pass after at least one guess.",
      items: [
        "Your team's card — revealed, keep guessing.",
        "Neutral card — turn ends.",
        "Opponent's card — revealed for them, turn ends.",
        "Assassin — your team loses immediately.",
      ],
    },
    {
      title: "Bonus Guess",
      text: "Teams always get one extra guess per turn. A clue of 3 allows up to 4 guesses.",
    },
    {
      title: "Winning",
      text: "First team to contact all their agents wins. If the Assassin is revealed, that team loses instantly.",
    },
  ],
};
