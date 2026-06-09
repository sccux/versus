-- Enums
create type room_status as enum ('lobby', 'playing', 'finished');
create type round_status as enum ('drawing', 'voting', 'finished');
create type player_role as enum ('artist', 'imposter');
create type round_winner as enum ('artists', 'imposters');
create type vote_session_status as enum ('active', 'resolved');

-- rooms
create table rooms (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  status room_status not null default 'lobby',
  host_player_id uuid,
  current_round_id uuid,
  created_at timestamptz not null default now()
);

-- players
create table players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  user_id uuid references auth.users(id),
  nickname text not null,
  color text not null,
  score int not null default 0,
  is_connected bool not null default true,
  created_at timestamptz not null default now()
);

-- Add FK from rooms to players after players exists
alter table rooms
  add constraint rooms_host_player_id_fkey
  foreign key (host_player_id) references players(id);

-- rounds
create table rounds (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  round_number int not null,
  word text not null,
  status round_status not null default 'drawing',
  winner round_winner,
  current_turn_player_id uuid references players(id),
  turn_started_at timestamptz,
  can_vote bool not null default false,
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

alter table rooms
  add constraint rooms_current_round_id_fkey
  foreign key (current_round_id) references rounds(id);

-- round_players
create table round_players (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references rounds(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  role player_role not null,
  turn_order int not null,
  has_drawn bool not null default false,
  is_alive bool not null default true,
  unique(round_id, player_id)
);

-- vote_sessions
create table vote_sessions (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references rounds(id) on delete cascade,
  initiated_by uuid not null references players(id),
  status vote_session_status not null default 'active',
  killed_player_id uuid references players(id),
  created_at timestamptz not null default now()
);

-- votes
create table votes (
  id uuid primary key default gen_random_uuid(),
  vote_session_id uuid not null references vote_sessions(id) on delete cascade,
  voter_id uuid not null references players(id),
  target_id uuid not null references players(id),
  created_at timestamptz not null default now(),
  unique(vote_session_id, voter_id)
);

-- RLS: enable on all tables, allow all for now (structured for easy auth gating later)
alter table rooms enable row level security;
alter table players enable row level security;
alter table rounds enable row level security;
alter table round_players enable row level security;
alter table vote_sessions enable row level security;
alter table votes enable row level security;

create policy "allow_all_rooms" on rooms for all using (true) with check (true);
create policy "allow_all_players" on players for all using (true) with check (true);
create policy "allow_all_rounds" on rounds for all using (true) with check (true);
create policy "allow_all_round_players" on round_players for all using (true) with check (true);
create policy "allow_all_vote_sessions" on vote_sessions for all using (true) with check (true);
create policy "allow_all_votes" on votes for all using (true) with check (true);

-- Enable Realtime for Postgres Changes
alter publication supabase_realtime add table rooms;
alter publication supabase_realtime add table players;
alter publication supabase_realtime add table rounds;
alter publication supabase_realtime add table round_players;
alter publication supabase_realtime add table vote_sessions;
alter publication supabase_realtime add table votes;
