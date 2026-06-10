# misdraw "Paper & Ink" Visual Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the "paper & ink" dark monochrome design system (spec: `docs/superpowers/specs/2026-06-10-misdraw-paper-ink-design.md`) across misdraw's UI — new color tokens, sticker-shadow panels, dashed dividers, paper grain, Patrick Hand display font — without changing any logic, props, or data flow.

**Architecture:** Add shared design tokens and utility classes to `app/globals.css`, load Patrick Hand in `app/layout.tsx`, then update `className` strings (and a couple of inline styles) component by component. Every change is presentational only.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind CSS v4 (`@theme inline`), `next/font/google`.

---

### Task 1: Design tokens, Patrick Hand font, and shared utility classes

**Files:**
- Modify: `misdraw/app/globals.css`
- Modify: `misdraw/app/layout.tsx`

- [ ] **Step 1: Rewrite `globals.css` with the paper & ink tokens and utilities**

```css
@import "tailwindcss";

:root {
  --paper: #1c1b1e;
  --panel: #232227;
  --canvas: #fffefb;
  --ink: #efe9dd;
  --ink-muted: #4a484e;
}

@theme inline {
  --color-paper: var(--paper);
  --color-panel: var(--panel);
  --color-canvas: var(--canvas);
  --color-ink: var(--ink);
  --color-ink-muted: var(--ink-muted);
  --font-hand: var(--font-patrick-hand);
}

body {
  background: var(--color-paper);
  color: var(--color-ink);
}

.ink-panel {
  background: var(--color-panel);
  border: 2px solid var(--color-ink);
  border-radius: 0.625rem;
  box-shadow: 4px 4px 0 var(--color-ink);
}

.ink-divider {
  border-top: 1.5px dashed var(--color-ink-muted);
}

.paper-noise {
  position: relative;
}

.paper-noise::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  border-radius: inherit;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E");
}
```

- [ ] **Step 2: Load Patrick Hand and apply page-wide background/noise in `layout.tsx`**

Replace the full file contents with:

```tsx
import type { Metadata } from 'next';
import { Inter, Patrick_Hand } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });
const patrickHand = Patrick_Hand({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-patrick-hand',
});

export const metadata: Metadata = {
  title: 'misdraw',
  description: 'draw. deceive. survive.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} ${patrickHand.variable} bg-paper text-ink paper-noise`}>
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Verify the project builds**

Run: `cd misdraw && npm run build`
Expected: build succeeds with no type or CSS errors (it's fine if pages render with old `bg-gray-*` classes still present — they'll be replaced in later tasks).

- [ ] **Step 4: Commit**

```bash
git add misdraw/app/globals.css misdraw/app/layout.tsx
git commit -m "style: add paper & ink design tokens and base utilities"
```

---

### Task 2: `PlayerTopBar.tsx`

**Files:**
- Modify: `misdraw/components/game/PlayerTopBar.tsx`

- [ ] **Step 1: Restyle the outer container, divider, chips, turn text, and role pill**

Replace lines 53–115 (the full `return (...)` block) with:

