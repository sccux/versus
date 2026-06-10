# misdraw "Paper & Ink" Visual Redesign

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:writing-plans to turn this into an implementation plan, then superpowers:subagent-driven-development or superpowers:executing-plans to implement it.

**Goal:** Restyle misdraw's UI with a consistent "paper & ink" aesthetic — dark paper surfaces, hand-drawn cream ink borders, offset sticker shadows, dashed dividers, subtle paper grain, and a hand-written accent font for headings — without changing any game logic, data flow, or component behavior.

**Architecture:** Purely presentational change. New CSS custom properties and a couple of reusable utility classes (sticker border/shadow, dashed divider, noise overlay) are added to `globals.css`, plus a new Google Font import. Every game/lobby/home component gets its `className` strings updated to use these tokens. No props, state, server actions, or realtime logic change.

**Tech Stack:** Next.js 16 App Router, Tailwind CSS v4 (`@theme inline` tokens in `globals.css`), Google Fonts (`next/font/google`).

---

## Visual Language

### Color tokens (added to `app/globals.css`)

| Token | Value | Usage |
|---|---|---|
| `--color-paper` | `#1c1b1e` | Page background |
| `--color-panel` | `#232227` | Cards/panels: top bar, canvas frame, chat, controls bar, modals |
| `--color-canvas` | `#fffefb` | The drawing surface itself ("paper" white) |
| `--color-ink` | `#efe9dd` | Borders, sticker shadows, icons, headings, primary text on dark |
| `--color-ink-muted` | `#4a484e` | Dashed dividers, inactive chip borders, secondary text |

These are exposed via Tailwind v4's `@theme inline` block as `--color-paper`, `--color-panel`, `--color-canvas`, `--color-ink`, `--color-ink-muted`, so they're usable as Tailwind utilities: `bg-paper`, `bg-panel`, `bg-canvas`, `border-ink`, `text-ink`, `border-ink-muted`, `text-ink-muted`, etc.

**No brand/accent color is introduced anywhere.** The only color in the UI remains the existing per-player `color` field (used today for chips, canvas strokes, score rows). Player color is now also the *only* source of color in chat messages, vote buttons, and scoreboards — unchanged from today.

### Typography

- Add **Patrick Hand** via `next/font/google` alongside the existing Inter.
- Patrick Hand is used **only** for:
  - The "misdraw" logo/wordmark (home screen, lobby header)
  - Section headings: "Voting", "Round over", "Waiting for everyone to be ready", role-reveal title ("You are a Real Artist 🎨" / "You are an Imposter 🕵️")
  - The turn-status line in the top bar ("Your turn — draw!", "{name} is drawing", etc.)
  - The win banner ("🎨 Artists Win!" / "🕵️ Imposters Win!")
- Everything else (chat messages, inputs, buttons, chip labels, scoreboard rows, system messages) stays in Inter — these need to stay compact and highly legible.
- Implementation: expose Patrick Hand as a CSS variable `--font-hand` via `next/font/google`'s `variable` option, register it in `@theme inline` as `--font-hand`, and apply via Tailwind's `font-hand` utility class.

### Reusable surface utilities (new classes in `globals.css`)

1. **`.ink-panel`** — the standard "card" treatment used for every panel (top bar, canvas frame, chat, controls bar, lobby card, role reveal, round-end card):
   ```css
   .ink-panel {
     background: var(--color-panel);
     border: 2px solid var(--color-ink);
     border-radius: 0.625rem; /* 10px */
     box-shadow: 4px 4px 0 var(--color-ink);
   }
   ```
   Smaller/inline elements (chips, badges, buttons) use a lighter version with a 3px shadow and 1.5px border via Tailwind utilities directly (no separate class needed): `border-2 border-ink rounded-full shadow-[3px_3px_0_var(--color-ink)]`.

2. **`.ink-divider`** — dashed horizontal divider between sections within a panel (top bar row 1/2, chat/voting split):
   ```css
   .ink-divider {
     border-top: 1.5px dashed var(--color-ink-muted);
   }
   ```

3. **`.paper-noise`** — subtle grain overlay, applied to the page background and the canvas-frame panel:
   ```css
   .paper-noise {
     position: relative;
   }
   .paper-noise::after {
     content: "";
     position: absolute;
     inset: 0;
     pointer-events: none;
     border-radius: inherit;
     background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.05'/%3E%3C/rect%3E%3C/svg%3E");
   }
   ```
   Any element using `.paper-noise` must have `position: relative` (or `relative` Tailwind class) and `overflow: hidden` if it has rounded corners, so the overlay doesn't bleed past the border radius.

