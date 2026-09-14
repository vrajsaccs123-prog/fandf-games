import type { GameRules, GameRulesFacts } from "@/game/core/types";
import { formatPlayerCountLabel } from "@/game/core/rulesFacts";

export const modernArtFacts: GameRulesFacts = {
  minPlayers: 3,
  maxPlayers: 5,
  recommendedPlayers: [4, 5],
  supportsLocal: false,
  supportsOffline: false,
  supportsOnline: true,
};

export const modernArtRules: GameRules = {
  facts: modernArtFacts,

  overview:
    `Modern Art is an auction game for ${formatPlayerCountLabel(modernArtFacts)}. You are Museum directors competing to acquire the most valuable paintings. Over four rounds, players auction paintings from their hands. The most traded artists become valuable; the rest are worthless.`,
  objective:
    "Earn the most money by round 4. Buy low, sell high — the Bank buys your collection at the end of each round at market value.",
  setup: [
    {
      title: "Starting Money",
      content: "Each player begins with $100.",
    },
    {
      title: "Card Distribution",
      content:
        "Shuffle all 70 cards. Deal 10 cards each (3p), 9 each (4p), or 8 each (5p). Remaining cards form the draw pile.",
    },
    {
      title: "Starting Auctioneer",
      content:
        "The youngest player goes first and holds the Auctioneer token.",
    },
  ],
  gameplay: [
    {
      title: "On Your Turn",
      content:
        "Select a painting from your hand and announce what type of auction it is (shown on the card). Run the auction. The winner takes the painting; money changes hands.",
    },
    {
      title: "Open Auction",
      content:
        "Anyone can bid any amount, any number of times. Each new bid must exceed the previous. The Auctioneer decides when to close bidding. If nobody bids, the Auctioneer receives the painting for free. If another player wins, they pay the Auctioneer. If the Auctioneer wins, they pay the Bank.",
    },
    {
      title: "One Offer Auction",
      content:
        "Starting with the player left of the Auctioneer and proceeding clockwise, each player makes exactly one bid or passes. The Auctioneer acts last. Highest bidder wins. If nobody bids, Auctioneer gets painting free.",
    },
    {
      title: "Hidden Auction",
      content:
        "All players simultaneously choose a secret bid (or no bid). Bids are revealed at once. Highest bid wins. Ties go to the player closest to the Auctioneer clockwise. The Auctioneer wins their own ties. If nobody bids, Auctioneer gets painting free.",
    },
    {
      title: "Fixed Price Auction",
      content:
        "The Auctioneer declares a price (cannot exceed their cash). Players may buy or pass, clockwise. The Auctioneer acts last. First player to buy wins. If nobody buys, the Auctioneer must purchase it themselves, paying the Bank.",
    },
    {
      title: "Double Auction",
      content:
        "The Auctioneer plays a Double card and may also play a second card of the same artist (not another Double). If they don't, the chance passes clockwise. Whoever supplies the second card becomes the new Auctioneer. The second card's type determines the auction. If nobody supplies a second card, the original Auctioneer gets the first card free.",
    },
  ],
  endCondition: [
    {
      title: "Round End",
      content:
        "When the 5th painting of any one artist is offered, the round ends immediately. That 5th painting is NOT auctioned but counts toward the artist ranking.",
    },
    {
      title: "After Round 4",
      content:
        "The game ends. Reveal all money. The player with the most money wins.",
    },
  ],
  scoring: [
    {
      title: "Artist Rankings",
      content:
        "At round end, count how many paintings of each artist were offered. The top 3 artists earn value tiles: 1st=$30, 2nd=$20, 3rd=$10. Ties go to the artist furthest left on the board (Manuel Carvalho first).",
    },
    {
      title: "Selling Paintings",
      content:
        "Each purchased painting's value = the sum of all value tiles earned by that artist across all rounds — but only if the artist is Top 3 this round. Otherwise, the painting is worth $0.",
    },
    {
      title: "Cumulative Values",
      content:
        "Value tiles accumulate. An artist worth $30 in round 1 and $20 in round 3 would have paintings worth $50 at the end of round 3 (if they ranked in round 3). Previous tile values remain on the board.",
    },
  ],
  specialRules: [
    {
      title: "Mystery Player (3-player variant)",
      content:
        "An optional 4th hand is dealt face-down. After each auction, the current player may optionally reveal one random card from the Mystery hand. That card counts toward artist rankings but is not auctioned. A Mystery card can end the round.",
    },
    {
      title: "No Cards",
      content:
        "A player who runs out of cards cannot offer a painting but may still bid in others' auctions.",
    },
  ],
  glossary: [
    { term: "Auctioneer", definition: "The player whose turn it is to offer a painting." },
    { term: "Offer Count", definition: "How many paintings of an artist have been played this round (including the 5th that ends the round)." },
    { term: "Value Tile", definition: "A permanent marker placed on the market board at round end: $30, $20, or $10." },
    { term: "Cumulative Value", definition: "The sum of all value tiles an artist has earned across all completed rounds." },
    { term: "Double Auction", definition: "An auction that requires a second painting of the same artist to run; the second card determines the auction type." },
  ],
};
