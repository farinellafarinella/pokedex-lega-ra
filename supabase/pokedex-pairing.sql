-- Permette a un allenatore già registrato, ma senza Pokédex, di abbinarne uno disponibile.
create policy pokedex_trainer_own_read on public.pokedex_devices
for select to authenticated
using(trainer_id=public.my_profile_id() or public.is_admin());

create or replace function public.pair_pokedex(p_activation_token text)
returns table(pokedex_id uuid,trainer_code text)
language plpgsql security definer set search_path=public,extensions as $$
declare v_device public.pokedex_devices; v_profile public.profiles; v_normalized text:=upper(trim(coalesce(p_activation_token,'')));
begin
 if auth.uid() is null then raise exception 'AUTHENTICATION_REQUIRED'; end if;
 select * into v_profile from public.profiles where user_id=auth.uid() and is_active for update;
 if not found then raise exception 'TRAINER_PROFILE_REQUIRED'; end if;
 if exists(select 1 from public.pokedex_devices where trainer_id=v_profile.id and status='activated') then raise exception 'TRAINER_ALREADY_HAS_POKEDEX'; end if;
 select * into v_device from public.pokedex_devices where upper(trim(activation_token))=v_normalized for update;
 if not found then raise exception 'INVALID_POKEDEX'; end if;
 if v_device.status<>'available' or v_device.trainer_id is not null then raise exception 'POKEDEX_NOT_AVAILABLE'; end if;
 update public.pokedex_devices set status='activated',trainer_id=v_profile.id,activated_at=now(),updated_at=now() where id=v_device.id;
 pokedex_id:=v_device.id;trainer_code:=v_profile.trainer_code;return next;
end$$;

revoke all on function public.pair_pokedex(text) from public;
grant execute on function public.pair_pokedex(text) to authenticated;
