# DateNu — Phase 5: Profile, Idea Submission & Push Notifications

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A complete Profile tab (user info, couple info, settings), community idea submission with photo upload, push notifications for matches (via Supabase Edge Function) and date reminders (via Expo local notifications).

**Architecture:** Profile tab reads from `useAuth` + `useCouple` and allows inline editing. Idea submission uploads a photo to Supabase Storage and inserts a `date_ideas` row with `is_approved = false`. Push token is registered on app launch and stored in the `users` table. A Supabase Edge Function (Database Webhook) fires when a new `matches` row is inserted and sends an Expo push notification to the partner. Date reminders are scheduled locally via Expo Notifications when a date is scheduled.

**Tech Stack:** expo-image-picker, expo-notifications, Supabase Storage, Supabase Edge Functions, expo-local-authentication (optional)

**Prerequisite:** Phase 4 complete.

---

## File Structure (this phase)

```
app/(tabs)/
└── profile.tsx              # Profile tab (replaces placeholder)
lib/
├── notifications.ts         # Push token registration + local notification scheduling
└── storage.ts               # Supabase Storage upload helper
supabase/
└── functions/
    └── notify-match/
        └── index.ts         # Edge Function: send push on new match
__tests__/
└── lib/
    └── notifications.test.ts
```

---

## Task 1: Push Notifications Library

- [ ] **Step 1: Write failing tests**

Create `__tests__/lib/notifications.test.ts`:

```ts
import { scheduleDateReminder, cancelDateReminder } from '@/lib/notifications';

jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: jest.fn().mockResolvedValue('notif-id-1'),
  cancelScheduledNotificationAsync: jest.fn().mockResolvedValue(undefined),
}));

import * as Notifications from 'expo-notifications';

describe('scheduleDateReminder', () => {
  it('schedules a notification for 24 hours before the date', async () => {
    const scheduled = new Date('2026-05-01T19:00:00Z');
    const id = await scheduleDateReminder({ ideaTitle: 'Sunset Picnic', scheduledAt: scheduled });
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({
          title: expect.stringContaining('Sunset Picnic'),
        }),
        trigger: expect.objectContaining({
          date: new Date(scheduled.getTime() - 24 * 60 * 60 * 1000),
        }),
      })
    );
    expect(id).toBe('notif-id-1');
  });
});

describe('cancelDateReminder', () => {
  it('cancels a scheduled notification by id', async () => {
    await cancelDateReminder('notif-id-1');
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('notif-id-1');
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
npx jest __tests__/lib/notifications.test.ts --no-coverage
```

Expected: FAIL.

- [ ] **Step 3: Create `lib/notifications.ts`**

```ts
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { updateUserProfile } from '@/lib/auth';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerPushToken(userId: string): Promise<void> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const token = (await Notifications.getExpoPushTokenAsync()).data;
  await updateUserProfile(userId, { expo_push_token: token });
}

export async function scheduleDateReminder(params: {
  ideaTitle: string;
  scheduledAt: Date;
}): Promise<string> {
  const triggerDate = new Date(params.scheduledAt.getTime() - 24 * 60 * 60 * 1000);

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: `📅 ${params.ideaTitle}`,
      body: 'Your date is coming up tomorrow!',
      data: {},
    },
    trigger: { date: triggerDate },
  });
  return id;
}

export async function cancelDateReminder(notificationId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}
```

- [ ] **Step 4: Run tests**

```bash
npx jest __tests__/lib/notifications.test.ts --no-coverage
```

Expected: PASS.

- [ ] **Step 5: Wire push token registration into root layout**

  In `app/_layout.tsx`, call `registerPushToken` once after session is confirmed:

```tsx
// Add inside AuthGuard component, below the existing useEffect:
import { registerPushToken } from '@/lib/notifications';

useEffect(() => {
  if (session?.user?.id && !authLoading) {
    registerPushToken(session.user.id).catch(console.error);
  }
}, [session?.user?.id, authLoading]);
```

- [ ] **Step 6: Commit**

