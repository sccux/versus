-- Players mark themselves ready before the next round starts
alter table players add column is_ready bool not null default false;
