# Family & Friends Games Website — Project Context

**Purpose:** This document is the persistent product, UX, visual-design, architecture, and engineering context for the games website. It intentionally contains **no game-specific rules or metadata** — that content lives in `/games` (see Section 2 and `/games/README.md`).

**Audience:** Cursor and developers working on this project.

**Status:** Living document — update it whenever a foundational decision changes.

---

## 1. Product Vision

Build a polished, private, mobile-first web app where friends and family can discover and play many different board/card/social-deduction games.

The website should feel like a premium digital tabletop rather than a generic web-app dashboard.

Core goals:

- Many games in one consistent application.
- New games can be added quickly without rewriting shared systems.
- Maximum practical code reuse across games.
- Excellent phone UX, with strong laptop/tablet support.
- Fast, fluid animations.
- Realistic tabletop/card/board presentation where appropriate.
- Games can support local/offline play and online play where technically appropriate.
- No persistent database.
- No user accounts unless a future requirement makes them necessary.
- Games are private to the intended group; do not build a public social network or public game directory.
- Deploy continuously to Vercel as new games are added.
- Rules should be available from every game's lobby/game screen.
- Discovery should support filtering by player count, difficulty, game type, estimated duration, and other useful metadata.
- The app is intended to grow for years. Architecture must optimize for long-term extensibility, not just getting Version 1 shipped.

Important:

- Each game must be implemented as an isolated game module/plugin using shared platform primitives.
- Game-specific rules, state, UI, assets, and validation belong to the game module.
- Generic mechanics must live in shared reusable packages/modules.
- Do not copy/paste card, dice, player, timer, modal, animation, drag/drop, or turn-management implementations between games.

---

## 2. Game Catalogue (external reference — do not duplicate here)

**All game selection, rules, and per-game architecture notes live in `/games`, not in this file.**

- `/games/README.md` — index of all games, how to add a new one, and the current build order.
- `/games/_TEMPLATE.md` — the template every new game file should follow.
- `/games/<game-id>.md` — one file per game, containing its rules, metadata, and any game-specific architecture notes.

When Cursor (or a developer) is implementing or modifying a specific game, it should read the relevant `/games/<game-id>.md` file for authoritative rules/metadata. This file (`PROJECT_CONTEXT.md`) only defines the platform-level systems that every game is built on top of.

This separation exists so that:

- New games can be added by dropping in a new markdown file, without editing this document.
- This document stays stable and focused on architecture, UX, and engineering standards.
- Game rules can be drafted, reviewed, and iterated on independently of platform work.

---

## 3. Product Principles

### 3.1 Digital tabletop first

The visual language should evoke:

- physical cards
- boards
- tokens
- chips
- dice
- paper
- wood
- felt
- tiles
- game pieces
- tables
- subtle shadows and depth
- tactile interactions

Avoid making the experience look like:

- a SaaS dashboard
- an admin panel
- a spreadsheet
- a generic mobile game UI
- an overly glossy casino app unless the specific game calls for it

The UI chrome should stay quiet so the game itself is the hero.

### 3.2 Mobile first

Design for phones before desktop.

Primary considerations:

- One-handed interaction where possible.
- Thumb-friendly controls.
- Minimum comfortable touch target around 44px.
- Avoid hover-only interactions.
- Avoid tiny card text.
- Use bottom sheets/drawers for secondary information when appropriate.
- Keep the most important action reachable without excessive scrolling.
- Support portrait first; allow landscape where a game benefits substantially from it.
- Respect safe-area insets on iOS/modern phones.
- Avoid fixed UI that conflicts with browser controls or notches.
- Desktop should feel like an expanded tabletop rather than simply a stretched mobile page.

### 3.3 Fast and tactile

Animations should communicate:

- movement
- cause/effect
- state changes
- whose turn it is
- cards being dealt/drawn
- dice being rolled
- pieces moving
- selections
- success/failure
- transitions between phases

Animations must never become a barrier to playing.

Rules:

- Prefer transform/opacity animations.
- Avoid animating layout properties unnecessarily.
- Respect `prefers-reduced-motion`.
- Keep interaction feedback immediate.
- Use short animations for ordinary interactions.
- Reserve longer animations for meaningful game moments.
- Never require the user to watch an animation before continuing unless it is a deliberate game effect.
- Avoid excessive particles, blur, glow, and bounce.