```bash
git add lib/notifications.ts __tests__/lib/notifications.test.ts app/_layout.tsx
git commit -m "feat: add push token registration and local date reminder scheduling"
```

---

## Task 2: Date Reminder Integration in ScheduleModal

- [ ] **Step 1: Update `components/dates/ScheduleModal.tsx`** to schedule a local reminder when confirming

  In the `handleConfirm` function, after calling `scheduleMatch`, add:

```ts
import { scheduleDateReminder } from '@/lib/notifications';

// After scheduleMatch call, inside handleConfirm:
const now = new Date();
const reminderDate = new Date(date.getTime() - 24 * 60 * 60 * 1000);
if (reminderDate > now) {
  await scheduleDateReminder({
    ideaTitle: match!.date_ideas.title,
    scheduledAt: date,
  }).catch(console.error); // non-fatal
}
```

- [ ] **Step 2: Commit**

```bash
git add components/dates/ScheduleModal.tsx
git commit -m "feat: schedule local reminder notification when booking a date"
```

---

## Task 3: Supabase Edge Function — Match Push Notification

This Edge Function fires when a `matches` row is inserted (via Database Webhook) and sends an Expo push notification to both partners.

- [ ] **Step 1: Create Edge Function**

Create `supabase/functions/notify-match/index.ts`:

```ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

serve(async (req) => {
  try {
    const payload = await req.json();
    const match = payload.record; // { id, couple_id, idea_id, ... }

    // Fetch the idea title
    const { data: idea } = await supabase
      .from('date_ideas')
      .select('title')
      .eq('id', match.idea_id)
      .single();

    if (!idea) return new Response('idea not found', { status: 404 });

    // Fetch both partners' push tokens
    const { data: couple } = await supabase
      .from('couples')
      .select('user_a_id, user_b_id')
      .eq('id', match.couple_id)
      .single();

    if (!couple) return new Response('couple not found', { status: 404 });

    const { data: users } = await supabase
      .from('users')
      .select('expo_push_token')
      .in('id', [couple.user_a_id, couple.user_b_id]);

    const tokens = (users ?? [])
      .map((u) => u.expo_push_token)
      .filter(Boolean);

    if (!tokens.length) return new Response('no push tokens', { status: 200 });

    // Send via Expo Push API
    const messages = tokens.map((token) => ({
      to: token,
      title: `💛 It's a match!`,
      body: `You both want to: ${idea.title}`,
      sound: 'default',
    }));

    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messages),
    });

    return new Response('ok', { status: 200 });
  } catch (e) {
    console.error(e);
    return new Response(String(e), { status: 500 });
  }
});
```

- [ ] **Step 2: Deploy Edge Function**

```bash
supabase functions deploy notify-match
```

- [ ] **Step 3: Configure Database Webhook in Supabase**

  In Supabase Dashboard → Database → Webhooks → Create a new webhook:
  - **Name:** notify-match
  - **Table:** `public.matches`
  - **Events:** INSERT
  - **URL:** `https://<your-project>.supabase.co/functions/v1/notify-match`
  - **HTTP Headers:** `Authorization: Bearer <service_role_key>`

- [ ] **Step 4: Test the webhook**

  Create a match (both users swipe right on the same idea). Confirm both receive a push notification within ~5 seconds.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/
git commit -m "feat: add edge function to send push notification on match"
```

---

## Task 4: Storage Helper

- [ ] **Step 1: Create `lib/storage.ts`**

```ts
import { supabase } from '@/lib/supabase';
import * as FileSystem from 'expo-file-system';

