# DateNu — Phase 2: Auth & Onboarding

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Users can sign in (Google, Apple, Email), create a user profile row, pair with a partner via invite code / link / QR, and land on the tab navigation.

**Architecture:** Supabase Auth handles sessions. A `users` row is created on first sign-in via an auth trigger. The pairing flow gates the tab navigation — unpaired users are redirected to the pairing screen. Deep links carrying invite tokens are stored in SecureStore before auth and consumed afterward.

**Tech Stack:** expo-auth-session (Google/Apple OAuth), Supabase Auth, expo-secure-store, expo-router, react-native-qrcode-svg, expo-barcode-scanner

**Prerequisite:** Phase 1 complete (Supabase schema deployed, Supabase client configured).

---

## File Structure (this phase)

```
app/
├── _layout.tsx              # Updated: auth redirect + session listener
├── (auth)/
│   ├── _layout.tsx          # Auth group layout (no tab bar)
│   └── login.tsx            # Login screen
├── pairing.tsx              # Couple pairing screen
└── (tabs)/
    └── _layout.tsx          # Tab bar (placeholder screens)
components/
├── pairing/
│   ├── InviteCodePanel.tsx  # Generate/enter invite code
│   ├── InviteLinkPanel.tsx  # Share link via native sheet
│   └── QRPanel.tsx          # QR display + scanner
lib/
├── auth.ts                  # Sign in/out, session, profile creation
└── couples.ts               # Couple CRUD + invite logic
hooks/
├── useAuth.ts               # Auth state
└── useCouple.ts             # Current couple + partner
__tests__/
└── lib/
    ├── auth.test.ts
    └── couples.test.ts
```

---

## Task 1: Auth Library

- [ ] **Step 1: Write failing tests**

Create `__tests__/lib/auth.test.ts`:

```ts
import { createUserProfile, signOut, getSession } from '@/lib/auth';

// Mock supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      signOut: jest.fn(),
    },
    from: jest.fn(() => ({
      upsert: jest.fn(() => ({ error: null })),
      select: jest.fn(() => ({
        eq: jest.fn(() => ({ single: jest.fn(() => ({ data: null, error: null })) })),
      })),
    })),
  },
}));

import { supabase } from '@/lib/supabase';

describe('createUserProfile', () => {
  it('upserts a user row with the correct fields', async () => {
    const mockUpsert = jest.fn().mockResolvedValue({ error: null });
    (supabase.from as jest.Mock).mockReturnValue({ upsert: mockUpsert });

    await createUserProfile({
      id: 'user-1',
      email: 'test@example.com',
      displayName: 'Test User',
      authProvider: 'email',
    });

    expect(supabase.from).toHaveBeenCalledWith('users');
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'user-1',
        email: 'test@example.com',
        display_name: 'Test User',
        auth_provider: 'email',
      }),
      { onConflict: 'id' }
    );
  });
});

describe('signOut', () => {
  it('calls supabase.auth.signOut', async () => {
    (supabase.auth.signOut as jest.Mock).mockResolvedValue({ error: null });
    await signOut();
    expect(supabase.auth.signOut).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
npx jest __tests__/lib/auth.test.ts --no-coverage
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create `lib/auth.ts`**

```ts
import { supabase } from '@/lib/supabase';
import { AuthProvider, DbUser } from '@/types/database';

export interface CreateProfileParams {
  id: string;
  email: string;
  displayName: string;
  authProvider: AuthProvider;
  avatarUrl?: string;
}

