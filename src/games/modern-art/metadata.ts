import type { GameMetadata } from "@/game/core/types";
import { catalogueFieldsFromRules } from "@/game/core/rulesFacts";
import { modernArtFacts } from "./rules";

export const modernArtMetadata: GameMetadata = {
  id: "modern-art",
  name: "Modern Art",
  shortDescription: "Auction paintings. Read the market. Outbid and outmaneuver.",
  description:
    "A Reiner Knizia auction masterpiece. Over four rounds, bid on paintings by five contemporary artists. Only the most-exhibited artists earn value — but market tastes shift each round. Master five auction types, navigate the Double Auction, and convert your collection into the biggest fortune.",

  ...catalogueFieldsFromRules(modernArtFacts),

  difficulty: "medium",

  durationMinutes: { min: 45, max: 75 },

  categories: ["auction", "strategy", "competitive"],
  mechanics: ["auction", "hand-management", "betting"],

  image: "/assets/games/modern-art/cover.png",
  accent: "#8B4513",

  status: "available",
};
