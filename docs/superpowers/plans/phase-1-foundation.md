# DateNu — Phase 1: Foundation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold the Expo project with all dependencies configured, Tamagui themed, TypeScript + Jest ready, and Supabase schema deployed.

**Architecture:** Expo Router v3 (file-based routing), Tamagui for UI with custom design tokens, Supabase PostgreSQL with RLS policies and a match-detection trigger.

**Tech Stack:** Expo SDK 51, React Native, Expo Router v3, Tamagui, TypeScript, Jest + React Native Testing Library, Supabase CLI

**Spec:** `docs/superpowers/specs/2026-03-24-datenu-design.md`

---

## File Structure (this phase)

```
datenu/
├── app/
│   └── _layout.tsx              # Root layout (placeholder, expanded in Phase 2)
├── constants/
│   └── theme.ts                 # Design tokens
├── types/
│   └── database.ts              # Supabase DB types (hand-authored)
├── lib/
│   └── supabase.ts              # Supabase client singleton
├── supabase/
│   └── migrations/
│       ├── 001_schema.sql       # Full DB schema with RLS
│       └── 002_triggers.sql     # Match detection trigger
├── __tests__/
│   └── lib/
│       └── supabase.test.ts     # Client singleton smoke test
├── app.json
├── babel.config.js
├── metro.config.js
├── tamagui.config.ts
├── tsconfig.json
└── package.json
```

---

## Task 1: Scaffold Expo Project

- [ ] **Step 1: Create project**

```bash
npx create-expo-app@latest datenu --template blank-typescript
cd datenu
```

- [ ] **Step 2: Install Expo Router**

```bash
npx expo install expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants expo-status-bar
```

- [ ] **Step 3: Install core UI and animation deps**

```bash
npx expo install tamagui @tamagui/core @tamagui/config @tamagui/babel-plugin
npx expo install react-native-reanimated react-native-gesture-handler
npx expo install lottie-react-native
npx expo install expo-image   # fast, cached image component
```

- [ ] **Step 4: Install Supabase and auth deps**

```bash
npx expo install @supabase/supabase-js
npx expo install expo-secure-store expo-auth-session expo-crypto expo-web-browser
npx expo install @react-native-async-storage/async-storage
```

- [ ] **Step 5: Install remaining feature deps**

```bash
npx expo install expo-calendar expo-camera expo-image-picker expo-sharing expo-notifications
npx expo install react-native-qrcode-svg
npx expo install @react-native-community/datetimepicker
npx expo install @phosphor-icons/react-native   # icon set
```

- [ ] **Step 6: Install dev/test deps**

```bash
npm install --save-dev jest jest-expo @testing-library/react-native @testing-library/jest-native
npm install --save-dev @types/react @types/react-native
```

- [ ] **Step 7: Commit**

```bash
git add .
git commit -m "feat: scaffold expo project with all dependencies"
```

---

## Task 2: Configure Babel, Metro, and TypeScript

- [ ] **Step 1: Update `babel.config.js`**

```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      '@tamagui/babel-plugin',
      'react-native-reanimated/plugin', // must be last
    ],
  };
};
```

- [ ] **Step 2: Create `metro.config.js`**

```js
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Tamagui: allow .web.js extensions for web compat
config.resolver.sourceExts.push('mjs');

module.exports = config;
```

- [ ] **Step 3: Update `tsconfig.json`**

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

- [ ] **Step 4: Update `app.json` for Expo Router and deep links**

```json
{
  "expo": {
    "name": "DateNu",
    "slug": "datenu",
    "scheme": "datenu",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#FAFAF8"
    },
    "ios": {
      "supportsTablet": false,
      "bundleIdentifier": "com.yourname.datenu",
      "infoPlist": {
        "NSCalendarsUsageDescription": "DateNu uses your calendar to schedule dates.",
        "NSCameraUsageDescription": "DateNu uses your camera to scan QR codes.",
        "NSPhotoLibraryUsageDescription": "DateNu uses your photo library to add images to date ideas."
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#FAFAF8"
      },
      "package": "com.yourname.datenu",
      "permissions": [
        "READ_CALENDAR",
        "WRITE_CALENDAR",
        "CAMERA",
        "READ_EXTERNAL_STORAGE"
      ]
    },
    "plugins": [
      "expo-router",
      "expo-secure-store",
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#C97B84"
        }
      ]
    ],
    "experiments": {
      "typedRoutes": true
    }
  }
}
```

- [ ] **Step 5: Configure Jest in `package.json`**

```json
{
  "jest": {
    "preset": "jest-expo",
    "setupFilesAfterFramework": ["@testing-library/jest-native/extend-expect"],
    "transformIgnorePatterns": [
      "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|tamagui|@tamagui/.*|lottie-react-native)"
    ]
  }
}
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add babel.config.js metro.config.js tsconfig.json app.json package.json
git commit -m "feat: configure babel, metro, typescript, and jest"
```

