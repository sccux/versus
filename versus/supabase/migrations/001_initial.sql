create extension if not exists "uuid-ossp";

create table public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  display_name text,
  avatar_url text,
  token_balance int not null default 0 constraint token_balance_non_negative check (token_balance >= 0),
  vote_count int not null default 0 constraint vote_count_non_negative check (vote_count >= 0),
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

-- NOTE: token_balance and vote_count updates in lib/tokens.ts currently use an
-- optimistic-lock (read-then-conditional-update) pattern to mitigate races.
-- For fully atomic increments under load, add these RPCs and call them instead:
--
-- create or replace function public.increment_vote_and_maybe_award(
--   p_user_id uuid, p_vote_id uuid
-- ) returns boolean language plpgsql security definer as $$
-- declare
--   v_new_count int;
--   v_awarded boolean := false;
-- begin
--   update public.users
--     set vote_count = vote_count + 1
--   where id = p_user_id
--   returning vote_count into v_new_count;
--
--   if v_new_count > 0 and v_new_count % 20 = 0 then
--     update public.users set token_balance = token_balance + 1 where id = p_user_id;
--     insert into public.token_transactions (user_id, amount, reason, reference_id)
--       values (p_user_id, 1, 'voted', p_vote_id);
--     v_awarded := true;
--   end if;
--   return v_awarded;
-- end;
-- $$;
--
-- create or replace function public.spend_token_for_feed_post(
--   p_user_id uuid, p_comparison_id uuid
-- ) returns boolean language plpgsql security definer as $$
-- declare
--   v_rows int;
-- begin
--   update public.users
--     set token_balance = token_balance - 1
--   where id = p_user_id and token_balance >= 1;
--   get diagnostics v_rows = row_count;
--   if v_rows = 0 then return false; end if;
--   insert into public.token_transactions (user_id, amount, reason, reference_id)
--     values (p_user_id, -1, 'post_to_feed', p_comparison_id);
--   return true;
-- end;
-- $$;
