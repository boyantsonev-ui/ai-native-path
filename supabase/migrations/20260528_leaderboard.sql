-- Add display_name to user_progress for leaderboard (populated on each sync)
alter table user_progress add column if not exists display_name text;

-- Public leaderboard function (SECURITY DEFINER bypasses RLS; only exposes safe fields)
create or replace function get_leaderboard(limit_n integer default 20)
returns table(rank bigint, display_name text, points integer, is_current_user boolean)
language plpgsql security definer stable
set search_path = public
as $$
begin
  return query
  select
    row_number() over (order by up.points desc)::bigint as rank,
    coalesce(up.display_name, 'Anonymous') as display_name,
    up.points,
    up.user_id = auth.uid() as is_current_user
  from user_progress up
  where up.points > 0
  order by up.points desc
  limit limit_n;
end;
$$;

-- Allow both anon and authenticated callers
grant execute on function get_leaderboard(integer) to anon, authenticated;
