import type { GameMetadata } from "@/game/core/types";
import { catalogueFieldsFromRules, formatPlayerRange } from "@/game/core/rulesFacts";
import { undercoverFacts } from "./rules";

export const undercoverMetadata: GameMetadata = {
  id: "undercover",
  name: "Undercover",
  shortDescription: "Find the spies before they blend in — one word at a time.",
  description:
    `A social deduction game for ${formatPlayerRange(undercoverFacts)} players. Civilians and Undercovers each receive a related-but-different secret word. Give clever one-word clues to prove you belong — without being too obvious. Watch for players who seem just slightly off. Special roles like the Judge, Lovers, Revenger, and Mr. White add dramatic twists to every round.`,

  ...catalogueFieldsFromRules(undercoverFacts),

  difficulty: "easy",

  durationMinutes: { min: 15, max: 60 },

  categories: ["party", "social-deduction", "bluffing", "word"],
  mechanics: ["hidden-roles", "voting", "deduction", "bluffing", "elimination"],

  image: "/assets/games/undercover/cover.png",
  accent: "#7c3aed",

  status: "available",
};
