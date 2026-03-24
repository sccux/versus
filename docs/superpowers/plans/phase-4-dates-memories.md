# DateNu — Phase 4: Dates & Memories

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A fully working Dates tab with three sub-tabs (Ideas, Upcoming, Memories), scheduling with device calendar integration, and a memory capture flow (rating + note) after completing a date.

**Architecture:** `matches.ts` handles all match queries and mutations. A Supabase Realtime subscription on `matches` and `scheduled_dates` keeps both partners in sync without polling. Scheduling writes to `scheduled_dates` and optionally adds a device calendar event via Expo Calendar. Completing a date writes to `date_memories` and updates the match status.

**Tech Stack:** Supabase Realtime, expo-calendar, @tamagui/sheet (bottom sheet)

**Prerequisite:** Phase 3 complete (swipe working, matches being created).

---

## File Structure (this phase)

```
components/
├── dates/
│   ├── DateCard.tsx          # Match card (photo, title, status, actions)
│   ├── ScheduleModal.tsx     # Date + time picker modal
│   └── MemoryModal.tsx       # Rate + note capture after completion
└── ui/
    └── StarRating.tsx        # 1–5 interactive star rating
lib/
└── matches.ts                # All match/schedule/memory CRUD
hooks/
└── useMatches.ts             # Matches list + realtime subscription
app/(tabs)/
└── dates.tsx                 # Dates tab with 3 sub-tabs (replaces placeholder)
__tests__/
└── lib/
    └── matches.test.ts
```

---

## Task 1: Matches Library

- [ ] **Step 1: Write failing tests**

Create `__tests__/lib/matches.test.ts`:

```ts
import {
  getMatchesForCouple,
  scheduleMatch,
  completeMatch,
} from '@/lib/matches';

jest.mock('@/lib/supabase', () => ({
  supabase: { from: jest.fn() },
}));
import { supabase } from '@/lib/supabase';

const mockChain = (resolvedValue: unknown) => {
  const chain: Record<string, jest.Mock> = {};
  const methods = ['select', 'eq', 'order', 'update', 'insert', 'upsert', 'single'];
  methods.forEach((m) => {
    chain[m] = jest.fn().mockReturnValue(chain);
  });
  chain['then'] = jest.fn().mockImplementation((cb: (v: unknown) => unknown) => cb(resolvedValue));
  // Make awaitable
  Object.assign(chain, { then: undefined });
  chain.order = jest.fn().mockResolvedValue(resolvedValue);
  chain.single = jest.fn().mockResolvedValue(resolvedValue);
  return chain;
};

describe('getMatchesForCouple', () => {
  it('queries matches joined with ideas', async () => {
    const data = [{ id: 'match-1', status: 'pending', idea_id: 'idea-1' }];
    const chain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data, error: null }),
    };
    (supabase.from as jest.Mock).mockReturnValue(chain);
    const result = await getMatchesForCouple('couple-1');
    expect(supabase.from).toHaveBeenCalledWith('matches');
    expect(result).toEqual(data);
  });
});

describe('scheduleMatch', () => {
  it('upserts a scheduled_dates row and updates match status to scheduled', async () => {
    const upsertChain = { upsert: jest.fn().mockResolvedValue({ error: null }) };
    const updateChain = {
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ error: null }),
    };
    (supabase.from as jest.Mock)
      .mockReturnValueOnce(upsertChain)       // scheduled_dates
      .mockReturnValueOnce(updateChain);      // matches

    await scheduleMatch({ matchId: 'match-1', scheduledAt: new Date('2026-04-01T19:00:00Z') });

    expect(supabase.from).toHaveBeenCalledWith('scheduled_dates');
    expect(upsertChain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ match_id: 'match-1' }),
      { onConflict: 'match_id' }
    );
    expect(supabase.from).toHaveBeenCalledWith('matches');
    expect(updateChain.update).toHaveBeenCalledWith({ status: 'scheduled' });
  });
});

describe('completeMatch', () => {
  it('inserts a memory row and updates match status to completed', async () => {
    const insertChain = { insert: jest.fn().mockResolvedValue({ error: null }) };
    const updateChain = {
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ error: null }),
    };
    (supabase.from as jest.Mock)
      .mockReturnValueOnce(insertChain)
      .mockReturnValueOnce(updateChain);

    await completeMatch({ matchId: 'match-1', rating: 5, note: 'Amazing!' });

    expect(supabase.from).toHaveBeenCalledWith('date_memories');
    expect(insertChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ match_id: 'match-1', rating: 5, note: 'Amazing!' })
    );
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
npx jest __tests__/lib/matches.test.ts --no-coverage
```

