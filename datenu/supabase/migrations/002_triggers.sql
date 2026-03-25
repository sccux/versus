-- Match detection trigger
-- Fires after a 'like' swipe is inserted.
-- If the partner has already liked the same idea, creates a match.

create or replace function public.check_and_create_match()
returns trigger
language plpgsql
security definer
as $$
declare
  partner_id uuid;
  partner_liked boolean;
begin
  -- Only act on 'like' swipes
  if new.direction != 'like' then
    return new;
  end if;

  -- Find the partner's user_id in this couple
  select case
    when user_a_id = new.user_id then user_b_id
    else user_a_id
  end into partner_id
  from public.couples
  where id = new.couple_id;

  -- Check if partner has liked the same idea
  select exists(
    select 1 from public.swipes
    where couple_id = new.couple_id
      and user_id = partner_id
      and idea_id = new.idea_id
      and direction = 'like'
  ) into partner_liked;

  -- If partner liked it too, create a match (ignore if already exists)
  if partner_liked then
    insert into public.matches (couple_id, idea_id)
    values (new.couple_id, new.idea_id)
    on conflict (couple_id, idea_id) do nothing;
  end if;

  return new;
end;
$$;

create trigger on_swipe_inserted
  after insert on public.swipes
  for each row execute function public.check_and_create_match();
