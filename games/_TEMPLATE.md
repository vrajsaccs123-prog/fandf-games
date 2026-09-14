# [Game Name] — Game Specification

> Copy this file to `/games/<game-id>.md` and fill in every section.
> The source code module lives at `src/games/<game-id>/`.

---

## Rules facts (source of truth for lobby + catalogue)

Player counts and play modes live on `GameRules.facts` in `src/games/<game-id>/rules.ts`.
The lobby page, catalogue cards, and setup sliders all read those facts — never hardcode
min/max players or local/online flags in metadata or lobby components.

```ts
// src/games/<game-id>/rules.ts
export const myGameFacts: GameRulesFacts = {
  minPlayers: 2,
  maxPlayers: 6,
  recommendedPlayers: [4],
  supportsLocal: true,
  supportsOffline: true,
  supportsOnline: false,
};

export const myGameRules: GameRules = {
  facts: myGameFacts,
  overview: `A game for ${formatPlayerCountLabel(myGameFacts)}. …`,
  // …
};
```

```ts
// src/games/<game-id>/metadata.ts
import { catalogueFieldsFromRules } from "@/game/core/rulesFacts";
import { myGameFacts } from "./rules";

export const metadata: GameMetadata = {
  id: "<game-id>",
  name: "",
  shortDescription: "",
  description: "",

  ...catalogueFieldsFromRules(myGameFacts),

  difficulty: "easy",           // "easy" | "medium" | "hard" | "expert"

  durationMinutes: {
    min: 15,
    max: 30,
  },

  categories: [],               // See GameCategory type
  mechanics: [],                // See GameMechanic type

  image: "cover.webp",
  accent: "#4a6741",            // Dominant color from artwork (optional)

  status: "coming-soon",        // Change to "available" when done
};
```

---

## Overview

<!-- One paragraph overview of the game. What is it? What's the feel? -->

---

## Objective

<!-- How does a player win? -->

---

## Players

- Min: X
- Max: Y
- Recommended: Z
- Teams: yes/no

---

## Setup

<!-- Step by step setup instructions -->

1. Step one
2. Step two

---

## Shared Mechanics Required

<!-- List which shared mechanics from src/game/mechanics/ this game needs -->

- [ ] Cards / Deck
- [ ] Dice
- [ ] Tokens
- [ ] Voting
- [ ] Roles
- [ ] Hidden information
- [ ] Timers
- [ ] Scoring

### New mechanics needed (not yet in the platform)

<!-- List any mechanics this game introduces that should become shared -->

- None

---

## Game State (TState)

<!-- Describe the authoritative game state shape -->

```ts
interface <GameId>State {
  phase: "setup" | "playing" | "finished";
  players: Player[];
  currentPlayerId: string;
  round: number;
  // ...game-specific fields
}
```

---

## Actions (TAction)

<!-- List every action a player can take -->

```ts
type <GameId>Action =
  | { type: "START_GAME" }
  | { type: "DRAW_CARD"; playerId: string }
  // ...
```

---

## Gameplay

### Turn structure

<!-- Describe a player's turn step by step -->

1. ...
2. ...

### Special rules

<!-- Any special rules, exceptions, edge cases -->

---

## End Condition

<!-- How does the game end? -->

---

## Scoring

<!-- How is the winner determined? Scoring method? -->

---

## Hidden Information

<!-- What information is hidden from which players? -->

- Player hands: visible to owner only
- etc.

---

## Randomness

<!-- What is random? Where does the RNG get used? -->

- Deck shuffle on setup
- etc.

---

## Edge Cases

<!-- Important edge cases the reducer must handle correctly -->

- ...

---

## UI Notes

<!-- Any game-specific UI requirements not covered by the shared system -->

- ...

---

## Test Coverage Required

<!-- List what must be tested before the game is marked "available" -->

- [ ] Initial state is valid
- [ ] Valid actions are accepted
- [ ] Invalid actions are rejected
- [ ] Win condition is detected
- [ ] Scoring is correct
- [ ] Hidden information is not exposed in player view