---

## Task 3: Design Tokens

- [ ] **Step 1: Create `constants/theme.ts`**

```ts
export const colors = {
  background: '#FAFAF8',
  textPrimary: '#1C1C1E',
  textSecondary: '#6B6B6B',
  accent: '#C97B84',
  accentLight: '#F2D9DC',
  surface: '#FFFFFF',
  border: '#E8E8E6',
  success: '#4CAF50',
  error: '#E53935',
} as const;

export const radii = {
  sm: 8,
  md: 16,
  lg: 24,
  full: 9999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const fontSizes = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
} as const;

export const fontWeights = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};
```

- [ ] **Step 2: Create `tamagui.config.ts`**

```ts
import { createTamagui, createTokens } from '@tamagui/core';
import { config as defaultConfig } from '@tamagui/config/v3';
import { colors, radii, spacing, fontSizes } from '@/constants/theme';

const tokens = createTokens({
  ...defaultConfig.tokens,
  color: {
    background: colors.background,
    textPrimary: colors.textPrimary,
    textSecondary: colors.textSecondary,
    accent: colors.accent,
    accentLight: colors.accentLight,
    surface: colors.surface,
    border: colors.border,
  },
  radius: {
    sm: radii.sm,
    md: radii.md,
    lg: radii.lg,
    full: radii.full,
  },
  space: {
    xs: spacing.xs,
    sm: spacing.sm,
    md: spacing.md,
    lg: spacing.lg,
    xl: spacing.xl,
    xxl: spacing.xxl,
  },
});

const config = createTamagui({
  ...defaultConfig,
  tokens,
  themes: {
    light: {
      ...defaultConfig.themes.light,
      background: colors.background,
      color: colors.textPrimary,
      borderColor: colors.border,
    },
  },
  defaultTheme: 'light',
});

export type Conf = typeof config;
declare module '@tamagui/core' {
  interface TamaguiCustomConfig extends Conf {}
}

export default config;
```

- [ ] **Step 3: Create placeholder `app/_layout.tsx`**

```tsx
import { TamaguiProvider } from '@tamagui/core';
import { Stack } from 'expo-router';
import config from '@/tamagui.config';

export default function RootLayout() {
  return (
    <TamaguiProvider config={config}>
      <Stack screenOptions={{ headerShown: false }} />
    </TamaguiProvider>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add constants/theme.ts tamagui.config.ts app/_layout.tsx
git commit -m "feat: add design tokens and tamagui config"
```

---

## Task 4: Supabase Project Setup

> This task requires manual steps in the Supabase dashboard and local CLI setup.

- [ ] **Step 1: Create Supabase project**

  1. Go to https://supabase.com and create a new project named `datenu`.
  2. Note your **Project URL** and **Anon Key** from Settings → API.

- [ ] **Step 2: Install Supabase CLI**

```bash
brew install supabase/tap/supabase
supabase login
supabase init
```

- [ ] **Step 3: Create `.env.local`** (never commit this file)

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

- [ ] **Step 4: Add `.env.local` to `.gitignore`**

```bash
echo ".env.local" >> .gitignore
git add .gitignore
git commit -m "chore: ignore env files"
```

---

## Task 5: Database Schema Migration

- [ ] **Step 1: Create `supabase/migrations/001_schema.sql`**

