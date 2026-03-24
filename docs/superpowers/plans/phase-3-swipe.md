# DateNu — Phase 3: Swipe Feature

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A fully working swipe tab — couples independently swipe on location-filtered date idea cards, matches are detected via DB trigger, and a Lottie animation reveals the match to each partner.

**Architecture:** `ideas.ts` fetches approved, location-filtered ideas excluding already-swiped ones. `swipes.ts` records like/pass and the DB trigger creates matches. A Supabase Realtime subscription on `matches` detects new matches and shows the reveal animation. `CardStack` uses Reanimated 3 pan gesture for spring-physics swiping.

**Tech Stack:** Reanimated 3, GestureHandler, Lottie, Supabase Realtime, expo-image

**Prerequisite:** Phase 2 complete (auth working, user is paired).

---

## File Structure (this phase)

```
components/
├── swipe/
│   ├── SwipeCard.tsx        # Card UI (photo, title, tags, cost, duration)
│   ├── CardDetail.tsx       # Expanded bottom sheet on tap
│   ├── CardStack.tsx        # Gesture-driven card stack
│   └── MatchReveal.tsx      # Full-screen match reveal overlay
└── ui/
    ├── VibeTags.tsx         # Pill tag row
    └── CostBadge.tsx        # € / €€ / €€€ badge
lib/
├── ideas.ts                 # Fetch approved ideas for couple
└── swipes.ts                # Record swipe; query unseen ideas
hooks/
└── useIdeas.ts              # Ideas state for swipe stack
app/(tabs)/
└── index.tsx                # Swipe tab (replaces placeholder)
__tests__/
└── lib/
    ├── ideas.test.ts
    └── swipes.test.ts
```

---

## Task 1: UI Primitives — VibeTags + CostBadge

- [ ] **Step 1: Write failing tests**

Create `__tests__/components/VibeTags.test.tsx`:

```tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import { TamaguiProvider } from '@tamagui/core';
import config from '@/tamagui.config';
import { VibeTags } from '@/components/ui/VibeTags';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <TamaguiProvider config={config}>{children}</TamaguiProvider>
);

describe('VibeTags', () => {
  it('renders each tag as text', () => {
    const { getByText } = render(
      <VibeTags tags={['Romantic', 'Cozy']} />,
      { wrapper }
    );
    expect(getByText('Romantic')).toBeTruthy();
    expect(getByText('Cozy')).toBeTruthy();
  });

  it('renders nothing when tags is empty', () => {
    const { toJSON } = render(<VibeTags tags={[]} />, { wrapper });
    expect(toJSON()).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
npx jest __tests__/components/VibeTags.test.tsx --no-coverage
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create `components/ui/VibeTags.tsx`**

```tsx
import { XStack, Text } from 'tamagui';
import { colors, spacing, radii } from '@/constants/theme';

interface Props {
  tags: string[];
}

export function VibeTags({ tags }: Props) {
  if (!tags.length) return null;
  return (
    <XStack flexWrap="wrap" gap={spacing.xs}>
      {tags.map((tag) => (
        <XStack
          key={tag}
          backgroundColor={colors.accentLight}
          borderRadius={radii.full}
          paddingHorizontal={spacing.sm}
          paddingVertical={4}
        >
          <Text fontSize={12} color={colors.accent} fontWeight="600">{tag}</Text>
        </XStack>
      ))}
    </XStack>
  );
}
```

- [ ] **Step 4: Create `components/ui/CostBadge.tsx`**

```tsx
import { XStack, Text } from 'tamagui';
import { colors, spacing, radii } from '@/constants/theme';
import type { CostRange } from '@/types/database';

interface Props {
  cost: CostRange;
}

