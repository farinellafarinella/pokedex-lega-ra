-- Rende la verifica dei token tollerante a spazi e differenze maiuscole/minuscole.
create or replace function public.resolve_pokedex_activation(p_activation_token text)
returns table(device_status public.pokedex_status,trainer_code text)
language plpgsql security definer set search_path=public,extensions as $$
declare
 v_device public.pokedex_devices;
 v_normalized text:=upper(trim(coalesce(p_activation_token,'')));
 v_hash text:=encode(digest(v_normalized,'sha256'),'hex');
 v_exists boolean:=false;
begin
 if (select count(*) from public.pokedex_activation_attempts where token_hash=v_hash and attempted_at>now()-interval '15 minutes')>=20 then
   raise exception 'TOO_MANY_ATTEMPTS';
 end if;
 select * into v_device from public.pokedex_devices
 where upper(trim(activation_token))=v_normalized;
 v_exists:=found;
 insert into public.pokedex_activation_attempts(token_hash,actor_user_id,result)
 values(v_hash,auth.uid(),case when v_exists then v_device.status::text else 'invalid' end);
 if not v_exists then return; end if;
 device_status:=v_device.status;
 if v_device.status='activated' then
   select p.trainer_code into trainer_code from public.profiles p where p.id=v_device.trainer_id;
 end if;
 return next;
end$$;

revoke all on function public.resolve_pokedex_activation(text) from public;
grant execute on function public.resolve_pokedex_activation(text) to anon,authenticated;