export async function uploadIdeaPhoto(localUri: string, userId: string): Promise<string> {
  const filename = `${userId}/${Date.now()}.jpg`;

  // Read file as base64
  const base64 = await FileSystem.readAsStringAsync(localUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

  const { error } = await supabase.storage
    .from('idea-photos')
    .upload(filename, bytes, { contentType: 'image/jpeg', upsert: false });

  if (error) throw error;

  const { data } = supabase.storage.from('idea-photos').getPublicUrl(filename);
  return data.publicUrl;
}
```

- [ ] **Step 2: Create the Storage bucket**

  In Supabase Dashboard → Storage → Create bucket:
  - Name: `idea-photos`
  - Public: ✓ (so photo URLs work in `date_ideas.photo_url`)
  - File size limit: 5 MB
  - Allowed MIME types: `image/jpeg, image/png, image/webp`

  Add RLS policy:
  ```sql
  create policy "Authenticated users can upload idea photos"
    on storage.objects for insert
    with check (bucket_id = 'idea-photos' and auth.uid() is not null);
  ```

- [ ] **Step 3: Install expo-file-system**

```bash
npx expo install expo-file-system
```

- [ ] **Step 4: Commit**

```bash
git add lib/storage.ts
git commit -m "feat: add supabase storage upload helper for idea photos"
```

---

## Task 5: Profile Tab Screen

- [ ] **Step 1: Replace `app/(tabs)/profile.tsx`**

```tsx
import { useState } from 'react';
import { Alert, ScrollView } from 'react-native';
import { YStack, XStack, Text, Input, Button, Spinner, Switch } from 'tamagui';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import { useCouple } from '@/hooks/useCouple';
import { updateUserProfile, signOut } from '@/lib/auth';
import { colors, spacing, radii } from '@/constants/theme';

export default function ProfileTab() {
  const insets = useSafeAreaInsets();
  const { session, user } = useAuth();
  const { couple, partner } = useCouple(session?.user?.id);

  const [displayName, setDisplayName] = useState(user?.display_name ?? '');
  const [location, setLocation] = useState(user?.location_region ?? '');
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  async function handleSave() {
    if (!session?.user?.id) return;
    setSaving(true);
    try {
      await updateUserProfile(session.user.id, {
        display_name: displayName.trim(),
        location_region: location.trim(),
      });
      Alert.alert('Saved!');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
    } catch (e: any) {
      Alert.alert('Error', e.message);
      setSigningOut(false);
    }
  }

  const pairedSince = couple?.created_at
    ? new Date(couple.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }}>
      <YStack padding={spacing.xl} paddingTop={insets.top + spacing.md} gap={spacing.xl}>

        {/* User info */}
        <YStack gap={spacing.md}>
          <Text fontSize={22} fontWeight="700" color={colors.textPrimary}>Profile</Text>

          <YStack
            backgroundColor={colors.surface}
            borderRadius={radii.lg}
            padding={spacing.lg}
            gap={spacing.md}
          >
            <YStack gap={spacing.xs}>
              <Text fontSize={13} color={colors.textSecondary} fontWeight="600">Display Name</Text>
              <Input
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Your name"
                height={48}
                borderRadius={radii.md}
                borderColor={colors.border}
              />
            </YStack>
            <YStack gap={spacing.xs}>
              <Text fontSize={13} color={colors.textSecondary} fontWeight="600">Location</Text>
              <Input
                value={location}
                onChangeText={setLocation}
                placeholder="e.g. Copenhagen"
                height={48}
                borderRadius={radii.md}
                borderColor={colors.border}
              />
            </YStack>
            <Button
              onPress={handleSave}
              disabled={saving}
              backgroundColor={colors.accent}
              borderRadius={radii.lg}
              height={48}
            >
              {saving ? <Spinner color={colors.background} /> : (
                <Text fontWeight="600" color={colors.background}>Save changes</Text>
              )}
            </Button>
          </YStack>
        </YStack>

        {/* Couple info */}
        {couple && partner && (
          <YStack gap={spacing.md}>
            <Text fontSize={18} fontWeight="700" color={colors.textPrimary}>Your Couple 💛</Text>
            <YStack
              backgroundColor={colors.surface}
              borderRadius={radii.lg}
              padding={spacing.lg}
              gap={spacing.sm}
            >
              <XStack alignItems="center" gap={spacing.md}>
                {partner.avatar_url ? (
                  <Image
                    source={{ uri: partner.avatar_url }}
                    style={{ width: 48, height: 48, borderRadius: 24 }}
                    contentFit="cover"
                  />
                ) : (
                  <YStack
                    width={48}
                    height={48}
                    borderRadius={24}
                    backgroundColor={colors.accentLight}
                    justifyContent="center"
                    alignItems="center"
                  >
                    <Text fontSize={20}>{partner.display_name.charAt(0).toUpperCase()}</Text>
                  </YStack>
                )}
                <YStack>
                  <Text fontWeight="600" color={colors.textPrimary}>{partner.display_name}</Text>
                  <Text fontSize={13} color={colors.textSecondary}>{partner.email}</Text>
                </YStack>
              </XStack>
              {pairedSince && (
                <Text fontSize={13} color={colors.textSecondary}>
                  Together since {pairedSince}
                </Text>
              )}
            </YStack>
          </YStack>
        )}

        {/* Idea submission CTA */}
        <YStack gap={spacing.md}>
          <Text fontSize={18} fontWeight="700" color={colors.textPrimary}>Share a Date Idea</Text>
          <YStack
            backgroundColor={colors.accentLight}
            borderRadius={radii.lg}
            padding={spacing.lg}
            gap={spacing.sm}
          >
            <Text color={colors.textPrimary} fontSize={14}>
              Have a great date idea? Submit it and it might show up for other couples!
            </Text>
            <IdeaSubmissionForm userId={session?.user?.id ?? ''} />
          </YStack>
        </YStack>

        {/* Sign out */}
        <Button
          onPress={handleSignOut}
          disabled={signingOut}
          backgroundColor="transparent"
          borderWidth={1}
          borderColor={colors.border}
          borderRadius={radii.lg}
          height={48}
          marginTop={spacing.sm}
        >
          {signingOut ? <Spinner /> : (
            <Text color={colors.textSecondary}>Sign out</Text>
          )}
        </Button>

      </YStack>
    </ScrollView>
  );
}
```

- [ ] **Step 2: Commit placeholder profile tab**

```bash
git add app/(tabs)/profile.tsx
git commit -m "feat: add profile tab with user info and couple display"
```

---

## Task 6: Idea Submission Form

- [ ] **Step 1: Create the `IdeaSubmissionForm` component** (inline in profile or extract to `components/profile/IdeaSubmissionForm.tsx`)

```tsx
// components/profile/IdeaSubmissionForm.tsx
import { useState } from 'react';
import { Alert } from 'react-native';
import { YStack, XStack, Text, Input, Button, Spinner } from 'tamagui';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { uploadIdeaPhoto } from '@/lib/storage';
import { colors, spacing, radii } from '@/constants/theme';
import type { CostRange } from '@/types/database';

