# Game Catalogue — Index

This directory contains one markdown file per game. These are **specification documents**, not source code.

Before implementing any game, read the relevant `<game-id>.md` file here first.  
The source code lives in `src/games/<game-id>/`.

---

## How to Add a New Game

1. Copy `_TEMPLATE.md` → `<game-id>.md` and fill in all sections.
2. Create `src/games/<game-id>/` with the module structure below.
3. Register the game in `src/catalogue/gameRegistry.ts`.
4. Add assets to `src/assets/games/<game-id>/`.
5. Write tests.
6. Deploy.

### Module structure (`src/games/<game-id>/`)

```
<game-id>/
  index.ts          — re-exports the GameDefinition default
  metadata.ts       — GameMetadata; player/mode fields MUST come from rules facts
  rules.ts          — GameRules including `facts` (source of truth for players + modes)
  state.ts          — TState type + createInitialState()
  actions.ts        — TAction union type
  reducer.ts        — pure reduce() function
  validation.ts     — validateAction() + getAvailableActions()
  selectors.ts      — getPlayerView() + getStatus() + derived selectors
  components/       — React UI for this game only
  assets/           — game-specific images, sounds (symlink or copy to src/assets/games/<id>/)
```

---

## Current Build Order

Start with simpler, self-contained games to validate the platform before tackling spatial/board games.

| # | Game ID      | Status       | Notes                                      |
|---|-------------|-------------|---------------------------------------------|
| 1 | blackjack   | ✅ available | Cards + turns + scoring.                   |
| 2 | undercover  | 🔲 planned  | Social deduction, roles, voting.            |

Status key: 🔲 planned · 🔨 in progress · ✅ available · 🧪 beta

---

## Shared Mechanics Checklist

Before coding a mechanic for a game, check if it already exists in `src/game/mechanics/`:

- [ ] Cards / Deck (`src/game/mechanics/cards/`, `src/game/mechanics/deck/`)
- [ ] Dice (`src/game/mechanics/dice/`)
- [ ] Tokens (`src/game/mechanics/tokens/`)
- [ ] Voting (`src/game/mechanics/voting/`)
- [ ] Roles / Hidden information (`src/game/mechanics/roles/`, `src/game/mechanics/hidden-information/`)
- [ ] Timers (`src/game/mechanics/timers/`)
- [ ] Scoring (`src/game/mechanics/scoring/`)
- [ ] Turn / Phase system (`src/game/core/turn/`, `src/game/core/phases/`)

If a mechanic is missing and would be reused by more than one game, add it to `src/game/mechanics/` as a shared primitive.
