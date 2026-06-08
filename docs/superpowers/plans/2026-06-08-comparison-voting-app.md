# Comparison Voting App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a dark-mode web app ("versus") where users create image comparisons, share voting links, and earn/spend tokens on a public feed.

**Architecture:** Next.js App Router with server-rendered vote pages for fast loads and Open Graph previews. Supabase handles auth, database, image storage, and realtime-ready vote counts. Business logic (votes, tokens) lives in server-side lib functions called from API routes and Server Actions. The shareable slug is generated server-side; image upload paths use a client-generated UUID.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Tailwind CSS (dark mode via `class`), Supabase (PostgreSQL + Auth + Storage), nanoid, Jest, Vercel

---

## File Map

```
versus/
├── app/
│   ├── layout.tsx                  # Root layout — dark mode, nav
│   ├── globals.css
│   ├── page.tsx                    # / — Landing
│   ├── login/
│   │   └── page.tsx                # /login — Email + Google auth
│   ├── feed/
│   │   └── page.tsx                # /feed — Public comparisons feed
│   ├── create/
│   │   ├── page.tsx                # /create — Upload form
│   │   └── actions.ts              # Server action: create comparison
│   ├── c/
│   │   └── [slug]/
│   │       └── page.tsx            # /c/[slug] — Server-rendered vote page + OG
│   ├── dashboard/
│   │   └── page.tsx                # /dashboard — Creator stats + token balance
│   └── api/
│       ├── vote/
│       │   └── route.ts            # POST /api/vote
│       └── auth/
│           └── callback/
│               └── route.ts        # OAuth callback
├── components/
│   ├── VoteCard.tsx                # Full-page voting UI (client)
│   ├── FeedCard.tsx                # Feed list item with inline voting (client)
│   ├── ComparisonForm.tsx          # Create comparison form (client)
│   ├── CopyLink.tsx                # Copy shareable link button (client)
│   └── TokenBadge.tsx             # Token balance display
├── lib/
│   ├── supabase/
│   │   ├── client.ts               # Browser Supabase client
│   │   └── server.ts               # Server + service role clients
│   ├── comparisons.ts              # Comparison CRUD (server-only)
│   ├── votes.ts                    # Vote recording + counts (server-only)
│   ├── tokens.ts                   # Token earn/spend logic (server-only)
│   └── upload.ts                   # Image upload to Supabase Storage (browser)
├── types/
│   └── index.ts                    # Shared TypeScript types
├── middleware.ts                    # Auth route protection
├── __tests__/
│   ├── tokens.test.ts
│   └── votes.test.ts
└── supabase/
    └── migrations/
        └── 001_initial.sql
```

---

## Task 1: Project Scaffold + Tailwind Dark Mode

**Files:**
- Create: `versus/` (new Next.js project at repo root)
- Modify: `versus/tailwind.config.ts`
- Modify: `versus/app/layout.tsx`
- Modify: `versus/app/globals.css`
- Modify: `versus/package.json`

- [ ] **Step 1: Scaffold project**

From `/Users/stefancc/Desktop/CrowsClaude`:
```bash
npx create-next-app@latest versus \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --no-src-dir \
  --import-alias "@/*"
```

- [ ] **Step 2: Install dependencies**

```bash
cd versus
npm install @supabase/supabase-js @supabase/ssr nanoid
npm install --save-dev jest @types/jest jest-environment-node ts-jest
```

- [ ] **Step 3: Configure Tailwind dark mode**

Replace `versus/tailwind.config.ts`:
```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: { extend: {} },
  plugins: [],
}
export default config
```

- [ ] **Step 4: Configure Jest**

Add to `versus/package.json` (merge into the root JSON object):
```json
"jest": {
  "testEnvironment": "node",
  "transform": {
    "^.+\\.tsx?$": ["ts-jest", { "tsconfig": { "module": "commonjs" } }]
  },
  "moduleNameMapper": {
    "^@/(.*)$": "<rootDir>/$1"
  }
}
```

Add `"test": "jest"` to the `scripts` section.

- [ ] **Step 5: Replace root layout**

Replace `versus/app/layout.tsx`:
```tsx
import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import Link from 'next/link'
import './globals.css'

const geist = Geist({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Versus — Pick a side',
  description: 'Create image comparisons and let the internet decide',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${geist.className} bg-gray-950 text-white min-h-screen`}>
        <nav className="fixed top-0 left-0 right-0 z-50 border-b border-gray-900 bg-gray-950/80 backdrop-blur-sm">
          <div className="max-w-xl mx-auto px-4 h-14 flex items-center justify-between">
            <Link href="/" className="font-black text-white tracking-tight">versus</Link>
            <div className="flex items-center gap-4">
              <Link href="/feed" className="text-gray-400 hover:text-white text-sm transition-colors">Feed</Link>
              <Link href="/create" className="bg-white text-gray-900 font-semibold text-sm px-4 py-1.5 rounded-lg hover:bg-gray-100 transition-colors">Create</Link>
              <Link href="/dashboard" className="text-gray-400 hover:text-white text-sm transition-colors">Dashboard</Link>
            </div>
          </div>
        </nav>
        <div className="pt-14">{children}</div>
      </body>
    </html>
  )
}
```

- [ ] **Step 6: Replace globals.css**

Replace `versus/app/globals.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 7: Verify dev server**

```bash
npm run dev
```
Expected: Server starts on `http://localhost:3000` with a dark background.

- [ ] **Step 8: Commit**

```bash
git add versus/
git commit -m "feat: scaffold versus app with Next.js + Tailwind dark mode"
```

---

## Task 2: Environment Variables

**Files:**
- Create: `versus/.env.local`
- Create: `versus/.env.example`

