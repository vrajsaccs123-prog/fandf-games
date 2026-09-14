import type { GameMetadata } from "@/game/core/types";
import { catalogueFieldsFromRules, formatPlayerCountLabel } from "@/game/core/rulesFacts";
import { blackjackFacts } from "./rules";

export const blackjackMetadata: GameMetadata = {
  id: "blackjack",
  name: "Blackjack",
  shortDescription: "Beat the dealer to 21 without going bust.",
  description:
    `The classic casino card game for ${formatPlayerCountLabel(blackjackFacts)}. Each player competes against the dealer to get a hand value as close to 21 as possible without exceeding it. Natural blackjack pays 3:2. Hit, stand, or double down.`,

  ...catalogueFieldsFromRules(blackjackFacts),

  difficulty: "easy",

  durationMinutes: { min: 10, max: 40 },

  categories: ["card", "casino", "competitive"],
  mechanics: ["betting", "push-your-luck"],

  image: "/assets/games/blackjack/cover.png",
  accent: "#1a6e3a",

  status: "available",
};