```sql
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─── USERS ────────────────────────────────────────────────────────────────────
create table public.users (
  id              uuid primary key references auth.users(id) on delete cascade,
  email           text not null,
  display_name    text not null default '',
  avatar_url      text,
  location_region text not null default '',
  auth_provider   text not null default 'email',
  expo_push_token text,
  created_at      timestamptz not null default now()
);

alter table public.users enable row level security;

create policy "Users can read their own row"
  on public.users for select using (auth.uid() = id);

create policy "Users can update their own row"
  on public.users for update using (auth.uid() = id);

create policy "Users can insert their own row"
  on public.users for insert with check (auth.uid() = id);

-- ─── COUPLES ──────────────────────────────────────────────────────────────────
create table public.couples (
  id              uuid primary key default uuid_generate_v4(),
  user_a_id       uuid not null references public.users(id) on delete cascade,
  user_b_id       uuid references public.users(id) on delete cascade,
  invite_code     text not null unique,
  location_region text not null default '', -- shared couple location; defaults to user_a's region on pairing
  created_at      timestamptz not null default now()
);

alter table public.couples enable row level security;

create policy "Couple members can read their couple"
  on public.couples for select
  using (auth.uid() = user_a_id or auth.uid() = user_b_id);

create policy "user_a can insert couple"
  on public.couples for insert with check (auth.uid() = user_a_id);

create policy "user_b can accept invite (update user_b_id)"
  on public.couples for update using (auth.uid() = user_b_id or auth.uid() = user_a_id);

-- ─── DATE IDEAS ───────────────────────────────────────────────────────────────
create table public.date_ideas (
  id              uuid primary key default uuid_generate_v4(),
  title           text not null,
  tagline         text not null,
  photo_url       text not null,
  cost_range      text not null check (cost_range in ('€', '€€', '€€€')),
  duration_mins   int not null,
  vibe_tags       text[] not null default '{}',
  location_region text not null,
  booking_url     text,
  maps_url        text,
  submitted_by    uuid references public.users(id) on delete set null,
  is_approved     boolean not null default false,
  created_at      timestamptz not null default now()
);

alter table public.date_ideas enable row level security;

create policy "Anyone can read approved ideas"
  on public.date_ideas for select using (is_approved = true);

create policy "Authenticated users can submit ideas"
  on public.date_ideas for insert with check (auth.uid() = submitted_by);

-- ─── SWIPES ───────────────────────────────────────────────────────────────────
create table public.swipes (
  id         uuid primary key default uuid_generate_v4(),
  couple_id  uuid not null references public.couples(id) on delete cascade,
  user_id    uuid not null references public.users(id) on delete cascade,
  idea_id    uuid not null references public.date_ideas(id) on delete cascade,
  direction  text not null check (direction in ('like', 'pass')),
  swiped_at  timestamptz not null default now(),
  unique(couple_id, user_id, idea_id)
);

alter table public.swipes enable row level security;

create policy "Couple members can insert their own swipes"
  on public.swipes for insert with check (
    auth.uid() = user_id and
    exists (
      select 1 from public.couples
      where id = couple_id
        and (user_a_id = auth.uid() or user_b_id = auth.uid())
    )
  );

create policy "Couple members can read swipes for their couple"
  on public.swipes for select using (
    exists (
      select 1 from public.couples
      where id = couple_id
        and (user_a_id = auth.uid() or user_b_id = auth.uid())
    )
  );

-- ─── MATCHES ──────────────────────────────────────────────────────────────────
create table public.matches (
  id         uuid primary key default uuid_generate_v4(),
  couple_id  uuid not null references public.couples(id) on delete cascade,
  idea_id    uuid not null references public.date_ideas(id) on delete cascade,
  matched_at timestamptz not null default now(),
  status     text not null default 'pending' check (status in ('pending', 'scheduled', 'completed')),
  unique(couple_id, idea_id)
);

alter table public.matches enable row level security;

create policy "Couple members can read their matches"
  on public.matches for select using (
    exists (
      select 1 from public.couples
      where id = couple_id
        and (user_a_id = auth.uid() or user_b_id = auth.uid())
    )
  );

create policy "System can insert matches (via trigger)"
  on public.matches for insert with check (true);

create policy "Couple members can update match status"
  on public.matches for update using (
    exists (
      select 1 from public.couples
      where id = couple_id
        and (user_a_id = auth.uid() or user_b_id = auth.uid())
    )
  );

-- ─── SCHEDULED DATES ──────────────────────────────────────────────────────────
create table public.scheduled_dates (
  id                uuid primary key default uuid_generate_v4(),
  match_id          uuid not null references public.matches(id) on delete cascade,
  scheduled_at      timestamptz not null,
  calendar_event_id text,
  unique(match_id)
);

alter table public.scheduled_dates enable row level security;

create policy "Couple members can manage their scheduled dates"
  on public.scheduled_dates for all using (
    exists (
      select 1 from public.matches m
      join public.couples c on c.id = m.couple_id
      where m.id = match_id
        and (c.user_a_id = auth.uid() or c.user_b_id = auth.uid())
    )
  );

-- ─── DATE MEMORIES ────────────────────────────────────────────────────────────
create table public.date_memories (
  id           uuid primary key default uuid_generate_v4(),
  match_id     uuid not null references public.matches(id) on delete cascade,
  note         text,
  rating       int check (rating between 1 and 5),
  completed_at timestamptz not null default now(),
  unique(match_id)
);

alter table public.date_memories enable row level security;

create policy "Couple members can manage their memories"
  on public.date_memories for all using (
    exists (
      select 1 from public.matches m
      join public.couples c on c.id = m.couple_id
      where m.id = match_id
        and (c.user_a_id = auth.uid() or c.user_b_id = auth.uid())
    )
  );

-- ─── REALTIME ─────────────────────────────────────────────────────────────────
-- Enable realtime for match notifications and scheduled date sync
alter publication supabase_realtime add table public.matches;
alter publication supabase_realtime add table public.scheduled_dates;
```