export function CostBadge({ cost }: Props) {
  return (
    <XStack
      backgroundColor="rgba(0,0,0,0.35)"
      borderRadius={radii.full}
      paddingHorizontal={spacing.sm}
      paddingVertical={4}
    >
      <Text fontSize={13} color="#FFFFFF" fontWeight="600">{cost}</Text>
    </XStack>
  );
}
```

- [ ] **Step 5: Run tests**

```bash
npx jest __tests__/components/VibeTags.test.tsx --no-coverage
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add components/ui/ __tests__/components/VibeTags.test.tsx
git commit -m "feat: add VibeTags and CostBadge UI components"
```

---

## Task 2: Ideas Library

- [ ] **Step 1: Write failing tests**

Create `__tests__/lib/ideas.test.ts`:

```ts
import { getIdeasForCouple } from '@/lib/ideas';

jest.mock('@/lib/supabase', () => ({
  supabase: { from: jest.fn() },
}));
import { supabase } from '@/lib/supabase';

describe('getIdeasForCouple', () => {
  it('queries approved ideas filtered by location', async () => {
    const mockData = [{ id: 'idea-1', title: 'Sunset Hike', is_approved: true }];
    const mockQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      not: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: mockData, error: null }),
    };
    (supabase.from as jest.Mock).mockReturnValue(mockQuery);

    const result = await getIdeasForCouple({
      coupleId: 'couple-1',
      locationRegion: 'Copenhagen',
      seenIdeaIds: [],
    });

    expect(supabase.from).toHaveBeenCalledWith('date_ideas');
    expect(result).toHaveLength(1);
  });

  it('excludes already-swiped idea IDs', async () => {
    const mockQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      not: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: [], error: null }),
    };
    (supabase.from as jest.Mock).mockReturnValue(mockQuery);

    await getIdeasForCouple({
      coupleId: 'couple-1',
      locationRegion: 'Copenhagen',
      seenIdeaIds: ['idea-1', 'idea-2'],
    });

    expect(mockQuery.not).toHaveBeenCalledWith('id', 'in', '("idea-1","idea-2")');
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
npx jest __tests__/lib/ideas.test.ts --no-coverage
```

Expected: FAIL.

- [ ] **Step 3: Create `lib/ideas.ts`**

```ts
import { supabase } from '@/lib/supabase';
import { DbDateIdea } from '@/types/database';

interface GetIdeasParams {
  coupleId: string;
  locationRegion: string;
  seenIdeaIds: string[];
}

export async function getIdeasForCouple({
  locationRegion,
  seenIdeaIds,
}: GetIdeasParams): Promise<DbDateIdea[]> {
  let query = supabase
    .from('date_ideas')
    .select('*')
    .eq('is_approved', true)
    .eq('location_region', locationRegion)
    .order('created_at', { ascending: false });

  if (seenIdeaIds.length > 0) {
    const ids = seenIdeaIds.map((id) => `"${id}"`).join(',');
    query = query.not('id', 'in', `(${ids})`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getIdeaById(id: string): Promise<DbDateIdea | null> {
  const { data, error } = await supabase
    .from('date_ideas')
    .select('*')
    .eq('id', id)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}
```

- [ ] **Step 4: Run tests**

```bash
npx jest __tests__/lib/ideas.test.ts --no-coverage
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/ideas.ts __tests__/lib/ideas.test.ts
git commit -m "feat: add ideas library with location-filtered query"
```

---

## Task 3: Swipes Library

- [ ] **Step 1: Write failing tests**

Create `__tests__/lib/swipes.test.ts`:

```ts
import { recordSwipe, getSwipedIdeaIds } from '@/lib/swipes';

jest.mock('@/lib/supabase', () => ({
  supabase: { from: jest.fn() },
}));
import { supabase } from '@/lib/supabase';

describe('recordSwipe', () => {
  it('inserts a swipe row with correct fields', async () => {
    const mockInsert = jest.fn().mockResolvedValue({ error: null });
    (supabase.from as jest.Mock).mockReturnValue({ insert: mockInsert });

    await recordSwipe({
      coupleId: 'couple-1',
      userId: 'user-1',
      ideaId: 'idea-1',
      direction: 'like',
    });

    expect(supabase.from).toHaveBeenCalledWith('swipes');
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        couple_id: 'couple-1',
        user_id: 'user-1',
        idea_id: 'idea-1',
        direction: 'like',
      })
    );
  });
});

