-- Blinq multiplayer schema. See docs/MULTIPLAYER.md.
-- All game writes go through the Next.js API (service role). Clients only read, under RLS.

create type room_phase as enum (
  'lobby', 'teams_ready', 'duel_intro', 'memorize', 'recall', 'duel_result', 'level_result', 'finished'
);

create table rooms (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  admin_user_id uuid not null,
  phase room_phase not null default 'lobby',
  phase_version int not null default 0,
  phase_started_at timestamptz,
  phase_duration_ms int,
  level int not null default 1,
  max_levels int not null default 3 check (max_levels between 1 and 10),
  difficulty text not null default 'medium' check (difficulty in ('easy', 'medium', 'hard')),
  pacing text not null default 'manual' check (pacing in ('manual', 'auto')),
  duel_index int not null default 0,
  expires_at timestamptz not null default now() + interval '24 hours',
  created_at timestamptz not null default now()
);
create index rooms_admin_created_idx on rooms (admin_user_id, created_at);
create index rooms_expires_idx on rooms (expires_at);

create table teams (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms on delete cascade,
  name text not null,
  score int not null default 0,
  unique (room_id, name)
);

create table players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms on delete cascade,
  user_id uuid,
  name text not null,
  is_bot boolean not null default false,
  team_id uuid references teams on delete set null,
  seat int,
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
create unique index players_room_name_idx on players (room_id, lower(name));
create unique index players_room_user_idx on players (room_id, user_id) where user_id is not null;
create index players_user_idx on players (user_id);

create table duels (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms on delete cascade,
  level int not null,
  duel_index int not null,
  player_a uuid not null references players on delete cascade,
  player_b uuid not null references players on delete cascade,
  item_count int not null,
  memorize_ms int not null,
  recall_ms int not null,
  winner_id uuid references players on delete set null,
  resolved boolean not null default false,
  bot_plan jsonb,
  unique (room_id, level, duel_index)
);

-- The items on the table. Players can read them only while memorizing (or once the duel is over).
create table duel_items (
  duel_id uuid not null references duels on delete cascade,
  position int not null,
  item_key text not null,
  primary key (duel_id, position)
);

-- Targets mixed with decoys, shuffled. Never says which are targets.
create table duel_choices (
  duel_id uuid not null references duels on delete cascade,
  position int not null,
  item_key text not null,
  primary key (duel_id, position)
);

-- No client access at all.
create table submissions (
  id bigint generated always as identity primary key,
  duel_id uuid not null references duels on delete cascade,
  player_id uuid not null references players on delete cascade,
  item_key text not null,
  correct boolean not null,
  created_at timestamptz not null default clock_timestamp(),
  unique (duel_id, player_id, item_key)
);
create index submissions_player_idx on submissions (duel_id, player_id, created_at);

-- Live progress, replaces per-answer Broadcast so serverless functions never hold sockets.
create table duel_progress (
  duel_id uuid not null references duels on delete cascade,
  player_id uuid not null references players on delete cascade,
  correct_count int not null default 0,
  wrong_count int not null default 0,
  points int not null default 0,
  primary key (duel_id, player_id)
);

create table duel_results (
  duel_id uuid not null references duels on delete cascade,
  player_id uuid not null references players on delete cascade,
  correct_count int not null,
  finished_ms int,
  points int not null,
  primary key (duel_id, player_id)
);

-- Row Level Security -------------------------------------------------------

create function public.is_room_member(rid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from players where room_id = rid and user_id = auth.uid())
$$;

-- Items: only while memorizing the current duel, or after it is finished.
create function public.can_read_duel_items(did uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from duels du
    join rooms r on r.id = du.room_id
    where du.id = did
      and public.is_room_member(r.id)
      and (
        (du.level, du.duel_index) < (r.level, r.duel_index)
        or (
          (du.level, du.duel_index) = (r.level, r.duel_index)
          and r.phase in ('memorize', 'duel_result', 'level_result', 'finished')
        )
      )
  )
$$;

-- Choices: from memorize onward for the current duel, always for past duels.
create function public.can_read_duel_choices(did uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from duels du
    join rooms r on r.id = du.room_id
    where du.id = did
      and public.is_room_member(r.id)
      and (
        (du.level, du.duel_index) < (r.level, r.duel_index)
        or (
          (du.level, du.duel_index) = (r.level, r.duel_index)
          and r.phase in ('memorize', 'recall', 'duel_result', 'level_result', 'finished')
        )
      )
  )
$$;

create function public.is_duel_member(did uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from duels where id = did and public.is_room_member(room_id))
$$;

alter table rooms enable row level security;
alter table teams enable row level security;
alter table players enable row level security;
alter table duels enable row level security;
alter table duel_items enable row level security;
alter table duel_choices enable row level security;
alter table submissions enable row level security;
alter table duel_progress enable row level security;
alter table duel_results enable row level security;

create policy rooms_read on rooms for select to authenticated using (public.is_room_member(id));
create policy teams_read on teams for select to authenticated using (public.is_room_member(room_id));
create policy players_read on players for select to authenticated using (public.is_room_member(room_id));
create policy duels_read on duels for select to authenticated using (public.is_room_member(room_id));
create policy duel_items_read on duel_items for select to authenticated using (public.can_read_duel_items(duel_id));
create policy duel_choices_read on duel_choices for select to authenticated using (public.can_read_duel_choices(duel_id));
create policy duel_progress_read on duel_progress for select to authenticated using (public.is_duel_member(duel_id));
create policy duel_results_read on duel_results for select to authenticated using (public.is_duel_member(duel_id));

revoke all on all tables in schema public from anon, authenticated;
grant select on rooms, teams, players, duels, duel_items, duel_choices, duel_progress, duel_results to authenticated;
revoke all on function public.is_room_member(uuid), public.can_read_duel_items(uuid),
  public.can_read_duel_choices(uuid), public.is_duel_member(uuid) from public;
grant execute on function public.is_room_member(uuid), public.can_read_duel_items(uuid),
  public.can_read_duel_choices(uuid), public.is_duel_member(uuid) to authenticated;

-- Realtime ------------------------------------------------------------------

alter publication supabase_realtime add table rooms, teams, players, duels, duel_progress, duel_results;
alter table players replica identity full;