- [ ] **Step 1: Create a Supabase project**

Go to https://supabase.com → New project. Collect:
- Project URL (e.g. `https://xxx.supabase.co`)
- Anon public key (Settings → API)
- Service role secret key (Settings → API)

- [ ] **Step 2: Create `.env.local`**

Create `versus/.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

- [ ] **Step 3: Create `.env.example`**

Create `versus/.env.example`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_BASE_URL=
```

- [ ] **Step 4: Confirm `.env.local` is gitignored**

`create-next-app` adds `.env.local` to `.gitignore` by default — verify it's there.

- [ ] **Step 5: Commit**

```bash
git add versus/.env.example
git commit -m "feat: add env config for Supabase"
```

---

## Task 3: Database Schema + Triggers

**Files:**
- Create: `versus/supabase/migrations/001_initial.sql`

- [ ] **Step 1: Write migration**

Create `versus/supabase/migrations/001_initial.sql`:
```sql
create extension if not exists "uuid-ossp";

create table public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  display_name text,
  avatar_url text,
  token_balance int not null default 0,
  vote_count int not null default 0,
  created_at timestamptz not null default now()
);

create table public.comparisons (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  creator_id uuid references public.users(id) on delete cascade not null,
  question text not null,
  image_a_url text not null,
  image_b_url text not null,
  is_public boolean not null default false,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  constraint status_check check (status in ('active', 'closed'))
);

create table public.votes (
  id uuid primary key default uuid_generate_v4(),
  comparison_id uuid references public.comparisons(id) on delete cascade not null,
  voter_id uuid references public.users(id) on delete set null,
  choice text not null,
  voted_at timestamptz not null default now(),
  constraint choice_check check (choice in ('a', 'b')),
  unique(comparison_id, voter_id)
);

create table public.token_transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade not null,
  amount int not null,
  reason text not null,
  reference_id uuid,
  created_at timestamptz not null default now(),
  constraint reason_check check (reason in ('signup_bonus', 'voted', 'post_to_feed'))
);

create index on public.comparisons (slug);
create index on public.comparisons (creator_id);
create index on public.comparisons (is_public, created_at desc) where is_public = true;
create index on public.votes (comparison_id);
create index on public.token_transactions (user_id);

alter table public.users enable row level security;
alter table public.comparisons enable row level security;
alter table public.votes enable row level security;
alter table public.token_transactions enable row level security;

create policy "Users can read own profile"
  on public.users for select using (auth.uid() = id);
create policy "Users can update own profile"
  on public.users for update using (auth.uid() = id);

-- All comparisons are readable — links are designed to be shared publicly
create policy "Anyone can read comparisons"
  on public.comparisons for select using (true);
create policy "Authenticated users can insert comparisons"
  on public.comparisons for insert with check (auth.uid() = creator_id);
create policy "Creators can update own comparisons"
  on public.comparisons for update using (auth.uid() = creator_id);

create policy "Anyone can read votes"
  on public.votes for select using (true);
create policy "Anyone can insert votes"
  on public.votes for insert with check (true);

create policy "Users can read own transactions"
  on public.token_transactions for select using (auth.uid() = user_id);

-- Auto-create user profile and award signup bonus when auth user is created
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  );
  insert into public.token_transactions (user_id, amount, reason)
  values (new.id, 5, 'signup_bonus');
  update public.users set token_balance = 5 where id = new.id;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

- [ ] **Step 2: Run migration in Supabase**

Supabase dashboard → SQL Editor → paste `001_initial.sql` contents → Run.

Expected: All tables created, no errors.

- [ ] **Step 3: Create storage bucket**

Supabase dashboard → Storage → New bucket:
- Name: `comparison-images`
- Public: ✅ (images must be viewable by anyone with a link)

- [ ] **Step 4: Commit**

```bash
git add versus/supabase/
git commit -m "feat: add database schema with RLS, triggers, and storage bucket"
```

---

## Task 4: TypeScript Types

**Files:**
- Create: `versus/types/index.ts`

- [ ] **Step 1: Write types**

Create `versus/types/index.ts`:
```typescript
export type User = {
  id: string
  email: string
  display_name: string | null
  avatar_url: string | null
  token_balance: number
  vote_count: number
  created_at: string
}

export type Comparison = {
  id: string
  slug: string
  creator_id: string
  question: string
  image_a_url: string
  image_b_url: string
  is_public: boolean
  status: 'active' | 'closed'
  created_at: string
}

export type Vote = {
  id: string
  comparison_id: string
  voter_id: string | null
  choice: 'a' | 'b'
  voted_at: string
}

export type TokenTransaction = {
  id: string
  user_id: string
  amount: number
  reason: 'signup_bonus' | 'voted' | 'post_to_feed'
  reference_id: string | null
  created_at: string
}

export type VoteCounts = { a: number; b: number }
```

- [ ] **Step 2: Commit**

```bash
git add versus/types/
git commit -m "feat: add shared TypeScript types"
```

---

## Task 5: Supabase Clients + Auth Middleware

**Files:**
- Create: `versus/lib/supabase/client.ts`
- Create: `versus/lib/supabase/server.ts`
- Create: `versus/middleware.ts`

- [ ] **Step 1: Write browser client**

Create `versus/lib/supabase/client.ts`:
```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 2: Write server clients**

Create `versus/lib/supabase/server.ts`:
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}

