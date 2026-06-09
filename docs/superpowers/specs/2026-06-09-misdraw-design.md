# Misdraw — Design Spec

**Date:** 2026-06-09
**Domain:** misdraw.art
**Stack:** Next.js + Supabase (Realtime Broadcast + Presence + DB)

---

## Overview

Misdraw is a web-based multiplayer drawing game based on a TikTok trend. Players take turns drawing on a shared canvas. Some players are **imposters** who don't know the secret word; others are **real artists** who do. Artists try to draw suggestively enough to signal their team without revealing the word to imposters. Anyone can call a vote to eliminate a player. The game is round-based with cumulative scoring.

---

## Architecture

**Frontend:** Next.js app deployed on Vercel at `misdraw.art`.

**Backend:** Supabase handles all three layers:
- **DB** — persistent source of truth for rooms, players, rounds, votes, scores
- **Broadcast** — ephemeral real-time events (drawing strokes, chat, turn/vote notifications)
- **Presence** — live connection tracking per room (drop detection, join notifications)

**No auth for v1.** Players are anonymous — identified by nickname and an auto-assigned color. The schema is structured to support login later (nullable `user_id` on `players`, RLS policies written as "allow all" but structured for easy auth gating).

**Routes:**
- `/` — home: create or join a room
- `/[code]` — single route, renders lobby → game → round-end in place based on `room.status`

---

## Database Schema

### `rooms`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `code` | text UNIQUE | 6-character room code (e.g. `MX7K2P`) |
| `status` | enum | `lobby` \| `playing` \| `finished` |
| `host_player_id` | uuid FK → players | Who created the room (no special permissions in v1) |
| `current_round_id` | uuid FK → rounds | Nullable |
| `created_at` | timestamptz | |

### `players`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `room_id` | uuid FK → rooms | |
| `user_id` | uuid FK → auth.users | **Nullable** — for future login support |
| `nickname` | text | |
| `color` | text | Hex color from a fixed palette of 10 |
| `score` | int | Cumulative wins across all rounds in this room |
| `is_connected` | bool | Updated via Presence |
| `created_at` | timestamptz | |

### `rounds`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `room_id` | uuid FK → rooms | |
| `round_number` | int | 1-indexed |
| `word` | text | Secret word for this round |
| `status` | enum | `drawing` \| `voting` \| `finished` |
| `winner` | enum | `artists` \| `imposters` \| null |
| `started_at` | timestamptz | |
| `ended_at` | timestamptz | Nullable |

### `round_players`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `round_id` | uuid FK → rounds | |
| `player_id` | uuid FK → players | |
| `role` | enum | `artist` \| `imposter` |
| `turn_order` | int | Position in the drawing queue |
| `has_drawn` | bool | Whether this player has drawn in the current rotation |
| `is_alive` | bool | Flips false when killed via vote |

### `vote_sessions`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `round_id` | uuid FK → rounds | |
| `initiated_by` | uuid FK → players | |
| `status` | enum | `active` \| `resolved` |
| `killed_player_id` | uuid FK → players | Nullable — null if no majority |
| `created_at` | timestamptz | |

### `votes`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `vote_session_id` | uuid FK → vote_sessions | |
| `voter_id` | uuid FK → players | |
| `target_id` | uuid FK → players | |
| `created_at` | timestamptz | |

---

## Imposter Counts

Fixed ratios (no customization in v1). The pairs represent (artists — imposters):

| Total players | Artists | Imposters |
|---|---|---|
| 3 | 2 | 1 |
| 4 | 3 | 1 |
| 5 | 3 | 2 |
| 6 | 4 | 2 |
| 7 | 4 | 3 |
| 8 | 5 | 3 |
| 9 | 5 | 4 |
| 10 | 6 | 4 |

Max 10 players per room. Minimum 3 to start. If connected players drop below 3 mid-round, the round ends with no winner and the game waits for players to rejoin before a new round can start.

---

## Real-time Layer

One Supabase Realtime channel per room: `room:{code}`.

### Broadcast Events

| Event | Payload | Sender |
|---|---|---|
| `stroke_point` | `{player_id, x, y, is_start}` | Active player (throttled ~60fps) |
| `stroke_end` | `{player_id}` | Active player on pointer up |
| `chat_message` | `{player_id, text, is_dead}` | Any player |
| `turn_start` | `{player_id, starts_at}` | Server action |
| `turn_timeout` | `{player_id}` | Active player when 15s expires |
| `vote_initiated` | `{vote_session_id, initiated_by}` | Server action |
| `vote_cast` | `{vote_session_id, voter_id}` | Each voter as they vote |
| `vote_resolved` | `{killed_player_id, was_sole_imposter}` | Server action |
| `round_end` | `{winner, scores}` | Server action |
| `player_joined` | `{player_id, nickname, color}` | Server action |
| `player_dropped` | `{player_id}` | Server action (on Presence leave) |

### Presence

Each connected client tracks: `{player_id, nickname, color, is_connected}`.

Presence leave → server action fires `player_dropped`, sets `is_connected = false`, re-checks win conditions, adjusts turn order.

---

## Turn Timer

- `turn_start` is broadcast with `starts_at = now() + 3000ms`
- All clients show "3, 2, 1..." countdown until `starts_at`
- Drawing window opens at `starts_at` and lasts 15 seconds
- Turn ends on **whichever comes first**: pointer up (early release) or 15s expiry
- The **active player's client** is responsible for firing `stroke_end` and calling the `advance_turn` server action
- `turn_timeout` broadcast distinguishes a timeout from an early release (for UI feedback)

---

## Game State Machine