Expected: FAIL.

- [ ] **Step 3: Create `lib/matches.ts`**

```ts
import { supabase } from '@/lib/supabase';
import { DbMatch, DbDateIdea, DbScheduledDate, DbDateMemory } from '@/types/database';

export interface MatchWithIdea extends DbMatch {
  date_ideas: DbDateIdea;
  scheduled_dates: DbScheduledDate | null;
  date_memories: DbDateMemory | null;
}

export async function getMatchesForCouple(coupleId: string): Promise<MatchWithIdea[]> {
  const { data, error } = await supabase
    .from('matches')
    .select(`
      *,
      date_ideas(*),
      scheduled_dates(*),
      date_memories(*)
    `)
    .eq('couple_id', coupleId)
    .order('matched_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

interface ScheduleMatchParams {
  matchId: string;
  scheduledAt: Date;
  calendarEventId?: string;
}

export async function scheduleMatch(params: ScheduleMatchParams): Promise<void> {
  const { error: schedError } = await supabase.from('scheduled_dates').upsert(
    {
      match_id: params.matchId,
      scheduled_at: params.scheduledAt.toISOString(),
      calendar_event_id: params.calendarEventId ?? null,
    },
    { onConflict: 'match_id' }
  );
  if (schedError) throw schedError;

  const { error: matchError } = await supabase
    .from('matches')
    .update({ status: 'scheduled' })
    .eq('id', params.matchId);
  if (matchError) throw matchError;
}

interface CompleteMatchParams {
  matchId: string;
  rating?: number;
  note?: string;
}

export async function completeMatch(params: CompleteMatchParams): Promise<void> {
  const { error: memError } = await supabase.from('date_memories').insert({
    match_id: params.matchId,
    rating: params.rating ?? null,
    note: params.note ?? null,
  });
  if (memError) throw memError;

  const { error: matchError } = await supabase
    .from('matches')
    .update({ status: 'completed' })
    .eq('id', params.matchId);
  if (matchError) throw matchError;
}
```

- [ ] **Step 4: Run tests**

```bash
npx jest __tests__/lib/matches.test.ts --no-coverage
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/matches.ts __tests__/lib/matches.test.ts
git commit -m "feat: add matches library with schedule and complete mutations"
```

---

## Task 2: useMatches Hook with Realtime

- [ ] **Step 1: Create `hooks/useMatches.ts`**

