-- Tables are generated from a seed. Play again changes the seed, so a replay gets new tables
-- instead of the same ones as the first game.
alter table rooms add column game_seed text not null default gen_random_uuid()::text;