```
LOBBY → ROLE_ASSIGNMENT → DRAWING → [VOTING → DRAWING] → ROUND_END → LOBBY (next round)
```

### LOBBY
- Players join via room code + nickname
- Live player list shown via Presence
- "Start Game" button visible to all players, enabled at 3+ connected players
- Any player can start

### ROLE_ASSIGNMENT
- Server action: assigns roles randomly, sets `turn_order`, picks `word` from word list
- Artists query their own `round_players` row to get the word
- Imposters see "You are the imposter" + the other imposters' names (if multiple)
- Role reveal screen shown before drawing begins

### DRAWING
- Players draw in `turn_order` sequence (skipping dead players)
- Each turn: 3s countdown → 15s drawing window
- After all alive players have drawn once (`has_drawn = true` for all), `can_vote` is available
- `has_drawn` resets at the start of each new rotation

### VOTING
- Any alive player can call a vote (button enabled when `can_vote = true`)
- Canvas freezes (blurs), voting overlay appears
- All alive players must vote; cannot vote for themselves
- Majority wins; ties → no kill
- After resolution: `is_alive` flips for killed player, win condition checked
- Identity of killed player **not revealed** unless they were the sole remaining imposter
- Dead players can no longer draw or vote; can still chat (messages only visible to other dead players, marked in chat)

### WIN CONDITIONS
Checked after every kill and every player drop:
- **Artists win:** all imposters have `is_alive = false`
- **Imposters win:** `alive_imposters >= alive_artists`

### ROUND_END
- Winner announced with breakdown
- `score` incremented for all players on the winning team
- Scoreboard shown (cumulative scores)
- Next round auto-starts after 5s (or any player can trigger early)
- New round: roles + word reassigned randomly to all currently connected players

### MID-GAME EVENTS
- **Player drops mid-round:** removed from turn order, win condition re-checked, round may end immediately
- **Player joins mid-round:** added to `players` with `is_connected = true`, shown "Waiting for next round" UI, included in next round's role assignment
- **Enough players drop that minimum is unmet (< 3):** round ends with no winner declared, waiting for players to rejoin

---

## UI Structure

### Home (`/`)
- "Create Room" → generates code, creates room in DB, redirects to `/[code]` with nickname prompt
- "Join Room" → enter code + nickname, redirects to `/[code]`

### Room (`/[code]`)

Renders based on `room.status`:

**Lobby view:**
- Room code displayed prominently (for sharing)
- Live player list (names + colors, via Presence)
- "Start Game" button (disabled below 3 players)

**Game view (Layout C):**
```
┌─────────────────────────────────────────────────────┐
│  [P1 chip] [P2 chip] [P3 chip ✏️] ... │ R2 │ A3–I1 │
├──────────────────────────────────┬──────────────────┤
│                                  │                  │
│          Drawing Canvas          │      Chat        │
│                                  │   (dead msgs     │
│  [====timer bar================] │    dimmed/tagged)│
└──────────────────────────────────┴──────────────────┘
│  [Call Vote — available after full rotation]         │
└──────────────────────────────────────────────────────┘
```

- Player chips show nickname in their color; active drawer has a pencil indicator; dead players are crossed out and dimmed
- Timer bar depletes over 15s; shows countdown overlay before turn starts
- Chat messages colored by player; dead players' messages shown only to dead players, marked with 💀

**Voting overlay** (appears over game view):
- Canvas blurs
- Player list with vote buttons (cannot vote for self)
- Live vote tally updates as `vote_cast` events arrive
- Resolves automatically when all alive players have voted

**Role reveal screen** (shown at round start, before drawing):
- Artists: word displayed prominently
- Imposters: "You are the imposter 🕵️" + other imposter names

**Round end view:**
- Winner banner (Artists win / Imposters win)
- Score table: all players, cumulative wins, delta from this round
- Countdown to next round (5s) with "Start Now" button

---

## Drawing Canvas

**Implementation:** Plain browser Canvas API with a React wrapper. No canvas library.

- `pointerdown` → new stroke, broadcast `stroke_point {is_start: true}`
- `pointermove` (while down) → broadcast `stroke_point` at ~60fps
- `pointerup` / `pointerleave` → end turn, broadcast `stroke_end`
- Receiving clients call `ctx.lineTo()` in the sender's color

Canvas state is not persisted. Refreshing mid-game loses drawing history (game state intact). Acceptable for v1.

---

## Player Colors

Fixed palette of 10, assigned in join order:

`#FF6B6B` `#4ECDC4` `#FFD93D` `#6BCB77` `#4D96FF` `#FF922B` `#CC5DE8` `#F06595` `#74C0FC` `#A9E34B`

---

## Word List

~80 hardcoded simple nouns, randomly sampled each round without repeats until exhausted:

pizza, bottle, sun, tree, house, cat, hat, clock, book, chair, fish, boat, star, moon, apple, guitar, umbrella, shoe, car, bridge, cloud, flower, key, lamp, mountain, phone, ring, rocket, snake, spoon, sword, table, torch, train, wave, window, balloon, banana, bell, broom, butterfly, candle, crown, diamond, door, drum, egg, elephant, feather, flag, frog, ghost, hammer, heart, horse, kite, ladder, leaf, lighthouse, lion, mushroom, needle, owl, parachute, pencil, penguin, piano, pineapple, rabbit, rainbow, robot, scissors, skull, snowflake, spider, trophy, volcano, waterfall, whale, windmill

---

## Future Considerations (not in scope for v1)

- Login / subscriptions (schema prepared: nullable `user_id` on `players`, RLS policies structured for auth gating)
- Custom imposter counts per room
- Line weight and color customization
- Persistent drawing history
- Word list customization or expansion
- Mobile / touch optimization
