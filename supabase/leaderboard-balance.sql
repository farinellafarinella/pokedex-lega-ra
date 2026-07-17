-- Classifica pubblica ordinata dal sito in base al saldo Pokédollari.
create or replace view public.public_profiles
with (security_invoker = true)
as
select
  id,
  trainer_code,
  trainer_name,
  registration_date,
  ranking_points,
  is_active,
  created_at,
  balance
from public.profiles
where role = 'trainer' and is_active;

grant select on public.public_profiles to anon, authenticated;
grant select (id, trainer_code, trainer_name, registration_date, ranking_points, is_active, created_at, balance)
on public.profiles to anon, authenticated;
