-- Stable A/B slot for pairing; `name` is the display label shown in the UI.
alter table teams add column side text check (side in ('a', 'b'));

update teams set side = 'a' where name = 'Team A' and side is null;
update teams set side = 'b' where name = 'Team B' and side is null;

-- Any stray rows (shouldn't exist) get deterministic sides before NOT NULL.
update teams t
set side = case when t.id = (select min(id) from teams t2 where t2.room_id = t.room_id) then 'a' else 'b' end
where side is null;

alter table teams alter column side set not null;
create unique index teams_room_side_idx on teams (room_id, side);
