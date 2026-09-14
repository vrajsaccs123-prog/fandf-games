import type { GameRules, GameRulesFacts } from "@/game/core/types";
import { formatPlayerRange } from "@/game/core/rulesFacts";

export const undercoverFacts: GameRulesFacts = {
  minPlayers: 4,
  maxPlayers: 20,
  recommendedPlayers: [6, 7, 8, 9, 10],
  supportsLocal: true,
  supportsOffline: true,
  supportsOnline: true,
};

export function getRules(): GameRules {
  return {
    facts: undercoverFacts,

    overview:
      "Undercover is a social deduction game where Civilians must identify and eliminate the Undercovers and Mr. White before it's too late. Each player receives a related-but-different secret word and must give careful clues — not too obvious, not too vague.",

    objective:
      "Civilians: Eliminate all Undercovers and Mr. Whites. Undercovers: Outnumber the Civilians (including when only one Civilian remains). Mr. White: Guess the Civilian word when voted out, or win when only one Civilian remains with you.",

    setup: [
      {
        title: "Players",
        content:
          `${formatPlayerRange(undercoverFacts)} players. The game creator sets the number of Civilians, Undercovers, and Mr. Whites. Their counts must add up to the total number of players.`,
        items: [
          "Civilians receive the Civilian word.",
          "Undercovers receive the Undercover word.",
          "Mr. White receives no word.",
        ],
      },
      {
        title: "Word Pairs",
        content:
          "The game randomly selects a related word pair (e.g. Apple / Pear). Each round, it randomly decides which word is the Civilian word and which is the Undercover word.",
      },
      {
        title: "Special Characters (Optional)",
        content:
          "Optional modifiers that alter gameplay. They do not add new players — they change an existing player's behavior.",
        items: [
          "Judge: Breaks perfect ties in voting.",
          "Joy Fool: Wants to be voted out in Round 1 for +4 bonus points.",
          "Ghost: Assigned to one player — only they can still vote after being eliminated.",
          "Lovers: Two players are secretly bonded — if one dies, so does the other.",
          "Revenger: When voted out, drags one other player down with them.",
          "Duelists: Two players secretly compete — the one eliminated first loses 2 points; the survivor gains 2.",
        ],
      },
    ],

    gameplay: [
      {
        title: "Card Reveal",
        content:
          "Each player privately views their secret card — their role, word, and any special character. In offline mode, players pass the device and tap to reveal their card privately.",
      },
      {
        title: "Clue Phase",
        content:
          "Players take turns giving exactly one clue. The clue should relate to your secret word without being too obvious. Clues are public — everyone hears them.",
        items: [
          "Give one word only.",
          "Don't make it too obvious (Civilians) or too generic (Undercovers).",
          "Clues are given in the randomized turn order.",
        ],
      },
      {
        title: "Voting",
        content:
          "After all clues, players discuss and vote for who they think is suspicious. In online mode, players vote in turn order. In offline mode, the creator selects who to eliminate.",
        items: [
          "You cannot vote for yourself.",
          "Eliminated players cannot vote, unless they are the assigned Ghost.",
          "The player with the most votes is eliminated.",
          "In a perfect tie, the Judge decides (if alive) or a random selection is made.",
        ],
      },
      {
        title: "Elimination",
        content:
          "The eliminated player's role is revealed. Special effects trigger in sequence: Lovers chain, Revenger target, Ghost conversion (only for the assigned Ghost player).",
      },
    ],

    endCondition: [
      {
        title: "Civilian Victory",
        content:
          "Civilians win when all Undercovers and all Mr. Whites have been eliminated.",
      },
      {
        title: "Undercover Victory",
        content:
          "Undercovers win when their number of living players equals or exceeds the number of living Civilians — including when only one Civilian remains with them.",
      },
      {
        title: "Mr. White Victory",
        content:
          "Mr. White wins if they correctly guess the Civilian word immediately after being voted out, or if they are still alive when only one Civilian remains and no Undercovers are left.",
      },
    ],

    scoring: [
      {
        title: "Civilian Win",
        content: "Each surviving Civilian earns +2 points.",
      },
      {
        title: "Undercover Win",
        content:
          "10 points are split equally among surviving Undercovers (e.g., 2 Undercovers = +5 each, 3 = +3.33 each).",
      },
      {
        title: "Mr. White Win",
        content: "Mr. White earns +6 points for guessing correctly, or for winning when only one Civilian remains.",
      },
      {
        title: "Joy Fool",
        content: "+4 bonus points if voted out in Round 1.",
      },
      {
        title: "Duelists",
        content:
          "-2 for the first Duelist eliminated; +2 for the Duelist who survives longer — regardless of whether they are later eliminated. No change if both are eliminated in the same event.",
      },
    ],

    specialRules: [
      {
        title: "Judge",
        content:
          "If voting results in a perfect tie (two or more players with the same highest vote count), the Judge secretly chooses one tied player to eliminate. The Judge's identity is not revealed by using this power. If the Judge has already been eliminated, a random selection is made among tied players.",
      },
      {
        title: "Joy Fool",
        content:
          "The Joy Fool's secret goal is to be voted out in Round 1. If successful, they earn +4 bonus points and their status is publicly revealed. If they survive Round 1, their special ability permanently deactivates.",
      },
      {
        title: "Ghost",
        content:
          "When Ghost is enabled, exactly one player is assigned the Ghost character. Only that player can continue to vote after they are eliminated. All other eliminated players cannot vote.",
      },
      {
        title: "Lovers",
        content:
          "Two players are secretly bonded as Lovers. They know each other's identity. If one Lover is eliminated for any reason, the other immediately dies as well. Both are revealed and their deaths are processed before play continues.",
      },
      {
        title: "Revenger",
        content:
          "If the Revenger is voted out, they can drag one other player down with them. After being eliminated, the Revenger privately selects a living target. That player is immediately eliminated. The Revenger ability only activates when they are voted out — not from other causes of death.",
      },
      {
        title: "Duelists",
        content:
          "Two players are secretly rivals. They know who their rival is. The first to be eliminated receives -2 points; the one who outlasts the other earns +2 points — even if that survivor is later eliminated themselves. If both are eliminated in the same event, neither bonus nor penalty applies.",
      },
    ],

    glossary: [
      { term: "Civilian", definition: "The majority faction. Receives the Civilian word." },
      { term: "Undercover", definition: "The hidden faction. Receives the Undercover word — related but different." },
      { term: "Mr. White", definition: "A wild-card role. Receives no word and must deduce the Civilian word." },
      { term: "Judge", definition: "A special-character modifier. Breaks perfect ties in voting." },
      { term: "Joy Fool", definition: "Wants to be eliminated in Round 1." },
      { term: "Ghost", definition: "A special character assigned to one player. Only they can still vote after being eliminated." },
      { term: "Lovers", definition: "Two bonded players who share a fatal link." },
      { term: "Revenger", definition: "Drags a target to death upon their own elimination." },
      { term: "Duelists", definition: "Two rival players scoring against each other." },
      { term: "Word Pair", definition: "Two related words (e.g. Apple / Pear). One is the Civilian word; one is the Undercover word." },
    ],
  };
}
