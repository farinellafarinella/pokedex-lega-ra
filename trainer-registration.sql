-- Registrazione allenatore separata dall'abbinamento del Pokédex.
create or replace function public.register_trainer_profile(p_trainer_name text)
returns table(trainer_id uuid, trainer_code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles;
  v_code text;
begin
  if auth.uid() is null then raise exception 'AUTHENTICATION_REQUIRED'; end if;
  if length(trim(p_trainer_name)) not between 2 and 60 then raise exception 'INVALID_TRAINER_NAME'; end if;

  select * into v_profile from public.profiles where user_id = auth.uid();
  if found then
    trainer_id := v_profile.id;
    trainer_code := v_profile.trainer_code;
    return next;
    return;
  end if;

  v_code := 'TR-' || lpad(nextval('public.trainer_code_seq')::text, 4, '0');
  insert into public.profiles(user_id, trainer_code, trainer_name, registration_date, ranking_points, balance, role, is_active)
  values(auth.uid(), v_code, trim(p_trainer_name), current_date, 0, 0, 'trainer', true)
  returning * into v_profile;

  trainer_id := v_profile.id;
  trainer_code := v_profile.trainer_code;
  return next;
end;
$$;

revoke all on function public.register_trainer_profile(text) from public;
grant execute on function public.register_trainer_profile(text) to authenticated;
