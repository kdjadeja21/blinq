-- Individual (free-for-all) mode. See docs/MULTIPLAYER.md.
-- Everyone plays each level at the same time on the same items. One `rounds` row per level.

alter table rooms
  add column mode text not null default 'team' check (mode in ('team', 'individual'));

create table rounds (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms on delete cascade,
  level int not null,
  item_count int not null,
  memorize_ms int not null,
  recall_ms int not null,
  rules jsonb not null,
  resolved boolean not null default false,
  unique (room_id, level)
);

create table round_items (
  round_id uuid not null references rounds on delete cascade,
  position int not null,
  item_key text not null,
  primary key (round_id, position)
);

create table round_choices (
  round_id uuid not null references rounds on delete cascade,
  position int not null,
  item_key text not null,
  primary key (round_id, position)
);

-- No client access at all.
create table round_submissions (
  id bigint generated always as identity primary key,
  round_id uuid not null references rounds on delete cascade,
  player_id uuid not null references players on delete cascade,
  item_key text not null,
  correct boolean not null,
  created_at timestamptz not null default clock_timestamp(),
  unique (round_id, player_id, item_key)
);
create index round_submissions_player_idx on round_submissions (round_id, player_id, created_at);

-- One row per player when they stop recalling. No per-pick progress, so realtime load stays flat.
create table round_done (
  round_id uuid not null references rounds on delete cascade,
  player_id uuid not null references players on delete cascade,
  done_ms int,
  primary key (round_id, player_id)
);

create table round_results (
  round_id uuid not null references rounds on delete cascade,
  player_id uuid not null references players on delete cascade,
  level int not null,
  correct_count int not null,
  wrong_count int not null default 0,
  speed_bonus int not null default 0,
  found_keys text[] not null default '{}',
  finished_ms int,
  points int not null,
  primary key (round_id, player_id)
);

create function public.is_round_member(rid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from rounds where id = rid and public.is_room_member(room_id))
$$;

create function public.can_read_round_items(rid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from rounds ro
    join rooms r on r.id = ro.room_id
    where ro.id = rid
      and public.is_room_member(r.id)
      and (
        ro.level < r.level
        or (ro.level = r.level and r.phase in ('memorize', 'level_result', 'finished'))
      )
  )
$$;

create function public.can_read_round_choices(rid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from rounds ro
    join rooms r on r.id = ro.room_id
    where ro.id = rid
      and public.is_room_member(r.id)
      and (
        ro.level < r.level
        or (ro.level = r.level and r.phase in ('memorize', 'recall', 'level_result', 'finished'))
      )
  )
$$;

create function public.can_read_round_results(rid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from rounds ro
    join rooms r on r.id = ro.room_id
    where ro.id = rid
      and public.is_room_member(r.id)
      and (
        ro.level < r.level
        or (ro.level = r.level and r.phase in ('level_result', 'finished'))
      )
  )
$$;

alter table rounds enable row level security;
alter table round_items enable row level security;
alter table round_choices enable row level security;
alter table round_submissions enable row level security;
alter table round_done enable row level security;
alter table round_results enable row level security;

create policy rounds_read on rounds for select to authenticated using (public.is_room_member(room_id));
create policy round_items_read on round_items for select to authenticated using (public.can_read_round_items(round_id));
create policy round_choices_read on round_choices for select to authenticated using (public.can_read_round_choices(round_id));
create policy round_done_read on round_done for select to authenticated using (public.is_round_member(round_id));
create policy round_results_read on round_results for select to authenticated using (public.can_read_round_results(round_id));

revoke all on rounds, round_items, round_choices, round_submissions, round_done, round_results from anon, authenticated;
grant select on rounds, round_items, round_choices, round_done, round_results to authenticated;
revoke all on function public.is_round_member(uuid), public.can_read_round_items(uuid),
  public.can_read_round_choices(uuid), public.can_read_round_results(uuid) from public;
grant execute on function public.is_round_member(uuid), public.can_read_round_items(uuid),
  public.can_read_round_choices(uuid), public.can_read_round_results(uuid) to authenticated;

alter publication supabase_realtime add table rounds, round_done, round_results;
