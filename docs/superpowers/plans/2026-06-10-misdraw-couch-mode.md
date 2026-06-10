# Misdraw Couch Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Couch Mode" room type where one device acts as a read-only shared TV display (drawings, chat, game status) while real players join and play from their own devices.

**Architecture:** Add a `mode` column to `rooms` (`'online' | 'couch'`). Couch rooms get a reserved code prefix (`C`) and never create a player row for the host — the absence of a stored `playerId` for that room is what makes a browser render the new `CouchHostView` instead of the normal lobby/game/round-end views. `CouchHostView` reuses existing data subscriptions from `GameRoom` and renders read-only variants of the lobby, in-round view (canvas + chat via the existing realtime broadcast channel), and round-end scoreboard. A new `isRoundTrigger` rule decides which client calls `startRound` (the TV in couch mode, the host player in online mode).

**Tech Stack:** Next.js (App Router, Server Actions), Supabase (Postgres + Realtime), TypeScript, Jest, `qrcode` npm package for client-side QR rendering.

---

## File Structure

- `supabase/migrations/004_couch_mode.sql` — new: adds `room_mode` enum + `rooms.mode` column.
- `lib/supabase/types.ts` — modify: add `RoomMode` type, `mode` field on `Room`.
- `lib/game/roomCode.ts` — new: `generateCode(mode)`, `isCouchCode(code)`.
- `__tests__/roomCode.test.ts` — new: tests for the above.
- `lib/game/roundTrigger.ts` — new: `isRoundTrigger(mode, currentPlayerId, hostPlayerId)`.
- `__tests__/roundTrigger.test.ts` — new: tests for the above.
- `actions/room.ts` — modify: `createRoom` takes a `mode` param, uses `generateCode`.
- `package.json` — modify: add `qrcode` + `@types/qrcode`.
- `components/game/QRCode.tsx` — new: thin client component wrapping `qrcode` to render a canvas.
- `components/home/HomeClient.tsx` — modify: add Online/Couch toggle, conditional nickname field, couch-code badge on join.
- `components/game/ChatPanel.tsx` — modify: add `readOnly` prop that hides the input row.
- `components/game/DrawingCanvas.tsx` — modify: add optional `showWaitingOverlay` prop (default `true`).
- `components/round/RoundEndView.tsx` — modify: rename `isHost` prop to `isRoundTrigger` (same usage, clearer name for couch mode).
- `components/couch/CouchLobby.tsx` — new: TV lobby (code, QR, player list, start button).
- `components/couch/CouchGameView.tsx` — new: TV in-round view (top bar, canvas, read-only chat, voting status).
- `components/couch/CouchRoundEnd.tsx` — new: TV round-end scoreboard (read-only).
- `components/couch/CouchHostView.tsx` — new: dispatcher choosing between the three above based on room/round status.
- `app/[code]/GameRoom.tsx` — modify: branch to `CouchHostView`, fix round-start trigger logic for couch mode, gate the trigger on `playerId` having loaded from localStorage.

---

### Task 1: Database migration for room mode

**Files:**
- Create: `supabase/migrations/004_couch_mode.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Couch mode: TV/spectator rooms where the host is not a player
create type room_mode as enum ('online', 'couch');

alter table rooms add column mode room_mode not null default 'online';
```

- [ ] **Step 2: Apply the migration locally**