```ts
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { getMatchesForCouple, MatchWithIdea } from '@/lib/matches';

export function useMatches(coupleId: string | undefined) {
  const [matches, setMatches] = useState<MatchWithIdea[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!coupleId) return;
    try {
      const data = await getMatchesForCouple(coupleId);
      setMatches(data);
    } finally {
      setLoading(false);
    }
  }, [coupleId]);

  useEffect(() => {
    load();
  }, [load]);

  // Realtime: reload when matches or scheduled_dates change
  useEffect(() => {
    if (!coupleId) return;

    const channel = supabase
      .channel(`couple-dates:${coupleId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'matches', filter: `couple_id=eq.${coupleId}` },
        () => load()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'scheduled_dates' },
        () => load()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [coupleId, load]);

  const pending = matches.filter((m) => m.status === 'pending');
  const scheduled = matches.filter((m) => m.status === 'scheduled').sort(
    (a, b) =>
      new Date(a.scheduled_dates!.scheduled_at).getTime() -
      new Date(b.scheduled_dates!.scheduled_at).getTime()
  );
  const completed = matches.filter((m) => m.status === 'completed');

  return { matches, pending, scheduled, completed, loading, reload: load };
}
```

- [ ] **Step 2: Commit**

```bash
git add hooks/useMatches.ts
git commit -m "feat: add useMatches hook with realtime subscription"
```

---

## Task 3: StarRating Component

- [ ] **Step 1: Write failing tests**

Create `__tests__/components/StarRating.test.tsx`:

```tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { TamaguiProvider } from '@tamagui/core';
import config from '@/tamagui.config';
import { StarRating } from '@/components/ui/StarRating';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <TamaguiProvider config={config}>{children}</TamaguiProvider>
);