const VIBE_OPTIONS = ['Romantic', 'Adventurous', 'Cozy', 'Foodie', 'Active', 'Cultural', 'Spontaneous'];
const COST_OPTIONS: CostRange[] = ['€', '€€', '€€€'];

interface Props {
  userId: string;
}

export function IdeaSubmissionForm({ userId }: Props) {
  const [title, setTitle] = useState('');
  const [tagline, setTagline] = useState('');
  const [location, setLocation] = useState('');
  const [cost, setCost] = useState<CostRange>('€€');
  const [duration, setDuration] = useState('');
  const [bookingUrl, setBookingUrl] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  async function pickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  }

  async function handleSubmit() {
    if (!title.trim() || !tagline.trim() || !location.trim() || !photoUri || !duration) {
      return Alert.alert('Please fill in all required fields and add a photo.');
    }
    const durationNum = parseInt(duration, 10);
    if (isNaN(durationNum) || durationNum <= 0) {
      return Alert.alert('Please enter a valid duration in minutes.');
    }

    setSubmitting(true);
    try {
      const photoUrl = await uploadIdeaPhoto(photoUri, userId);
      const { error } = await supabase.from('date_ideas').insert({
        title: title.trim(),
        tagline: tagline.trim(),
        photo_url: photoUrl,
        cost_range: cost,
        duration_mins: durationNum,
        vibe_tags: selectedTags,
        location_region: location.trim(),
        booking_url: bookingUrl.trim() || null,
        submitted_by: userId,
        is_approved: false,
      });
      if (error) throw error;
      setSubmitted(true);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <YStack alignItems="center" gap={spacing.sm} padding={spacing.md}>
        <Text fontSize={32}>🎉</Text>
        <Text fontWeight="700" color={colors.textPrimary} textAlign="center">
          Thanks for your idea!
        </Text>
        <Text color={colors.textSecondary} textAlign="center" fontSize={14}>
          It's under review and will appear in the swipe stack once approved.
        </Text>
      </YStack>
    );
  }

  return (
    <YStack gap={spacing.md}>
      {/* Photo picker */}
      <Button
        onPress={pickPhoto}
        backgroundColor={photoUri ? 'transparent' : colors.surface}
        borderWidth={1}
        borderColor={colors.border}
        borderRadius={radii.lg}
        height={photoUri ? undefined : 120}
        overflow="hidden"
        padding={0}
      >
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={{ width: '100%', height: 160, borderRadius: 12 }} contentFit="cover" />
        ) : (
          <Text color={colors.textSecondary}>📷 Add a photo (required)</Text>
        )}
      </Button>

      <Input value={title} onChangeText={setTitle} placeholder="Date idea title *" height={48} borderRadius={radii.md} borderColor={colors.border} />
      <Input value={tagline} onChangeText={setTagline} placeholder="Short description *" height={48} borderRadius={radii.md} borderColor={colors.border} />
      <Input value={location} onChangeText={setLocation} placeholder="City or region *" height={48} borderRadius={radii.md} borderColor={colors.border} />
      <Input value={duration} onChangeText={setDuration} placeholder="Duration in minutes *" keyboardType="numeric" height={48} borderRadius={radii.md} borderColor={colors.border} />
      <Input value={bookingUrl} onChangeText={setBookingUrl} placeholder="Booking URL (optional)" keyboardType="url" autoCapitalize="none" height={48} borderRadius={radii.md} borderColor={colors.border} />

      {/* Cost picker */}
      <YStack gap={spacing.xs}>
        <Text fontSize={13} color={colors.textSecondary} fontWeight="600">Cost range</Text>
        <XStack gap={spacing.sm}>
          {COST_OPTIONS.map((c) => (
            <YStack
              key={c}
              flex={1}
              backgroundColor={cost === c ? colors.accent : colors.surface}
              borderRadius={radii.md}
              borderWidth={1}
              borderColor={cost === c ? colors.accent : colors.border}
              paddingVertical={spacing.sm}
              alignItems="center"
              onPress={() => setCost(c)}
            >
              <Text fontWeight="600" color={cost === c ? colors.background : colors.textPrimary}>{c}</Text>
            </YStack>
          ))}
        </XStack>
      </YStack>

      {/* Vibe tags */}
      <YStack gap={spacing.xs}>
        <Text fontSize={13} color={colors.textSecondary} fontWeight="600">Vibe tags</Text>
        <XStack flexWrap="wrap" gap={spacing.xs}>
          {VIBE_OPTIONS.map((tag) => {
            const selected = selectedTags.includes(tag);
            return (
              <YStack
                key={tag}
                backgroundColor={selected ? colors.accent : colors.surface}
                borderRadius={radii.full}
                borderWidth={1}
                borderColor={selected ? colors.accent : colors.border}
                paddingHorizontal={spacing.sm}
                paddingVertical={4}
                onPress={() => toggleTag(tag)}
              >
                <Text fontSize={13} fontWeight="600" color={selected ? colors.background : colors.textPrimary}>{tag}</Text>
              </YStack>
            );
          })}
        </XStack>
      </YStack>

      <Button
        onPress={handleSubmit}
        disabled={submitting}
        backgroundColor={colors.textPrimary}
        borderRadius={radii.lg}
        height={52}
        marginTop={spacing.sm}
      >
        {submitting ? <Spinner color={colors.background} /> : (
          <Text fontWeight="600" color={colors.background}>Submit idea</Text>
        )}
      </Button>
    </YStack>
  );
}
```

- [ ] **Step 2: Import `IdeaSubmissionForm` in `app/(tabs)/profile.tsx`**

```tsx
import { IdeaSubmissionForm } from '@/components/profile/IdeaSubmissionForm';
```

Replace the `<IdeaSubmissionForm userId={session?.user?.id ?? ''} />` call (already in the profile screen template above) with the real import.

- [ ] **Step 3: Verify idea submission end-to-end**

  1. Open Profile tab → scroll to "Share a Date Idea"
  2. Fill in all fields, pick a photo, choose vibe tags
  3. Submit → confirm `date_ideas` row inserted in Supabase with `is_approved = false`
  4. In Supabase Studio → Table Editor → `date_ideas`, manually set `is_approved = true`
  5. Reopen swipe tab — new idea should appear in the stack

- [ ] **Step 4: Commit**

```bash
git add components/profile/IdeaSubmissionForm.tsx app/(tabs)/profile.tsx
git commit -m "feat: add idea submission form with photo upload to supabase storage"
```

---

## Task 7: Tab Bar Icons

Replace text-only tab bar labels with Phosphor icons for a polished look.

- [ ] **Step 1: Update `app/(tabs)/_layout.tsx`**

```tsx
import { Tabs } from 'expo-router';
import { Heart, Calendar, User } from 'phosphor-react-native';
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
          paddingBottom: 4,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Discover',
          tabBarIcon: ({ color, size }) => <Heart size={size} color={color} weight="fill" />,
        }}
      />
      <Tabs.Screen
        name="dates"
        options={{
          title: 'Dates',
          tabBarIcon: ({ color, size }) => <Calendar size={size} color={color} weight="fill" />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User size={size} color={color} weight="fill" />,
        }}
      />
    </Tabs>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/(tabs)/_layout.tsx
