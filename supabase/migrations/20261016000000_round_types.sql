-- Round types in individual rooms: item (default), change, delayed, or mixed (rotates by level).
-- The type of each level lives in rounds.rules (roundType, hideMs, distractMs), so old rows keep working.
alter table rooms
  add column round_type text not null default 'item'
  check (round_type in ('item', 'change', 'delayed', 'mixed'));

-- Change rounds store the table before the change in round_items and the table after it in
-- round_choices ('-' marks an empty spot). The spots that changed are server-only.
create table round_puzzles (
  round_id uuid primary key references rounds on delete cascade,
  changed text[] not null default '{}'
);
alter table round_puzzles enable row level security;
revoke all on round_puzzles from anon, authenticated;

-- The second view of a change round is an answer, so it is hidden until recall.
create or replace function public.can_read_round_choices(rid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from rounds ro
    join rooms r on r.id = ro.room_id
    where ro.id = rid
      and public.is_room_member(r.id)
      and (
        ro.level < r.level
        or (
          ro.level = r.level
          and (
            r.phase in ('recall', 'level_result', 'finished')
            or (r.phase = 'memorize' and coalesce(ro.rules->>'roundType', 'item') <> 'change')
          )
        )
      )
  )
$$;
