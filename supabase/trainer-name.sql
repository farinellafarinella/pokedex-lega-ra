-- Permette a ogni allenatore attivo di modificare soltanto il proprio nome.
create or replace function public.update_my_trainer_name(p_trainer_name text)
returns table(trainer_name text,updated_at timestamptz)
language plpgsql security definer set search_path=public as $$
declare v_name text:=trim(p_trainer_name); v_profile public.profiles;
begin
 if auth.uid() is null then raise exception 'AUTHENTICATION_REQUIRED'; end if;
 if length(v_name) not between 2 and 60 then raise exception 'INVALID_TRAINER_NAME'; end if;
 if v_name !~ '^[[:alnum:]][[:alnum:] ''._-]*$' then raise exception 'INVALID_TRAINER_NAME'; end if;
 update public.profiles set trainer_name=v_name,updated_at=now()
 where user_id=auth.uid() and is_active
 returning * into v_profile;
 if not found then raise exception 'TRAINER_NOT_FOUND_OR_INACTIVE'; end if;
 trainer_name:=v_profile.trainer_name;updated_at:=v_profile.updated_at;return next;
end$$;

revoke all on function public.update_my_trainer_name(text) from public;
grant execute on function public.update_my_trainer_name(text) to authenticated;