describe('getSwipedIdeaIds', () => {
  it('returns idea ids already swiped by this user in this couple', async () => {
    const mockData = [{ idea_id: 'idea-1' }, { idea_id: 'idea-2' }];
    const mockQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      then: jest.fn((cb) => cb({ data: mockData, error: null })),
    };
    // Chain: .eq().eq() → resolves
    const mockEq = jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ data: mockData, error: null }),
    });
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({ eq: mockEq }),
    });

    const ids = await getSwipedIdeaIds('couple-1', 'user-1');
    expect(ids).toEqual(['idea-1', 'idea-2']);
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
npx jest __tests__/lib/swipes.test.ts --no-coverage
```

Expected: FAIL.

- [ ] **Step 3: Create `lib/swipes.ts`**

```ts
import { supabase } from '@/lib/supabase';
import { SwipeDirection } from '@/types/database';

interface RecordSwipeParams {
  coupleId: string;
  userId: string;
  ideaId: string;
  direction: SwipeDirection;
}

export async function recordSwipe(params: RecordSwipeParams): Promise<void> {
  const { error } = await supabase.from('swipes').insert({
    couple_id: params.coupleId,
    user_id: params.userId,
    idea_id: params.ideaId,
    direction: params.direction,
  });
  // Ignore unique constraint violations (idempotent)
  if (error && error.code !== '23505') throw error;
}

export async function getSwipedIdeaIds(coupleId: string, userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('swipes')
    .select('idea_id')
    .eq('couple_id', coupleId)
    .eq('user_id', userId);
  if (error) throw error;
  return (data ?? []).map((row) => row.idea_id);
}
```

- [ ] **Step 4: Run tests**

```bash
npx jest __tests__/lib/swipes.test.ts --no-coverage
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/swipes.ts __tests__/lib/swipes.test.ts
git commit -m "feat: add swipes library"
```

---

## Task 4: useIdeas Hook

- [ ] **Step 1: Create `hooks/useIdeas.ts`**

```ts
import { useEffect, useState, useCallback } from 'react';
import { DbDateIdea } from '@/types/database';
import { getIdeasForCouple } from '@/lib/ideas';
import { getSwipedIdeaIds } from '@/lib/swipes';

interface UseIdeasParams {
  coupleId: string;
  userId: string;
  locationRegion: string;
}

export function useIdeas({ coupleId, userId, locationRegion }: UseIdeasParams) {
  const [ideas, setIdeas] = useState<DbDateIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const seenIds = await getSwipedIdeaIds(coupleId, userId);
      const fresh = await getIdeasForCouple({ coupleId, locationRegion, seenIdeaIds: seenIds });
      setIdeas(fresh);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [coupleId, userId, locationRegion]);

  useEffect(() => { load(); }, [load]);

  function removeTop() {
    setIdeas((prev) => prev.slice(0, -1));
  }

  return { ideas, loading, error, reload: load, removeTop };
}
```

- [ ] **Step 2: Commit**

```bash
git add hooks/useIdeas.ts
git commit -m "feat: add useIdeas hook"
```

---

## Task 5: SwipeCard + CardDetail

- [ ] **Step 1: Create `components/swipe/SwipeCard.tsx`**

```tsx
import { Dimensions, Linking } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { VibeTags } from '@/components/ui/VibeTags';
import { CostBadge } from '@/components/ui/CostBadge';
import { DbDateIdea } from '@/types/database';
import { colors, spacing, radii } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
export const CARD_WIDTH = SCREEN_WIDTH - spacing.xl * 2;
export const CARD_HEIGHT = CARD_WIDTH * 1.4;

interface Props {
  idea: DbDateIdea;
  onPress: () => void;
}