```tsx
  return (
    <div className="ink-panel overflow-hidden flex-shrink-0">
      {/* Row 1: Player chips + round stats */}
      <div className="flex items-center gap-2 px-3 py-2">
        <div className="flex items-center gap-1.5 flex-1 min-w-0 overflow-x-auto">
          {players.map((p) => {
            const rp = rpMap[p.id];
            const isAlive = rp?.is_alive ?? true;
            const isActive = p.id === currentTurnPlayerId && !frozen;

            return (
              <div
                key={p.id}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 transition-all border ${
                  isAlive ? 'opacity-100' : 'opacity-30 line-through'
                } ${
                  isActive
                    ? 'border-2 border-ink shadow-[2px_2px_0_var(--color-ink)]'
                    : 'border-ink-muted'
                }`}
                style={{ color: p.color }}
              >
                {isActive && <span>● ✏️</span>}
                {p.nickname}
                {!isAlive && ' 💀'}
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-2 text-xs text-ink-muted flex-shrink-0 pl-1">
          <span>R{roundNumber}</span>
          <span>
            <span className="text-green-500">{aliveArtists}A</span>
            {' '}–{' '}
            <span className="text-red-500">{aliveImposters}I</span>
          </span>
        </div>
      </div>

      {/* Row 2: Turn status + role pill */}
      <div className="flex items-center justify-between px-3 py-1.5 ink-divider">
        <span
          className={`font-hand text-lg ${
            canDraw
              ? 'text-green-400'
              : frozen
              ? 'text-yellow-400'
              : 'text-ink-muted'
          }`}
        >
          {turnText}
        </span>
        {myRole && (
          <span className="text-xs font-medium px-2 py-0.5 rounded border-2 border-dashed border-ink text-ink">
            {myRole === 'artist' ? `🎨 "${myWord}"` : '🕵️ Imposter'}
          </span>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `cd misdraw && npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add misdraw/components/game/PlayerTopBar.tsx
git commit -m "style: paper & ink restyle for PlayerTopBar"
```

---

### Task 3: `DrawingCanvas.tsx`

**Files:**
- Modify: `misdraw/components/game/DrawingCanvas.tsx`

- [ ] **Step 1: Apply ink-panel + noise to the canvas wrapper, switch canvas surface to `bg-canvas`**

Replace lines 119–139 with:

```tsx
  return (
    <div className={`relative w-full h-full flex items-center justify-center ink-panel paper-noise overflow-hidden ${frozen ? 'opacity-50 pointer-events-none' : ''}`}>
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        className="max-w-full max-h-full aspect-[4/3] bg-canvas rounded-lg touch-none"
        style={{ cursor: isMyTurn && !frozen ? 'crosshair' : 'default' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      />
      {!isMyTurn && (
        <div className="absolute inset-0 flex items-end justify-center pb-4 pointer-events-none">
          <span className="text-ink-muted text-sm bg-paper/70 border border-ink-muted px-3 py-1 rounded-full">
            waiting for your turn...
          </span>
        </div>
      )}
    </div>
  );
});
```

- [ ] **Step 2: Verify build**

Run: `cd misdraw && npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add misdraw/components/game/DrawingCanvas.tsx
git commit -m "style: paper & ink restyle for DrawingCanvas"
```

---

### Task 4: `ChatPanel.tsx`

**Files:**
- Modify: `misdraw/components/game/ChatPanel.tsx`

- [ ] **Step 1: Restyle container, messages, system pills, divider, input, and send button**

Replace lines 50–96 with:

```tsx
  return (
    <div className="flex flex-col h-full ink-panel overflow-hidden">
      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
        {visibleMessages.map((msg, i) => (
          <div key={i} className={`text-sm ${msg.is_dead ? 'opacity-50' : ''}`}>
            <span className="font-medium" style={{ color: msg.color }}>
              {msg.nickname}
              {msg.is_dead && ' 💀'}:
            </span>{' '}
            <span className="text-ink">{msg.text}</span>
          </div>
        ))}
        {systemMessages.map((sm) => (
          <div key={sm.id} className="text-sm text-center py-1">
            <span className="border border-dashed border-ink-muted text-ink-muted px-3 py-1 rounded-full text-xs">
              {sm.text}
            </span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {voting && (
        <div className="px-3 pt-1 flex-shrink-0">
          <VotingPanel {...voting} />
        </div>
      )}

      <div className="p-2 ink-divider flex gap-2 flex-shrink-0">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder={isDeadPlayer ? 'Ghost chat...' : 'Say something...'}
          maxLength={200}
          className="flex-1 bg-paper text-ink border border-ink-muted rounded px-3 py-2 text-sm outline-none focus:border-ink placeholder:text-ink-muted"
        />
        <button
          onClick={handleSend}
          className="border-2 border-ink rounded-full text-ink px-3 py-2 text-sm hover:bg-ink/10 transition-colors"
        >
          ↵
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `cd misdraw && npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add misdraw/components/game/ChatPanel.tsx
git commit -m "style: paper & ink restyle for ChatPanel"
```

---

### Task 5: `VotingPanel.tsx`

**Files:**
- Modify: `misdraw/components/game/VotingPanel.tsx`

- [ ] **Step 1: Restyle the spectator view, heading, vote buttons, and progress text**

Replace lines 46–90 with:

```tsx
  if (!isAlive) {
    return (
      <div className="ink-divider pt-3 mt-1">
        <p className="text-xs text-ink-muted text-center py-2">
          ⚖️ Voting in progress — {voterIds.length}/{totalVoters} voted
        </p>
      </div>
    );
  }

  return (
    <div className="ink-divider pt-3 mt-1">
      <p className="font-hand text-lg mb-2">
        ⚖️ Who is the imposter?
      </p>
      <div className="flex flex-col gap-1.5 mb-2">
        {alivePlayers.map((player) => {
          const isMe = player.id === currentPlayerId;
          const isMyVote = myVoteTargetId === player.id;
          return (
            <button
              key={player.id}
              disabled={isMe || hasVoted || isPending}
              onClick={() => vote(player.id)}
              className={[
                'w-full text-left px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border-2',
                isMyVote
                  ? 'border-ink shadow-[2px_2px_0_var(--color-ink)]'
                  : 'border-ink-muted',
                !isMe && !hasVoted ? 'hover:bg-ink/10 cursor-pointer' : 'cursor-default',
                isMe || (hasVoted && !isMyVote) ? 'opacity-40' : '',
              ].join(' ')}
              style={{ color: player.color }}
            >
              {player.nickname}
              {isMe && <span className="text-ink-muted text-xs ml-2">(you)</span>}
              {isMyVote && <span className="text-ink-muted text-xs ml-2">✓ voted</span>}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-ink-muted text-center pb-1">
        {voterIds.length}/{totalVoters} voted
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `cd misdraw && npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add misdraw/components/game/VotingPanel.tsx
git commit -m "style: paper & ink restyle for VotingPanel"
```

---

### Task 6: `ControlsBar.tsx`

**Files:**
- Modify: `misdraw/components/game/ControlsBar.tsx`

- [ ] **Step 1: Restyle the eliminated message, container, helper text, and Call Vote button**

Replace lines 23–53 with:

```tsx
  if (!isAlive) {
    return (
      <div className="px-4 py-2 ink-panel text-center text-ink-muted text-sm">
        You have been eliminated. You can still watch and chat.
      </div>
    );
  }

  const canCallVote = canVote && roundStatus === 'drawing';

  return (
    <div className="flex items-center justify-between px-4 py-2 ink-panel">
      <span className="text-ink-muted text-sm">
        {canCallVote
          ? 'First rotation complete — vote available'
          : 'Vote available after everyone draws once'}
      </span>
      <button
        disabled={!canCallVote || isPending}
        onClick={() =>
          startTransition(async () => {
            await initiateVote(roundId, currentPlayerId);
          })
        }
        className="border-2 border-ink rounded-full text-ink text-sm font-medium px-4 py-2 hover:bg-ink/10 disabled:border-ink-muted disabled:text-ink-muted disabled:cursor-not-allowed transition-colors"
      >
        ⚖️ Call Vote
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `cd misdraw && npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add misdraw/components/game/ControlsBar.tsx
git commit -m "style: paper & ink restyle for ControlsBar"
```

---

### Task 7: `RoleReveal.tsx`

**Files:**
- Modify: `misdraw/components/game/RoleReveal.tsx`

- [ ] **Step 1: Restyle the modal card, headings, text, and dismiss button**

Replace lines 11–51 with:

```tsx
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="ink-panel paper-noise overflow-hidden p-8 max-w-sm w-full text-center">
        {role === 'artist' ? (
          <>
            <p className="text-ink-muted text-sm mb-2">You are a</p>
            <h2 className="font-hand text-3xl text-green-400 mb-6">Real Artist 🎨</h2>
            <p className="text-ink-muted text-sm mb-2">The word is</p>
            <p className="text-4xl font-bold text-ink mb-6">{word}</p>
            <p className="text-ink-muted text-sm">
              Draw it suggestively — help your team, hide it from imposters.
            </p>
          </>
        ) : (
          <>
            <p className="text-ink-muted text-sm mb-2">You are an</p>
            <h2 className="font-hand text-3xl text-red-400 mb-6">Imposter 🕵️</h2>
            {fellowImposters.length > 0 && (
              <div className="mb-4">
                <p className="text-ink-muted text-sm mb-2">Your fellow imposters:</p>
                {fellowImposters.map((imp) => (
                  <p key={imp.nickname} className="font-medium" style={{ color: imp.color }}>
                    {imp.nickname}
                  </p>
                ))}
              </div>
            )}
            <p className="text-ink-muted text-sm">
              Blend in. Draw like you know the word. Survive the vote.
            </p>
          </>
        )}
        <button
          onClick={onDismiss}
          className="mt-6 w-full border-2 border-ink rounded-xl text-ink font-semibold py-3 hover:bg-ink/10 transition-colors"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `cd misdraw && npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add misdraw/components/game/RoleReveal.tsx
git commit -m "style: paper & ink restyle for RoleReveal"
```

---

### Task 8: `RoundEndView.tsx`

**Files:**
- Modify: `misdraw/components/round/RoundEndView.tsx`

- [ ] **Step 1: Restyle the page wrapper, winner banner, scoreboard, ready list, and ready button**

Replace lines 85–171 (the full `return (...)` block) with:

```tsx
  return (
    <div className="min-h-screen bg-paper flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="ink-panel text-center mb-6 p-6">
          <p className="text-ink-muted text-sm mb-1">Round over</p>
          <h2
            className={`font-hand text-3xl ${
              winner === 'artists' ? 'text-green-400' : 'text-red-400'
            }`}
          >
            {winner === 'artists' ? '🎨 Artists Win!' : '🕵️ Imposters Win!'}
          </h2>
          <p className="text-ink-muted text-sm mt-2">
            The word was: <span className="text-ink font-medium">{roundWord}</span>
          </p>
        </div>

        <div className="ink-panel overflow-hidden mb-4">
          <div className="px-4 py-3 ink-divider">
            <p className="text-ink-muted text-sm font-medium">Scoreboard</p>
          </div>
          {sorted.map((p, i) => (
            <div
              key={p.id}
              className="flex items-center px-4 py-3 ink-divider last:border-0"
            >
              <span className="text-ink-muted text-sm w-6">{i + 1}</span>
              <span className="flex-1 font-medium" style={{ color: p.color }}>
                {p.nickname}
              </span>
              <div className="flex items-center gap-2">
                {p.scoreDelta > 0 && (
                  <span className="text-green-400 text-sm">+{p.scoreDelta}</span>
                )}
                <span className="text-ink font-bold">{p.score}</span>
              </div>
            </div>
          ))}
        </div>

        {countdown !== null ? (
          <div className="text-center py-3">
            <p className="text-ink-muted text-sm mb-1">Everyone&apos;s ready — next round in</p>
            <p className="font-hand text-5xl text-ink">{countdown}</p>
          </div>
        ) : (
          <>
            <div className="ink-panel overflow-hidden mb-4">
              <div className="px-4 py-3 ink-divider">
                <p className="font-hand text-lg">Waiting for everyone to be ready</p>
              </div>
              {players.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center px-4 py-3 ink-divider last:border-0"
                >
                  <span className="flex-1 font-medium" style={{ color: p.color }}>
                    {p.nickname}
                    {p.id === currentPlayerId && ' (you)'}
                  </span>
                  <span className={`text-sm font-medium ${p.is_ready ? 'text-green-400' : 'text-ink-muted'}`}>
                    {p.is_ready ? '✓ Ready' : 'Not ready'}
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={toggleReady}
              className={`w-full font-semibold rounded-xl py-3 transition-colors border-2 ${
                isReady
                  ? 'border-ink shadow-[2px_2px_0_var(--color-ink)] text-ink hover:bg-ink/10'
                  : 'border-ink text-ink hover:bg-ink/10'
              }`}
            >
              {isReady ? 'Cancel' : "I'm Ready"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
```

Note: the `ink-divider` class sets `border-top`, so `last:border-0` on row elements still removes the dashed top border from the last row as before (the property name is the same — only its style changed).

- [ ] **Step 2: Verify build**

Run: `cd misdraw && npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add misdraw/components/round/RoundEndView.tsx
git commit -m "style: paper & ink restyle for RoundEndView"
```

---

### Task 9: `LobbyView.tsx`

**Files:**
- Modify: `misdraw/components/lobby/LobbyView.tsx`

- [ ] **Step 1: Restyle the page wrapper, logo, room code stamp, player list, and start button**

Replace lines 27–82 (the full `return (...)` block) with:

```tsx
  return (
    <div className="min-h-screen bg-paper flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <h1 className="font-hand text-4xl text-ink text-center mb-2">misdraw</h1>

        <div className="ink-panel p-6 mb-4">
          <p className="text-ink-muted text-sm text-center mb-2">Room Code</p>
          <button
            onClick={copyCode}
            className="w-full border-2 border-dashed border-ink rounded-lg px-4 py-2 font-hand text-2xl text-ink text-center tracking-widest hover:bg-ink/10 transition-colors"
          >
            {room.code}
          </button>
          <p className="text-ink-muted text-xs text-center mt-1">tap to copy</p>
        </div>

        <div className="ink-panel p-4 mb-4">
          <p className="text-ink-muted text-sm mb-3">
            Players ({connectedPlayers.length}/10)
          </p>
          <div className="space-y-2">
            {connectedPlayers.map((p) => (
              <div key={p.id} className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: p.color }}
                />
                <span
                  className="font-medium"
                  style={{ color: p.color }}
                >
                  {p.nickname}
                  {p.id === currentPlayerId && (
                    <span className="text-ink-muted text-xs ml-2">(you)</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={handleStart}
          disabled={isPending || connectedPlayers.length < 3}
          className="w-full border-2 border-ink rounded-xl text-ink font-semibold py-3 hover:bg-ink/10 transition-colors disabled:border-ink-muted disabled:text-ink-muted disabled:cursor-not-allowed"
        >
          {connectedPlayers.length < 3
            ? `Need ${3 - connectedPlayers.length} more player${3 - connectedPlayers.length === 1 ? '' : 's'}`
            : isPending
            ? 'Starting...'
            : 'Start Game'}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `cd misdraw && npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add misdraw/components/lobby/LobbyView.tsx
git commit -m "style: paper & ink restyle for LobbyView"
```

---

### Task 10: `HomeClient.tsx`

**Files:**
- Modify: `misdraw/components/home/HomeClient.tsx`

- [ ] **Step 1: Restyle the page wrapper, logo, tab bar, inputs, and submit button**

Replace lines 45–104 (the full `return (...)` block) with:

```tsx
  return (
    <div className="min-h-screen bg-paper flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <h1 className="font-hand text-5xl text-ink text-center mb-2">misdraw</h1>
        <p className="text-ink-muted text-center mb-8 text-sm">draw. deceive. survive.</p>

        <div className="flex mb-6 ink-panel p-1">
          <button
            onClick={() => setTab('create')}
            className={`flex-1 py-2 rounded-md text-sm font-hand transition-colors ${
              tab === 'create' ? 'border-2 border-ink text-ink' : 'text-ink-muted hover:text-ink'
            }`}
          >
            Create Room
          </button>
          <button
            onClick={() => setTab('join')}
            className={`flex-1 py-2 rounded-md text-sm font-hand transition-colors ${
              tab === 'join' ? 'border-2 border-ink text-ink' : 'text-ink-muted hover:text-ink'
            }`}
          >
            Join Room
          </button>
        </div>

        <div className="space-y-3">
          <input
            type="text"
            placeholder="Your nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={20}
            className="w-full bg-panel text-ink rounded-lg px-4 py-3 outline-none border border-ink-muted focus:border-ink placeholder:text-ink-muted"
          />

          {tab === 'join' && (
            <input
              type="text"
              placeholder="Room code (e.g. MX7K2P)"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={6}
              className="w-full bg-panel text-ink rounded-lg px-4 py-3 outline-none border border-ink-muted focus:border-ink placeholder:text-ink-muted font-mono tracking-widest"
            />
          )}

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            onClick={tab === 'create' ? handleCreate : handleJoin}
            disabled={isPending}
            className="w-full border-2 border-ink rounded-lg text-ink font-semibold py-3 hover:bg-ink/10 transition-colors disabled:border-ink-muted disabled:text-ink-muted disabled:cursor-not-allowed"
          >
            {isPending ? 'Loading...' : tab === 'create' ? 'Create Room' : 'Join Room'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `cd misdraw && npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add misdraw/components/home/HomeClient.tsx
git commit -m "style: paper & ink restyle for HomeClient"
```

---

### Task 11: `GameView.tsx` mobile tab bar and page background

**Files:**
- Modify: `misdraw/components/game/GameView.tsx`

- [ ] **Step 1: Restyle the page wrapper and the mobile draw/chat tab bar**

Replace line 176:

```tsx
    <div className="h-screen bg-gray-950 flex flex-col gap-2 p-2 overflow-hidden">
```

with:

```tsx
    <div className="h-screen bg-paper flex flex-col gap-2 p-2 overflow-hidden">
```

Then replace lines 194–219 with:

```tsx
      {/* Tab bar — only visible below lg breakpoint */}
      <div className="flex lg:hidden gap-1 bg-panel border-2 border-ink rounded-lg p-1 flex-shrink-0 shadow-[2px_2px_0_var(--color-ink)]">
        <button
          onClick={() => handleTabChange('draw')}
          className={`flex-1 py-1.5 text-sm rounded-md font-hand transition-colors ${
            activeTab === 'draw'
              ? 'border-2 border-ink text-ink'
              : 'text-ink-muted hover:text-ink'
          }`}
        >
          Drawing
        </button>
        <button
          onClick={() => handleTabChange('chat')}
          className={`flex-1 py-1.5 text-sm rounded-md font-hand relative transition-colors ${
            activeTab === 'chat'
              ? 'border-2 border-ink text-ink'
              : 'text-ink-muted hover:text-ink'
          }`}
        >
          Chat
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-5 w-2 h-2 bg-red-500 rounded-full" />
          )}
        </button>
      </div>
```

- [ ] **Step 2: Verify build**

Run: `cd misdraw && npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add misdraw/components/game/GameView.tsx
git commit -m "style: paper & ink restyle for GameView shell and tab bar"
```

---

### Task 12: `TurnTimer.tsx`

**Files:**
- Modify: `misdraw/components/game/TurnTimer.tsx`

- [ ] **Step 1: Restyle countdown text and progress bar track**

Replace lines 67–96 with:

```tsx
  return (
    <div className="absolute inset-0 pointer-events-none">
      {phase === 'countdown' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-lg z-10">
          <div className="text-center">
            <p className="text-ink text-sm mb-1">
              {isMyTurn ? 'Your turn!' : `${currentPlayer?.nickname ?? '...'}'s turn`}
            </p>
            <p
              className="font-hand text-8xl"
              style={{ color: currentPlayer?.color ?? 'var(--color-ink)' }}
            >
              {countdownNum}
            </p>
          </div>
        </div>
      )}
      {phase === 'drawing' && (
        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-ink-muted rounded-b-lg overflow-hidden">
          <div
            className="h-full transition-none rounded-b-lg"
            style={{
              width: `${progress * 100}%`,
              backgroundColor: currentPlayer?.color ?? 'var(--color-ink)',
            }}
          />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `cd misdraw && npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add misdraw/components/game/TurnTimer.tsx
git commit -m "style: paper & ink restyle for TurnTimer"
```

---

### Task 13: Final visual check and deploy

**Files:** none (verification only)

- [ ] **Step 1: Start the dev server**

Run: `cd misdraw && npm run dev`

- [ ] **Step 2: Visually check each screen in a browser**

Check, in order:
1. Home screen (`/`) — logo, tabs, inputs, button
2. Lobby (create a room) — room code stamp, player list, start button
3. In-game — top bar (active player highlight, turn text, role pill), canvas, chat panel, controls bar, mobile tab bar (resize to narrow viewport)
4. Role reveal modal (first turn)
5. Voting panel (call a vote with 3 players)
6. Round-end / ready-up screen, including the 3-2-1 countdown

Confirm: no `bg-gray-*`/`text-gray-*`/`text-white` remnants, no brand colors besides player colors and the existing green/red win/role/role-pill semantics, dashed dividers and sticker shadows render correctly, Patrick Hand renders on headings only.

- [ ] **Step 3: Deploy**

```bash
git subtree push --prefix misdraw sccux-misdraw main
```

Expected: Vercel picks up the push and redeploys; confirm the live site at the production URL reflects the new styling.
