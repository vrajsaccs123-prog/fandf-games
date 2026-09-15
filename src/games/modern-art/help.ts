import type { GameHelpRules } from "@/game/core/types/help";

export const modernArtHelp: GameHelpRules = {
  sections: [
    {
      title: "Goal",
      text: "Earn the most money by buying and selling paintings over 4 rounds.",
    },
    {
      title: "On Your Turn",
      text: "Pick a painting from your hand and run an auction. The auction type is marked on the top-left corner of each card.",
    },
    {
      title: "Round End",
      text: "When the 5th painting of any artist is played, the round ends. That 5th painting is not auctioned.",
    },
    {
      title: "Rankings",
      text: "Top 3 most-offered artists earn value tiles: 1st=$30, 2nd=$20, 3rd=$10. Ties go to leftmost artist on board.",
    },
    {
      title: "Selling",
      text: "Paintings are worth the sum of all value tiles their artist has earned—only if ranked Top 3 this round.",
    },
    {
      title: "Open Auction",
      iconKey: "open",
      text: "Anyone can bid. Auctioneer can close after 10 seconds. No bids = free to Auctioneer.",
    },
    {
      title: "One Offer",
      iconKey: "one-offer",
      text: "Each player bids once or passes, clockwise. Auctioneer bids last.",
    },
    {
      title: "Hidden",
      iconKey: "hidden",
      text: "All bid secretly and simultaneously. Highest wins. Ties: closest to Auctioneer clockwise.",
    },
    {
      title: "Fixed Price",
      iconKey: "fixed-price",
      text: "Auctioneer sets price. Players buy or pass. All pass = Auctioneer must buy (pays Bank).",
    },
    {
      title: "Double",
      iconKey: "double",
      text: "Needs a 2nd same-artist card. Provider becomes Auctioneer. 2nd card's type runs the auction.",
    },
  ],
};
