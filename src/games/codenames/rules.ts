/**
 * Codenames — in-app rules definition.
 */

import type { GameRules, GameRulesFacts } from "@/game/core/types";
import { formatPlayerCountLabel } from "@/game/core/rulesFacts";

export const codenamesFacts: GameRulesFacts = {
  minPlayers: 4,
  maxPlayers: 10,
  recommendedPlayers: [4, 5, 6],
  supportsLocal: true,
  supportsOffline: true,
  supportsOnline: true,
};

export function getRules(): GameRules {
  return {
    facts: codenamesFacts,

    overview:
      `Codenames is a team word-guessing game for ${formatPlayerCountLabel(codenamesFacts)}. Two teams (Red and Blue) compete to contact all of their secret agents first. A Spymaster on each team knows which words belong to their team and gives one-word clues to guide their teammates.`,

    objective:
      "Be the first team to reveal all of your team's word cards. Avoid the Assassin at all costs — touching it means instant defeat.",

    setup: [
      {
        title: "Teams",
        content:
          `${formatPlayerCountLabel(codenamesFacts)}. Divide into two teams: Red and Blue. Each team picks one player to be the Spymaster — they know the secret identities of all 25 words.`,
      },
      {
        title: "The Board",
        content:
          "25 word cards are laid out in a 5×5 grid. The starting team has 9 cards to find; the other team has 8. There are 7 neutral (bystander) cards and 1 deadly Assassin.",
      },
      {
        title: "Starting Team",
        content:
          "The starting team is chosen randomly and goes first. Because they have one extra card to find, they also have a slight disadvantage — but they get the first move.",
      },
    ],

    gameplay: [
      {
        title: "Spymaster's Clue",
        content:
          "On your team's turn, the Spymaster gives exactly one word as a clue, followed by a number. The number tells teammates how many cards on the board relate to the clue. The clue word must not be any word currently on the board.",
        items: [
          "One word only — no compound words, no gestures, no hints.",
          "The number can be 0 meaning 'unlimited guesses'.",
          "You may say '∞' (unlimited) to let your team guess freely.",
        ],
      },
      {
        title: "Guessing",
        content:
          "Teammates discuss and touch (tap) one card at a time. You may guess up to (clue number + 1) cards per turn. You may also pass (end your turn) at any time after making at least one guess.",
        items: [
          "Correct guess (your team's card): card is revealed, keep guessing.",
          "Wrong guess (neutral card): turn ends immediately.",
          "Wrong guess (opponent's card): their card is revealed and your turn ends.",
          "Assassin: game over — your team loses instantly.",
        ],
      },
      {
        title: "Turn End",
        content:
          "A team's turn ends when they make a wrong guess, run out of guesses, or voluntarily pass. The other team then takes their turn.",
      },
    ],

    endCondition: [
      {
        title: "Win Condition",
        content: "The first team to reveal all of their word cards wins.",
      },
      {
        title: "Assassin",
        content:
          "If any team touches the Assassin card, that team immediately loses (the other team wins).",
      },
    ],

    specialRules: [
      {
        title: "Bonus Guess",
        content:
          "Teams always get one bonus guess per turn. If the clue number is 3, you can guess up to 4 cards.",
      },
      {
        title: "Unlimited Clue (0 or ∞)",
        content:
          "A Spymaster may say '0' (displayed as ∞) meaning the team can guess as many cards as they want. This is risky but useful for catching up.",
      },
      {
        title: "Opponent's Card Benefit",
        content:
          "If you accidentally reveal your opponent's card, it counts toward their total — they may win early if it was their last card!",
      },
    ],

    glossary: [
      {
        term: "Spymaster",
        definition:
          "The player on each team who knows all card identities and gives one-word clues.",
      },
      {
        term: "Operative",
        definition: "Non-spymaster teammates who guess based on the clue.",
      },
      {
        term: "Assassin",
        definition:
          "The one deadly card — any team that reveals it loses immediately.",
      },
      {
        term: "Bystander / Neutral",
        definition:
          "Cards that belong to neither team. Guessing one ends the turn with no other penalty.",
      },
      {
        term: "Contact",
        definition:
          "Revealing a card by tapping it. Once contacted, a card stays revealed.",
      },
    ],
  };
}
