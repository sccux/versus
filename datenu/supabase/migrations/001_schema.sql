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
  id              uuid primary key default gen_random_uuid(),
  user_a_id       uuid not null references public.users(id) on delete cascade,
  user_b_id       uuid references public.users(id) on delete cascade,
  invite_code     text not null unique,
  location_region text not null default '',
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
  id              uuid primary key default gen_random_uuid(),
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
  id         uuid primary key default gen_random_uuid(),
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
  id         uuid primary key default gen_random_uuid(),
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
  id                uuid primary key default gen_random_uuid(),
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
  id           uuid primary key default gen_random_uuid(),
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
alter publication supabase_realtime add table public.matches;
alter publication supabase_realtime add table public.scheduled_dates;