- [ ] **Step 2: Create `supabase/migrations/002_triggers.sql`**

```sql
-- Match detection trigger
-- Fires after a 'like' swipe is inserted.
-- If the partner has already liked the same idea, creates a match.

create or replace function public.check_and_create_match()
returns trigger
language plpgsql
security definer
as $$
declare
  partner_id uuid;
  partner_liked boolean;
begin
  -- Only act on 'like' swipes
  if new.direction != 'like' then
    return new;
  end if;

  -- Find the partner's user_id in this couple
  select case
    when user_a_id = new.user_id then user_b_id
    else user_a_id
  end into partner_id
  from public.couples
  where id = new.couple_id;

  -- Check if partner has liked the same idea
  select exists(
    select 1 from public.swipes
    where couple_id = new.couple_id
      and user_id = partner_id
      and idea_id = new.idea_id
      and direction = 'like'
  ) into partner_liked;

  -- If partner liked it too, create a match (ignore if already exists)
  if partner_liked then
    insert into public.matches (couple_id, idea_id)
    values (new.couple_id, new.idea_id)
    on conflict (couple_id, idea_id) do nothing;
  end if;

  return new;
end;
$$;

create trigger on_swipe_inserted
  after insert on public.swipes
  for each row execute function public.check_and_create_match();
```

- [ ] **Step 3: Apply migrations to Supabase**

```bash
supabase db push
```

Expected: migrations applied successfully with no errors.

- [ ] **Step 4: Verify in Supabase Studio**

  Open your project in https://supabase.com → Table Editor. Confirm all 6 tables exist: `users`, `couples`, `date_ideas`, `swipes`, `matches`, `date_memories`, `scheduled_dates`.

- [ ] **Step 5: Commit**

```bash
git add supabase/
git commit -m "feat: add database schema with RLS policies and match trigger"
```

---

## Task 6: Supabase Client + DB Types

- [ ] **Step 1: Write the failing test**

Create `__tests__/lib/supabase.test.ts`:

```ts
import { supabase } from '@/lib/supabase';

describe('supabase client', () => {
  it('is a singleton', async () => {
    const { supabase: second } = await import('@/lib/supabase');
    expect(supabase).toBe(second);
  });

  it('exposes auth', () => {
    expect(supabase.auth).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest __tests__/lib/supabase.test.ts --no-coverage
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create `types/database.ts`**

```ts
export type CostRange = '€' | '€€' | '€€€';
export type SwipeDirection = 'like' | 'pass';
export type MatchStatus = 'pending' | 'scheduled' | 'completed';
export type AuthProvider = 'google' | 'apple' | 'email';

export interface DbUser {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  location_region: string;
  auth_provider: AuthProvider;
  expo_push_token: string | null;
  created_at: string;
}

export interface DbCouple {
  id: string;
  user_a_id: string;
  user_b_id: string | null;
  invite_code: string;
  location_region: string; // shared couple location for filtering date ideas
  created_at: string;
}

export interface DbDateIdea {
  id: string;
  title: string;
  tagline: string;
  photo_url: string;
  cost_range: CostRange;
  duration_mins: number;
  vibe_tags: string[];
  location_region: string;
  booking_url: string | null;
  maps_url: string | null;
  submitted_by: string | null;
  is_approved: boolean;
  created_at: string;
}

export interface DbSwipe {
  id: string;
  couple_id: string;
  user_id: string;
  idea_id: string;
  direction: SwipeDirection;
  swiped_at: string;
}

export interface DbMatch {
  id: string;
  couple_id: string;
  idea_id: string;
  matched_at: string;
  status: MatchStatus;
}

export interface DbScheduledDate {
  id: string;
  match_id: string;
  scheduled_at: string;
  calendar_event_id: string | null;
}

export interface DbDateMemory {
  id: string;
  match_id: string;
  note: string | null;
  rating: number | null;
  completed_at: string;
}
```

- [ ] **Step 4: Create `lib/supabase.ts`**

```ts
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npx jest __tests__/lib/supabase.test.ts --no-coverage
```

Expected: PASS.

- [ ] **Step 6: Smoke test the connection**

```bash
# Quick check that env vars are wired correctly
npx expo start --no-dev --minify
```

Open Expo Go or a simulator — app should launch without crashing.

- [ ] **Step 7: Commit**

```bash
git add types/database.ts lib/supabase.ts __tests__/lib/supabase.test.ts
git commit -m "feat: add supabase client and database types"
```

---

## Phase 1 Complete

At the end of Phase 1 you have:
- Expo project running on iOS + Android
- Tamagui configured with DateNu design tokens
- TypeScript + Jest working
- Supabase schema deployed with RLS and match trigger
- Supabase client singleton connected and tested

**Next:** Phase 2 — Auth & Onboarding