4. **Outline button style** — for all interactive "pill" actions (Call Vote, I'm Ready/Cancel, vote-target buttons, tab toggle, role badges): `border-2 border-ink rounded-full bg-transparent text-ink` with `hover:bg-ink/10` for hover feedback. Disabled/inactive states drop to `border-ink-muted text-ink-muted`.

### Active-turn indicator

The current drawer's player chip in the top bar gets:
- `border-2 border-ink` (vs `border border-ink-muted` for inactive chips)
- `shadow-[2px_2px_0_var(--color-ink)]`
- A leading "●" dot before the name (in addition to the existing ✏️ emoji already used for the active drawer)

This replaces the current `ring-1 ring-white/60` treatment.

---

## Component-by-component changes

All changes below are styling/markup-wrapper only. No prop signatures, state, or logic change.

### `app/layout.tsx` / `app/globals.css`
- Add Patrick Hand via `next/font/google`, expose as `--font-hand`.
- Define the five color tokens and `--font-hand` in `@theme inline`.
- Set `body` background to `bg-paper text-ink` (replacing `bg-gray-950`).
- Apply `.paper-noise` to the `<body>` (or a top-level wrapper div) for the page-wide grain.

### `components/game/PlayerTopBar.tsx`
- Outer container: `bg-gray-900 rounded-lg` → `ink-panel` (drop the separate rounded/overflow classes already covered by `.ink-panel`).
- Replace the `border-t border-gray-800` between row 1 and row 2 with `ink-divider`.
- Player chips: keep per-player `color` for text; inactive chip border becomes `border border-ink-muted`; active chip becomes `border-2 border-ink shadow-[2px_2px_0_var(--color-ink)]` plus a leading "●" before the nickname (in addition to existing ✏️).
- Round stats (`R{n}`, `{aliveArtists}A – {aliveImposters}I`) text color: `text-ink-muted`, keep the existing green/red for the A/I counts (these are semantic, not brand, and were already there).
- Turn-status text (`turnText`): apply `font-hand text-lg` (up from `text-sm`) for the playful heading feel; keep the existing green/yellow/gray color logic for canDraw/frozen/default states.
- Role pill: replace solid background pill with `border-2 border-dashed border-ink rounded px-2 py-0.5 text-ink` (drop the green/red background — role color was the only "extra" brand-ish color and the spec calls for none). The 🎨/🕵️ emoji + word/role text remain as-is.

### `components/game/DrawingCanvas.tsx`
- The canvas wrapper element gets `ink-panel paper-noise overflow-hidden` (replacing whatever current wrapper styling exists), with the `<canvas>` itself keeping `bg-canvas` (white paper) so strokes remain high-contrast.
- No changes to canvas drawing logic, refs, or event handlers — only the wrapping container's `className`.

### `components/game/ChatPanel.tsx`
- Outer container: `bg-gray-900 rounded-lg overflow-hidden` → `ink-panel overflow-hidden`.
- System message pills (`bg-gray-800 text-gray-400 ... rounded-full`) → `border border-dashed border-ink-muted text-ink-muted rounded-full px-3 py-1 text-xs` (no fill).
- The divider above the input area (`border-t border-gray-800`) → `ink-divider`.
- The voting panel container's top border (`border-t border-gray-800`, if present) → `ink-divider` as well, keeping the existing `flex-shrink-0` layout.
- Input field: `bg-gray-800` → `bg-paper border border-ink-muted` with `focus:border-ink` (replacing `focus:ring-1 focus:ring-white/20`); placeholder text stays muted (`placeholder:text-ink-muted`).
- Send button (↵): becomes the standard outline pill button (`border-2 border-ink rounded-full text-ink hover:bg-ink/10`), replacing `bg-gray-700 hover:bg-gray-600`.

### `components/game/VotingPanel.tsx`
- Section heading ("⚖️ Who is the imposter?"): `font-hand text-lg` (was `text-xs uppercase tracking-wide`), drop the uppercase/letter-spacing treatment since the hand font carries the "label" feel on its own.
- Vote-target buttons: `bg-gray-800` → outline style `border-2 border-ink-muted rounded-lg bg-transparent`; the selected/"isMyVote" state (`ring-2 ring-white/30 bg-gray-700`) → `border-ink shadow-[2px_2px_0_var(--color-ink)]`. Player name text keeps its per-player `color`.
- "✓ voted" / "(you)" annotations: `text-ink-muted`.
- Progress text (`{voterIds.length}/{totalVoters} voted`): `text-ink-muted`.
- Spectator message ("⚖️ Voting in progress — x/y voted"): `text-ink-muted`, divider above it (`border-t border-gray-700`) → `ink-divider`.

### `components/game/ControlsBar.tsx`
- Outer container: apply `ink-panel`.
- "Call Vote" button: outline pill style (`border-2 border-ink rounded-full text-ink hover:bg-ink/10`), replacing its current solid/red styling. Disabled state (vote not available yet): `border-ink-muted text-ink-muted` and the helper text ("Vote available after everyone draws once") in `text-ink-muted`.
- "You have been eliminated..." message: `text-ink-muted`, container keeps `ink-panel`.

### `components/game/RoleReveal.tsx`
- Modal/card container: `ink-panel paper-noise overflow-hidden`.
- Title ("You are a Real Artist 🎨" / "You are an Imposter 🕵️"): `font-hand text-3xl`.
- Word reveal / "Draw it suggestively..." helper text: regular Inter, `text-ink` / `text-ink-muted`.
- "Got it" dismiss button: outline pill button style.
- Fellow-imposters list (if shown): each name keeps its player `color`; container styling uses `ink-divider` to separate from the main message.

### `components/round/RoundEndView.tsx`
- Both cards (winner banner, scoreboard, ready-list) use `ink-panel`.
- "Round over" label: `text-ink-muted`; winner heading ("🎨 Artists Win!" / "🕵️ Imposters Win!"): `font-hand text-3xl` — drop the green/red background tint on the banner (`bg-green-900/30` / `bg-red-900/30`) in favor of `ink-panel`, but keep green/red on the heading text itself (semantic win/lose color, not brand).
- Scoreboard rows: divider between rows (`border-b border-gray-800`) → `ink-divider`; rank number `text-ink-muted`; score delta keeps green; player name keeps per-player `color`.
- "Waiting for everyone to be ready" heading: `font-hand text-lg`.
- Ready-list rows: divider → `ink-divider`; "✓ Ready" stays green, "Not ready" → `text-ink-muted`.
- "I'm Ready" / "Cancel" button: outline pill button style (replacing `bg-white text-gray-950` / `bg-gray-800 text-white`).
- Countdown ("3, 2, 1"): `font-hand text-5xl`.

### `components/lobby/LobbyView.tsx` and `components/home/HomeClient.tsx`
- Apply `ink-panel` to the main card(s).
- "misdraw" wordmark/logo: `font-hand text-4xl` (or larger on home screen).
- Room code display: dashed-outline "stamp" box — `border-2 border-dashed border-ink rounded-lg px-4 py-2 font-hand text-2xl tracking-widest`.
- Player list rows in lobby: divider via `ink-divider`; player names keep per-player `color`.
- Primary action buttons (Create Room, Join Room, Start Game, Copy Code): outline pill button style.
- Input fields (nickname, room code entry): same treatment as chat input — `bg-paper border border-ink-muted focus:border-ink`.

### `components/game/GameView.tsx` (mobile tab bar)
- Tab bar container: `bg-gray-900 rounded-lg p-1` → `ink-panel p-1` (lighter shadow variant, e.g. `shadow-[2px_2px_0_var(--color-ink)]`, to keep it visually secondary to the canvas/chat panels).
- Active tab button: `bg-gray-700 text-white font-medium` → `border-2 border-ink rounded-md text-ink font-hand`.
- Inactive tab button: `text-gray-400 hover:text-gray-200` → `text-ink-muted hover:text-ink`.
- Unread red dot: unchanged (this is a notification indicator, not branding — keeping it red for universal "new message" recognition is reasonable and the spec's "no brand color" rule applies to UI chrome, not status indicators).

### `components/game/TurnTimer.tsx` and `components/game/VotingOverlay.tsx`
- `TurnTimer`: if rendered, apply `text-ink` / `text-ink-muted` per existing color logic (no structural change). `VotingOverlay` is currently unused (per prior session notes) — leave as-is, no changes needed.

---

## Out of scope / explicitly unchanged

- All game logic, realtime subscriptions, server actions, data fetching, and state management.
- The unread-message red dot (status indicator, not branding).
- Win/lose semantic colors (green for artists/correct, red for imposters/danger) and per-player colors — these are existing functional color uses, not new brand colors.
- Canvas drawing behavior, stroke colors, tool behavior.
