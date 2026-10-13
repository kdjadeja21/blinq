-- Snapshot of the difficulty engine's rules for each duel, so the server, every client and the
-- bot judge a duel by the same lives, penalty and combo window. Older duels get the values that
-- were hard-coded before the engine existed.
alter table duels
  add column rules jsonb not null default
    '{"engineVersion":0,"lives":3,"wrongPenaltyMs":3000,"comboWindowMs":3000,"choiceCount":0,"modifiers":[]}'::jsonb;
