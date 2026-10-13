-- Hourly cleanup: delete rooms older than 1 hour with no player seen in the last 15 minutes.
-- Children (teams, players, duels, ...) are removed by ON DELETE CASCADE.
-- expires_at (24h) stays as a hard cap for rooms that keep pinging.

create or replace function public.cleanup_inactive_rooms()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  removed integer;
begin
  with gone as (
    delete from rooms r
    where (
      r.created_at < now() - interval '1 hour'
      and not exists (
        select 1 from players p
        where p.room_id = r.id
          and not p.is_bot
          and p.last_seen_at > now() - interval '15 minutes'
      )
    ) or r.expires_at < now()
    returning 1
  )
  select count(*) into removed from gone;
  return removed;
end;
$$;

revoke all on function public.cleanup_inactive_rooms() from public, anon, authenticated;

do $$
begin
  create extension if not exists pg_cron;
  perform cron.unschedule(jobid) from cron.job where jobname = 'blinq-room-cleanup';
  perform cron.schedule('blinq-room-cleanup', '0 * * * *', 'select public.cleanup_inactive_rooms();');
exception when others then
  raise notice 'pg_cron unavailable (%); schedule public.cleanup_inactive_rooms() manually.', sqlerrm;
end;
$$;
