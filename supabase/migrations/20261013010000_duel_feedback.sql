-- Early finish ("I'm done") and richer duel results.
alter table duel_progress
  add column done boolean not null default false,
  add column done_ms int;

alter table duel_results
  add column wrong_count int not null default 0,
  add column speed_bonus int not null default 0,
  add column found_keys text[] not null default '{}';