export async function createUserProfile(params: CreateProfileParams): Promise<void> {
  const { error } = await supabase.from('users').upsert(
    {
      id: params.id,
      email: params.email,
      display_name: params.displayName,
      auth_provider: params.authProvider,
      avatar_url: params.avatarUrl ?? null,
    },
    { onConflict: 'id' }
  );
  if (error) throw error;
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function getUserProfile(userId: string): Promise<DbUser | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function updateUserProfile(
  userId: string,
  updates: Partial<Pick<DbUser, 'display_name' | 'avatar_url' | 'location_region' | 'expo_push_token'>>
): Promise<void> {
  const { error } = await supabase.from('users').update(updates).eq('id', userId);
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
```

- [ ] **Step 4: Run tests to verify passing**

```bash
npx jest __tests__/lib/auth.test.ts --no-coverage
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/auth.ts __tests__/lib/auth.test.ts
git commit -m "feat: add auth library"
```

---

## Task 2: Couples Library

- [ ] **Step 1: Write failing tests**

Create `__tests__/lib/couples.test.ts`:

```ts
import { generateInviteCode, createCouple, joinCoupleByCode, getMyCouple } from '@/lib/couples';

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

import { supabase } from '@/lib/supabase';

describe('generateInviteCode', () => {
  it('returns a 6-character uppercase alphanumeric string', () => {
    const code = generateInviteCode();
    expect(code).toMatch(/^[A-Z0-9]{6}$/);
  });

  it('generates unique codes on repeated calls', () => {
    const codes = new Set(Array.from({ length: 100 }, generateInviteCode));
    expect(codes.size).toBeGreaterThan(90);
  });
});

describe('createCouple', () => {
  it('inserts a couple row with user_a_id and invite_code', async () => {
    const mockInsert = jest.fn().mockResolvedValue({
      data: { id: 'couple-1', invite_code: 'ABC123' },
      error: null,
    });
    const mockSelect = jest.fn().mockReturnValue({ single: () => mockInsert() });
    (supabase.from as jest.Mock).mockReturnValue({ insert: jest.fn().mockReturnValue({ select: mockSelect }) });

    const result = await createCouple('user-1');
    expect(supabase.from).toHaveBeenCalledWith('couples');
    expect(result).toMatchObject({ id: 'couple-1' });
  });
});

describe('joinCoupleByCode', () => {
  it('throws when code is not found', async () => {
    const mockSingle = jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } });
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          is: jest.fn().mockReturnValue({ single: mockSingle }),
        }),
      }),
    });
    await expect(joinCoupleByCode('user-2', 'BADCODE')).rejects.toThrow('Invalid invite code');
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
npx jest __tests__/lib/couples.test.ts --no-coverage
```

Expected: FAIL.

- [ ] **Step 3: Create `lib/couples.ts`**

```ts
import { supabase } from '@/lib/supabase';
import { DbCouple } from '@/types/database';

