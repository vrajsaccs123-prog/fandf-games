# Undercover

> Social deduction — 4-20 players — Mobile-first — Online + Offline

## Overview

Undercover is a social deduction game where players receive secretly different but related words and must give one-word clues each round. Civilians try to find and eliminate the Undercovers. Undercovers try to blend in and outnumber the Civilians. Mr. White has no word at all and must survive by listening carefully.

## Metadata

| Field            | Value                                              |
|------------------|----------------------------------------------------|
| ID               | `undercover`                                       |
| Min Players      | 4                                                  |
| Max Players      | 20                                                 |
| Recommended      | 6–10                                               |
| Difficulty       | Medium                                             |
| Duration         | 15–60 min                                          |
| Categories       | party, social-deduction, bluffing, word            |
| Mechanics        | hidden-roles, voting, deduction, bluffing, elimination |
| Modes            | local (offline pass-the-device), online (PeerJS P2P) |
| Status           | available                                          |

## Factions

| Role        | Receives      | Goal                                      |
|-------------|---------------|-------------------------------------------|
| Civilian    | Civilian word | Eliminate all Undercovers + Mr. Whites    |
| Undercover  | Undercover word | Outnumber Civilians (living U ≥ living C), including when 1 Civilian remains |
| Mr. White   | No word       | Guess Civilian word on death, or win when only 1 Civilian remains |

## Special Characters (Optional Modifiers)

| Character | Assignment | Effect |
|-----------|-----------|--------|
| Judge     | 1 player  | Breaks perfect voting ties |
| Joy Fool  | 1 player  | +4 pts if voted out in Round 1 |
| Ghost     | 1 player  | Only that player can still vote after elimination |
| Lovers    | 2 players | If one dies, so does the other |
| Revenger  | 1 player  | Drags one player down when voted out |
| Duelists  | 2 players | First eliminated: -2; Survivor: +2 |

## Scoring

| Event                        | Points              |
|------------------------------|---------------------|
| Civilian win (surviving)     | +2 each             |
| Undercover win (surviving)   | 10 ÷ count each     |
| Mr. White win (guess/survive)| +6                  |
| Joy Fool — voted out Round 1 | +4 bonus            |
| Duelist — first eliminated   | -2                  |
| Duelist — survivor           | +2                  |

## Game Flow

```
LOBBY → CARD_REVEAL → CLUE_PHASE → VOTING → VOTE_RESULT →
[TIE_BREAK] → ELIMINATION → [REVENGER_PICK] → [MR_WHITE_GUESS] →
WIN_CHECK → ROUND_RESULT → [NEXT_ROUND | GAME_OVER]
```

## Implementation

**Source:** `src/games/undercover/`

```
undercover/
  metadata.ts         — GameMetadata
  types.ts            — All game-specific types
  words.ts            — 100 word pairs (Easy / Medium / Difficult)
  actions.ts          — UndercoverAction union type
  state.ts            — createInitialState, advanceToNextRound
  reducer.ts          — Pure game reducer / state machine
  validation.ts       — validateAction
  selectors.ts        — getPlayerView (secret-info gating), getAvailableActions, getStatus
  scoring.ts          — applyRoundScores
  rules.ts            — getRules()
  index.ts            — GameDefinition default export
  engine/
    roles.ts          — Role + special character assignment (seeded RNG)
    wordQueue.ts      — Word deck management, difficulty fallback, direction randomization
    elimination.ts    — Elimination chain engine (event queue)
    winConditions.ts  — Win condition checks
  components/
    UndercoverLobby.tsx  — Step-based setup UI (6 steps)
    UndercoverGame.tsx   — Main game surface (all phase UIs)
  __tests__/
    roles.test.ts     — Role assignment tests
    words.test.ts     — Word queue tests
    engine.test.ts    — Reducer, elimination, win conditions, scoring tests
```

## Key Design Decisions

- **Roles are fixed** for the entire match; word pairs change each round.
- **Match = multiple elimination rounds** until a faction's win condition is triggered.
- **Private state separation**: `getPlayerView` strips all secret info for other players. Never broadcast roles or words to all clients.
- **Elimination chain engine** uses an event queue (not a simple function) to correctly sequence Lover deaths, Revenger picks, and Ghost conversion before checking win conditions.
- **Word direction randomized** independently each round — "Civilian" is not always wordA.
- **Word queue exhaustion** follows difficulty fallback order; full reset with notification when all pairs exhausted.
- **Offline mode**: pass-the-device card reveal; creator eliminates admin-style.
- **Online mode**: each player on own device; sequential digital voting in turn order.

## Word Pairs

100 pairs across three difficulties:
- **Easy** (34): Common, clearly related (Dog/Wolf, Coffee/Tea, etc.)
- **Medium** (34): Moderately similar (Airport/Railway Station, Morning/Evening, etc.)
- **Difficult** (32): Subtly related (Detective/Spy, Secret/Mystery, etc.)
