-- Couch mode: TV/spectator rooms where the host is not a player
create type room_mode as enum ('online', 'couch');

alter table rooms add column mode room_mode not null default 'online';