// Bypasses RLS — use only in Server Actions and API routes for privileged ops
export function createServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )
}
```

- [ ] **Step 3: Write auth middleware**

Create `versus/middleware.ts`:
```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const protectedRoutes = ['/create', '/dashboard']
  const isProtected = protectedRoutes.some(r => request.nextUrl.pathname.startsWith(r))

  if (isProtected && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
```

- [ ] **Step 4: Commit**

```bash
git add versus/lib/supabase/ versus/middleware.ts
git commit -m "feat: add Supabase clients and auth middleware"
```

---

## Task 6: Auth — Login Page + OAuth Callback

**Files:**
- Create: `versus/app/api/auth/callback/route.ts`
- Create: `versus/app/login/page.tsx`

- [ ] **Step 1: Write OAuth callback route**

Create `versus/app/api/auth/callback/route.ts`:
```typescript
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    await supabase.auth.exchangeCodeForSession(code)
  }

  return NextResponse.redirect(`${origin}${next}`)
}
```

- [ ] **Step 2: Write login page**

Create `versus/app/login/page.tsx`:
```tsx
'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await (mode === 'signin'
      ? supabase.auth.signInWithPassword({ email, password })
      : supabase.auth.signUp({ email, password }))
    if (error) { setError(error.message); setLoading(false); return }
    router.push('/create')
  }

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/api/auth/callback?next=/create` },
    })
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-white mb-8 text-center">
          {mode === 'signin' ? 'Sign in' : 'Create account'}
        </h1>

        <button
          onClick={handleGoogle}
          className="w-full bg-white text-gray-900 font-medium py-3 rounded-xl mb-6 hover:bg-gray-100 transition-colors"
        >
          Continue with Google
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-gray-800" />
          <span className="text-gray-500 text-sm">or</span>
          <div className="flex-1 h-px bg-gray-800" />
        </div>

        <form onSubmit={handleEmail} className="flex flex-col gap-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="bg-gray-900 border border-gray-800 text-white rounded-xl px-4 py-3 placeholder-gray-500 focus:outline-none focus:border-gray-600"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className="bg-gray-900 border border-gray-800 text-white rounded-xl px-4 py-3 placeholder-gray-500 focus:outline-none focus:border-gray-600"
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="bg-white text-gray-900 font-medium py-3 rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            {loading ? 'Loading...' : mode === 'signin' ? 'Sign in' : 'Sign up'}
          </button>
        </form>

        <button
          onClick={() => setMode(m => m === 'signin' ? 'signup' : 'signin')}
          className="w-full text-gray-500 text-sm mt-4 hover:text-gray-300"
        >
          {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </button>
      </div>
    </main>
  )
}
```

- [ ] **Step 3: Enable Google OAuth in Supabase**

Supabase dashboard → Authentication → Providers → Google:
- Enable Google provider
- Add your Google OAuth Client ID and Secret (from console.cloud.google.com)
- Add `https://your-project.supabase.co/auth/v1/callback` to Google's authorized redirect URIs

- [ ] **Step 4: Commit**

```bash
git add versus/app/login/ versus/app/api/auth/
git commit -m "feat: add login page with email and Google OAuth"
```

---

## Task 7: Library — Comparisons

**Files:**
- Create: `versus/lib/comparisons.ts`

- [ ] **Step 1: Write comparisons library**

Create `versus/lib/comparisons.ts`:
```typescript
import { createServiceClient } from './supabase/server'
import { customAlphabet } from 'nanoid'
import type { Comparison } from '@/types'

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 8)

export async function getComparisonBySlug(slug: string): Promise<Comparison | null> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('comparisons')
    .select('*')
    .eq('slug', slug)
    .single()
  return data
}

export async function createComparison(params: {
  creatorId: string
  question: string
  imageAUrl: string
  imageBUrl: string
}): Promise<Comparison> {
  const supabase = createServiceClient()
  const slug = nanoid()

  const { data, error } = await supabase
    .from('comparisons')
    .insert({
      slug,
      creator_id: params.creatorId,
      question: params.question,
      image_a_url: params.imageAUrl,
      image_b_url: params.imageBUrl,
      is_public: false,
    })
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function publishComparison(comparisonId: string): Promise<void> {
  const supabase = createServiceClient()
  await supabase
    .from('comparisons')
    .update({ is_public: true })
    .eq('id', comparisonId)
}

export async function getPublicFeed(limit = 20, offset = 0): Promise<Comparison[]> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('comparisons')
    .select('*')
    .eq('is_public', true)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)
  return data ?? []
}

export async function getUserComparisons(userId: string): Promise<Comparison[]> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('comparisons')
    .select('*')
    .eq('creator_id', userId)
    .order('created_at', { ascending: false })
  return data ?? []
}
```

- [ ] **Step 2: Commit**

```bash
git add versus/lib/comparisons.ts
git commit -m "feat: add comparisons library"
```

---

## Task 8: Library — Votes (with tests)

**Files:**
- Create: `versus/lib/votes.ts`
- Create: `versus/__tests__/votes.test.ts`

- [ ] **Step 1: Write failing tests**

Create `versus/__tests__/votes.test.ts`:
```typescript
jest.mock('@/lib/supabase/server', () => ({
  createServiceClient: jest.fn(),
}))

import { createServiceClient } from '@/lib/supabase/server'
import { getVoteCounts } from '@/lib/votes'

describe('getVoteCounts', () => {
  it('returns zero counts when no votes exist', async () => {
    ;(createServiceClient as jest.Mock).mockReturnValue({
      from: () => ({ select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }) }),
    })
    const counts = await getVoteCounts('comp-1')
    expect(counts).toEqual({ a: 0, b: 0 })
  })

  it('counts a and b votes correctly', async () => {
    ;(createServiceClient as jest.Mock).mockReturnValue({
      from: () => ({
        select: () => ({
          eq: () => Promise.resolve({
            data: [{ choice: 'a' }, { choice: 'a' }, { choice: 'b' }],
            error: null,
          }),
        }),
      }),
    })
    const counts = await getVoteCounts('comp-1')
    expect(counts).toEqual({ a: 2, b: 1 })
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd versus && npm test -- --testPathPattern=votes
```
Expected: FAIL — `Cannot find module '@/lib/votes'`

