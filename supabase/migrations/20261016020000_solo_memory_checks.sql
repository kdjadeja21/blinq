-- Memory test results for signed-in solo players, so the baseline and retests follow the account.
-- Accessed only through /api/solo with the service role; RLS is on with no policies.

create table solo_memory_checks (
  user_id text not null references solo_profiles on delete cascade,
  check_date text not null,
  accuracy int not null check (accuracy between 0 and 100),
  created_at timestamptz not null default now(),
  primary key (user_id, check_date)
);

alter table solo_memory_checks enable row level security;
