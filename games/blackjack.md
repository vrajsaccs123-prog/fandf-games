# Blackjack — Game Specification

---

## Metadata

```ts
export const metadata: GameMetadata = {
  id: "blackjack",
  name: "Blackjack",
  shortDescription: "Beat the dealer to 21 without going bust.",
  description:
    "The classic casino card game. Each player competes against the dealer to get a hand value as close to 21 as possible without exceeding it. Natural blackjack pays 3:2. Hit, stand, or double down.",

  minPlayers: 1,
  maxPlayers: 6,
  recommendedPlayers: [2, 3, 4],

  difficulty: "easy",

  durationMinutes: { min: 10, max: 40 },

  categories: ["card", "casino", "competitive"],
  mechanics: ["betting", "push-your-luck"],
  modes: ["local"],

  supportsLocal: true,
  supportsOffline: true,
  supportsOnline: false,

  image: "cover.webp",
  accent: "#1a6e3a",

  status: "available",
};
```

---

## Overview

Players each receive a hand of cards and compete against a shared dealer (not each other). The goal is to get a hand value as close to 21 as possible without exceeding it ("busting"). Each round, players place a bet, take their turn, then the dealer plays. Winners collect chips; losers forfeit their bet.

---

## Objective

Beat the dealer. Your hand value must be higher than the dealer's without exceeding 21. If you bust (exceed 21), you lose regardless of the dealer's hand.

---

## Players

- Min: 1
- Max: 6
- Recommended: 2–4
- Teams: No
- Dealer: Controlled by the game (not a human player)

---

## Card Values

| Card       | Value       |
|-----------|-------------|
| 2 – 10    | Face value  |
| J, Q, K   | 10          |
| Ace        | 1 or 11 (whichever is more advantageous without busting) |

---

## Chips

- Each player starts with **1,000 chips**.
- Minimum bet per round: **10 chips**.
- A player with 0 chips is **eliminated** (can no longer bet).

---

## Setup

1. Shuffle a standard 52-card deck.
2. Each player places their bet (minimum 10 chips, maximum: their current chip stack).
3. Deal 2 cards face-up to each player.
4. Deal 2 cards to the dealer: 1 face-up, 1 face-down (the "hole card").

---

## Shared Mechanics Required

- [x] Cards (`src/game/mechanics/cards/`)
- [x] Deck (`src/game/mechanics/deck/`)
- [ ] Scoring
- [x] Turn system (players take turns; dealer plays automatically)

---

## Game State (TState)

```ts
interface BlackjackState {
  phase: "betting" | "playing" | "dealer-turn" | "resolving" | "round-over";
  players: BlackjackPlayer[];
  dealer: DealerState;
  deck: Card[];
  currentPlayerIndex: number;   // Index into players[] during "playing" phase
  round: number;
  seed: string;
}

interface BlackjackPlayer {
  id: string;
  name: string;
  chips: number;
  bet: number;
  hand: Card[];
  status: "betting" | "playing" | "stand" | "bust" | "blackjack" | "doubled" | "eliminated";
  outcome?: "win" | "lose" | "push" | "blackjack";
  payout?: number;              // Chips won (or negative = chips lost)
}

interface DealerState {
  hand: Card[];
  holeCardRevealed: boolean;
  status: "waiting" | "playing" | "stand" | "bust";
}
```

---

## Actions (TAction)

```ts
type BlackjackAction =
  | { type: "PLACE_BET"; playerId: string; amount: number }
  | { type: "START_ROUND" }          // After all bets placed — deals cards
  | { type: "HIT"; playerId: string }
  | { type: "STAND"; playerId: string }
  | { type: "DOUBLE_DOWN"; playerId: string }
  | { type: "NEXT_ROUND" }           // Reset for a new round
```

---

## Gameplay

### Betting phase
- Each player who is not eliminated must place a bet.
- Once all active players have bet, the round starts.

### Turn structure (playing phase)
Players take turns in seat order. On your turn you may:

1. **Hit** — Draw one card. If your total exceeds 21 you bust and lose your bet.
2. **Stand** — End your turn. Your current total is locked in.
3. **Double Down** — Only available on your first action (2-card hand). Double your bet, draw exactly one card, then automatically stand.

A "natural blackjack" (Ace + 10-value card on first two cards) is an automatic win (unless the dealer also has blackjack, which results in a push).

### Dealer turn (dealer-turn phase)
After all players have acted:
1. Reveal the hole card.
2. Dealer must **hit** on any hand totalling 16 or less.
3. Dealer must **stand** on any hand totalling 17 or more.
4. Dealer plays automatically — no player input.

### Resolving phase
For each active (non-bust) player:
- Player total > Dealer total → **Win** (1:1 payout)
- Player total < Dealer total → **Lose** (forfeit bet)
- Player total == Dealer total → **Push** (bet returned)
- Player has natural blackjack, dealer doesn't → **Win** (3:2 payout)
- Dealer busts → all non-bust players **Win** (1:1)

---

## End Condition

A session ends when:
- All players have been eliminated (chip stack = 0), or
- The group chooses to stop (exits to the lobby).

There is no fixed number of rounds.

---

## Scoring

Win (1:1): player receives their bet × 2 (bet returned + equal winnings).
Blackjack (3:2): player receives their bet × 2.5.
Push: player receives their bet back.
Loss: player forfeits their bet.

---

## Hidden Information

- The dealer's hole card is face-down until the dealer's turn.
- `getPlayerView()` must hide the hole card until `holeCardRevealed === true`.

---

## Randomness

- Deck shuffle on round start (using shared `createRng(seed)`).
- Seed is set once per game session; each round re-shuffles using the same RNG instance (progressive).

---

## Edge Cases

- **Soft 17**: Dealer stands on soft 17 (Ace counted as 11 + 6).
- **All players bust**: Dealer still reveals hole card and stands (all lose regardless).
- **All players have blackjack**: Dealer checks for blackjack; ties are pushes.
- **Player eliminated mid-game**: They are skipped in subsequent rounds.
- **Deck runs low**: Re-shuffle when fewer than 15 cards remain.

---

## UI Notes

- Table surface: deep felt green (`--color-table`).
- Dealer area at top; player areas below in a row.
- Cards should animate: deal (fly in), flip (hole card reveal), bust (shake/red).
- Show chip count and current bet clearly for each player.
- Betting phase: each player gets a bet selector with +/- controls.
- During play: large Hit / Stand / Double buttons, thumb-reachable on mobile.
- After resolving: show result label (WIN / LOSE / PUSH / BLACKJACK) per player with chip delta.

---

## Test Coverage Required

- [x] createInitialState produces a valid betting-phase state
- [x] PLACE_BET: valid bet accepted; invalid bet (too high/low/non-integer) rejected
- [x] START_ROUND: deals 2 cards to each player + 2 to dealer
- [x] Natural blackjack is detected correctly
- [x] HIT: draws a card; bust is detected when total > 21
- [x] STAND: advances turn to next player
- [x] DOUBLE_DOWN: only valid on 2-card hand; doubles bet; draws one card; auto-stands
- [x] Ace counts as 11 unless bust, then 1
- [x] Dealer plays correctly (hit ≤16, stand ≥17)
- [x] Payouts are correct for all outcomes
- [x] Eliminated player is skipped
- [x] Hole card is not visible in player view before dealer's turn