- [ ] **Step 3: Write votes library**

Create `versus/lib/votes.ts`:
```typescript
import { createServiceClient } from './supabase/server'
import type { VoteCounts } from '@/types'

export async function castVote(
  comparisonId: string,
  choice: 'a' | 'b',
  voterId: string | null
): Promise<{ voteId: string; alreadyVoted: boolean }> {
  const supabase = createServiceClient()

  if (voterId) {
    const { data: existing } = await supabase
      .from('votes')
      .select('id')
      .eq('comparison_id', comparisonId)
      .eq('voter_id', voterId)
      .maybeSingle()

    if (existing) return { voteId: existing.id, alreadyVoted: true }
  }

  const { data, error } = await supabase
    .from('votes')
    .insert({ comparison_id: comparisonId, voter_id: voterId, choice })
    .select('id')
    .single()

  if (error) throw new Error(error.message)
  return { voteId: data.id, alreadyVoted: false }
}

export async function getVoteCounts(comparisonId: string): Promise<VoteCounts> {
  const supabase = createServiceClient()

  const { data } = await supabase
    .from('votes')
    .select('choice')
    .eq('comparison_id', comparisonId)

  if (!data) return { a: 0, b: 0 }
  return {
    a: data.filter(v => v.choice === 'a').length,
    b: data.filter(v => v.choice === 'b').length,
  }
}

export async function getUserVote(
  comparisonId: string,
  voterId: string
): Promise<'a' | 'b' | null> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('votes')
    .select('choice')
    .eq('comparison_id', comparisonId)
    .eq('voter_id', voterId)
    .maybeSingle()
  return (data?.choice as 'a' | 'b') ?? null
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- --testPathPattern=votes
```
Expected: PASS — 2 tests pass

- [ ] **Step 5: Commit**

```bash
git add versus/lib/votes.ts versus/__tests__/votes.test.ts
git commit -m "feat: add votes library with tests"
```

---

## Task 9: Library — Tokens (with tests)

**Files:**
- Create: `versus/lib/tokens.ts`
- Create: `versus/__tests__/tokens.test.ts`

- [ ] **Step 1: Write failing tests**

Create `versus/__tests__/tokens.test.ts`:
```typescript
import { shouldAwardToken } from '@/lib/tokens'

describe('shouldAwardToken', () => {
  it('returns false for vote counts that are not multiples of 20', () => {
    expect(shouldAwardToken(1)).toBe(false)
    expect(shouldAwardToken(19)).toBe(false)
    expect(shouldAwardToken(21)).toBe(false)
  })

  it('returns true when vote count reaches a multiple of 20', () => {
    expect(shouldAwardToken(20)).toBe(true)
    expect(shouldAwardToken(40)).toBe(true)
    expect(shouldAwardToken(100)).toBe(true)
  })

  it('returns false for 0', () => {
    expect(shouldAwardToken(0)).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npm test -- --testPathPattern=tokens
```
Expected: FAIL — `Cannot find module '@/lib/tokens'`

- [ ] **Step 3: Write tokens library**

Create `versus/lib/tokens.ts`:
```typescript
import { createServiceClient } from './supabase/server'

// Pure function — testable without DB
export function shouldAwardToken(newVoteCount: number): boolean {
  return newVoteCount > 0 && newVoteCount % 20 === 0
}

// Call after a logged-in user casts a vote. Returns true if a token was awarded.
export async function recordVoteAndMaybeAwardToken(
  userId: string,
  voteId: string
): Promise<boolean> {
  const supabase = createServiceClient()

  const { data: user } = await supabase
    .from('users')
    .select('vote_count, token_balance')
    .eq('id', userId)
    .single()

  if (!user) return false

  const newVoteCount = user.vote_count + 1
  const award = shouldAwardToken(newVoteCount)

  await supabase
    .from('users')
    .update({
      vote_count: newVoteCount,
      ...(award ? { token_balance: user.token_balance + 1 } : {}),
    })
    .eq('id', userId)

  if (award) {
    await supabase.from('token_transactions').insert({
      user_id: userId,
      amount: 1,
      reason: 'voted',
      reference_id: voteId,
    })
  }

  return award
}

// Deduct 1 token to post a comparison to the public feed.
// Returns false if the user has insufficient balance.
export async function spendTokenForFeedPost(
  userId: string,
  comparisonId: string
): Promise<boolean> {
  const supabase = createServiceClient()

  const { data: user } = await supabase
    .from('users')
    .select('token_balance')
    .eq('id', userId)
    .single()

  if (!user || user.token_balance < 1) return false

  await supabase
    .from('users')
    .update({ token_balance: user.token_balance - 1 })
    .eq('id', userId)

  await supabase.from('token_transactions').insert({
    user_id: userId,
    amount: -1,
    reason: 'post_to_feed',
    reference_id: comparisonId,
  })

  return true
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- --testPathPattern=tokens
```
Expected: PASS — 3 tests pass

- [ ] **Step 5: Commit**

```bash
git add versus/lib/tokens.ts versus/__tests__/tokens.test.ts
git commit -m "feat: add token library with tests"
```

---

## Task 10: Vote API Route

**Files:**
- Create: `versus/app/api/vote/route.ts`

- [ ] **Step 1: Write vote route**