---

## 4. UX Information Architecture

Recommended top-level structure:

```
Home
├── Game catalogue
├── Filters
├── Featured / Recently added
└── Game cards

Game detail / pre-game lobby
├── Game artwork
├── Description
├── Player count
├── Difficulty
├── Duration
├── Game type/tags
├── Rules
├── How to play
├── Start / Create game
└── Online / Local options where supported

Game session
├── Game surface
├── Player information
├── Turn / phase indicator
├── Primary actions
├── Secondary actions
├── Rules/help
├── Game log/history where useful
├── Settings
└── Exit / restart

Post-game
├── Results
├── Scores / winner
├── Replay / rematch
└── Return to catalogue
```

The exact structure may vary by game.

---

## 5. Game Catalogue UX

The catalogue is a major part of the product. Each game's data conforms to a shared metadata shape, defined once here and populated per-game in `/games/<game-id>.md`:

```ts
type GameMetadata = {
  id: string;
  name: string;
  shortDescription: string;
  description?: string;

  minPlayers: number;
  maxPlayers: number;

  recommendedPlayers?: number[];

  difficulty: "easy" | "medium" | "hard" | "expert";

  durationMinutes: {
    min: number;
    max: number;
  };

  categories: GameCategory[];

  mechanics?: GameMechanic[];

  modes?: GameMode[];

  supportsLocal: boolean;
  supportsOffline: boolean;
  supportsOnline: boolean;

  image: string;
  accent?: string;

  status: "available" | "coming-soon";

  publisher?: string;
  year?: number;
};
```

Possible categories (the canonical list should live in `catalogue/filters.ts` and be kept in sync with `/games/README.md`):

- Card
- Board
- Party
- Strategy
- Social deduction
- Bluffing
- Word
- Dice
- Auction
- Economic
- Family
- Competitive
- Cooperative
- Two-player
- Casino

Catalogue filters should support:

- Number of players
- Difficulty
- Duration
- Game type/category
- Mechanics
- Local / online availability
- Possibly recommended age later

Filters should be easy to use on mobile, preferably through a bottom-sheet/filter drawer.

Do not force users through complex filtering before they can browse.

---

## 6. Visual Design System

### Overall aesthetic

Target: **premium modern tabletop + restrained digital polish**

Visual characteristics:

- Warm, sophisticated surfaces.
- Strong hierarchy.
- Rich but controlled imagery.
- Physical depth.
- Natural-looking cards and game pieces.
- Soft shadows.
- Subtle texture where it improves realism.
- Clear typography.
- High contrast for gameplay actions.
- Game-specific visual identity inside a shared system.

Avoid:

- excessive gradients
- excessive glassmorphism
- neon gaming aesthetics by default
- clutter
- giant decorative headings
- animations on every element
- inconsistent corner radii
- inconsistent shadows

### Surfaces

Create reusable surface primitives:

- TableSurface
- CardSurface
- TileSurface
- BoardSurface
- Panel
- Modal
- BottomSheet
- Popover
- Chip
- Token
- Dice
- Button
- IconButton

These should be themeable rather than duplicated per game.

### Typography

Use a clean, highly legible UI font.

Potential hierarchy:

- Display: game titles / major results
- Heading: sections
- Body: rules and descriptions
- Label: controls
- Numeric/display: scores, timers, card values

Rules:

- Prioritize legibility over decorative typography.
- Avoid overly condensed type for gameplay information.
- Use tabular/monospaced numerals where useful for scores and timers.

### Color

The base application should use a neutral tabletop-inspired palette.

Games can have their own accent/theme, but the shared UI should remain recognizable.

Define semantic tokens instead of hardcoding colors:

```
--color-background
--color-surface
--color-surface-raised
--color-text
--color-text-muted
--color-border
--color-primary
--color-primary-foreground
--color-success
--color-warning
--color-danger
--color-focus
```

Do not hardcode colors throughout components.

### Shape

Use a small, consistent radius scale.

Cards can have their own realistic physical radius.

Avoid making every object look like a rounded rectangle.