export function SwipeCard({ idea, onPress }: Props) {
  const durationLabel = idea.duration_mins < 60
    ? `${idea.duration_mins} min`
    : `${Math.round(idea.duration_mins / 60)} hrs`;

  return (
    <YStack
      width={CARD_WIDTH}
      height={CARD_HEIGHT}
      borderRadius={radii.lg}
      overflow="hidden"
      onPress={onPress}
      style={{ shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 16, shadowOffset: { width: 0, height: 6 } }}
    >
      {/* Photo */}
      <Image
        source={{ uri: idea.photo_url }}
        style={{ width: '100%', height: '100%', position: 'absolute' }}
        contentFit="cover"
        transition={200}
      />

      {/* Gradient overlay */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.75)']}
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '55%' }}
      />

      {/* Top row — cost + duration */}
      <XStack position="absolute" top={spacing.md} right={spacing.md} gap={spacing.xs}>
        <CostBadge cost={idea.cost_range} />
        <XStack
          backgroundColor="rgba(0,0,0,0.35)"
          borderRadius={radii.full}
          paddingHorizontal={spacing.sm}
          paddingVertical={4}
        >
          <Text fontSize={13} color="#FFFFFF" fontWeight="600">{durationLabel}</Text>
        </XStack>
      </XStack>

      {/* Bottom content */}
      <YStack position="absolute" bottom={0} left={0} right={0} padding={spacing.lg} gap={spacing.sm}>
        <Text fontSize={22} fontWeight="700" color="#FFFFFF">{idea.title}</Text>
        <Text fontSize={14} color="rgba(255,255,255,0.85)">{idea.tagline}</Text>
        <VibeTags tags={idea.vibe_tags} />
      </YStack>
    </YStack>
  );
}
```

> Install LinearGradient if not already: `npx expo install expo-linear-gradient`

- [ ] **Step 2: Create `components/swipe/CardDetail.tsx`**

```tsx
import { Modal, Linking, ScrollView } from 'react-native';
import { YStack, XStack, Text, Button } from 'tamagui';
import { Image } from 'expo-image';
import { VibeTags } from '@/components/ui/VibeTags';
import { CostBadge } from '@/components/ui/CostBadge';
import { DbDateIdea } from '@/types/database';
import { colors, spacing, radii } from '@/constants/theme';

interface Props {
  idea: DbDateIdea | null;
  onClose: () => void;
}