Create `versus/app/api/vote/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { castVote, getVoteCounts } from '@/lib/votes'
import { recordVoteAndMaybeAwardToken } from '@/lib/tokens'

export async function POST(request: NextRequest) {
  const { comparisonId, choice } = await request.json()

  if (!comparisonId || !['a', 'b'].includes(choice)) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { voteId, alreadyVoted } = await castVote(
    comparisonId,
    choice as 'a' | 'b',
    user?.id ?? null
  )

  if (!alreadyVoted && user) {
    await recordVoteAndMaybeAwardToken(user.id, voteId)
  }

  const counts = await getVoteCounts(comparisonId)
  return NextResponse.json({ counts, alreadyVoted })
}
```

- [ ] **Step 2: Commit**

```bash
git add versus/app/api/vote/
git commit -m "feat: add vote API route"
```

---

## Task 11: VoteCard Component + Vote Page

**Files:**
- Create: `versus/components/VoteCard.tsx`
- Create: `versus/app/c/[slug]/page.tsx`

- [ ] **Step 1: Write VoteCard**

Create `versus/components/VoteCard.tsx`:
```tsx
'use client'
import { useState } from 'react'
import type { Comparison, VoteCounts } from '@/types'

type Props = {
  comparison: Comparison
  initialCounts: VoteCounts
  initialVote?: 'a' | 'b' | null
}

export function VoteCard({ comparison, initialCounts, initialVote = null }: Props) {
  const [counts, setCounts] = useState(initialCounts)
  const [voted, setVoted] = useState<'a' | 'b' | null>(initialVote)
  const [loading, setLoading] = useState(false)

  const total = counts.a + counts.b
  const pctA = total === 0 ? 50 : Math.round((counts.a / total) * 100)
  const pctB = 100 - pctA

  async function vote(choice: 'a' | 'b') {
    if (voted || loading) return
    setLoading(true)
    const res = await fetch('/api/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comparisonId: comparison.id, choice }),
    })
    if (res.ok) {
      const data = await res.json()
      setCounts(data.counts)
      setVoted(choice)
    }
    setLoading(false)
  }

  const options = [
    { side: 'a' as const, url: comparison.image_a_url, pct: pctA },
    { side: 'b' as const, url: comparison.image_b_url, pct: pctB },
  ]

  return (
    <div className="w-full max-w-3xl">
      <h1 className="text-2xl font-bold text-white text-center mb-8">
        {comparison.question}
      </h1>

      <div className="grid grid-cols-2 gap-4">
        {options.map(({ side, url, pct }) => (
          <button
            key={side}
            onClick={() => vote(side)}
            disabled={!!voted || loading}
            className={`relative overflow-hidden rounded-2xl aspect-square group focus:outline-none
              ${voted === side ? 'ring-4 ring-white' : ''}
              ${voted && voted !== side ? 'opacity-60' : ''}
            `}
          >
            <img src={url} alt={`Option ${side.toUpperCase()}`} className="w-full h-full object-cover" />
            {voted ? (
              <div className="absolute inset-0 bg-black/40 flex items-end p-4">
                <span className="text-white text-4xl font-black">{pct}%</span>
              </div>
            ) : (
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
            )}
          </button>
        ))}
      </div>

      {voted && (
        <div className="mt-6 p-4 rounded-2xl bg-gray-900 text-center">
          <p className="text-gray-400 text-sm">
            Earn tokens when you vote —{' '}
            <a href="/login" className="text-white underline hover:text-gray-200">
              create a free account
            </a>
          </p>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Write vote page**

Create `versus/app/c/[slug]/page.tsx`:
```tsx
import { notFound } from 'next/navigation'
import { getComparisonBySlug } from '@/lib/comparisons'
import { getVoteCounts, getUserVote } from '@/lib/votes'
import { createClient } from '@/lib/supabase/server'
import { VoteCard } from '@/components/VoteCard'
import type { Metadata } from 'next'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const comparison = await getComparisonBySlug(slug)
  if (!comparison) return {}
  return {
    title: comparison.question,
    description: 'Vote now — no account needed',
    openGraph: {
      title: comparison.question,
      description: 'Vote now — no account needed',
      images: [{ url: comparison.image_a_url, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: comparison.question,
      images: [comparison.image_a_url],
    },
  }
}

export default async function VotePage({ params }: Props) {
  const { slug } = await params
  const comparison = await getComparisonBySlug(slug)
  if (!comparison) notFound()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [counts, initialVote] = await Promise.all([
    getVoteCounts(comparison.id),
    user ? getUserVote(comparison.id, user.id) : null,
  ])

  return (
    <main className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4">
      <VoteCard comparison={comparison} initialCounts={counts} initialVote={initialVote} />
    </main>
  )
}
```

- [ ] **Step 3: Smoke test**

With dev server running, insert a test row in Supabase:
```sql
insert into comparisons (slug, creator_id, question, image_a_url, image_b_url)
values ('test1234', '<any-user-id>', 'Which is better?', 'https://picsum.photos/600/600?1', 'https://picsum.photos/600/600?2');
```
Visit `http://localhost:3000/c/test1234`.

Expected: Two images render side by side. Clicking one reveals percentage overlays.

- [ ] **Step 4: Commit**

```bash
git add versus/components/VoteCard.tsx versus/app/c/
git commit -m "feat: add VoteCard component and server-rendered vote page with OG tags"
```

---

## Task 12: Create Comparison Page

**Files:**
- Create: `versus/lib/upload.ts`
- Create: `versus/app/create/actions.ts`
- Create: `versus/components/CopyLink.tsx`
- Create: `versus/components/ComparisonForm.tsx`
- Create: `versus/app/create/page.tsx`

- [ ] **Step 1: Write image upload helper**

Create `versus/lib/upload.ts`:
```typescript
import { createClient } from './supabase/client'

// uploadId is a client-generated UUID used only for the storage path.
// The shareable slug is generated server-side in createComparison.
export async function uploadComparisonImage(
  file: File,
  uploadId: string,
  side: 'a' | 'b'
): Promise<string> {
  const supabase = createClient()
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `comparisons/${uploadId}/${side}.${ext}`

  const { error } = await supabase.storage
    .from('comparison-images')
    .upload(path, file, { upsert: true })

  if (error) throw new Error(error.message)

  const { data } = supabase.storage.from('comparison-images').getPublicUrl(path)
  return data.publicUrl
}
```

- [ ] **Step 2: Write server action**

Create `versus/app/create/actions.ts`:
```typescript
'use server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { createComparison, publishComparison } from '@/lib/comparisons'
import { spendTokenForFeedPost } from '@/lib/tokens'
import { redirect } from 'next/navigation'

export async function createComparisonAction(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const question = formData.get('question') as string
  const imageAUrl = formData.get('imageAUrl') as string
  const imageBUrl = formData.get('imageBUrl') as string
  const postToFeed = formData.get('postToFeed') === 'true'

  if (!question?.trim() || !imageAUrl || !imageBUrl) {
    throw new Error('Missing required fields')
  }

  const comparison = await createComparison({
    creatorId: user.id,
    question: question.trim(),
    imageAUrl,
    imageBUrl,
  })

  if (postToFeed) {
    const spent = await spendTokenForFeedPost(user.id, comparison.id)
    if (spent) await publishComparison(comparison.id)
  }

  redirect(`/c/${comparison.slug}?created=true`)
}
```

- [ ] **Step 3: Write CopyLink component**

Create `versus/components/CopyLink.tsx`:
```tsx
'use client'
import { useState } from 'react'

export function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={copy}
      className="flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-sm text-gray-300 hover:border-gray-600 transition-colors w-full"
    >
      <span className="flex-1 truncate text-left font-mono text-xs">{url}</span>
      <span className="text-white font-medium shrink-0">{copied ? 'Copied!' : 'Copy'}</span>
    </button>
  )
}
```

- [ ] **Step 4: Write ComparisonForm component**

Create `versus/components/ComparisonForm.tsx`:
```tsx
'use client'
import { useState } from 'react'
import { uploadComparisonImage } from '@/lib/upload'
import { createComparisonAction } from '@/app/create/actions'

export function ComparisonForm({ tokenBalance }: { tokenBalance: number }) {
  const [fileA, setFileA] = useState<File | null>(null)
  const [fileB, setFileB] = useState<File | null>(null)
  const [previewA, setPreviewA] = useState<string | null>(null)
  const [previewB, setPreviewB] = useState<string | null>(null)
  const [postToFeed, setPostToFeed] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function pickFile(side: 'a' | 'b', file: File) {
    const url = URL.createObjectURL(file)
    if (side === 'a') { setFileA(file); setPreviewA(url) }
    else { setFileB(file); setPreviewB(url) }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!fileA || !fileB) { setError('Upload both images'); return }
    setUploading(true)
    setError(null)

    try {
      const uploadId = crypto.randomUUID()
      const [imageAUrl, imageBUrl] = await Promise.all([
        uploadComparisonImage(fileA, uploadId, 'a'),
        uploadComparisonImage(fileB, uploadId, 'b'),
      ])

      const formData = new FormData(e.currentTarget)
      formData.set('imageAUrl', imageAUrl)
      formData.set('imageBUrl', imageBUrl)
      formData.set('postToFeed', String(postToFeed))

      await createComparisonAction(formData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setUploading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 w-full max-w-xl">
      <div className="grid grid-cols-2 gap-4">
        {(['a', 'b'] as const).map(side => {
          const preview = side === 'a' ? previewA : previewB
          return (
            <label
              key={side}
              className="aspect-square rounded-2xl border-2 border-dashed border-gray-700 hover:border-gray-500 transition-colors cursor-pointer overflow-hidden flex items-center justify-center bg-gray-900"
            >
              {preview ? (
                <img src={preview} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center p-4">
                  <div className="text-4xl mb-2 text-gray-600">+</div>
                  <div className="text-gray-500 text-sm">Option {side.toUpperCase()}</div>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => e.target.files?.[0] && pickFile(side, e.target.files[0])}
              />
            </label>
          )
        })}
      </div>

      <input
        name="question"
        type="text"
        placeholder="Which looks better?"
        required
        className="bg-gray-900 border border-gray-800 text-white rounded-xl px-4 py-3 placeholder-gray-500 focus:outline-none focus:border-gray-600"
      />

      <label className={`flex items-center justify-between p-4 rounded-xl border ${tokenBalance > 0 ? 'border-gray-700 cursor-pointer' : 'border-gray-800 opacity-40 cursor-not-allowed'}`}>
        <div>
          <div className="text-white font-medium text-sm">Post to public feed</div>
          <div className="text-gray-500 text-xs mt-0.5">Costs 1 token · You have {tokenBalance}</div>
        </div>
        <input
          type="checkbox"
          checked={postToFeed}
          onChange={e => setPostToFeed(e.target.checked)}
          disabled={tokenBalance < 1}
          className="w-4 h-4 accent-white"
        />
      </label>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={uploading}
        className="bg-white text-gray-900 font-semibold py-3 rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-50"
      >
        {uploading ? 'Creating...' : 'Create comparison'}
      </button>
    </form>
  )
}
```

- [ ] **Step 5: Write create page**

Create `versus/app/create/page.tsx`:
```tsx
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ComparisonForm } from '@/components/ComparisonForm'

export default async function CreatePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await createServiceClient()
    .from('users')
    .select('token_balance')
    .eq('id', user.id)
    .single()

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4">
      <h1 className="text-2xl font-bold text-white mb-8">Create a comparison</h1>
      <ComparisonForm tokenBalance={profile?.token_balance ?? 0} />
    </main>
  )
}
```

- [ ] **Step 6: Test the create flow**

With dev server running:
1. Log in at `http://localhost:3000/login`
2. Visit `http://localhost:3000/create`
3. Upload two images, enter a question, click Create

Expected: Redirected to `/c/[slug]` showing both images with the question.

- [ ] **Step 7: Commit**

```bash
git add versus/lib/upload.ts versus/app/create/ versus/components/ComparisonForm.tsx versus/components/CopyLink.tsx
git commit -m "feat: add create comparison page with image upload"
```

---

## Task 13: Feed Page

**Files:**
- Create: `versus/components/FeedCard.tsx`
- Create: `versus/app/feed/page.tsx`

- [ ] **Step 1: Write FeedCard**

Create `versus/components/FeedCard.tsx`:
```tsx
'use client'
import { useState } from 'react'
import Link from 'next/link'
import type { Comparison, VoteCounts } from '@/types'

type Props = {
  comparison: Comparison
  initialCounts: VoteCounts
  initialVote: 'a' | 'b' | null
}

export function FeedCard({ comparison, initialCounts, initialVote }: Props) {
  const [counts, setCounts] = useState(initialCounts)
  const [voted, setVoted] = useState<'a' | 'b' | null>(initialVote)
  const [loading, setLoading] = useState(false)

  const total = counts.a + counts.b
  const pctA = total === 0 ? 50 : Math.round((counts.a / total) * 100)
  const pctB = 100 - pctA

  async function vote(choice: 'a' | 'b') {
    if (voted || loading) return
    setLoading(true)
    const res = await fetch('/api/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comparisonId: comparison.id, choice }),
    })
    if (res.ok) {
      const data = await res.json()
      setCounts(data.counts)
      setVoted(choice)
    }
    setLoading(false)
  }

  const options = [
    { side: 'a' as const, url: comparison.image_a_url, pct: pctA },
    { side: 'b' as const, url: comparison.image_b_url, pct: pctB },
  ]

  return (
    <div className="bg-gray-900 rounded-2xl overflow-hidden border border-gray-800">
      <div className="p-4">
        <p className="text-white font-semibold">{comparison.question}</p>
      </div>
      <div className="grid grid-cols-2 gap-0.5">
        {options.map(({ side, url, pct }) => (
          <button
            key={side}
            onClick={() => vote(side)}
            disabled={!!voted || loading}
            className={`relative aspect-video overflow-hidden group focus:outline-none
              ${voted === side ? 'ring-2 ring-inset ring-white' : ''}
            `}
          >
            <img src={url} alt="" className="w-full h-full object-cover" />
            {voted ? (
              <div className="absolute inset-0 bg-black/40 flex items-end p-3">
                <span className="text-white text-2xl font-black">{pct}%</span>
              </div>
            ) : (
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
            )}
          </button>
        ))}
      </div>
      <div className="px-4 py-3 flex justify-between items-center">
        <span className="text-gray-500 text-xs">{total} vote{total !== 1 ? 's' : ''}</span>
        <Link href={`/c/${comparison.slug}`} className="text-gray-500 text-xs hover:text-gray-300 transition-colors">
          Share →
        </Link>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Write feed page**

Create `versus/app/feed/page.tsx`:
```tsx
import { getPublicFeed } from '@/lib/comparisons'
import { getVoteCounts, getUserVote } from '@/lib/votes'
import { createClient } from '@/lib/supabase/server'
import { FeedCard } from '@/components/FeedCard'

export const revalidate = 30

export default async function FeedPage() {
  const comparisons = await getPublicFeed(20)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const enriched = await Promise.all(
    comparisons.map(async (c) => ({
      comparison: c,
      counts: await getVoteCounts(c.id),
      initialVote: user ? await getUserVote(c.id, user.id) : null,
    }))
  )

  return (
    <main className="min-h-screen p-4 max-w-xl mx-auto">
      <h1 className="text-xl font-bold text-white mb-6">Feed</h1>

      {enriched.length === 0 ? (
        <p className="text-gray-500 text-center mt-20">
          No comparisons yet.{' '}
          <a href="/create" className="text-white underline">Be the first.</a>
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {enriched.map(({ comparison, counts, initialVote }) => (
            <FeedCard
              key={comparison.id}
              comparison={comparison}
              initialCounts={counts}
              initialVote={initialVote}
            />
          ))}
        </div>
      )}

      {!user && (
        <div className="fixed bottom-4 left-4 right-4 max-w-xl mx-auto bg-gray-900 border border-gray-800 rounded-2xl p-4 text-center">
          <p className="text-gray-400 text-sm">
            <a href="/login" className="text-white underline">Log in</a> to earn tokens when you vote
          </p>
        </div>
      )}
    </main>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add versus/components/FeedCard.tsx versus/app/feed/
git commit -m "feat: add public feed page"
```

---

## Task 14: Dashboard Page

**Files:**
- Create: `versus/components/TokenBadge.tsx`
- Create: `versus/app/dashboard/page.tsx`

- [ ] **Step 1: Write TokenBadge**

Create `versus/components/TokenBadge.tsx`:
```tsx
export function TokenBadge({ balance }: { balance: number }) {
  return (
    <div className="flex items-center gap-1.5 bg-gray-900 border border-gray-800 rounded-full px-3 py-1">
      <span className="text-yellow-400 text-sm">◈</span>
      <span className="text-white font-semibold text-sm">{balance}</span>
      <span className="text-gray-500 text-sm">tokens</span>
    </div>
  )
}
```

- [ ] **Step 2: Write dashboard page**

Create `versus/app/dashboard/page.tsx`:
```tsx
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getUserComparisons } from '@/lib/comparisons'
import { getVoteCounts } from '@/lib/votes'
import { redirect } from 'next/navigation'
import { TokenBadge } from '@/components/TokenBadge'
import { CopyLink } from '@/components/CopyLink'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await createServiceClient()
    .from('users')
    .select('token_balance, vote_count')
    .eq('id', user.id)
    .single()

  const comparisons = await getUserComparisons(user.id)
  const withCounts = await Promise.all(
    comparisons.map(async (c) => ({ ...c, counts: await getVoteCounts(c.id) }))
  )

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
  const votesUntilToken = 20 - ((profile?.vote_count ?? 0) % 20)

  return (
    <main className="min-h-screen p-4 max-w-xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-white">Dashboard</h1>
        <TokenBadge balance={profile?.token_balance ?? 0} />
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 mb-6">
        <p className="text-gray-400 text-sm">
          Vote on{' '}
          <span className="text-white font-semibold">{votesUntilToken} more</span>{' '}
          comparison{votesUntilToken !== 1 ? 's' : ''} to earn your next token
        </p>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white font-semibold">Your comparisons</h2>
        <a href="/create" className="text-sm text-gray-400 hover:text-white transition-colors">+ Create</a>
      </div>

      {withCounts.length === 0 ? (
        <p className="text-gray-500 text-center mt-12">No comparisons yet.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {withCounts.map((c) => {
            const total = c.counts.a + c.counts.b
            const pctA = total === 0 ? 0 : Math.round((c.counts.a / total) * 100)
            const pctB = 100 - pctA
            return (
              <div key={c.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                <p className="text-white font-medium mb-3">{c.question}</p>
                <div className="flex gap-3 mb-3">
                  <img src={c.image_a_url} alt="" className="w-16 h-16 rounded-xl object-cover shrink-0" />
                  <img src={c.image_b_url} alt="" className="w-16 h-16 rounded-xl object-cover shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-gray-400 text-sm mb-2">{total} vote{total !== 1 ? 's' : ''}</div>
                    <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full bg-white rounded-full" style={{ width: `${pctA}%` }} />
                    </div>
                    <div className="text-gray-500 text-xs mt-1">{pctA}% A · {pctB}% B</div>
                  </div>
                </div>
                <CopyLink url={`${baseUrl}/c/${c.slug}`} />
                {!c.is_public && (
                  <p className="text-gray-600 text-xs mt-2">Link-only · not posted to feed</p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add versus/components/TokenBadge.tsx versus/app/dashboard/
git commit -m "feat: add dashboard with comparison stats and token balance"
```

---

## Task 15: Landing Page

**Files:**
- Modify: `versus/app/page.tsx`

- [ ] **Step 1: Write landing page**

Replace `versus/app/page.tsx`:
```tsx
import Link from 'next/link'

export default function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
      <h1 className="text-5xl font-black text-white mb-4 tracking-tight">
        Pick a side.
      </h1>
      <p className="text-gray-400 text-lg mb-10 max-w-sm">
        Create an image comparison, share the link, and let the internet decide.
      </p>

      <div className="flex gap-3 flex-wrap justify-center">
        <Link
          href="/create"
          className="bg-white text-gray-900 font-semibold px-6 py-3 rounded-xl hover:bg-gray-100 transition-colors"
        >
          Create a comparison
        </Link>
        <Link
          href="/feed"
          className="bg-gray-900 text-white font-semibold px-6 py-3 rounded-xl border border-gray-800 hover:border-gray-600 transition-colors"
        >
          Browse feed
        </Link>
      </div>

      <div className="mt-20 grid grid-cols-3 gap-8 max-w-md text-sm text-gray-500">
        <div>
          <div className="text-2xl font-bold text-white mb-1">Free</div>
          <div>to create &amp; share</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-white mb-1">No</div>
          <div>account to vote</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-white mb-1">Tokens</div>
          <div>for engagement</div>
        </div>
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Run all tests**

```bash
cd versus && npm test
```
Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add versus/app/page.tsx
git commit -m "feat: add landing page"
```

---

## Task 16: Deploy to Vercel

**Files:** None (Vercel reads the repo directly)

- [ ] **Step 1: Push to GitHub**

```bash
git remote add origin https://github.com/YOUR_USERNAME/versus.git
git push -u origin main
```

- [ ] **Step 2: Import on Vercel**

vercel.com → New Project → Import the GitHub repo → Root directory: `versus`

- [ ] **Step 3: Add environment variables in Vercel**

In the Vercel project settings → Environment Variables:
```
NEXT_PUBLIC_SUPABASE_URL     = https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = your-anon-key
SUPABASE_SERVICE_ROLE_KEY    = your-service-role-key
NEXT_PUBLIC_BASE_URL         = https://your-app.vercel.app
```

- [ ] **Step 4: Update Supabase allowed URLs**

Supabase dashboard → Authentication → URL Configuration:
- Site URL: `https://your-app.vercel.app`
- Redirect URLs: add `https://your-app.vercel.app/api/auth/callback`

- [ ] **Step 5: Verify production**

Visit `https://your-app.vercel.app` — landing page loads with dark background.
Create a comparison and verify the shareable link works and OG tags render when the link is pasted into iMessage or Slack.

- [ ] **Step 6: Commit**

```bash
git commit --allow-empty -m "chore: deployed to Vercel"
```