### Shadows / depth

Use layered shadows:

- low elevation: subtle
- medium elevation: cards/panels
- high elevation: modals / floating pieces

Physical objects should generally cast softer shadows than UI overlays.

---

## 7. Responsive Layout Strategy

Breakpoints should be based on layout requirements, not device names.

Conceptual ranges:

- Small phone
- Phone
- Large phone / small tablet
- Tablet
- Laptop
- Large desktop

Games should define their own responsive behavior. Examples:

- A poker table can become a compact radial table on mobile.
- A board game may use a scaled/scrollable board on small screens.
- A card hand may use overlapping cards on mobile.
- A rules panel may become a bottom sheet.
- A desktop board can use more surrounding information.

Never simply shrink a desktop game until it technically fits.

---

## 8. Core Technical Architecture

The architecture should be **platform + game modules**.

Conceptually:

```
Application Shell
│
├── Game Catalogue
├── Routing
├── Theme System
├── Shared UI
├── Shared Game Engine Primitives
├── Local Storage / Persistence
├── Online Session Layer (optional)
└── Game Registry
      │
      └── (one module per game — see /games)
```

Recommended conceptual directory structure:

```
src/
  app/
    routes/
    providers/
    layout/

  components/
    ui/
    layout/
    feedback/
    overlays/

  game/
    core/
      types/
      state/
      actions/
      events/
      turn/
      phases/
      validation/
      random/
      serialization/
      history/

    mechanics/
      cards/
      deck/
      dealing/
      dice/
      tokens/
      board/
      grid/
      auction/
      voting/
      roles/
      scoring/
      timers/
      teams/
      resources/
      trading/
      hidden-information/

    rendering/
      card/
      board/
      table/
      pieces/
      animations/

  games/
    <game-id>/
      index.ts
      metadata.ts
      rules.ts
      state.ts
      actions.ts
      selectors.ts
      validation.ts
      components/
      assets/

  catalogue/
    gameRegistry.ts
    filters.ts

  hooks/
  lib/
  styles/
  assets/
```

The exact framework/library choices may evolve, but the architectural separation should remain.

Note: `src/games/<game-id>/` (source code) is distinct from `/games/<game-id>.md` (rules/spec docs at the repo root). The doc file is what a developer or Cursor reads *before* writing the code in `src/games/<game-id>/`.

---

## 9. Game Module Contract

Every game should conform to a common conceptual interface.

```ts
interface GameDefinition<TState, TAction, TPlayerView = unknown> {
  metadata: GameMetadata;

  createInitialState(
    config: GameConfig,
    seed?: string
  ): TState;

  reduce(
    state: TState,
    action: TAction
  ): TState;

  validateAction(
    state: TState,
    action: TAction
  ): ValidationResult;

  getAvailableActions(
    state: TState,
    playerId: string
  ): TAction[];

  getPlayerView(
    state: TState,
    playerId: string
  ): TPlayerView;

  getStatus(
    state: TState
  ): GameStatus;

  getRules(): GameRules;

  components: GameComponents;
}
```

The actual TypeScript interface can be refined during implementation.

Important distinction:

**Game logic** must be:

- deterministic where possible
- testable without React
- independent of DOM
- independent of visual components
- serializable where practical
- reusable in local and online modes

**UI** should:

- render game state
- dispatch actions
- display available actions
- animate transitions
- handle gestures
- manage presentation-only state

Do not put core game rules inside React components.

---

## 10. State Architecture

Use a clear separation:

```
Authoritative game state
        ↓
Derived selectors
        ↓
Player-specific view
        ↓
UI rendering
```

Do not store values that can be derived unless there is a compelling reason.

Example:

Bad:

```
state.currentPlayerName
state.currentPlayerId
```

Prefer:

```
state.currentPlayerId
```

and derive the name from the player collection.

Keep state serializable. Avoid putting inside game state:

- DOM elements
- React components
- functions
- animation objects
- browser APIs

---

## 11. Actions and Events

Game interactions should be represented as explicit actions.

Examples:

```json
{ "type": "DRAW_CARD", "playerId": "p1" }
{ "type": "PLAY_CARD", "playerId": "p1", "cardId": "card-17" }
{ "type": "ROLL_DICE", "playerId": "p2" }
{ "type": "VOTE", "playerId": "p3", "targetId": "p5" }
```

