-- Rimozione sicura delle medaglie da parte di un amministratore.
create or replace function public.admin_remove_trainer_badge(
  p_trainer_id uuid,
  p_badge_position integer
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trainer_badge public.trainer_badges;
  v_badge_name text;
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN';
  end if;

  select tb.* into v_trainer_badge
  from public.trainer_badges tb
  join public.badges b on b.id = tb.badge_id
  where tb.trainer_id = p_trainer_id
    and b.position = p_badge_position
  for update of tb;

  if not found then
    raise exception 'BADGE_NOT_FOUND';
  end if;

  select name into v_badge_name
  from public.badges
  where id = v_trainer_badge.badge_id;

  -- Elimina prima l'eventuale registrazione prodotta dalla scansione QR.
  delete from public.gym_badge_claims
  where trainer_badge_id = v_trainer_badge.id;

  delete from public.trainer_badges
  where id = v_trainer_badge.id;

  return v_badge_name;
end;
$$;

revoke all on function public.admin_remove_trainer_badge(uuid, integer) from public;
grant execute on function public.admin_remove_trainer_badge(uuid, integer) to authenticated;
