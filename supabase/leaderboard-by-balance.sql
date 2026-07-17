-- Classifica ufficiale basata sul saldo Pokédollari.
create or replace function public.get_leaderboard()
returns table (
  id uuid,
  trainer_code text,
  trainer_name text,
  registration_date date,
  ranking_points integer,
  balance bigint,
  is_active boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.trainer_code,
    p.trainer_name,
    p.registration_date,
    p.ranking_points,
    p.balance,
    p.is_active
  from public.profiles p
  where p.role = 'trainer' and p.is_active
  order by p.balance desc, p.trainer_name asc, p.id asc;
$$;

revoke all on function public.get_leaderboard() from public;
grant execute on function public.get_leaderboard() to anon, authenticated;
