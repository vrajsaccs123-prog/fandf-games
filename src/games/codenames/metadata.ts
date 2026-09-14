import type { GameMetadata } from "@/game/core/types";
import { catalogueFieldsFromRules, formatPlayerRange } from "@/game/core/rulesFacts";
import { codenamesFacts } from "./rules";

export const codenamesMetadata: GameMetadata = {
  id: "codenames",
  name: "Codenames",
  shortDescription: "Give one-word clues to guide your team to their secret agents.",
  description:
    `A team word-guessing game for ${formatPlayerRange(codenamesFacts)} players. Two rival spymasters know the secret identities of 25 agents. They give one-word clues to help their team guess the right words — but watch out for the assassin! First team to contact all their agents wins.`,

  ...catalogueFieldsFromRules(codenamesFacts),

  difficulty: "easy",

  durationMinutes: { min: 15, max: 30 },

  categories: ["party", "word", "social-deduction"],
  mechanics: ["teams", "deduction", "hidden-roles"],

  image: "/assets/games/codenames/cover.png",
  accent: "#c0392b",

  status: "available",
};
