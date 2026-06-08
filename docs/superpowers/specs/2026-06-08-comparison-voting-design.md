# Comparison Voting App — Design Spec

**Date:** 2026-06-08
**Platform:** Web (Next.js)
**Concept:** A "this or that" image comparison voting app. Upload two images, get a shareable link, let the internet pick a winner. Optionally post to a public feed. A token economy rewards voting and gates feed posting.

---

## 1. Overview

Users create comparisons between two images and collect votes via shareable links. No account is needed to vote. Accounts unlock token earning and feed posting. The hybrid model means every creator is a distributor (link sharing) with optional organic discovery on top (public feed).

---

## 2. User Modes

### Creator (account required)
1. Sign up / log in
2. Create a comparison — upload 2 images, write a question
3. Get a shareable link instantly (always free)
4. Optionally post to the public feed (costs 1 token)
5. Track live vote counts in the dashboard

### Voter via link (no account needed)
1. Click a shared link
2. See two images + question
3. Tap to vote → results revealed (% overlay on each image)
4. Prompted: "Earn tokens when you vote — create a free account"

### Feed browser (no account needed to browse, account to earn)
1. Scroll public feed of comparisons
2. Vote → results revealed → earn tokens if logged in
3. Feed sorted by recency

---

## 3. Tech Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js (App Router) |
| Styling | Tailwind CSS — dark mode default |
| Backend / DB | Supabase (PostgreSQL + Auth + Storage + Realtime) |
| Image storage | Supabase Storage |
| Hosting | Vercel |

Dark mode is the default and only theme — enforced via Tailwind's `dark` class on the root `<html>` element.

---

## 4. Architecture

```
User browser
  ├── /               Landing page
  ├── /feed           Public feed (realtime vote counts)
  ├── /create         Create a comparison (auth required)
  ├── /c/[slug]       Shareable vote page (public, server-rendered)
  ├── /dashboard      Creator's comparisons + stats (auth required)
  └── /login          Email + Google sign in

Supabase
  ├── Auth            Email + Google OAuth
  ├── PostgreSQL      comparisons, votes, token_transactions, users
  ├── Storage         comparison images (image_a, image_b)
  └── Realtime        live vote counts on /c/[slug] and /dashboard
```

Shareable links use the pattern `/c/[slug]` where slug is a short random string (e.g. `abc123`). Pages are server-rendered for fast load and correct Open Graph previews when shared on iMessage, Twitter, WhatsApp, etc.

---

## 5. Data Model

```sql
users
  id uuid PK
  email text
  display_name text
  avatar_url text
  token_balance int DEFAULT 0       -- cached sum of token_transactions
  created_at timestamptz

comparisons
  id uuid PK
  slug text UNIQUE                  -- short random ID for shareable URL
  creator_id uuid FK → users
  question text                     -- "Which logo looks better?"
  image_a_url text
  image_b_url text
  is_public boolean DEFAULT false   -- true = appears in feed
  status text DEFAULT 'active'      -- active | closed
  created_at timestamptz

votes
  id uuid PK
  comparison_id uuid FK → comparisons
  voter_id uuid FK → users          -- null if anonymous
  choice text                       -- 'a' | 'b'
  voted_at timestamptz
  UNIQUE (comparison_id, voter_id)  -- one vote per logged-in user per comparison

token_transactions
  id uuid PK
  user_id uuid FK → users
  amount int                        -- positive = earned, negative = spent
  reason text                       -- 'signup_bonus' | 'voted' | 'post_to_feed'
  reference_id uuid                 -- comparison_id or vote_id
  created_at timestamptz
```

`users.token_balance` is a cached value updated on each transaction for fast reads.

---

## 6. Token Economy

### Earning

| Action | Tokens |
|---|---|
| Sign up (one-time) | +5 |
| Vote on 20 comparisons | +1 |

Vote counting: a running tally is kept per user. Every 20th vote triggers a +1 token transaction. Anonymous votes earn nothing — incentive to create an account.

### Spending

| Action | Cost | Effect |
|---|---|---|
| Post comparison to public feed | 1 token | Comparison appears in `/feed` |

Creating a comparison and getting a shareable link is always free. Posting to the feed costs 1 token. New users start with 5 tokens (can immediately post up to 5 comparisons to the feed), then must vote on 20 others per additional token.

### Abuse prevention
- Max one vote per logged-in user per comparison (DB unique constraint)
- Anonymous voters get a cookie-based soft block (best-effort, no DB enforcement)
- Tokens only awarded for votes on comparisons the user did not create

### Feed ranking
Recency only — newest posts surface first. No boost or promotion mechanic in v1.

---

## 7. Pages & UI

All pages use dark mode by default (dark background, light text).

### `/` — Landing
- Hero: headline, subheadline, two example images with a vote CTA
- Explains the concept in one sentence
- CTAs: "Create a comparison" (→ /login if not authed) and "Browse feed"

### `/feed` — Public Feed
- Infinite scroll of public comparisons
- Each card: question, two images side by side, current vote counts
- Tap to vote → results revealed inline
- Login prompt banner if anonymous: "Log in to earn tokens"

### `/create` — Create Comparison (auth required)
- Two upload zones (drag & drop or file picker)
- Question text field
- Toggle: "Post to public feed" — shows current token balance; disabled with tooltip if balance is 0
- Submit → confirmation screen with shareable link + copy button

### `/c/[slug]` — Vote Page (the shareable link)
- Server-rendered for fast load + Open Graph preview
- Two images large and tappable (side by side on desktop, stacked on mobile)
- Question displayed above
- Tap to vote → vote % overlaid on each image, winner highlighted
- After voting: subtle banner "Earn tokens when you vote — create a free account" (→ /login)
- Realtime: vote counts update live if multiple people are on the page

### `/dashboard` — Creator Dashboard (auth required)
- Token balance displayed prominently at top
- List of user's comparisons: question, thumbnail, A vs B vote % bar, share button
- "Create new comparison" CTA

### `/login` — Auth
- Email + password
- Google OAuth
- On success: redirect to /create or the page that triggered the login prompt

---

## 8. Open Graph / Link Previews

Each `/c/[slug]` page includes:
```html
<meta property="og:title" content="{question}" />
<meta property="og:image" content="{image_a_url}" />  <!-- or a combined preview image -->
<meta property="og:description" content="Vote now — no account needed" />
```

This ensures the link previews correctly when shared in iMessage, Twitter, WhatsApp, Slack, etc. — the question appears as the title, making the link self-explanatory before clicking.

---

## 9. Out of Scope (v1)

- Mobile native app
- Comments or reactions on comparisons
- User profiles / public pages
- Notifications
- Closing / archiving comparisons
- Reporting or moderation tools
- Paid tokens or any monetization
