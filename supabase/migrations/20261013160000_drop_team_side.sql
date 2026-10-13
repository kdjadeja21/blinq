-- Revert attractive team names PR: drop stable side slot; pairing uses Team A / Team B names again.
drop index if exists teams_room_side_idx;
alter table teams drop column if exists side;
