# DateNu — App Design Spec

**Date:** 2026-03-24
**Platform:** iOS + Android (React Native / Expo)
**Concept:** A Tinder-style swipe app where couples privately match on date ideas.

---

## 1. Overview

DateNu lets couples independently swipe on date ideas. When both partners like the same idea, it's a match — revealed with a celebratory animation. Matched dates can be scheduled, booked, completed, and remembered. The idea pool is curated by the team and supplemented by community submissions.

---

## 2. Tech Stack

| Layer | Choice |
|---|---|
| Mobile framework | React Native + Expo (SDK 51+) |
| UI library | Tamagui |
| Animations | Reanimated 3 + Lottie |
| Backend / Auth / DB | Supabase (PostgreSQL + Realtime + Storage) |
| Push notifications | Expo Push Notification Service |
| Auth providers | Google OAuth, Apple Sign-In, Email + Password |

---

## 3. Architecture

```
┌─────────────────────────────────────────────┐
│               Expo (React Native)            │
│  ┌──────────┐ ┌──────────┐ ┌─────────────┐  │
│  │  Swipe   │ │  Dates   │ │   Profile   │  │
│  └──────────┘ └──────────┘ └─────────────┘  │
└───────────────────┬─────────────────────────┘
                    │
┌───────────────────▼─────────────────────────┐
│                 Supabase                     │
│  Auth │ PostgreSQL │ Realtime │ Storage      │
└─────────────────────────────────────────────┘
                    │
        ┌───────────▼────────────┐
        │   Expo Push Service    │
        └────────────────────────┘
```

Supabase handles all backend concerns: authentication, relational data, file storage (photos), and realtime subscriptions for match detection. No custom backend server is needed.

---

## 4. Data Model

```sql
users
  id uuid PK
  email text
  display_name text
  avatar_url text
  location_region text        -- city or region
  auth_provider text          -- google | apple | email
  expo_push_token text
  created_at timestamptz

couples
  id uuid PK
  user_a_id uuid FK → users
  user_b_id uuid FK → users
  invite_code text UNIQUE
  created_at timestamptz

date_ideas
  id uuid PK
  title text
  tagline text
  photo_url text
  cost_range text             -- € | €€ | €€€
  duration_mins int
  vibe_tags text[]            -- Romantic, Adventurous, Cozy, Foodie, Active, Cultural, Spontaneous
  location_region text
  booking_url text
  maps_url text
  submitted_by uuid FK → users  -- null = curated
  is_approved boolean         -- false until reviewed (community submissions)
  created_at timestamptz

swipes
  id uuid PK
  couple_id uuid FK → couples
  user_id uuid FK → users
  idea_id uuid FK → date_ideas
  direction text              -- like | pass
  swiped_at timestamptz

matches
  id uuid PK
  couple_id uuid FK → couples
  idea_id uuid FK → date_ideas
  matched_at timestamptz
  status text                 -- pending | scheduled | completed

scheduled_dates
  id uuid PK
  match_id uuid FK → matches
  scheduled_at timestamptz
  calendar_event_id text      -- device calendar event ID

date_memories
  id uuid PK
  match_id uuid FK → matches
  note text
  rating int                  -- 1–5
  completed_at timestamptz
```

**Match creation:** A Supabase database trigger fires when a second swipe (`direction = 'like'`) is inserted for the same `couple_id` + `idea_id`. It creates a `matches` row and triggers a realtime event, which the app uses to deliver push notifications to both partners.

---

## 5. Screen Flow

```
Splash Screen (animated logo)
        │
Login Screen
  ├── Continue with Google
  ├── Continue with Apple
  └── Continue with Email
        │
Couple Pairing (one-time onboarding)
  ├── Share invite code
  ├── Send invite link (SMS/email)
  └── Show QR code
        │
Tab Navigation (bottom bar)
  ├── Swipe   ← default home
  ├── Dates
  └── Profile
```

---

## 6. Screens & Features

### Splash Screen
- Animated logo fade-in (Lottie)
- Transitions to Login or directly to Swipe tab if already authenticated and paired

### Login Screen
- Three auth options: Google, Apple, Email/Password
- Clean, centered layout with app logo at top

