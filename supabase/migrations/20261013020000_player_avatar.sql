-- One unique avatar emoji per player in a room (assigned by the server when joining).
alter table players add column avatar text;
create unique index players_room_avatar_idx on players (room_id, avatar) where avatar is not null;
