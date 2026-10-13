-- Optional: run in SQL Editor after deploy, OR create the same jobs in Dashboard → Integrations → Cron.
-- See docs/SUPABASE_SETUP.md. Replace APP_URL and CRON_SECRET (same value as MULTIPLAYER_CRON_SECRET).
-- Requires Postgres 15+ for sub-minute schedules (https://supabase.com/docs/guides/cron/quickstart).

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule(jobid) from cron.job where jobname in ('blinq-sweeper', 'blinq-room-cleanup');

-- Advances rooms whose deadline passed, and moves admin rights away from offline admins.
select cron.schedule(
  'blinq-sweeper',
  '10 seconds',
  $$
  select net.http_post(
    url := 'APP_URL/api/mp/sweep',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer CRON_SECRET'),
    body := '{}'::jsonb,
    timeout_milliseconds := 8000
  );
  $$
);

-- Rooms expire 24 hours after creation; children are removed by ON DELETE CASCADE.
select cron.schedule(
  'blinq-room-cleanup',
  '17 * * * *',
  $$ delete from public.rooms where expires_at < now(); $$
);