Benefits:

- easier testing
- easier replay
- easier debugging
- easier networking
- easier game logs
- easier undo/redo where appropriate
- consistent architecture

---

## 12. Shared Mechanics Library

Before implementing a mechanic a second time, ask: **"Is this actually game-specific?"** If not, extract it.

Likely reusable mechanics include:

**Cards** — card definitions, deck creation, shuffled decks, multiple decks, draw, discard, shuffle, burn cards, hand management, dealing, card ownership, card visibility, card ordering, card selection, card flipping, card stacking, card fan layouts.

**Dice** — dice definitions, random rolls, seeded rolls, multiple dice, custom dice, dice animation, result history.

**Players** — player identity, seating order, turn order, teams, roles, spectators, eliminated players.

**Turn system** — active player, round, phase, turn timers, simultaneous actions, sequential actions, end-turn.

**Hidden information** — private cards, secret roles, hidden objectives, private player views, revealed information, spectator restrictions.

**Voting** — eligible voters, candidate set, secret/open votes, majority, plurality, tie handling, vote reveal.

**Timers** — countdown, count-up, turn timer, phase timer, pause/resume, expiration, optional audio/haptic feedback.

**Board / spatial mechanics** — grid, hex grid, coordinates, adjacency, placement, movement, zones, pieces, occupancy.

**Auctions** — reusable abstractions supporting multiple auction styles rather than one-off bidding logic.

**Resources** — generic resource system for games with coins, cards, cubes, tokens, commodities, victory points.

Each `/games/<game-id>.md` file should note which shared mechanics it needs (see the template), so Cursor can check reuse before building something new.

---

## 13. Randomness

Randomness is a core infrastructure concern.

Create one shared random abstraction.

Requirements:

- centralized RNG
- optional deterministic seed
- test-friendly
- avoid scattered direct calls to `Math.random()`
- ability to reproduce a game from a seed where feasible

Example conceptual API:

```ts
const rng = createRng(seed);

rng.next();
rng.int(min, max);
rng.pick(array);
rng.shuffle(array);
```

This will make testing and debugging much easier.

---

## 14. Offline Architecture

The application must work as a static/client-first application wherever possible.

Offline-capable games should not require a network connection after assets/application code have been cached.

Consider:

- PWA support
- service worker
- asset caching
- local game state persistence
- localStorage / IndexedDB where appropriate
- installability on mobile

Do not add a database merely to support offline play. Offline support must not become a reason to make game logic depend on server APIs.

---

## 15. Online Multiplayer Without a Database

Important architectural constraint: **no persistent database.**

Online multiplayer therefore should not depend on persistent server-side game storage.

Preferred future architecture:

```
Player A browser
       │
       │ WebRTC / P2P
       ▼
Player B browser
```

with only minimal ephemeral signaling infrastructure when required:

```
Browser
   │
   ├── temporary room/signaling endpoint
   │
   └── WebRTC peer connection
```

The server should not become the authoritative persistent database.

Possible approaches to evaluate when online multiplayer is implemented:

- WebRTC peer-to-peer
- Temporary Vercel/serverless signaling
- One browser acting as host/authority
- Shareable room/session code

Important:

- Do not introduce a persistent database without an explicit product decision.
- Do not assume Vercel static hosting alone provides realtime multiplayer.
- Design game logic so local and online execution use the same reducer/action model.

---

## 16. Privacy

This is a private family/friends project.

Default philosophy:

- no unnecessary analytics
- no unnecessary tracking
- no public profiles
- no social feed
- no public game history
- no collection of personal information
- no account requirement unless future requirements justify it

Game state should remain client-side where possible. If online sessions are introduced, minimize data transmitted and avoid persistent storage.

---

## 17. Rules System

Every game must have a first-class rules definition, authored in its `/games/<game-id>.md` file and surfaced in-app from that same source of truth. Rules should not be a giant hardcoded block inside a page.

Suggested structure (mirrors the template in `/games/_TEMPLATE.md`):