Run: `npx supabase db reset` (or `npx supabase migration up` if a local Supabase instance is already running)
Expected: migration `004_couch_mode.sql` applies without error, `rooms` table now has a `mode` column.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/004_couch_mode.sql
git commit -m "feat: add room mode column for couch mode"
```

---

### Task 2: Update shared types

**Files:**
- Modify: `lib/supabase/types.ts`

- [ ] **Step 1: Add `RoomMode` type and `mode` field to `Room`**

In `lib/supabase/types.ts`, add the new type near the other type aliases at the top, and add `mode` to the `Room` interface:

```typescript
export type RoomStatus = 'lobby' | 'playing' | 'finished';
export type RoomMode = 'online' | 'couch';
export type RoundStatus = 'drawing' | 'voting' | 'finished';
```

```typescript
export interface Room {
  id: string;
  code: string;
  status: RoomStatus;
  mode: RoomMode;
  host_player_id: string | null;
  current_round_id: string | null;
  created_at: string;
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/supabase/types.ts
git commit -m "feat: add RoomMode type and Room.mode field"
```

---

### Task 3: Room code generation with couch prefix

**Files:**
- Create: `lib/game/roomCode.ts`
- Test: `__tests__/roomCode.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
import { generateCode, isCouchCode } from '@/lib/game/roomCode';

describe('generateCode', () => {
  it('generates 6-character uppercase codes', () => {
    for (let i = 0; i < 50; i++) {
      const code = generateCode('online');
      expect(code).toMatch(/^[A-Z0-9]{6}$/);
    }
  });

  it('online codes never start with the couch prefix', () => {
    for (let i = 0; i < 200; i++) {
      expect(generateCode('online')[0]).not.toBe('C');
    }
  });

  it('couch codes always start with the couch prefix', () => {
    for (let i = 0; i < 50; i++) {
      expect(generateCode('couch')[0]).toBe('C');
    }
  });

  it('couch codes are still 6 characters', () => {
    for (let i = 0; i < 50; i++) {
      expect(generateCode('couch')).toMatch(/^C[A-Z0-9]{5}$/);
    }
  });
});

describe('isCouchCode', () => {
  it('returns true for codes starting with C', () => {
    expect(isCouchCode('C7K2P9')).toBe(true);
    expect(isCouchCode('c7k2p9')).toBe(true);
  });

  it('returns false for codes not starting with C', () => {
    expect(isCouchCode('MX7K2P')).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest roomCode -v`
Expected: FAIL with "Cannot find module '@/lib/game/roomCode'"

- [ ] **Step 3: Implement `lib/game/roomCode.ts`**

```typescript
import type { RoomMode } from '@/lib/supabase/types';

const COUCH_PREFIX = 'C';

function randomChars(length: number): string {
  return Math.random().toString(36).substring(2, 2 + length).toUpperCase();
}

export function generateCode(mode: RoomMode): string {
  if (mode === 'couch') {
    return COUCH_PREFIX + randomChars(5);
  }

  let code = randomChars(6);
  while (code[0] === COUCH_PREFIX) {
    code = randomChars(6);
  }
  return code;
}

export function isCouchCode(code: string): boolean {
  return code.toUpperCase().startsWith(COUCH_PREFIX);
}
```

Note: `Math.random().toString(36).substring(2, 2 + length)` can occasionally produce fewer than `length` characters. If the test run is flaky on length, pad and slice:

```typescript
function randomChars(length: number): string {
  let result = '';
  while (result.length < length) {
    result += Math.random().toString(36).substring(2);
  }
  return result.slice(0, length).toUpperCase();
}
```

Use this padded version directly to avoid flakiness.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest roomCode -v`
Expected: PASS (all 6 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/game/roomCode.ts __tests__/roomCode.test.ts
git commit -m "feat: add mode-aware room code generation"
```

---

### Task 4: Round-trigger logic

**Files:**
- Create: `lib/game/roundTrigger.ts`
- Test: `__tests__/roundTrigger.test.ts`

This determines which connected client is responsible for calling `startRound` (initial round start, and the next round after the round-end ready countdown). In online mode it's the room's `host_player_id`. In couch mode there is no host player — it's the TV, identified by having no `currentPlayerId` (no player record for this browser).

- [ ] **Step 1: Write the failing tests**

```typescript
import { isRoundTrigger } from '@/lib/game/roundTrigger';

describe('isRoundTrigger', () => {
  it('online mode: true when currentPlayerId matches hostPlayerId', () => {
    expect(isRoundTrigger('online', 'p1', 'p1')).toBe(true);
  });

  it('online mode: false when currentPlayerId does not match hostPlayerId', () => {
    expect(isRoundTrigger('online', 'p2', 'p1')).toBe(false);
  });

  it('online mode: false when hostPlayerId is null', () => {
    expect(isRoundTrigger('online', 'p1', null)).toBe(false);
  });

  it('couch mode: true when currentPlayerId is empty (the TV)', () => {
    expect(isRoundTrigger('couch', '', null)).toBe(true);
  });

  it('couch mode: false when currentPlayerId is set (a player)', () => {
    expect(isRoundTrigger('couch', 'p1', null)).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest roundTrigger -v`
Expected: FAIL with "Cannot find module '@/lib/game/roundTrigger'"

- [ ] **Step 3: Implement `lib/game/roundTrigger.ts`**

```typescript
import type { RoomMode } from '@/lib/supabase/types';

export function isRoundTrigger(
  mode: RoomMode,
  currentPlayerId: string,
  hostPlayerId: string | null
): boolean {
  if (mode === 'couch') {
    return currentPlayerId === '';
  }
  return hostPlayerId !== null && currentPlayerId === hostPlayerId;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest roundTrigger -v`
Expected: PASS (all 5 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/game/roundTrigger.ts __tests__/roundTrigger.test.ts
git commit -m "feat: add round-trigger logic for couch mode"
```

---

### Task 5: `createRoom` supports couch mode

**Files:**
- Modify: `actions/room.ts`

- [ ] **Step 1: Update `createRoom`**

Replace the existing `generateCode` function and `createRoom` in `actions/room.ts`:

```typescript
'use server';

import { createClient } from '@/lib/supabase/server';
import { assignColor, PLAYER_COLORS } from '@/lib/game/colors';
import { generateCode } from '@/lib/game/roomCode';
import type { RoomMode } from '@/lib/supabase/types';

export async function createRoom(
  mode: RoomMode,
  nickname?: string
): Promise<{ code: string; playerId: string | null }> {
  const supabase = await createClient();
  const code = generateCode(mode);

  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .insert({ code, status: 'lobby', mode })
    .select()
    .single();

  if (roomError) throw new Error(roomError.message);

  if (mode === 'couch') {
    return { code, playerId: null };
  }

  if (!nickname) throw new Error('Nickname is required for online rooms');

  const { data: player, error: playerError } = await supabase
    .from('players')
    .insert({
      room_id: room.id,
      nickname,
      color: PLAYER_COLORS[0],
      score: 0,
      is_connected: true,
    })
    .select()
    .single();

  if (playerError) throw new Error(playerError.message);

  await supabase
    .from('rooms')
    .update({ host_player_id: player.id })
    .eq('id', room.id);

  return { code, playerId: player.id };
}
```

Leave `joinRoom`, `markConnected`, `setPlayerReady`, and `startGame` unchanged — only the `generateCode` function (now removed, replaced by the import) and `createRoom` signature change.

- [ ] **Step 2: Run the existing test suite to confirm nothing else broke**

Run: `npx jest -v`
Expected: PASS (existing suites unaffected; `createRoom` has no direct unit tests since it's a server action requiring a DB)

- [ ] **Step 3: Commit**

```bash
git add actions/room.ts
git commit -m "feat: createRoom supports couch mode"
```

---

### Task 6: QR code dependency and component

**Files:**
- Modify: `package.json`
- Create: `components/game/QRCode.tsx`

- [ ] **Step 1: Install dependencies**

Run: `npm install qrcode && npm install --save-dev @types/qrcode`
Expected: `qrcode` added to `dependencies`, `@types/qrcode` added to `devDependencies` in `package.json` and `package-lock.json`.

- [ ] **Step 2: Create the QR code component**

```typescript
'use client';

import { useEffect, useRef } from 'react';
import QRCodeLib from 'qrcode';

interface Props {
  value: string;
  size?: number;
}

export default function QRCode({ value, size = 200 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    QRCodeLib.toCanvas(canvasRef.current, value, {
      width: size,
      margin: 1,
      color: { dark: '#1a1a1a', light: '#f5f1e8' },
    }).catch(() => {});
  }, [value, size]);

  return <canvas ref={canvasRef} width={size} height={size} className="rounded-lg" />;
}
```

- [ ] **Step 3: Verify it builds**

Run: `npx tsc --noEmit`
Expected: no new type errors.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json components/game/QRCode.tsx
git commit -m "feat: add QRCode component using qrcode package"
```

---

### Task 7: Home screen mode toggle

**Files:**
- Modify: `components/home/HomeClient.tsx`

- [ ] **Step 1: Update `HomeClient`**

Replace the full file with:

```tsx
'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createRoom, joinRoom } from '@/actions/room';
import { isCouchCode } from '@/lib/game/roomCode';

export default function HomeClient() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [createMode, setCreateMode] = useState<'online' | 'couch'>('online');
  const [nickname, setNickname] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  async function handleCreate() {
    if (createMode === 'online' && !nickname.trim()) return setError('Enter a nickname');
    setError('');
    startTransition(async () => {
      try {
        const { code, playerId } = await createRoom(
          createMode,
          createMode === 'online' ? nickname.trim() : undefined
        );
        if (playerId) {
          localStorage.setItem(`misdraw_player_${code}`, playerId);
        }
        router.push(`/${code}`);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Something went wrong');
      }
    });
  }

  async function handleJoin() {
    if (!nickname.trim()) return setError('Enter a nickname');
    if (!code.trim()) return setError('Enter a room code');
    setError('');
    startTransition(async () => {
      try {
        const upperCode = code.trim().toUpperCase();
        const { playerId } = await joinRoom(upperCode, nickname.trim());
        localStorage.setItem(`misdraw_player_${upperCode}`, playerId);
        router.push(`/${upperCode}`);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Room not found');
      }
    });
  }

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

        {tab === 'create' && (
          <div className="flex mb-3 ink-panel p-1">
            <button
              onClick={() => setCreateMode('online')}
              className={`flex-1 py-2 rounded-md text-sm font-hand transition-colors ${
                createMode === 'online' ? 'border-2 border-ink text-ink' : 'text-ink-muted hover:text-ink'
              }`}
            >
              Online
            </button>
            <button
              onClick={() => setCreateMode('couch')}
              className={`flex-1 py-2 rounded-md text-sm font-hand transition-colors ${
                createMode === 'couch' ? 'border-2 border-ink text-ink' : 'text-ink-muted hover:text-ink'
              }`}
            >
              Couch Mode
            </button>
          </div>
        )}

        {tab === 'create' && createMode === 'couch' && (
          <p className="text-ink-muted text-xs text-center mb-3">
            This device becomes the shared screen. Players join from their own phones.
          </p>
        )}

        <div className="space-y-3">
          {(tab === 'join' || (tab === 'create' && createMode === 'online')) && (
            <input
              type="text"
              placeholder="Your nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={20}
              className="w-full bg-panel text-ink rounded-lg px-4 py-3 outline-none border border-ink-muted focus:border-ink placeholder:text-ink-muted"
            />
          )}

          {tab === 'join' && (
            <>
              <input
                type="text"
                placeholder="Room code (e.g. MX7K2P)"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                maxLength={6}
                className="w-full bg-panel text-ink rounded-lg px-4 py-3 outline-none border border-ink-muted focus:border-ink placeholder:text-ink-muted font-mono tracking-widest"
              />
              {code.length === 6 && isCouchCode(code) && (
                <p className="text-ink-muted text-xs text-center">
                  🛋️ Couch Mode room — your role and word will appear on this device.
                </p>
              )}
            </>
          )}

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            onClick={tab === 'create' ? handleCreate : handleJoin}
            disabled={isPending}
            className="w-full border-2 border-ink rounded-lg text-ink font-semibold py-3 hover:bg-ink/10 transition-colors disabled:border-ink-muted disabled:text-ink-muted disabled:cursor-not-allowed"
          >
            {isPending
              ? 'Loading...'
              : tab === 'create'
              ? createMode === 'couch'
                ? 'Create Couch Room'
                : 'Create Room'
              : 'Join Room'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run lint**

Run: `npx eslint components/home/HomeClient.tsx`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/home/HomeClient.tsx
git commit -m "feat: add online/couch mode toggle to home screen"
```

---

### Task 8: ChatPanel read-only mode

**Files:**
- Modify: `components/game/ChatPanel.tsx`

- [ ] **Step 1: Add `readOnly` prop**

In `components/game/ChatPanel.tsx`, add `readOnly` to `Props` and the function signature:

```typescript
interface Props {
  messages: ChatMessage[];
  systemMessages: SystemMessage[];
  onSend: (text: string) => void;
  isDeadPlayer: boolean;
  voting?: VotingPanelProps | null;
  readOnly?: boolean;
}
```

```typescript
export default function ChatPanel({ messages, systemMessages, onSend, isDeadPlayer, voting, readOnly }: Props) {
```

Then wrap the input row (the `<div className="p-2 ink-divider flex gap-2 flex-shrink-0">...</div>` block at the bottom) so it only renders when `!readOnly`:

```tsx
      {!readOnly && (
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
      )}
```

- [ ] **Step 2: Run lint**

Run: `npx eslint components/game/ChatPanel.tsx`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/game/ChatPanel.tsx
git commit -m "feat: add read-only mode to ChatPanel"
```

---

### Task 9: DrawingCanvas optional waiting overlay

**Files:**
- Modify: `components/game/DrawingCanvas.tsx`

- [ ] **Step 1: Add `showWaitingOverlay` prop**

Add to `Props`:

```typescript
interface Props {
  isMyTurn: boolean;
  myPlayerId: string;
  myColor: string;
  frozen: boolean;
  onStrokePoint: (point: StrokePoint) => void;
  onStrokeEnd: () => void;
  showWaitingOverlay?: boolean;
}
```

Update the component signature's destructuring (the `forwardRef` callback parameters):

```typescript
const DrawingCanvas = forwardRef<DrawingCanvasHandle, Props>(function DrawingCanvas(
  { isMyTurn, myPlayerId, myColor, frozen, onStrokePoint, onStrokeEnd, showWaitingOverlay = true },
  ref
) {
```

Update the overlay condition near the bottom:

```tsx
      {!isMyTurn && showWaitingOverlay && (
        <div className="absolute inset-0 flex items-end justify-center pb-4 pointer-events-none">
          <span className="text-ink-muted text-sm bg-paper/70 border border-ink-muted px-3 py-1 rounded-full">
            waiting for your turn...
          </span>
        </div>
      )}
```

- [ ] **Step 2: Run lint**

Run: `npx eslint components/game/DrawingCanvas.tsx`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/game/DrawingCanvas.tsx
git commit -m "feat: add optional waiting overlay toggle to DrawingCanvas"
```

---

### Task 10: Rename RoundEndView's `isHost` to `isRoundTrigger`

**Files:**
- Modify: `components/round/RoundEndView.tsx`

- [ ] **Step 1: Rename the prop**

In `components/round/RoundEndView.tsx`, in the `Props` interface, rename `isHost: boolean;` to `isRoundTrigger: boolean;`.

In the component's destructured parameters, rename `isHost` to `isRoundTrigger`.

In the effect that triggers the next round:

```typescript
  // Once the countdown reaches 0, the round trigger starts the next round
  useEffect(() => {
    if (countdown === 0 && !startedRef.current && isRoundTrigger) {
      startedRef.current = true;
      startTransition(async () => {
        await startRound(roomId);
      });
    }
  }, [countdown, isRoundTrigger, roomId]);
```

- [ ] **Step 2: Run lint**

Run: `npx eslint components/round/RoundEndView.tsx`
Expected: error referencing `isHost` not provided where `RoundEndView` is used (in `GameRoom.tsx`) — this is expected and fixed in Task 12.

- [ ] **Step 3: Commit**

```bash
git add components/round/RoundEndView.tsx
git commit -m "refactor: rename RoundEndView isHost prop to isRoundTrigger"
```

---

### Task 11: Couch host view components

**Files:**
- Create: `components/couch/CouchLobby.tsx`
- Create: `components/couch/CouchGameView.tsx`
- Create: `components/couch/CouchRoundEnd.tsx`
- Create: `components/couch/CouchHostView.tsx`

- [ ] **Step 1: Create `CouchLobby.tsx`**

```tsx
'use client';

import { useState, useTransition } from 'react';
import { startGame } from '@/actions/room';
import QRCode from '@/components/game/QRCode';
import type { Player, Room } from '@/lib/supabase/types';

interface Props {
  room: Room;
  players: Player[];
}

export default function CouchLobby({ room, players }: Props) {
  const [isPending, startTransition] = useTransition();
  const [joinUrl, setJoinUrl] = useState('');
  const connectedPlayers = players.filter((p) => p.is_connected);

  if (typeof window !== 'undefined' && !joinUrl) {
    setJoinUrl(`${window.location.origin}/${room.code}`);
  }

  function handleStart() {
    startTransition(async () => {
      await startGame(room.id);
    });
  }

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center p-4">
      <div className="w-full max-w-2xl grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        <div className="text-center">
          <h1 className="font-hand text-5xl text-ink mb-2">misdraw</h1>
          <p className="text-ink-muted mb-6 text-sm">🛋️ Couch Mode — scan or enter the code to join</p>

          <div className="ink-panel p-6 mb-4">
            <p className="text-ink-muted text-sm mb-2">Room Code</p>
            <p className="font-hand text-4xl text-ink tracking-widest">{room.code}</p>
          </div>

          {joinUrl && (
            <div className="flex justify-center mb-4">
              <QRCode value={joinUrl} size={200} />
            </div>
          )}

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

        <div className="ink-panel p-4">
          <p className="text-ink-muted text-sm mb-3">
            Players ({connectedPlayers.length}/10)
          </p>
          <div className="space-y-2">
            {connectedPlayers.map((p) => (
              <div key={p.id} className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                <span className="font-medium" style={{ color: p.color }}>{p.nickname}</span>
              </div>
            ))}
            {connectedPlayers.length === 0 && (
              <p className="text-ink-muted text-sm">Waiting for players to join...</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `CouchGameView.tsx`**

This mirrors the read-only parts of `GameView`: top bar (no role pill), canvas fed by realtime broadcasts, read-only chat, and a simple voting status panel.

```tsx
'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import DrawingCanvas from '@/components/game/DrawingCanvas';
import type { DrawingCanvasHandle } from '@/components/game/DrawingCanvas';
import ChatPanel from '@/components/game/ChatPanel';
import type { SystemMessage } from '@/components/game/ChatPanel';
import PlayerTopBar from '@/components/game/PlayerTopBar';
import { useGameChannel } from '@/hooks/useGameChannel';
import type { StrokePoint, ChatMessage } from '@/hooks/useGameChannel';
import type { Player, Round, RoundPlayer, Vote, VoteSession } from '@/lib/supabase/types';

export interface VoteResult {
  id: string;
  killed_player_id: string | null;
}

interface Props {
  room: { id: string; code: string };
  round: Round;
  roundPlayers: RoundPlayer[];
  players: Player[];
  activeVoteSession: VoteSession | null;
  votes: Vote[];
  voteResult: VoteResult | null;
}

export default function CouchGameView({
  room,
  round,
  roundPlayers,
  players,
  activeVoteSession,
  votes,
  voteResult,
}: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [systemMessages, setSystemMessages] = useState<SystemMessage[]>([]);
  const canvasRef = useRef<DrawingCanvasHandle>(null);

  useEffect(() => {
    if (!voteResult) return;
    const killedPlayer = voteResult.killed_player_id
      ? players.find((p) => p.id === voteResult.killed_player_id)
      : null;
    const text = killedPlayer
      ? `⚖️ ${killedPlayer.nickname} was voted out!`
      : '⚖️ No majority — game continues.';
    setSystemMessages((prev) => [...prev, { id: voteResult.id, text }]);
  }, [voteResult?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useGameChannel({
    roomCode: room.code,
    onStrokePoint: useCallback((point: StrokePoint) => {
      canvasRef.current?.drawRemotePoint(point);
    }, []),
    onStrokeEnd: useCallback((playerId: string) => {
      canvasRef.current?.endRemoteStroke(playerId);
    }, []),
    onChatMessage: useCallback((msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
    }, []),
  });

  const playerMap = Object.fromEntries(players.map((p) => [p.id, p]));
  const aliveRoundPlayers = roundPlayers.filter((rp) => rp.is_alive);
  const aliveArtists = aliveRoundPlayers.filter((rp) => rp.role === 'artist').length;
  const aliveImposters = aliveRoundPlayers.filter((rp) => rp.role === 'imposter').length;
  const currentDrawer = players.find((p) => p.id === round.current_turn_player_id);
  const frozen = round.status === 'voting';

  const alivePlayers = aliveRoundPlayers
    .map((rp) => playerMap[rp.player_id])
    .filter(Boolean);
  const voterIds = votes.map((v) => v.voter_id);

  return (
    <div className="h-screen bg-paper flex flex-col gap-2 p-2 overflow-hidden">
      <PlayerTopBar
        players={players}
        roundPlayers={roundPlayers}
        currentTurnPlayerId={round.current_turn_player_id}
        roundNumber={round.round_number}
        aliveArtists={aliveArtists}
        aliveImposters={aliveImposters}
        canDraw={false}
        turnEnded={false}
        isMyTurn={false}
        frozen={frozen}
        currentDrawerName={currentDrawer?.nickname ?? ''}
        myRole={undefined}
        myWord={null}
      />

      <div className="flex gap-2 flex-1 min-h-0">
        <div className="relative min-w-0 flex flex-1 flex-col">
          <DrawingCanvas
            ref={canvasRef}
            isMyTurn={false}
            myPlayerId=""
            myColor="#000000"
            frozen={frozen}
            onStrokePoint={() => {}}
            onStrokeEnd={() => {}}
            showWaitingOverlay={false}
          />
        </div>

        <div className="flex flex-col w-64 flex-shrink-0">
          <ChatPanel
            messages={messages}
            systemMessages={systemMessages}
            onSend={() => {}}
            isDeadPlayer={true}
            voting={null}
            readOnly
          />
        </div>
      </div>

      {round.status === 'voting' && activeVoteSession && (
        <div className="ink-panel p-3 flex-shrink-0">
          <p className="text-ink-muted text-sm mb-2">⚖️ Voting in progress</p>
          <div className="flex flex-wrap gap-2">
            {alivePlayers.map((p) => (
              <span
                key={p.id}
                className={`text-xs px-2 py-1 rounded-full border ${
                  voterIds.includes(p.id) ? 'border-ink text-ink' : 'border-ink-muted text-ink-muted'
                }`}
              >
                {p.nickname} {voterIds.includes(p.id) ? '✓' : '...'}
              </span>
            ))}
          </div>
          <p className="text-ink-muted text-xs mt-2">{voterIds.length}/{alivePlayers.length} voted</p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create `CouchRoundEnd.tsx`**

Read-only version of the round-end scoreboard, with a "waiting for players" message instead of a ready toggle.

```tsx
'use client';

interface PlayerScore {
  id: string;
  nickname: string;
  color: string;
  score: number;
  scoreDelta: number;
}

interface Props {
  winner: 'artists' | 'imposters';
  scores: PlayerScore[];
  roundWord: string;
}

export default function CouchRoundEnd({ winner, scores, roundWord }: Props) {
  const sorted = [...scores].sort((a, b) => b.score - a.score);

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
            <div key={p.id} className="flex items-center px-4 py-3 ink-divider last:border-0">
              <span className="text-ink-muted text-sm w-6">{i + 1}</span>
              <span className="flex-1 font-medium" style={{ color: p.color }}>{p.nickname}</span>
              <div className="flex items-center gap-2">
                {p.scoreDelta > 0 && <span className="text-green-400 text-sm">+{p.scoreDelta}</span>}
                <span className="text-ink font-bold">{p.score}</span>
              </div>
            </div>
          ))}
        </div>

        <p className="text-ink-muted text-sm text-center">Waiting for players to ready up...</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create `CouchHostView.tsx`**

Dispatches between the three views based on room/round status, mirroring `GameRoom`'s player-side branching.

```tsx
'use client';

import CouchLobby from './CouchLobby';
import CouchGameView from './CouchGameView';
import type { VoteResult } from './CouchGameView';
import CouchRoundEnd from './CouchRoundEnd';
import type { Player, Room, Round, RoundPlayer, Vote, VoteSession } from '@/lib/supabase/types';

interface Props {
  room: Room;
  players: Player[];
  round: Round | null;
  roundPlayers: RoundPlayer[];
  activeVoteSession: VoteSession | null;
  votes: Vote[];
  voteResult: VoteResult | null;
  prevScores: Record<string, number>;
}

export default function CouchHostView({
  room,
  players,
  round,
  roundPlayers,
  activeVoteSession,
  votes,
  voteResult,
  prevScores,
}: Props) {
  if (room.status === 'lobby') {
    return <CouchLobby room={room} players={players} />;
  }

  if (round?.status === 'finished' && round.winner) {
    const scores = players.map((p) => ({
      id: p.id,
      nickname: p.nickname,
      color: p.color,
      score: p.score,
      scoreDelta: p.score - (prevScores[p.id] ?? p.score),
    }));
    return <CouchRoundEnd winner={round.winner} scores={scores} roundWord={round.word} />;
  }

  if (!round || roundPlayers.length === 0) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <p className="text-ink-muted">Starting round...</p>
      </div>
    );
  }

  return (
    <CouchGameView
      room={{ id: room.id, code: room.code }}
      round={round}
      roundPlayers={roundPlayers}
      players={players}
      activeVoteSession={activeVoteSession}
      votes={votes}
      voteResult={voteResult}
    />
  );
}
```

- [ ] **Step 5: Run lint and type-check**

Run: `npx eslint components/couch && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add components/couch
git commit -m "feat: add couch mode TV host views"
```

---

### Task 12: Wire CouchHostView into GameRoom and fix round-trigger logic

**Files:**
- Modify: `app/[code]/GameRoom.tsx`

This task: (a) tracks whether the localStorage `playerId` lookup has completed, (b) replaces the host-only round-start trigger with `isRoundTrigger`, (c) renders `CouchHostView` when the room is couch mode and this browser has no player, (d) passes `isRoundTrigger` to `RoundEndView`.

- [ ] **Step 1: Add a `playerIdLoaded` flag and import new helpers**

At the top of `app/[code]/GameRoom.tsx`, add the import:

```typescript
import { isRoundTrigger } from '@/lib/game/roundTrigger';
import CouchHostView from '@/components/couch/CouchHostView';
```

In the component, add a new state next to the other `useState` declarations:

```typescript
  const [playerIdLoaded, setPlayerIdLoaded] = useState(false);
```

Update the localStorage-reading effect to set it:

```typescript
  // Read player ID from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(`misdraw_player_${initialRoom.code}`);
    if (stored) {
      currentPlayerIdRef.current = stored;
      setCurrentPlayerId(stored);
    }
    setPlayerIdLoaded(true);
  }, [initialRoom.code]);
```

- [ ] **Step 2: Replace the round-start trigger condition**

Find the `rooms` postgres_changes handler inside the "Room + players subscription" effect:

```typescript
        async (payload) => {
          const updated = payload.new as Room;
          // Only the host's client starts the round (prevents multi-client race)
          if (
            updated.status === 'playing' &&
            !roundStartedRef.current &&
            currentPlayerIdRef.current === updated.host_player_id
          ) {
            roundStartedRef.current = true;
            await startRound(room.id);
          }
          setRoom(updated);
        }
```

Replace the condition with one that uses `isRoundTrigger` and waits for `playerIdLoaded`:

```typescript
        async (payload) => {
          const updated = payload.new as Room;
          // Only the round-trigger client starts the round (prevents multi-client race)
          if (
            updated.status === 'playing' &&
            !roundStartedRef.current &&
            playerIdLoaded &&
            isRoundTrigger(updated.mode, currentPlayerIdRef.current, updated.host_player_id)
          ) {
            roundStartedRef.current = true;
            await startRound(room.id);
          }
          setRoom(updated);
        }
```

Add `playerIdLoaded` to this effect's dependency array (it currently depends on `[room.id]`):

```typescript
  }, [room.id, playerIdLoaded]);
```

- [ ] **Step 3: Render `CouchHostView` for the TV browser**

After the existing early returns (`if (!currentPlayerId) { ... }` and `if (room.status === 'lobby') { ... }`), but the TV needs to be detected *before* the `lobby` early-return short-circuits to `LobbyView`. Restructure the top of the render logic:

Find:

```typescript
  if (!currentPlayerId) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (room.status === 'lobby') {
    return <LobbyView room={room} players={players} currentPlayerId={currentPlayerId} />;
  }
```

Replace with:

```typescript
  if (!playerIdLoaded) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  const isCouchHost = room.mode === 'couch' && !currentPlayerId;

  if (isCouchHost) {
    return (
      <CouchHostView
        room={room}
        players={players}
        round={round}
        roundPlayers={roundPlayers}
        activeVoteSession={activeVoteSession}
        votes={votes}
        voteResult={voteResult}
        prevScores={prevScores}
      />
    );
  }

  if (room.status === 'lobby') {
    return <LobbyView room={room} players={players} currentPlayerId={currentPlayerId} />;
  }
```

- [ ] **Step 4: Update the `RoundEndView` usage**

Find:

```typescript
    return (
      <RoundEndView
        winner={round.winner}
        scores={scores}
        roomId={room.id}
        roundWord={round.word}
        players={players.filter((p) => p.is_connected)}
        currentPlayerId={currentPlayerId}
        isHost={currentPlayerId === room.host_player_id}
      />
    );
```

Replace `isHost` with:

```typescript
        isRoundTrigger={isRoundTrigger(room.mode, currentPlayerId, room.host_player_id)}
```

- [ ] **Step 5: Type-check and lint**

Run: `npx tsc --noEmit && npx eslint app/\[code\]/GameRoom.tsx`
Expected: no errors.

- [ ] **Step 6: Run full test suite**

Run: `npx jest -v`
Expected: PASS (all suites including the new `roomCode` and `roundTrigger` tests).

- [ ] **Step 7: Commit**

```bash
git add app/[code]/GameRoom.tsx
git commit -m "feat: wire couch host view and fix round-trigger logic"
```

---

### Task 13: Manual end-to-end verification

**Files:** none (manual testing only)

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`
Expected: server starts on `http://localhost:3000`.

- [ ] **Step 2: Create a couch room**

In a browser, go to `http://localhost:3000`, select "Couch Mode", click "Create Couch Room".
Expected: redirected to `/CXXXXX` (code starts with `C`), shows the TV lobby with room code, QR code, and "Waiting for players to join...".

- [ ] **Step 3: Join from 3 separate browser sessions (or incognito windows)**

For each: go to `http://localhost:3000`, "Join Room" tab, enter the couch code and a nickname.
Expected: each shows the "Couch Mode room" badge while typing the code; after joining, the TV lobby's player list updates live to show all 3 players; each player's own browser shows the normal `LobbyView` (with its own Start Game button).

- [ ] **Step 4: Start the game**

Click "Start Game" from the TV (or any player).
Expected: TV transitions to the in-round view (top bar with no role pill, canvas, read-only chat, no controls bar). Each player's browser shows their `RoleReveal` with role/word — this should NOT appear on the TV.

- [ ] **Step 5: Play a turn and verify live sync**

Have the active player draw a stroke and send a chat message.
Expected: the stroke and chat message appear on the TV in real time. The TV chat panel has no input box.

- [ ] **Step 6: Trigger voting and round end**

Initiate a vote from a player, vote with all players, and let the round resolve.
Expected: TV shows the voting status panel with live vote counts, then the round-end scoreboard (read-only, no ready button). When all players ready up, the next round starts automatically (triggered by the TV).

- [ ] **Step 7: Verify online mode still works unchanged**

Repeat steps 2-6 with "Online" mode from the home screen (creator joins as a player).
Expected: behavior identical to before this change — host player triggers round starts, normal lobby/game/round-end views for all players, no couch-specific UI appears.
