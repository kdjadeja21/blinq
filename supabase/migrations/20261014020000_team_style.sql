-- Team style. See docs/MULTIPLAYER.md.
-- Duel: one duel at a time (the original behavior). Squad: every duel of a level runs at once.
-- Existing rooms are Duel.

alter table rooms
  add column team_style text not null default 'duel' check (team_style in ('duel', 'squad'));

-- Squad rooms keep duel_index at 0, so the "current duel" comparison would only open duel 0.
-- For Squad, every duel of the current level is readable in the same phases. Duel rooms keep
-- exactly the previous rules.
create or replace function public.can_read_duel_items(did uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from duels du
    join rooms r on r.id = du.room_id
    where du.id = did
      and public.is_room_member(r.id)
      and case
        when r.team_style = 'squad' then
          du.level < r.level
          or (du.level = r.level and r.phase in ('memorize', 'level_result', 'finished'))
        else
          (du.level, du.duel_index) < (r.level, r.duel_index)
          or (
            (du.level, du.duel_index) = (r.level, r.duel_index)
            and r.phase in ('memorize', 'duel_result', 'level_result', 'finished')
          )
      end
  )
$$;

create or replace function public.can_read_duel_choices(did uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from duels du
    join rooms r on r.id = du.room_id
    where du.id = did
      and public.is_room_member(r.id)
      and case
        when r.team_style = 'squad' then
          du.level < r.level
          or (du.level = r.level and r.phase in ('memorize', 'recall', 'level_result', 'finished'))
        else
          (du.level, du.duel_index) < (r.level, r.duel_index)
          or (
            (du.level, du.duel_index) = (r.level, r.duel_index)
            and r.phase in ('memorize', 'recall', 'duel_result', 'level_result', 'finished')
          )
      end
  )
$$;