```ts
type GameRules = {
  overview: string;
  objective: string;
  setup: RuleSection[];
  gameplay: RuleSection[];
  endCondition: RuleSection[];
  scoring?: RuleSection[];
  specialRules?: RuleSection[];
  examples?: RuleExample[];
  glossary?: RuleGlossaryEntry[];
};
```

Rules UX should support:

- short "How to play" summary
- full rules
- setup
- turn structure
- examples
- edge cases where important

On mobile, rules should open in a sheet/full-screen panel without destroying the current game state.

---

## 18. Animation System

Create a shared animation vocabulary.

**Cards** — deal, draw, flip, reveal, discard, play, hover/lift, selected, shake/error.

**Dice** — roll, settle, result reveal.

**Tokens** — move, place, collect, spend.

**Game phases** — phase transition, round transition, winner reveal.

**UI** — modal, bottom sheet, toast, tooltip, button feedback.

Animations should be declarative and reusable. Prefer:

```jsx
<AnimatedCard />
<DiceRoll />
<TokenMove />
<PhaseTransition />
```

over one-off animation code inside every game.

---

## 19. Realistic Card Design

Cards should feel like physical cards.

Reusable card system should support: front/back, dimensions/aspect ratio, face image, title, body, iconography, metadata, rarity/type, selection state, disabled state, hidden state, orientation, stacking, overlap, rotation, 3D-ish flip, shadows, texture, optional wear/print effects.

Important: do not use expensive visual effects on every card simultaneously. A hand of 10 cards should remain smooth on a phone.

---

## 20. Images and Assets

Use a consistent asset pipeline.

Game-specific assets belong under the game module. Shared assets belong in shared assets.

```
assets/
  common/
    icons/
    textures/
    cards/
    dice/

  games/
    <game-id>/
```

Images should be optimized for the web.

Prefer:

- WebP / AVIF where appropriate
- responsive image sizes
- lazy loading for catalogue artwork
- eager loading for critical in-game assets

Do not load the entire asset library on initial page load.

---

## 21. Performance Requirements

Performance is a product feature.

Priorities:

- Fast initial catalogue load.
- Fast route transitions.
- Fast interaction response.
- Smooth gameplay.
- Avoid unnecessary JS.
- Avoid rendering hidden games.
- Lazy-load game modules where practical.
- Lazy-load heavy assets.
- Keep animations GPU-friendly.
- Avoid unnecessary re-renders.

Potential architecture:

```
Catalogue
   ↓
Game metadata only

User opens game
   ↓
Lazy-load game module
   ↓
Load game assets
   ↓
Start session
```

Do not bundle every game's full implementation and all assets into the initial JavaScript payload if it can be avoided.

---

## 22. Accessibility

Accessibility is required, not optional.

Support:

- keyboard navigation on desktop
- visible focus
- semantic buttons
- screen-reader labels
- sufficient color contrast
- reduced motion
- non-color-only state indicators
- readable rules
- accessible modals
- accessible dialogs
- touch-friendly controls

Game state should never be communicated only through color.

---

## 23. Audio / Haptics

Audio should be optional and subtle.

Potential shared effects: card draw, card play, dice roll, success, error, timer warning, phase transition, victory.

Provide:

- mute control
- volume control where useful
- respect browser autoplay restrictions
- avoid unexpected audio

Haptics can be used on supported mobile devices but must never be required.

---

## 24. Game Development Workflow

Every new game should follow this process.

**Step 1 — Define the game.** Create (or update) `/games/<game-id>.md` from `/games/_TEMPLATE.md`, documenting: player count, objective, setup, phases, actions, rules, win condition, scoring, hidden information, randomness, game end, edge cases.

**Step 2 — Identify reusable mechanics.** Before coding: Which existing primitives (Section 12) can be reused? Which mechanics are genuinely new? Should any new mechanic become shared infrastructure?

**Step 3 — Implement pure game logic.** Implement state, actions, reducer, validation, selectors, rules, randomness — without depending on UI.

**Step 4 — Test rules.** Write tests for setup, valid actions, invalid actions, edge cases, scoring, win conditions, randomness where deterministic seeds can be used.

**Step 5 — Build UI.** Use existing cards, boards, tokens, dice, modals, buttons, player indicators, timers, animation primitives.