export function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // omit ambiguous chars
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export async function getOrCreateCouple(userAId: string, userARegion: string): Promise<DbCouple> {
  // Return existing unpaired couple row if one exists, to avoid orphaned rows
  const existing = await getMyUnpairedCouple(userAId);
  if (existing) return existing;

  const code = generateInviteCode();
  const { data, error } = await supabase
    .from('couples')
    .insert({ user_a_id: userAId, invite_code: code, location_region: userARegion })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Internal helper — finds an unpaired couple row started by this user
async function getMyUnpairedCouple(userAId: string): Promise<DbCouple | null> {
  const { data, error } = await supabase
    .from('couples')
    .select('*')
    .eq('user_a_id', userAId)
    .is('user_b_id', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

// Kept for backward compat in tests — prefer getOrCreateCouple in UI
export async function createCouple(userAId: string, locationRegion = ''): Promise<DbCouple> {
  return getOrCreateCouple(userAId, locationRegion);
}

export async function joinCoupleByCode(userBId: string, code: string): Promise<DbCouple> {
  // Find couple with this code that hasn't been paired yet
  const { data: couple, error: findError } = await supabase
    .from('couples')
    .select('*')
    .eq('invite_code', code.toUpperCase())
    .is('user_b_id', null)
    .single();

  if (findError || !couple) throw new Error('Invalid invite code');
  if (couple.user_a_id === userBId) throw new Error('You cannot pair with yourself');

  const { data, error } = await supabase
    .from('couples')
    .update({ user_b_id: userBId })
    .eq('id', couple.id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCoupleLocation(coupleId: string, locationRegion: string): Promise<void> {
  const { error } = await supabase
    .from('couples')
    .update({ location_region: locationRegion })
    .eq('id', coupleId);
  if (error) throw error;
}

export async function getMyCouple(userId: string): Promise<DbCouple | null> {
  const { data, error } = await supabase
    .from('couples')
    .select('*')
    .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
    .not('user_b_id', 'is', null)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function getCoupleByInviteCode(code: string): Promise<DbCouple | null> {
  const { data, error } = await supabase
    .from('couples')
    .select('*')
    .eq('invite_code', code.toUpperCase())
    .is('user_b_id', null)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

// Returns the deep-link URL for inviting a partner
export function buildInviteLink(inviteCode: string): string {
  return `datenu://pair?code=${inviteCode}`;
}
```

- [ ] **Step 4: Run tests**

```bash
npx jest __tests__/lib/couples.test.ts --no-coverage
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/couples.ts __tests__/lib/couples.test.ts
git commit -m "feat: add couples library with invite code generation and pairing logic"
```

---

## Task 3: useAuth Hook + Root Layout

- [ ] **Step 1: Create `hooks/useAuth.ts`**

```ts
import { useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { DbUser } from '@/types/database';
import { getUserProfile } from '@/lib/auth';

export interface AuthState {
  session: Session | null;
  user: DbUser | null;
  loading: boolean;
}

export function useAuth(): AuthState {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<DbUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) loadProfile(session.user.id);
      else setLoading(false);
    });

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) loadProfile(session.user.id);
      else { setUser(null); setLoading(false); }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loadProfile(userId: string) {
    try {
      const profile = await getUserProfile(userId);
      setUser(profile);
    } finally {
      setLoading(false);
    }
  }

  return { session, user, loading };
}
```

- [ ] **Step 2: Create `hooks/useCouple.ts`**

```ts
import { useEffect, useState } from 'react';
import { DbCouple, DbUser } from '@/types/database';
import { getMyCouple } from '@/lib/couples';
import { getUserProfile } from '@/lib/auth';

export interface CoupleState {
  couple: DbCouple | null;
  partner: DbUser | null;
  loading: boolean;
  refresh: () => void;
}

export function useCouple(userId: string | undefined): CoupleState {
  const [couple, setCouple] = useState<DbCouple | null>(null);
  const [partner, setPartner] = useState<DbUser | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!userId) { setLoading(false); return; }
    try {
      const c = await getMyCouple(userId);
      setCouple(c);
      if (c) {
        const partnerId = c.user_a_id === userId ? c.user_b_id : c.user_a_id;
        if (partnerId) {
          const p = await getUserProfile(partnerId);
          setPartner(p);
        }
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [userId]);

  return { couple, partner, loading, refresh: load };
}
```

- [ ] **Step 3: Update `app/_layout.tsx`**

```tsx
import { useEffect } from 'react';
import { TamaguiProvider } from '@tamagui/core';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import config from '@/tamagui.config';
import { useAuth } from '@/hooks/useAuth';
import { useCouple } from '@/hooks/useCouple';

export const PENDING_INVITE_KEY = 'pendingInviteCode';

function AuthGuard() {
  const { session, loading: authLoading } = useAuth();
  const { couple, loading: coupleLoading } = useCouple(session?.user?.id);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (authLoading || coupleLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inPairing = segments[0] === 'pairing';

    if (!session) {
      if (!inAuthGroup) router.replace('/(auth)/login');
    } else if (!couple) {
      if (!inPairing) router.replace('/pairing');
    } else {
      if (inAuthGroup || inPairing) router.replace('/(tabs)');
    }
  }, [session, couple, authLoading, coupleLoading]);

  return null;
}

export default function RootLayout() {
  return (
    <TamaguiProvider config={config}>
      <AuthGuard />
      <Stack screenOptions={{ headerShown: false }} />
    </TamaguiProvider>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add hooks/useAuth.ts hooks/useCouple.ts app/_layout.tsx
git commit -m "feat: add useAuth and useCouple hooks with root layout auth guard"
```

---

## Task 4: Login Screen

- [ ] **Step 1: Create `app/(auth)/_layout.tsx`**

```tsx
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

- [ ] **Step 2: Create `app/(auth)/login.tsx`**

```tsx
import { useState } from 'react';
import { Alert, Platform } from 'react-native';
import { YStack, XStack, Text, Input, Button, Separator, Spinner } from 'tamagui';
import { makeRedirectUri, useAuthRequest } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '@/lib/supabase';
import { createUserProfile } from '@/lib/auth';
import { colors, spacing } from '@/constants/theme';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleEmailAuth() {
    if (!email || !password) return Alert.alert('Please enter email and password');
    setLoading(true);
    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data.user) {
          await createUserProfile({
            id: data.user.id,
            email,
            displayName: email.split('@')[0],
            authProvider: 'email',
          });
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: makeRedirectUri({ scheme: 'datenu' }),
          skipBrowserRedirect: true,
        },
      });
      if (error) throw error;
      if (data.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, makeRedirectUri({ scheme: 'datenu' }));
        if (result.type === 'success') {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            await createUserProfile({
              id: session.user.id,
              email: session.user.email ?? '',
              displayName: session.user.user_metadata?.full_name ?? session.user.email?.split('@')[0] ?? 'User',
              authProvider: 'google',
              avatarUrl: session.user.user_metadata?.avatar_url,
            });
          }
        }
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAppleSignIn() {
    // Apple Sign-In is iOS only
    if (Platform.OS !== 'ios') {
      Alert.alert('Apple Sign-In is only available on iOS');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: makeRedirectUri({ scheme: 'datenu' }),
          skipBrowserRedirect: true,
        },
      });
      if (error) throw error;
      if (data.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, makeRedirectUri({ scheme: 'datenu' }));
        if (result.type === 'success') {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            await createUserProfile({
              id: session.user.id,
              email: session.user.email ?? '',
              displayName: session.user.user_metadata?.full_name ?? 'User',
              authProvider: 'apple',
            });
          }
        }
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <YStack flex={1} backgroundColor={colors.background} justifyContent="center" padding={spacing.xl}>
      {/* Logo placeholder */}
      <YStack alignItems="center" marginBottom={spacing.xxl}>
        <Text fontSize={40}>💛</Text>
        <Text fontSize={32} fontWeight="700" color={colors.textPrimary} marginTop={spacing.sm}>
          DateNu
        </Text>
        <Text fontSize={16} color={colors.textSecondary} marginTop={spacing.xs}>
          Find your next adventure together
        </Text>
      </YStack>

      {/* Social login */}
      <YStack gap={spacing.sm}>
        <Button
          onPress={handleGoogleSignIn}
          disabled={loading}
          backgroundColor={colors.surface}
          borderWidth={1}
          borderColor={colors.border}
          borderRadius={radii.lg}
          height={52}
        >
          <Text fontWeight="600" color={colors.textPrimary}>Continue with Google</Text>
        </Button>

        {Platform.OS === 'ios' && (
          <Button
            onPress={handleAppleSignIn}
            disabled={loading}
            backgroundColor={colors.textPrimary}
            borderRadius={radii.lg}
            height={52}
          >
            <Text fontWeight="600" color={colors.background}>Continue with Apple</Text>
          </Button>
        )}
      </YStack>

      <XStack alignItems="center" marginVertical={spacing.lg}>
        <Separator flex={1} />
        <Text color={colors.textSecondary} marginHorizontal={spacing.sm} fontSize={12}>or</Text>
        <Separator flex={1} />
      </XStack>

      {/* Email login */}
      <YStack gap={spacing.sm}>
        <Input
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          height={52}
          borderRadius={radii.lg}
          borderColor={colors.border}
        />
        <Input
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          height={52}
          borderRadius={radii.lg}
          borderColor={colors.border}
        />
        <Button
          onPress={handleEmailAuth}
          disabled={loading}
          backgroundColor={colors.accent}
          borderRadius={radii.lg}
          height={52}
        >
          {loading ? <Spinner color={colors.background} /> : (
            <Text fontWeight="600" color={colors.background}>
              {isSignUp ? 'Create Account' : 'Sign In'}
            </Text>
          )}
        </Button>

        <Button unstyled onPress={() => setIsSignUp(!isSignUp)} marginTop={spacing.xs}>
          <Text color={colors.textSecondary} textAlign="center" fontSize={14}>
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </Text>
        </Button>
      </YStack>
    </YStack>
  );
}
```

> Note: Import `radii` from `@/constants/theme` at the top of the file.

- [ ] **Step 3: Configure Google OAuth in Supabase**

  In Supabase Dashboard → Authentication → Providers → Google:
  - Enable Google provider
  - Add your Google OAuth Client ID and Secret (create at https://console.cloud.google.com)
  - Add `datenu://` as authorized redirect URI

  For Apple: Authentication → Providers → Apple, follow Supabase docs for Apple setup.

- [ ] **Step 4: Verify login flow manually**

  Run `npx expo start`, open on device/simulator, confirm:
  - Email signup creates a user in Supabase Auth + a row in `public.users`
  - Google login works and creates profile row
  - After sign-in, auth guard redirects to `/pairing`

- [ ] **Step 5: Commit**

```bash
git add app/(auth)/
git commit -m "feat: add login screen with email, google, and apple auth"
```

---

## Task 5: Splash Screen

- [ ] **Step 1: Add Lottie logo animation**

  Download a simple logo/sparkle Lottie animation from https://lottiefiles.com (search "sparkle", "love logo", or "heart logo). Save it to `assets/animations/logo-intro.json`.

  Note: `assets/animations/heart-burst.json` is a **separate** file used for the match reveal in Phase 3 — do not reuse `logo-intro.json` for that. They serve different moments in the app.

- [ ] **Step 2: Create `app/splash.tsx`** (shown before auth redirects settle)

  Actually, Expo handles the native splash screen. We extend it with a custom animated screen. Update `app/_layout.tsx` to show a custom splash while `authLoading` or `coupleLoading` is true:

```tsx
// Add to app/_layout.tsx, inside RootLayout, wrapping the Stack:
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

SplashScreen.preventAutoHideAsync();

// Inside AuthGuard, hide native splash once loading is done:
useEffect(() => {
  if (!authLoading && !coupleLoading) {
    SplashScreen.hideAsync();
  }
}, [authLoading, coupleLoading]);
```

- [ ] **Step 3: Configure splash in `app.json`** (already done in Phase 1, verify colors match)

  Confirm `backgroundColor: "#FAFAF8"` is set. Expo will use `assets/splash.png` — create a simple image with the DateNu logo or just a `💛` on the warm background.

- [ ] **Step 4: Commit**

```bash
git add assets/animations/ app/_layout.tsx
git commit -m "feat: extend splash screen until auth and couple state resolve"
```

---

## Task 6: Couple Pairing Screen

- [ ] **Step 1: Create `components/pairing/InviteCodePanel.tsx`**

```tsx
import { useState } from 'react';
import { Alert, Share } from 'react-native';
import { YStack, XStack, Text, Input, Button, Spinner } from 'tamagui';
import { colors, spacing, radii } from '@/constants/theme';
import { createCouple, joinCoupleByCode, buildInviteLink } from '@/lib/couples';

interface Props {
  userId: string;
  userRegion: string;
  onPaired: () => void;
}

export function InviteCodePanel({ userId, userRegion, onPaired }: Props) {
  const [myCode, setMyCode] = useState<string | null>(null);
  const [enteredCode, setEnteredCode] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    try {
      const couple = await getOrCreateCouple(userId, userRegion);
      setMyCode(couple.invite_code);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin() {
    if (!enteredCode.trim()) return;
    setLoading(true);
    try {
      await joinCoupleByCode(userId, enteredCode.trim());
      onPaired();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <YStack gap={spacing.lg}>
      {/* Generate your code */}
      <YStack gap={spacing.sm}>
        <Text fontWeight="600" color={colors.textPrimary}>Share your code</Text>
        {myCode ? (
          <YStack
            backgroundColor={colors.accentLight}
            borderRadius={radii.lg}
            padding={spacing.lg}
            alignItems="center"
          >
            <Text fontSize={32} fontWeight="700" letterSpacing={8} color={colors.accent}>
              {myCode}
            </Text>
          </YStack>
        ) : (
          <Button
            onPress={handleGenerate}
            disabled={loading}
            backgroundColor={colors.surface}
            borderWidth={1}
            borderColor={colors.border}
            borderRadius={radii.lg}
            height={52}
          >
            {loading ? <Spinner /> : <Text color={colors.textPrimary}>Generate my code</Text>}
          </Button>
        )}
      </YStack>

      {/* Enter partner's code */}
      <YStack gap={spacing.sm}>
        <Text fontWeight="600" color={colors.textPrimary}>Enter partner's code</Text>
        <XStack gap={spacing.sm}>
          <Input
            flex={1}
            placeholder="ABC123"
            value={enteredCode}
            onChangeText={(t) => setEnteredCode(t.toUpperCase())}
            autoCapitalize="characters"
            maxLength={6}
            height={52}
            borderRadius={radii.lg}
            borderColor={colors.border}
          />
          <Button
            onPress={handleJoin}
            disabled={loading || enteredCode.length < 6}
            backgroundColor={colors.accent}
            borderRadius={radii.lg}
            height={52}
            paddingHorizontal={spacing.lg}
          >
            <Text fontWeight="600" color={colors.background}>Join</Text>
          </Button>
        </XStack>
      </YStack>
    </YStack>
  );
}
```

- [ ] **Step 2: Create `components/pairing/InviteLinkPanel.tsx`**

```tsx
import { Alert, Share } from 'react-native';
import { useState } from 'react';
import { YStack, Text, Button, Spinner } from 'tamagui';
import { colors, spacing, radii } from '@/constants/theme';
import { getOrCreateCouple, buildInviteLink } from '@/lib/couples';

interface Props {
  userId: string;
  userRegion: string;
}

export function InviteLinkPanel({ userId, userRegion }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleShare() {
    setLoading(true);
    try {
      const couple = await getOrCreateCouple(userId, userRegion);
      const url = buildInviteLink(couple.invite_code);
      await Share.share({
        message: `Join me on DateNu! Use this link to pair with me: ${url}`,
        url,
      });
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <YStack gap={spacing.sm}>
      <Text fontWeight="600" color={colors.textPrimary}>Invite via link</Text>
      <Text color={colors.textSecondary} fontSize={14}>
        Send your partner a link to pair instantly.
      </Text>
      <Button
        onPress={handleShare}
        disabled={loading}
        backgroundColor={colors.accent}
        borderRadius={radii.lg}
        height={52}
      >
        {loading ? <Spinner color={colors.background} /> : (
          <Text fontWeight="600" color={colors.background}>Share invite link</Text>
        )}
      </Button>
    </YStack>
  );
}
```

- [ ] **Step 3: Create `components/pairing/QRPanel.tsx`**

```tsx
import { useState } from 'react';
import { Alert } from 'react-native';
import { YStack, XStack, Text, Button, Spinner } from 'tamagui';
import QRCode from 'react-native-qrcode-svg';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { colors, spacing, radii } from '@/constants/theme';
import { getOrCreateCouple, buildInviteLink, joinCoupleByCode } from '@/lib/couples';

interface Props {
  userId: string;
  userRegion: string;
  onPaired: () => void;
}

export function QRPanel({ userId, userRegion, onPaired }: Props) {
  const [myCode, setMyCode] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  async function handleShowQR() {
    setLoading(true);
    try {
      const couple = await getOrCreateCouple(userId, userRegion);
      setMyCode(couple.invite_code);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleStartScan() {
    if (!permission?.granted) await requestPermission();
    setScanning(true);
  }

  function handleScan({ data }: { data: string }) {
    setScanning(false);
    // data will be the deep link: datenu://pair?code=XXXXXX
    const match = data.match(/code=([A-Z0-9]{6})/);
    if (!match) return Alert.alert('Invalid QR code');
    joinCoupleByCode(userId, match[1])
      .then(onPaired)
      .catch((e: any) => Alert.alert('Error', e.message));
  }

  if (scanning) {
    return (
      <YStack flex={1}>
        <CameraView
          style={{ flex: 1 }}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={handleScan}
        />
        <Button onPress={() => setScanning(false)} marginTop={spacing.md}>
          <Text>Cancel</Text>
        </Button>
      </YStack>
    );
  }

  return (
    <YStack gap={spacing.lg} alignItems="center">
      {myCode ? (
        <YStack
          backgroundColor={colors.surface}
          borderRadius={radii.lg}
          padding={spacing.lg}
          alignItems="center"
          gap={spacing.sm}
        >
          <QRCode value={buildInviteLink(myCode)} size={200} color={colors.textPrimary} />
          <Text color={colors.textSecondary} fontSize={14}>Show this to your partner</Text>
        </YStack>
      ) : (
        <Button
          onPress={handleShowQR}
          disabled={loading}
          backgroundColor={colors.surface}
          borderWidth={1}
          borderColor={colors.border}
          borderRadius={radii.lg}
          height={52}
          width="100%"
        >
          {loading ? <Spinner /> : <Text color={colors.textPrimary}>Show my QR code</Text>}
        </Button>
      )}

      <Button
        onPress={() => setScanning(true)}
        backgroundColor={colors.accent}
        borderRadius={radii.lg}
        height={52}
        width="100%"
      >
        <Text fontWeight="600" color={colors.background}>Scan partner's QR code</Text>
      </Button>
    </YStack>
  );
}
```

- [ ] **Step 4: Create `app/pairing.tsx`**

```tsx
import { useState } from 'react';
import { YStack, XStack, Text, ScrollView } from 'tamagui';
import { colors, spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useCouple } from '@/hooks/useCouple';
import { InviteCodePanel } from '@/components/pairing/InviteCodePanel';
import { InviteLinkPanel } from '@/components/pairing/InviteLinkPanel';
import { QRPanel } from '@/components/pairing/QRPanel';

type Method = 'code' | 'link' | 'qr';

export default function PairingScreen() {
  const { session, user } = useAuth();
  const { refresh } = useCouple(session?.user?.id);
  const [method, setMethod] = useState<Method>('code');
  const userId = session?.user?.id ?? '';
  const userRegion = user?.location_region ?? '';

  function onPaired() {
    refresh(); // triggers auth guard to redirect to tabs
  }

  return (
    <ScrollView backgroundColor={colors.background}>
      <YStack padding={spacing.xl} gap={spacing.xl} paddingTop={64}>
        <YStack gap={spacing.xs}>
          <Text fontSize={28} fontWeight="700" color={colors.textPrimary}>Find your person 💛</Text>
          <Text color={colors.textSecondary}>Connect with your partner to start discovering dates together.</Text>
        </YStack>

        {/* Method selector */}
        <XStack gap={spacing.sm}>
          {(['code', 'link', 'qr'] as Method[]).map((m) => (
            <YStack
              key={m}
              flex={1}
              backgroundColor={method === m ? colors.accent : colors.surface}
              borderRadius={8}
              borderWidth={1}
              borderColor={method === m ? colors.accent : colors.border}
              padding={spacing.sm}
              alignItems="center"
              onPress={() => setMethod(m)}
            >
              <Text
                fontWeight="600"
                fontSize={13}
                color={method === m ? colors.background : colors.textPrimary}
              >
                {m === 'code' ? 'Code' : m === 'link' ? 'Link' : 'QR'}
              </Text>
            </YStack>
          ))}
        </XStack>

        {/* Active method panel */}
        {method === 'code' && <InviteCodePanel userId={userId} userRegion={userRegion} onPaired={onPaired} />}
        {method === 'link' && <InviteLinkPanel userId={userId} userRegion={userRegion} />}
        {method === 'qr' && <QRPanel userId={userId} userRegion={userRegion} onPaired={onPaired} />}
      </YStack>
    </ScrollView>
  );
}
```

- [ ] **Step 5: Handle deep link invite token (pre-auth)**

  Update `app/_layout.tsx` to intercept incoming deep links and store the invite code before auth resolves:

```tsx
// Add to app/_layout.tsx RootLayout, inside useEffect at mount:
import * as Linking from 'expo-linking';
import * as SecureStore from 'expo-secure-store';

// In RootLayout:
useEffect(() => {
  async function handleInitialUrl() {
    const url = await Linking.getInitialURL();
    if (url) consumeInviteLink(url);
  }
  handleInitialUrl();
  const sub = Linking.addEventListener('url', ({ url }) => consumeInviteLink(url));
  return () => sub.remove();
}, []);

async function consumeInviteLink(url: string) {
  const match = url.match(/code=([A-Z0-9]{6})/);
  if (match) {
    await SecureStore.setItemAsync(PENDING_INVITE_KEY, match[1]);
  }
}
```

  In `app/pairing.tsx`, on mount check for a pending code and auto-fill the code input:

```tsx
// In PairingScreen, add useEffect:
import * as SecureStore from 'expo-secure-store';

useEffect(() => {
  SecureStore.getItemAsync(PENDING_INVITE_KEY).then(async (code) => {
    if (code && userId) {
      await SecureStore.deleteItemAsync(PENDING_INVITE_KEY);
      // auto-join
      try {
        await joinCoupleByCode(userId, code);
        onPaired();
      } catch (_) { /* let user pair manually */ }
    }
  });
}, [userId]);
```

- [ ] **Step 6: Create placeholder tab layout**

Create `app/(tabs)/_layout.tsx`:

```tsx
import { Tabs } from 'expo-router';
import { colors } from '@/constants/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Swipe' }} />
      <Tabs.Screen name="dates" options={{ title: 'Dates' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
```

Create placeholder screens:

```tsx
// app/(tabs)/index.tsx
import { YStack, Text } from 'tamagui';
export default function SwipeTab() {
  return <YStack flex={1} justifyContent="center" alignItems="center"><Text>Swipe coming soon</Text></YStack>;
}

// app/(tabs)/dates.tsx
import { YStack, Text } from 'tamagui';
export default function DatesTab() {
  return <YStack flex={1} justifyContent="center" alignItems="center"><Text>Dates coming soon</Text></YStack>;
}

// app/(tabs)/profile.tsx
import { YStack, Text } from 'tamagui';
export default function ProfileTab() {
  return <YStack flex={1} justifyContent="center" alignItems="center"><Text>Profile coming soon</Text></YStack>;
}
```

- [ ] **Step 7: Verify the full flow manually**

  1. Launch app → sees Login screen
  2. Sign up with email → redirected to Pairing screen
  3. Generate a code on device A
  4. Enter code on device B (or second simulator) → both land on tab navigation
  5. Kill and reopen app → goes straight to tabs (session persisted)

- [ ] **Step 8: Commit**

```bash
git add app/ components/pairing/ hooks/
git commit -m "feat: add couple pairing screen with code, link, and QR methods"
```

---

## Phase 2 Complete

At the end of Phase 2 you have:
- Working login with Google, Apple, and Email/Password
- Auth guard redirecting unauthenticated users to login, unpaired users to pairing
- Full couple pairing flow (code, link share, QR scan)
- Deep link invite token handling (pre-auth storage + auto-join)
- Tab navigation skeleton with placeholder screens

**Next:** Phase 3 — Swipe Feature
