-- Signed-in solo players (Clerk). user_id is the Clerk user id (text, "user_...").
-- All access goes through /api/solo with the service role; RLS is on with no policies,
-- so browsers using the publishable key cannot read or write these tables.

create table solo_profiles (
  user_id text primary key,
  display_name text,
  avatar_url text,
  email text,
  birth_year int check (birth_year is null or birth_year between 1900 and 2100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table solo_stats (
  user_id text primary key references solo_profiles on delete cascade,
  level int not null default 1,
  best_level int not null default 1,
  rounds_played int not null default 0,
  wins int not null default 0,
  perfect_rounds int not null default 0,
  correct_items int not null default 0,
  total_items int not null default 0,
  wrong_guesses int not null default 0,
  best_score int not null default 0,
  streak int not null default 0,
  best_streak int not null default 0,
  last_daily_date text,
  daily jsonb,
  training_done boolean not null default false,
  updated_at timestamptz not null default now()
);

create table solo_rounds (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references solo_profiles on delete cascade,
  mode text not null check (mode in ('level', 'daily')),
  level int not null default 1,
  daily_date text,
  score int not null,
  stars int not null,
  correct int not null,
  total int not null,
  won boolean not null,
  created_at timestamptz not null default now()
);
create index solo_rounds_user_created_idx on solo_rounds (user_id, created_at desc);
create unique index solo_rounds_user_daily_idx on solo_rounds (user_id, daily_date) where daily_date is not null;

alter table solo_profiles enable row level security;
alter table solo_stats enable row level security;
alter table solo_rounds enable row level security;