**Step 6 — Mobile first.** Test the entire game on a narrow phone viewport before polishing desktop.

**Step 7 — Desktop enhancement.** Use additional space without changing the fundamental game rules.

**Step 8 — Performance pass.** Check asset size, render count, animation smoothness, route bundle, initial load.

**Step 9 — Accessibility pass.** Check keyboard, focus, screen readers, contrast, and reduced motion.

**Step 10 — Add to catalogue.** Only after the game is usable should it be added to the main catalogue as available (update `status` in its metadata and register it — see Section 27).

---

## 25. Definition of Done for a Game

A game is not finished merely because the rules work.

Minimum completion:

- Game module exists.
- Metadata exists (in `/games/<game-id>.md` and mirrored in `metadata.ts`).
- Rules are documented.
- Setup works.
- Core gameplay works.
- Win/end condition works.
- Scoring works if applicable.
- Invalid actions are blocked.
- Game state is serializable where practical.
- Unit tests cover important rules.
- Mobile UI works.
- Desktop UI works.
- Touch interactions work.
- Keyboard/accessibility basics work.
- Reduced-motion behavior exists.
- Loading state exists.
- Error state exists.
- Empty/edge states are handled.
- Assets are optimized.
- Animations are performant.
- No game-specific duplication of shared mechanics.
- Catalogue metadata is complete.

---

## 26. Coding Principles

**Prefer composition.** Build games from reusable primitives:

```
Game
├── GameShell
├── PlayerBar
├── TurnIndicator
├── CardHand
├── Board
├── ActionBar
├── RulesPanel
└── GameLog
```

rather than giant game-specific components.

**Prefer data-driven design.** Cards, roles, tiles, resources, and actions should generally be represented as data:

```ts
const cards = [
  { id: "card-1", type: "resource", name: "Example Card", image: "..." },
];
```

rather than hardcoded UI branches everywhere.

**Avoid premature abstraction.** Do not create a generic abstraction merely because two things look slightly similar. Extract when: the behavior is genuinely the same, the concept is stable, reuse reduces complexity, or the mechanic is clearly likely to recur.

**No copy/paste architecture.** If the same logic appears in a third game, stop and refactor the shared mechanic.

---

## 27. Game Registry

Use a central registry, generated/maintained from the games listed in `/games/README.md`:

```ts
export const games = [
  // one entry per game module in src/games/, matching /games/<game-id>.md
];
```

The registry should power: catalogue, routing, filtering, metadata, search, game availability, game loading.

Adding a game should ideally require:

1. Write `/games/<game-id>.md` (rules + metadata).
2. Create the game module in `src/games/<game-id>/`.
3. Register the game in `gameRegistry.ts`.
4. Add assets.
5. Add tests.
6. Deploy.

Do not require changes across 10 unrelated files.

---

## 28. Routing

Use stable game IDs/slugs matching the `/games/<game-id>.md` filename.

Examples:

```
/games
/games/<game-id>
```

Future session routing might be:

```
/games/<game-id>/play
/games/<game-id>/room/ABCD
```

Do not encode mutable game state into URLs unless there is a clear reason.

---

## 29. Persistence

Persistence should be deliberately scoped.

Potential local persistence: user preferences, audio setting, theme setting, recently played games, unfinished local game, game configuration.

Do not persist sensitive hidden game information in a way that undermines the game. For example, if a game has secret roles, consider whether storing the complete state in local storage would expose information to another player using the same device.

---

## 30. Testing Strategy

Use several levels of tests.

**Unit tests** — for pure game logic: reducers, validators, selectors, scoring, deck logic, dice logic, turn logic.

**Property / invariant tests** — deck has correct number of cards; cards aren't duplicated unless intended; player resources never become invalid; impossible actions cannot change state.

**Integration tests** — game setup → gameplay → end; UI action → reducer; rules panel; responsive controls.

**End-to-end tests** — for critical user flows: catalogue → select game → configure → start → play → finish → rematch.

---

## 31. Security / Trust Model

Because this is a private family/friends app, keep the security model simple but explicit.

- For local play: browser is trusted.
- For online play: do not trust client input blindly if another peer can exploit it; validate actions against the game state; prevent impossible actions; keep hidden information private; distinguish public state from player-specific state.

