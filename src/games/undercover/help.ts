import type { GameHelpRules, HelpSection } from "@/game/core/types/help";
import type { SpecialCharacterSettings } from "./types";

const SPECIAL_CHARACTER_HELP: Record<
  keyof SpecialCharacterSettings,
  HelpSection
> = {
  judge: {
    title: "The Judge",
    text: "If voting ends in a perfect tie, the Judge secretly chooses who is eliminated. The Judge's identity is not revealed. If the Judge is already out, a random tied player is eliminated.",
  },
  joyFool: {
    title: "Joy Fool",
    text: "Wants to be voted out in Round 1 for +4 bonus points. If they survive Round 1, this ability deactivates.",
  },
  ghost: {
    title: "Ghost",
    text: "Assigned to one player. If that player is eliminated, they become a Ghost and can still vote. All other eliminated players cannot vote.",
  },
  lovers: {
    title: "Lovers",
    text: "Two players are secretly bonded. If one Lover is eliminated, the other dies immediately as well.",
  },
  revenger: {
    title: "Revenger",
    text: "When voted out, the Revenger chooses one living player to eliminate with them. Only triggers on a vote-out.",
  },
  duelists: {
    title: "Duelists",
    text: "Two rivals secretly compete. First eliminated: −2 points. The one who outlasts the other: +2 points. No change if both go out in the same event.",
  },
};

const BASE_SECTIONS: HelpSection[] = [
  {
    title: "Goal",
    text: "Civilians must eliminate all Undercovers and Mr. Whites. Undercovers must outnumber Civilians (they also win if only one Civilian remains with them). Mr. White wins by guessing the Civilian word when voted out, or when only one Civilian remains with them.",
  },
  {
    title: "Your Secret Word",
    text: "Civilians share one word; Undercovers share a related but different word. Mr. White receives no word.",
  },
  {
    title: "Clue Phase",
    text: "Each player gives exactly one clue relating to their secret word—not too obvious, not too vague.",
  },
  {
    title: "Voting",
    text: "After all clues, vote for the most suspicious player. You cannot vote for yourself. Eliminated players cannot vote, unless they are the assigned Ghost. The player with the most votes is eliminated and their role is revealed.",
  },
  {
    title: "Winning",
    text: "The game ends when one faction meets its win condition:",
    items: [
      "Civilians — all Undercovers and Mr. Whites are eliminated.",
      "Undercovers — their living count equals or exceeds Civilians, including when only one Civilian remains with them.",
      "Mr. White — correctly guesses the Civilian word when voted out, or is still alive when only one Civilian remains (with no Undercovers left).",
    ],
  },
  {
    title: "Scoring",
    text: "Points are awarded at game end:",
    items: [
      "Civilian win — +2 per surviving Civilian.",
      "Undercover win — 10 points split among surviving Undercovers.",
      "Mr. White win — +6 points (correct guess, or only one Civilian remaining).",
    ],
  },
];

export function getUndercoverHelp(
  activeSpecials: SpecialCharacterSettings
): GameHelpRules {
  const enabledSpecials = (
    Object.keys(SPECIAL_CHARACTER_HELP) as Array<keyof SpecialCharacterSettings>
  ).filter((key) => activeSpecials[key]);

  const sections = [...BASE_SECTIONS];

  if (enabledSpecials.length > 0) {
    sections.push({
      title: "Special Characters In Play",
      text: "These modifiers are active in this game:",
    });
    for (const key of enabledSpecials) {
      sections.push(SPECIAL_CHARACTER_HELP[key]);
    }
  }

  return { sections };
}

/** Static fallback for tests or contexts without live settings. */
export const undercoverHelp: GameHelpRules = getUndercoverHelp({
  judge: false,
  joyFool: false,
  ghost: false,
  lovers: false,
  revenger: false,
  duelists: false,
});