git commit -m "feat: add phosphor icons to tab bar"
```

---

## Task 8: Final Smoke Test

- [ ] **Step 1: End-to-end test with two accounts**

Run through the full user journey:

1. **Account A** — sign up with email, enter location "Copenhagen"
2. **Account B** — sign up with email, enter location "Copenhagen"
3. **Pairing** — A generates invite code, B enters it
4. **Swipe** — both swipe right on "Sunset Picnic"
5. **Match** — match reveal fires on both devices, push notification arrives
6. **Dates tab** — match appears in Ideas sub-tab
7. **Schedule** — A schedules for next week, B sees it instantly in Upcoming
8. **Complete** — B taps Done, rates 5 stars, adds a note → moves to Memories
9. **Profile** — A edits display name, submits a new date idea with photo
10. Verify the submitted idea appears in Supabase with `is_approved = false`

- [ ] **Step 2: Fix any issues found**

- [ ] **Step 3: Final commit**

```bash
git add .
git commit -m "chore: phase 5 complete — profile, notifications, idea submission"
```

---

## Phase 5 Complete

At the end of Phase 5 you have a fully working DateNu v1:

- **Auth:** Google, Apple, Email/Password
- **Pairing:** invite code, link, QR
- **Swipe:** spring gesture physics, location-filtered ideas, private swiping
- **Match detection:** DB trigger + Realtime + push notification (Edge Function)
- **Dates tab:** Ideas / Upcoming / Memories with scheduling and calendar integration
- **Memories:** star rating + note capture
- **Profile:** edit name/location, couple info, idea submission with photo upload
- **Push notifications:** match alerts (Edge Function) + date reminders (local)

**What's left before App Store submission:**
- Add a real app icon and splash image (`assets/icon.png`, `assets/splash.png`)
- Set up EAS Build (`eas build --platform all`)
- Configure Apple Developer + Google Play accounts
- Seed curated date ideas per launch city
- Approve community-submitted ideas via Supabase Studio