If a future game requires stronger anti-cheating guarantees, revisit the host/authority architecture rather than adding ad-hoc checks.

---

## 32. Vercel Deployment

Deployment target: Vercel.

Design for: static assets, fast CDN delivery, route-based code splitting, client-side game execution, optional serverless/edge endpoints only where needed.

Do not assume serverless functions are persistent. Do not store game sessions in process memory and expect them to survive. Any ephemeral networking solution must tolerate serverless execution characteristics.

---

## 33. What Cursor Should Do When Adding a New Game

Before creating code, Cursor should:

1. Read `/games/<game-id>.md` for that game's rules and metadata.
2. Inspect existing shared mechanics (Section 12 and `src/game/`).
3. Identify reusable components.
4. Identify whether any missing mechanic should become shared.
5. Propose the state model.
6. Propose actions and phases.
7. Propose tests.
8. Only then implement.

When a new game resembles an existing game, reuse the infrastructure instead of duplicating the existing game.

---

## 34. What Cursor Should NOT Do

Do not:

- introduce a database without explicit approval
- add authentication without explicit approval
- create a separate UI system for each game
- duplicate generic mechanics
- put game rules inside visual components
- use arbitrary global mutable state
- scatter `Math.random()` calls
- make hidden information globally visible
- sacrifice mobile UX for desktop
- add animations solely for decoration
- ship inaccessible controls
- load every game and every image on initial page load
- hardcode catalogue filters separately from game metadata
- create a new component when an existing reusable component is appropriate
- silently change foundational architecture
- write or edit game rules/metadata directly in this file — they belong in `/games`

If a requested feature conflicts with this document, explain the trade-off before implementing it.

---

## 35. Decision-Making Hierarchy

When making implementation choices, prioritize:

1. Correct game rules
2. Excellent mobile usability
3. Reusable architecture
4. Fast performance
5. Accessibility
6. Visual quality
7. Developer convenience

Do not sacrifice long-term architecture for a quick demo. However, avoid over-engineering. The goal is simple primitives composed well, not an enormous game-engine framework.

---

## 36. Product North Star

The ideal experience is:

> "I open the site, immediately see games that fit my group, tap one, understand how to play, start within seconds, and the game feels like a beautifully designed physical tabletop game."

A new game should feel native to the platform while still having its own personality. The application should become a reusable digital tabletop platform, not a collection of unrelated mini-sites.

---

## 37. Future Possibilities — Do Not Build Yet Unless Requested

Potential future features: game favorites, recently played, custom game settings, saved local presets, shareable game links, room codes, online multiplayer, spectators, replay, game recording/replay, undo, accessibility themes, sound packs, custom card/board assets, family-specific house rules, game statistics, installable PWA, localization, additional game packs.

These should not drive current architecture unless they have a clear impact on foundational decisions.

---

## 38. Architecture Change Rule

Before introducing a major dependency, service, framework, database, or networking system, ask:

1. What problem does it solve?
2. Can the existing architecture solve it?
3. Does it preserve the no-database requirement?
4. Does it work with Vercel?
5. Does it work offline?
6. Does it improve or harm mobile performance?
7. Does it increase reuse?
8. What is the long-term maintenance cost?

Document significant decisions in an ADR-style file if the project grows large.

---

## 39. Current Implementation Priority

Recommended order:

**Foundation** — application shell, routing, design tokens, responsive layout, shared UI primitives, game registry, game metadata, rules system.

**Core game infrastructure** — players, turns/phases, actions/reducer model, RNG, cards/decks, dice, timers, hidden information, voting, resources, scoring.

**First games** — start with a relatively contained game to validate the architecture before tackling anything spatial/board-heavy. See `/games/README.md` for the current suggested game build order — it is flexible and should be updated there, not here.

---

## 40. Final Rule for Development

Every implementation should make the next game easier to build.

When adding functionality, ask: **"If the next game needs this, will we be able to reuse it?"**

If yes, build it as a reusable primitive. If no, determine whether the difference is genuinely game-specific or whether the abstraction is incomplete.

The project succeeds when adding game #20 is substantially easier than adding game #1.
