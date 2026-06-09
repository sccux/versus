create or replace function increment_score(player_id uuid)
returns void as $$
  update players set score = score + 1 where id = player_id;
$$ language sql;
