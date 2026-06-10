# Misdraw: Couch Mode Design

## Overview

A new room mode where one device (a TV/laptop, "the host") acts as a shared
spectator display showing drawings, chat, and live game status, while all
actual players join from their own phones/laptops. The host device is never
a player: it has no role, no word, and no controls.

## 1. Data model

- Add `mode: 'online' | 'couch'` to the `rooms` table, default `'online'`.
- `host_player_id` remains nullable. For couch rooms it is **never set** —
  the host is not a player and has no row in `players`.
- Migration file: `supabase/migrations/00X_couch_mode.sql`, adding the
  column and a `room_mode` enum (or text + check constraint, matching the
  existing `room_status` style).

## 2. Room codes

- `generateCode(mode)`:
  - Couch codes: 6 chars, first char fixed to a reserved letter `C`,
    remaining 5 chars random base36 (uppercased), e.g. `C7K2P9`.
  - Online codes: 6 random base36 chars as today, but regenerated if the
    first char would be `C` (so `C`-prefixed codes are exclusively couch
    rooms).
- The prefix is a UX signal only (e.g. show a "Couch Mode Room" badge when
  joining); `rooms.mode` is the source of truth for all behavior.
- `joinRoom` is unchanged otherwise — same code field, same flow, for both
  modes.

## 3. Home screen (`HomeClient`)

- "Create Room" tab gains a mode toggle: **Online** (default, current
  behavior — nickname required) vs **Couch** (no nickname field shown).
- `createRoom(mode, nickname?)`:
  - `mode === 'online'`: unchanged — creates a room and a player row, sets
    `host_player_id`.
  - `mode === 'couch'`: creates a room with `mode: 'couch'`, no player row,
    `host_player_id` stays null.
- After creation, the creator is redirected to `/[code]`. For couch mode, no
  `misdraw_player_<code>` key is written to localStorage — this absence is
  what identifies the browser as the host/TV.
- "Join Room" tab is unchanged.

## 4. GameRoom branching

`GameRoom.tsx` keeps all existing data subscriptions (room, players, round,
roundPlayers, votes, vote sessions) regardless of mode.

New top-level branch, checked before the existing `lobby` /
`round.status === 'finished'` / normal-game branches:

```
if (room.mode === 'couch' && !currentPlayerId) {
  return <CouchHostView ... />
}
```

`CouchHostView` receives the same data `GameRoom` already has, plus
`refreshRound` and the `useGameChannel` callbacks needed for canvas/chat, and
internally renders one of three states based on `room.status` /
`round.status`, mirroring `LobbyView` / `GameView` / `RoundEndView`.

## 5. Couch lobby (TV) — `CouchHostView` lobby state

Shown when `room.status === 'lobby'`. Displays:

- Large room code display.
- QR code rendered client-side via the `qrcode` npm package (canvas or SVG),
  encoding the room URL (e.g. `https://<host>/CXXXXX`) so scanning jumps
  straight into the room.
- Live list of joined/connected players (same data as `LobbyView`'s player
  list).
- A "Start Game" button, enabled once `connectedPlayers.length >= 3` (the
  host is never counted since it's not a player). Calls the existing
  `startGame(room.id)` action. This is in addition to the existing
  `LobbyView` Start button on each player's device — whichever is clicked
  first wins; `startGame` is idempotent (sets `status: 'playing'`).

## 6. Round-start triggering (fix for couch mode)

Today, the client where `currentPlayerId === room.host_player_id` is
responsible for calling `startRound` (both the initial round-start in
`GameRoom.tsx` and the next-round-after-countdown in `RoundEndView.tsx`). In
couch mode `host_player_id` is always null, so this never fires.

New trigger condition, applied in both places:

- Couch mode (`room.mode === 'couch'`): the trigger is `!currentPlayerId`
  (i.e., the TV).
- Online mode: unchanged — `currentPlayerId === room.host_player_id`.

`RoundEndView` gains an `isRoundTrigger` boolean prop computed this way by
the caller (`GameRoom`/`CouchHostView`), replacing the current `isHost` prop
for this purpose.

## 7. In-game TV view — `CouchHostView` playing/voting state

Renders, read-only:

- `PlayerTopBar` — same props as the player view, but `myRole={undefined}`
  and `myWord={null}`, so the role pill does not render. Turn status, alive
  counts, and player chips render normally.
- `DrawingCanvas` — `isMyTurn={false}` always; receives remote strokes via
  `useGameChannel`'s `stroke_point`/`stroke_end` broadcasts (TV joins the
  `room:<code>` realtime channel like every client, but never calls
  `broadcastStrokePoint`/`broadcastStrokeEnd`).
- `ChatPanel` — receives `chat_message` broadcasts and system messages
  (vote results) exactly like a player's panel, but rendered with no input
  box. `ChatPanel` gains a `readOnly` prop that hides the text input/send
  button (or a `onSend`-less mode); voting summary (`VotingPanel`, read-only
  view of who's voted) still renders if `round.status === 'voting'`.
- No `ControlsBar` (no draw/vote actions available to the TV).
- No `RoleReveal` overlay.

## 8. Round end (TV) — `CouchHostView` round-finished state

Reuses `RoundEndView`'s winner banner and scoreboard in a read-only form:

- No "ready" toggle for the TV (it's not in `players`, so it's excluded from
  the `allReady` check, which already only iterates `players`).
- Once all real players are ready and the 3-2-1 countdown completes, the TV
  (per section 6's trigger rule) calls `startRound`.

## Out of scope / explicitly unchanged

- Gameplay rules, scoring, roles, voting logic — identical to online mode.
- Min/max player counts (3 minimum) — host/TV is never counted, which falls
  out naturally from it never having a `players` row.
- Mid-game join behavior ("waiting for next round") — applies to players
  only; the TV is never in this state.