export function CardDetail({ idea, onClose }: Props) {
  if (!idea) return null;

  const durationLabel = idea.duration_mins < 60
    ? `${idea.duration_mins} min`
    : `${Math.round(idea.duration_mins / 60)} hrs`;

  return (
    <Modal animationType="slide" transparent presentationStyle="pageSheet" onRequestClose={onClose}>
      <YStack flex={1} backgroundColor={colors.background}>
        <Image
          source={{ uri: idea.photo_url }}
          style={{ width: '100%', height: 280 }}
          contentFit="cover"
        />
        <ScrollView>
          <YStack padding={spacing.lg} gap={spacing.md}>
            <Text fontSize={26} fontWeight="700" color={colors.textPrimary}>{idea.title}</Text>
            <Text fontSize={16} color={colors.textSecondary}>{idea.tagline}</Text>
            <XStack gap={spacing.sm} alignItems="center">
              <CostBadge cost={idea.cost_range} />
              <Text color={colors.textSecondary} fontSize={14}>{durationLabel}</Text>
              <Text color={colors.textSecondary} fontSize={14}>📍 {idea.location_region}</Text>
            </XStack>
            <VibeTags tags={idea.vibe_tags} />

            <YStack gap={spacing.sm} marginTop={spacing.sm}>
              {idea.maps_url && (
                <Button
                  onPress={() => Linking.openURL(idea.maps_url!)}
                  backgroundColor={colors.surface}
                  borderWidth={1}
                  borderColor={colors.border}
                  borderRadius={radii.lg}
                  height={52}
                >
                  <Text color={colors.textPrimary} fontWeight="600">🗺  Open in Maps</Text>
                </Button>
              )}
              {idea.booking_url && (
                <Button
                  onPress={() => Linking.openURL(idea.booking_url!)}
                  backgroundColor={colors.accent}
                  borderRadius={radii.lg}
                  height={52}
                >
                  <Text color={colors.background} fontWeight="600">🔗 Book Now</Text>
                </Button>
              )}
            </YStack>
          </YStack>
        </ScrollView>

        <Button
          position="absolute"
          top={spacing.md}
          right={spacing.md}
          circular
          size={36}
          backgroundColor="rgba(0,0,0,0.4)"
          onPress={onClose}
        >
          <Text color="#FFFFFF" fontWeight="700">✕</Text>
        </Button>
      </YStack>
    </Modal>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/swipe/SwipeCard.tsx components/swipe/CardDetail.tsx
git commit -m "feat: add SwipeCard and CardDetail components"
```

---

## Task 6: CardStack with Reanimated 3 Gestures

- [ ] **Step 1: Create `components/swipe/CardStack.tsx`**

```tsx
import { useCallback } from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import { YStack, Text } from 'tamagui';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { SwipeCard, CARD_WIDTH, CARD_HEIGHT } from './SwipeCard';
import { DbDateIdea } from '@/types/database';
import { colors, spacing } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.35;

interface Props {
  ideas: DbDateIdea[];
  onSwipeLeft: (idea: DbDateIdea) => void;
  onSwipeRight: (idea: DbDateIdea) => void;
  onCardPress: (idea: DbDateIdea) => void;
}

function SwipeableCard({
  idea,
  onSwipeLeft,
  onSwipeRight,
  onPress,
  isTop,
}: {
  idea: DbDateIdea;
  onSwipeLeft: (idea: DbDateIdea) => void;
  onSwipeRight: (idea: DbDateIdea) => void;
  onPress: () => void;
  isTop: boolean;
}) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const gesture = Gesture.Pan()
    .enabled(isTop)
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY * 0.2;
    })
    .onEnd((e) => {
      if (e.translationX > SWIPE_THRESHOLD) {
        translateX.value = withSpring(SCREEN_WIDTH * 1.5, { damping: 10 }, () => {
          runOnJS(onSwipeRight)(idea);
        });
      } else if (e.translationX < -SWIPE_THRESHOLD) {
        translateX.value = withSpring(-SCREEN_WIDTH * 1.5, { damping: 10 }, () => {
          runOnJS(onSwipeLeft)(idea);
        });
      } else {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      }
    });

  const tapGesture = Gesture.Tap()
    .enabled(isTop)
    .onEnd(() => runOnJS(onPress)());

  const composedGesture = Gesture.Simultaneous(gesture, tapGesture);

  const animStyle = useAnimatedStyle(() => {
    const rotate = interpolate(translateX.value, [-SCREEN_WIDTH, SCREEN_WIDTH], [-15, 15], Extrapolation.CLAMP);
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotate}deg` },
      ],
    };
  });

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.cardContainer, animStyle]}>
        <SwipeCard idea={idea} onPress={onPress} />
      </Animated.View>
    </GestureDetector>
  );
}

export function CardStack({ ideas, onSwipeLeft, onSwipeRight, onCardPress }: Props) {
  if (!ideas.length) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" gap={spacing.md}>
        <Text fontSize={40}>🌟</Text>
        <Text fontSize={18} fontWeight="600" color={colors.textPrimary}>You're all caught up!</Text>
        <Text color={colors.textSecondary}>Check back soon for new date ideas.</Text>
      </YStack>
    );
  }

  // Render bottom cards first (they'll be visually behind)
  const visible = ideas.slice(-3);

  return (
    <YStack width={CARD_WIDTH} height={CARD_HEIGHT} position="relative">
      {visible.map((idea, index) => (
        <SwipeableCard
          key={idea.id}
          idea={idea}
          isTop={index === visible.length - 1}
          onSwipeLeft={onSwipeLeft}
          onSwipeRight={onSwipeRight}
          onPress={() => onCardPress(idea)}
        />
      ))}
    </YStack>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add components/swipe/CardStack.tsx
git commit -m "feat: add gesture-driven CardStack with Reanimated 3"
```

---

## Task 7: Match Reveal Animation

- [ ] **Step 1: Download Lottie animation**

  1. Go to https://lottiefiles.com and search for "heart burst" or "love hearts"
  2. Download a free JSON animation and save to `assets/animations/heart-burst.json`

- [ ] **Step 2: Create `components/swipe/MatchReveal.tsx`**

```tsx
import { Modal } from 'react-native';
import { YStack, Text, Button } from 'tamagui';
import LottieView from 'lottie-react-native';
import { colors, spacing, radii } from '@/constants/theme';
import { DbDateIdea } from '@/types/database';

interface Props {
  idea: DbDateIdea | null;
  onDismiss: () => void;
}

export function MatchReveal({ idea, onDismiss }: Props) {
  if (!idea) return null;

  return (
    <Modal transparent animationType="fade" onRequestClose={onDismiss}>
      <YStack
        flex={1}
        backgroundColor="rgba(201, 123, 132, 0.95)"
        justifyContent="center"
        alignItems="center"
        padding={spacing.xl}
      >
        <LottieView
          source={require('@/assets/animations/heart-burst.json')}
          autoPlay
          loop={false}
          style={{ width: 250, height: 250 }}
        />
        <Text fontSize={36} fontWeight="700" color="#FFFFFF" textAlign="center" marginTop={spacing.lg}>
          It's a match! 💛
        </Text>
        <Text fontSize={18} color="rgba(255,255,255,0.9)" textAlign="center" marginTop={spacing.sm}>
          {idea.title}
        </Text>
        <Text fontSize={14} color="rgba(255,255,255,0.75)" textAlign="center" marginTop={spacing.xs}>
          {idea.tagline}
        </Text>

        <Button
          onPress={onDismiss}
          backgroundColor="#FFFFFF"
          borderRadius={radii.lg}
          height={52}
          width="100%"
          marginTop={spacing.xxl}
        >
          <Text fontWeight="700" color={colors.accent}>Keep swiping</Text>
        </Button>
      </YStack>
    </Modal>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add assets/animations/heart-burst.json components/swipe/MatchReveal.tsx
git commit -m "feat: add match reveal Lottie animation overlay"
```

---

## Task 8: Swipe Tab Screen

- [ ] **Step 1: Seed some date ideas into Supabase**

  In Supabase Studio → Table Editor → `date_ideas`, insert at least 5–10 rows manually (or via SQL). Use `is_approved = true` and pick a `location_region` matching your test user's location.

  Sample SQL:
  ```sql
  insert into public.date_ideas (title, tagline, photo_url, cost_range, duration_mins, vibe_tags, location_region, maps_url, is_approved)
  values
    ('Sunset Picnic', 'Watch the sun go down over the city with good food and better company.', 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800', '€', 120, '{"Romantic","Cozy"}', 'Copenhagen', 'https://maps.google.com/?q=Copenhagen', true),
    ('Wine Tasting', 'Explore local wines at a cozy wine bar — no expertise required.', 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800', '€€', 150, '{"Romantic","Foodie"}', 'Copenhagen', 'https://maps.google.com/?q=Copenhagen+wine+bar', true),
    ('City Bike Tour', 'Explore hidden streets and neighbourhoods on two wheels.', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800', '€', 180, '{"Active","Adventurous"}', 'Copenhagen', 'https://maps.google.com/?q=Copenhagen+bike+tour', true);
  ```

- [ ] **Step 2: Replace `app/(tabs)/index.tsx`**

```tsx
import { useState } from 'react';
import { YStack, XStack, Text, Spinner } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useCouple } from '@/hooks/useCouple';
import { useIdeas } from '@/hooks/useIdeas';
import { recordSwipe } from '@/lib/swipes';
import { CardStack } from '@/components/swipe/CardStack';
import { CardDetail } from '@/components/swipe/CardDetail';
import { MatchReveal } from '@/components/swipe/MatchReveal';
import { DbDateIdea, DbMatch } from '@/types/database';
import { colors, spacing } from '@/constants/theme';
import { useEffect, useRef } from 'react';

export default function SwipeTab() {
  const insets = useSafeAreaInsets();
  const { session, user } = useAuth();
  const { couple } = useCouple(session?.user?.id);
  const { ideas, loading, error, removeTop } = useIdeas({
    coupleId: couple?.id ?? '',
    userId: session?.user?.id ?? '',
    // Use the couple's shared location_region (not individual user's) per spec
    locationRegion: couple?.location_region ?? user?.location_region ?? '',
  });

  const [detailIdea, setDetailIdea] = useState<DbDateIdea | null>(null);
  const [matchedIdea, setMatchedIdea] = useState<DbDateIdea | null>(null);
  const matchChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Subscribe to new matches in realtime
  useEffect(() => {
    if (!couple?.id) return;

    const channel = supabase
      .channel(`matches:${couple.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'matches', filter: `couple_id=eq.${couple.id}` },
        async (payload) => {
          const match = payload.new as DbMatch;
          // Fetch the idea directly from DB — do NOT rely on local `ideas` state,
          // because the user who completed the match will have already removed that card.
          const idea = await getIdeaById(match.idea_id).catch(() => null);
          if (idea) setMatchedIdea(idea);
        }
      )
      .subscribe();

    matchChannelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [couple?.id, ideas]);

  async function handleSwipeRight(idea: DbDateIdea) {
    removeTop();
    if (!couple?.id || !session?.user?.id) return;
    try {
      await recordSwipe({
        coupleId: couple.id,
        userId: session.user.id,
        ideaId: idea.id,
        direction: 'like',
      });
    } catch (e) {
      console.error('Failed to record swipe:', e);
    }
  }

  async function handleSwipeLeft(idea: DbDateIdea) {
    removeTop();
    if (!couple?.id || !session?.user?.id) return;
    try {
      await recordSwipe({
        coupleId: couple.id,
        userId: session.user.id,
        ideaId: idea.id,
        direction: 'pass',
      });
    } catch (e) {
      console.error('Failed to record swipe:', e);
    }
  }

  if (!couple) return null;

  return (
    <YStack flex={1} backgroundColor={colors.background} paddingTop={insets.top}>
      {/* Header */}
      <XStack paddingHorizontal={spacing.lg} paddingVertical={spacing.md} justifyContent="center">
        <Text fontSize={22} fontWeight="700" color={colors.textPrimary}>💛 DateNu</Text>
      </XStack>

      {/* Card area */}
      <YStack flex={1} justifyContent="center" alignItems="center">
        {loading ? (
          <Spinner size="large" color={colors.accent} />
        ) : error ? (
          <Text color={colors.error}>{error}</Text>
        ) : (
          <CardStack
            ideas={ideas}
            onSwipeLeft={handleSwipeLeft}
            onSwipeRight={handleSwipeRight}
            onCardPress={setDetailIdea}
          />
        )}
      </YStack>

      {/* Action hint */}
      {!loading && ideas.length > 0 && (
        <XStack justifyContent="space-between" paddingHorizontal={spacing.xxl} paddingBottom={insets.bottom + spacing.lg}>
          <Text color={colors.textSecondary} fontSize={13}>← Pass</Text>
          <Text color={colors.textSecondary} fontSize={13}>Like →</Text>
        </XStack>
      )}

      {/* Modals */}
      <CardDetail idea={detailIdea} onClose={() => setDetailIdea(null)} />
      <MatchReveal idea={matchedIdea} onDismiss={() => setMatchedIdea(null)} />
    </YStack>
  );
}
```

- [ ] **Step 3: Verify swipe flow end-to-end**

  1. Log in on two devices/simulators as partners in the same couple
  2. Both swipe right on the same idea
  3. Confirm: match row appears in Supabase, MatchReveal animation fires on both devices
  4. Confirm: swiped cards are excluded from next load

- [ ] **Step 4: Commit**

```bash
git add app/(tabs)/index.tsx
git commit -m "feat: implement swipe tab with realtime match detection"
```

---

## Phase 3 Complete

At the end of Phase 3 you have:
- Full swipe card stack with spring gesture physics
- Location-filtered date idea feed excluding already-swiped ideas
- Swipe like/pass recorded to DB
- Match detection via DB trigger + Realtime subscription
- Match reveal Lottie animation on both partners' devices
- Expanded card detail view with Maps + Book Now links

**Next:** Phase 4 — Dates & Memories