### Couple Pairing (Onboarding)
- Shown once after first login, never again once paired
- Three pairing methods on a single screen:
  - **Invite Code:** generate a 6-character code; partner enters it
  - **Invite Link:** share via native share sheet (SMS, email, etc.)
  - **QR Code:** full-screen QR; partner scans with in-app scanner
- Deep link or code entry completes pairing and routes to Swipe tab
- **Deep link before auth:** If a user opens an invite link before logging in, the app stores the invite token locally, completes auth flow, then automatically resumes pairing with the stored token

### Swipe Tab (Home)
- Stack of swipeable date idea cards (Reanimated 3 gesture)
- Swipe right = like, swipe left = pass; tap = expand detail view
- On mutual like: full-screen match reveal animation (Lottie heart burst), then return to stack
- No indication of partner's swipe activity

**Card anatomy:**
- Full-bleed photo with soft gradient overlay
- Title, tagline
- Vibe tags (pills)
- Cost range (€/€€/€€€), estimated duration
- Location region

**Expanded card view (tap):**
- All card info
- Open in Maps button (Google Maps / Apple Maps)
- Book Now button (external URL, if available)

### Dates Tab
Three sub-tabs:

**Upcoming** — scheduled matches, sorted by date
- Date/time, idea name, photo
- Tap to view full detail, reschedule, or open maps/booking

**Ideas** — unscheduled matches
- Each card: Schedule button, Open in Maps, Book Now
- Schedule flow: date/time picker → option to add to device calendar

**Memories** — completed dates
- Completed date + rating (stars) + note
- Read-only, scrollable history

**Scheduling flow:**
1. Tap "Schedule a date"
2. Date + time picker
3. Confirm → option to add to device calendar (iOS Calendar / Google Calendar via Expo Calendar API)
4. Status updates to `scheduled`; the updated match row is propagated to the partner in real-time via Supabase Realtime subscription — both partners see the date appear in their Upcoming sub-tab without needing to reload

**Marking complete:**
1. Tap "Mark as Complete"
2. Prompt: rate (1–5 stars) + optional note
3. Moves to Memories sub-tab

### Profile Tab
- Avatar, display name, location region (editable)
- Couple info: partner name, paired since date
- **Submit a Date Idea** form:
  - Title, tagline
  - Vibe tags (multi-select)
  - Cost range, estimated duration
  - Booking URL (optional)
  - Location region
  - Photo (camera roll upload)
  - Submitted ideas show "Submitted by the community" tag; submitter identity never shown
- Notification preferences (matches on/off, date reminders on/off)
- Sign out

---

## 7. Notifications

Push notifications delivered via Expo Push Notification Service:

| Event | Message |
|---|---|
| New match | "💛 You both want to [Idea Title]!" |
| Upcoming date reminder | "📅 [Idea Title] is coming up [tomorrow/today]!" |

No other notification types in v1.

---

## 8. Design System

| Token | Value |
|---|---|
| Background | `#FAFAF8` (warm off-white) |
| Text primary | `#1C1C1E` (warm charcoal) |
| Accent | `#C97B84` (deep rose/mauve) |
| Card radius | 24px |
| Font | Plus Jakarta Sans |
| Icons | Rounded, slightly chunky (e.g., Phosphor Icons) |

**Animation principles:**
- Swipe cards: spring physics via Reanimated 3
- Match reveal: Lottie heart burst animation
- Tab transitions: smooth fade/slide
- Splash: logo fade-in

---

## 9. Idea Pool & Moderation

- Curated ideas: seeded directly into `date_ideas` with `submitted_by = null` and `is_approved = true`
- Community submissions: `is_approved = false` until manually approved via Supabase Studio (no admin UI in v1)
- All approved ideas look identical in the swipe stack regardless of origin
- Ideas are filtered by `location_region` to match the couple's location. When partners have different regions set, the couple's region defaults to **user_a's region** (the one who initiated the couple). Either partner can update the couple's location from the Profile tab.

---

## 10. Out of Scope (v1)

- In-app chat between partners
- Social features (sharing dates publicly)
- Paid/premium tiers
- Web companion app
- AI personalization
- Partner activity indicators during swiping
- Admin CMS (moderation via Supabase Studio directly)