describe('StarRating', () => {
  it('renders 5 stars', () => {
    const { getAllByRole } = render(
      <StarRating value={3} onChange={jest.fn()} />,
      { wrapper }
    );
    // Stars are pressable
    expect(getAllByRole('button').length).toBe(5);
  });

  it('calls onChange with the tapped star index', () => {
    const onChange = jest.fn();
    const { getAllByRole } = render(
      <StarRating value={0} onChange={onChange} />,
      { wrapper }
    );
    fireEvent.press(getAllByRole('button')[2]); // 3rd star = rating 3
    expect(onChange).toHaveBeenCalledWith(3);
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
npx jest __tests__/components/StarRating.test.tsx --no-coverage
```

Expected: FAIL.

- [ ] **Step 3: Create `components/ui/StarRating.tsx`**

```tsx
import { XStack, Text } from 'tamagui';
import { Pressable } from 'react-native';
import { colors } from '@/constants/theme';

interface Props {
  value: number;
  onChange?: (rating: number) => void;
  size?: number;
  readonly?: boolean;
}

export function StarRating({ value, onChange, size = 28, readonly = false }: Props) {
  return (
    <XStack gap={4}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Pressable
          key={star}
          accessibilityRole="button"
          onPress={() => !readonly && onChange?.(star)}
          disabled={readonly}
        >
          <Text fontSize={size} lineHeight={size + 4}>
            {star <= value ? '⭐' : '☆'}
          </Text>
        </Pressable>
      ))}
    </XStack>
  );
}
```

- [ ] **Step 4: Run tests**

```bash
npx jest __tests__/components/StarRating.test.tsx --no-coverage
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/ui/StarRating.tsx __tests__/components/StarRating.test.tsx
git commit -m "feat: add StarRating component"
```

---

## Task 4: DateCard Component

- [ ] **Step 1: Create `components/dates/DateCard.tsx`**

```tsx
import { Linking } from 'react-native';
import { YStack, XStack, Text, Button } from 'tamagui';
import { Image } from 'expo-image';
import { MatchWithIdea } from '@/lib/matches';
import { StarRating } from '@/components/ui/StarRating';
import { VibeTags } from '@/components/ui/VibeTags';
import { colors, spacing, radii } from '@/constants/theme';

interface Props {
  match: MatchWithIdea;
  onSchedule?: () => void;
  onComplete?: () => void;
}

export function DateCard({ match, onSchedule, onComplete }: Props) {
  const idea = match.date_ideas;
  const scheduled = match.scheduled_dates;
  const memory = match.date_memories;

  const scheduledLabel = scheduled
    ? new Date(scheduled.scheduled_at).toLocaleString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <YStack
      backgroundColor={colors.surface}
      borderRadius={radii.lg}
      overflow="hidden"
      style={{ shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } }}
    >
      {/* Photo */}
      <Image
        source={{ uri: idea.photo_url }}
        style={{ width: '100%', height: 160 }}
        contentFit="cover"
      />

      <YStack padding={spacing.md} gap={spacing.sm}>
        <Text fontSize={18} fontWeight="700" color={colors.textPrimary}>{idea.title}</Text>
        <Text fontSize={14} color={colors.textSecondary}>{idea.tagline}</Text>
        <VibeTags tags={idea.vibe_tags} />

        {/* Scheduled date label */}
        {scheduledLabel && (
          <XStack gap={spacing.xs} alignItems="center">
            <Text fontSize={13}>📅</Text>
            <Text fontSize={13} color={colors.accent} fontWeight="600">{scheduledLabel}</Text>
          </XStack>
        )}

        {/* Memory: read-only rating + note */}
        {memory && (
          <YStack gap={spacing.xs}>
            <StarRating value={memory.rating ?? 0} readonly />
            {memory.note && (
              <Text fontSize={13} color={colors.textSecondary} fontStyle="italic">"{memory.note}"</Text>
            )}
          </YStack>
        )}

        {/* Action buttons */}
        <XStack gap={spacing.sm} marginTop={spacing.xs}>
          {idea.maps_url && (
            <Button
              flex={1}
              onPress={() => Linking.openURL(idea.maps_url!)}
              backgroundColor={colors.surface}
              borderWidth={1}
              borderColor={colors.border}
              borderRadius={radii.md}
              height={40}
            >
              <Text fontSize={13} color={colors.textPrimary}>🗺 Maps</Text>
            </Button>
          )}
          {idea.booking_url && (
            <Button
              flex={1}
              onPress={() => Linking.openURL(idea.booking_url!)}
              backgroundColor={colors.surface}
              borderWidth={1}
              borderColor={colors.border}
              borderRadius={radii.md}
              height={40}
            >
              <Text fontSize={13} color={colors.textPrimary}>🔗 Book</Text>
            </Button>
          )}
          {match.status === 'pending' && onSchedule && (
            <Button
              flex={1}
              onPress={onSchedule}
              backgroundColor={colors.accent}
              borderRadius={radii.md}
              height={40}
            >
              <Text fontSize={13} color={colors.background} fontWeight="600">Schedule</Text>
            </Button>
          )}
          {match.status === 'scheduled' && onComplete && (
            <Button
              flex={1}
              onPress={onComplete}
              backgroundColor={colors.accent}
              borderRadius={radii.md}
              height={40}
            >
              <Text fontSize={13} color={colors.background} fontWeight="600">✓ Done</Text>
            </Button>
          )}
        </XStack>
      </YStack>
    </YStack>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/dates/DateCard.tsx
git commit -m "feat: add DateCard component"
```

---

## Task 5: ScheduleModal with Calendar Integration

- [ ] **Step 1: Create `lib/calendar.ts`**

```ts
import * as Calendar from 'expo-calendar';
import { Platform } from 'react-native';

export async function requestCalendarPermission(): Promise<boolean> {
  const { status } = await Calendar.requestCalendarPermissionsAsync();
  return status === 'granted';
}

async function getDefaultCalendarId(): Promise<string | null> {
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const defaultCal = calendars.find(
    (c) => c.isPrimary || c.source.name === 'iCloud' || c.source.name === 'Default'
  );
  return defaultCal?.id ?? calendars[0]?.id ?? null;
}

export async function addDateToCalendar(params: {
  title: string;
  notes?: string;
  startDate: Date;
  durationMins: number;
}): Promise<string | null> {
  const hasPermission = await requestCalendarPermission();
  if (!hasPermission) return null;

  const calendarId = await getDefaultCalendarId();
  if (!calendarId) return null;

  const endDate = new Date(params.startDate.getTime() + params.durationMins * 60 * 1000);

  const eventId = await Calendar.createEventAsync(calendarId, {
    title: `💛 ${params.title}`,
    notes: params.notes,
    startDate: params.startDate,
    endDate,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });

  return eventId;
}
```

- [ ] **Step 2: Create `components/dates/ScheduleModal.tsx`**

```tsx
import { useState } from 'react';
import { Alert, Platform } from 'react-native';
import { Modal } from 'react-native';
import { YStack, XStack, Text, Button, Spinner } from 'tamagui';
import DateTimePicker from '@react-native-community/datetimepicker';
import { scheduleMatch } from '@/lib/matches';
import { addDateToCalendar } from '@/lib/calendar';
import { MatchWithIdea } from '@/lib/matches';
import { colors, spacing, radii } from '@/constants/theme';

// Install: npx expo install @react-native-community/datetimepicker

interface Props {
  match: MatchWithIdea | null;
  onClose: () => void;
  onScheduled: () => void;
}

export function ScheduleModal({ match, onClose, onScheduled }: Props) {
  const [date, setDate] = useState(new Date());
  const [loading, setLoading] = useState(false);

  if (!match) return null;

  async function handleConfirm(addToCalendar: boolean) {
    setLoading(true);
    try {
      let calendarEventId: string | undefined;
      if (addToCalendar) {
        const eventId = await addDateToCalendar({
          title: match!.date_ideas.title,
          notes: match!.date_ideas.tagline,
          startDate: date,
          durationMins: match!.date_ideas.duration_mins,
        });
        calendarEventId = eventId ?? undefined;
      }
      await scheduleMatch({
        matchId: match!.id,
        scheduledAt: date,
        calendarEventId,
      });
      onScheduled();
      onClose();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet">
      <YStack flex={1} backgroundColor={colors.background} padding={spacing.xl}>
        <Text fontSize={22} fontWeight="700" color={colors.textPrimary} marginBottom={spacing.md}>
          Schedule your date
        </Text>
        <Text fontSize={16} color={colors.textSecondary} marginBottom={spacing.xl}>
          {match.date_ideas.title}
        </Text>

        <DateTimePicker
          value={date}
          mode="datetime"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          minimumDate={new Date()}
          onChange={(_, selected) => { if (selected) setDate(selected); }}
          style={{ alignSelf: 'stretch' }}
          themeVariant="light"
          accentColor={colors.accent}
        />

        <YStack gap={spacing.sm} marginTop={spacing.xl}>
          {loading ? (
            <Spinner color={colors.accent} />
          ) : (
            <>
              <Button
                onPress={() => handleConfirm(true)}
                backgroundColor={colors.accent}
                borderRadius={radii.lg}
                height={52}
              >
                <Text fontWeight="600" color={colors.background}>Confirm + Add to Calendar</Text>
              </Button>
              <Button
                onPress={() => handleConfirm(false)}
                backgroundColor={colors.surface}
                borderWidth={1}
                borderColor={colors.border}
                borderRadius={radii.lg}
                height={52}
              >
                <Text fontWeight="600" color={colors.textPrimary}>Confirm without Calendar</Text>
              </Button>
              <Button unstyled onPress={onClose} marginTop={spacing.xs}>
                <Text color={colors.textSecondary} textAlign="center">Cancel</Text>
              </Button>
            </>
          )}
        </YStack>
      </YStack>
    </Modal>
  );
}
```

- [ ] **Step 3: Install DateTimePicker**

```bash
npx expo install @react-native-community/datetimepicker
```

- [ ] **Step 4: Commit**

```bash
git add lib/calendar.ts components/dates/ScheduleModal.tsx
git commit -m "feat: add schedule modal with device calendar integration"
```

---

## Task 6: MemoryModal

- [ ] **Step 1: Create `components/dates/MemoryModal.tsx`**

```tsx
import { useState } from 'react';
import { Alert, Modal } from 'react-native';
import { YStack, Text, Button, Input, Spinner } from 'tamagui';
import { StarRating } from '@/components/ui/StarRating';
import { completeMatch } from '@/lib/matches';
import { MatchWithIdea } from '@/lib/matches';
import { colors, spacing, radii } from '@/constants/theme';

interface Props {
  match: MatchWithIdea | null;
  onClose: () => void;
  onCompleted: () => void;
}

export function MemoryModal({ match, onClose, onCompleted }: Props) {
  const [rating, setRating] = useState(0);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  if (!match) return null;

  async function handleComplete() {
    if (rating === 0) return Alert.alert('Please rate your date!');
    setLoading(true);
    try {
      await completeMatch({ matchId: match!.id, rating, note: note.trim() || undefined });
      onCompleted();
      onClose();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet">
      <YStack flex={1} backgroundColor={colors.background} padding={spacing.xl}>
        <Text fontSize={22} fontWeight="700" color={colors.textPrimary} marginBottom={spacing.xs}>
          How was it? 💛
        </Text>
        <Text fontSize={16} color={colors.textSecondary} marginBottom={spacing.xl}>
          {match.date_ideas.title}
        </Text>

        <YStack gap={spacing.lg}>
          <YStack gap={spacing.sm}>
            <Text fontWeight="600" color={colors.textPrimary}>Rate your date</Text>
            <StarRating value={rating} onChange={setRating} size={36} />
          </YStack>

          <YStack gap={spacing.sm}>
            <Text fontWeight="600" color={colors.textPrimary}>Add a memory (optional)</Text>
            <Input
              value={note}
              onChangeText={setNote}
              placeholder="We went on a Wednesday and the sunset was unreal..."
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              borderRadius={radii.lg}
              borderColor={colors.border}
              padding={spacing.md}
              height={120}
            />
          </YStack>

          {loading ? (
            <Spinner color={colors.accent} />
          ) : (
            <YStack gap={spacing.sm}>
              <Button
                onPress={handleComplete}
                backgroundColor={colors.accent}
                borderRadius={radii.lg}
                height={52}
              >
                <Text fontWeight="600" color={colors.background}>Save memory</Text>
              </Button>
              <Button unstyled onPress={onClose}>
                <Text color={colors.textSecondary} textAlign="center">Cancel</Text>
              </Button>
            </YStack>
          )}
        </YStack>
      </YStack>
    </Modal>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/dates/MemoryModal.tsx
git commit -m "feat: add memory capture modal with rating and note"
```

---

## Task 7: Dates Tab Screen

- [ ] **Step 1: Replace `app/(tabs)/dates.tsx`**

```tsx
import { useState } from 'react';
import { ScrollView } from 'react-native';
import { YStack, XStack, Text, Spinner } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import { useCouple } from '@/hooks/useCouple';
import { useMatches } from '@/hooks/useMatches';
import { DateCard } from '@/components/dates/DateCard';
import { ScheduleModal } from '@/components/dates/ScheduleModal';
import { MemoryModal } from '@/components/dates/MemoryModal';
import { MatchWithIdea } from '@/lib/matches';
import { colors, spacing, radii } from '@/constants/theme';

type SubTab = 'ideas' | 'upcoming' | 'memories';

export default function DatesTab() {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const { couple } = useCouple(session?.user?.id);
  const { pending, scheduled, completed, loading, reload } = useMatches(couple?.id);

  const [subTab, setSubTab] = useState<SubTab>('ideas');
  const [schedulingMatch, setSchedulingMatch] = useState<MatchWithIdea | null>(null);
  const [completingMatch, setCompletingMatch] = useState<MatchWithIdea | null>(null);

  const subTabs: { key: SubTab; label: string; count: number }[] = [
    { key: 'ideas', label: 'Ideas', count: pending.length },
    { key: 'upcoming', label: 'Upcoming', count: scheduled.length },
    { key: 'memories', label: 'Memories', count: completed.length },
  ];

  const activeMatches =
    subTab === 'ideas' ? pending :
    subTab === 'upcoming' ? scheduled :
    completed;

  return (
    <YStack flex={1} backgroundColor={colors.background} paddingTop={insets.top}>
      {/* Header */}
      <XStack paddingHorizontal={spacing.lg} paddingVertical={spacing.md} justifyContent="center">
        <Text fontSize={22} fontWeight="700" color={colors.textPrimary}>Your Dates</Text>
      </XStack>

      {/* Sub-tab selector */}
      <XStack
        paddingHorizontal={spacing.lg}
        marginBottom={spacing.md}
        backgroundColor={colors.surface}
        borderRadius={radii.lg}
        marginHorizontal={spacing.lg}
        padding={4}
      >
        {subTabs.map((tab) => (
          <YStack
            key={tab.key}
            flex={1}
            backgroundColor={subTab === tab.key ? colors.accent : 'transparent'}
            borderRadius={radii.md}
            paddingVertical={spacing.sm}
            alignItems="center"
            onPress={() => setSubTab(tab.key)}
          >
            <Text
              fontSize={13}
              fontWeight="600"
              color={subTab === tab.key ? colors.background : colors.textSecondary}
            >
              {tab.label} {tab.count > 0 ? `(${tab.count})` : ''}
            </Text>
          </YStack>
        ))}
      </XStack>

      {/* Content */}
      {loading ? (
        <YStack flex={1} justifyContent="center" alignItems="center">
          <Spinner color={colors.accent} />
        </YStack>
      ) : activeMatches.length === 0 ? (
        <YStack flex={1} justifyContent="center" alignItems="center" gap={spacing.sm}>
          <Text fontSize={32}>
            {subTab === 'ideas' ? '🌱' : subTab === 'upcoming' ? '📅' : '✨'}
          </Text>
          <Text fontSize={16} fontWeight="600" color={colors.textPrimary}>
            {subTab === 'ideas' ? 'No matches yet' :
             subTab === 'upcoming' ? 'Nothing scheduled' :
             'No memories yet'}
          </Text>
          <Text color={colors.textSecondary} textAlign="center" paddingHorizontal={spacing.xl}>
            {subTab === 'ideas' ? 'Keep swiping — when you both like the same idea it shows up here.' :
             subTab === 'upcoming' ? 'Schedule one of your matched ideas to see it here.' :
             'Complete a date to start building your memories.'}
          </Text>
        </YStack>
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
          {activeMatches.map((match) => (
            <DateCard
              key={match.id}
              match={match}
              onSchedule={match.status === 'pending' ? () => setSchedulingMatch(match) : undefined}
              onComplete={match.status === 'scheduled' ? () => setCompletingMatch(match) : undefined}
            />
          ))}
        </ScrollView>
      )}

      <ScheduleModal
        match={schedulingMatch}
        onClose={() => setSchedulingMatch(null)}
        onScheduled={reload}
      />
      <MemoryModal
        match={completingMatch}
        onClose={() => setCompletingMatch(null)}
        onCompleted={reload}
      />
    </YStack>
  );
}
```

- [ ] **Step 2: Verify Dates tab end-to-end**

  1. Create a match between two test accounts (both swipe right on same idea)
  2. Open Dates tab → confirm match appears in Ideas sub-tab
  3. Tap Schedule → pick a date → confirm → verify it moves to Upcoming sub-tab on both devices (realtime)
  4. Tap Done on Upcoming → rate → add note → verify it moves to Memories sub-tab
  5. Confirm `date_memories` and `matches` tables updated in Supabase Studio

- [ ] **Step 3: Commit**

```bash
git add app/(tabs)/dates.tsx
git commit -m "feat: implement dates tab with ideas, upcoming, and memories sub-tabs"
```

---

## Phase 4 Complete

At the end of Phase 4 you have:
- Full Dates tab with Ideas / Upcoming / Memories sub-tabs
- Schedule flow with device calendar integration (iOS + Android)
- Both partners see scheduling updates in real-time via Supabase Realtime
- Memory capture with star rating + note
- Complete match lifecycle: pending → scheduled → completed

**Next:** Phase 5 — Profile, Idea Submission & Push Notifications
