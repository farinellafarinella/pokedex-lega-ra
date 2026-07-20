-- Correzione unificata per QR Pokédex, profilo pubblico e trasferimenti.
create or replace function public.resolve_pokedex_activation(p_activation_token text)
returns table(device_status public.pokedex_status, trainer_code text)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_device public.pokedex_devices;
  v_normalized text := upper(trim(coalesce(p_activation_token, '')));
begin
  select * into v_device
  from public.pokedex_devices
  where upper(trim(activation_token)) = v_normalized;

  if not found then return; end if;
  device_status := v_device.status;

  if v_device.status = 'activated' then
    select p.trainer_code into trainer_code
    from public.profiles p
    where p.id = v_device.trainer_id and p.is_active;
  end if;
  return next;
end;
$$;

create or replace function public.resolve_transfer_recipient(p_activation_token text)
returns table(trainer_code text, trainer_name text)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'AUTHENTICATION_REQUIRED'; end if;

  return query
  select p.trainer_code, p.trainer_name
  from public.pokedex_devices d
  join public.profiles p on p.id = d.trainer_id
  where upper(trim(d.activation_token)) = upper(trim(coalesce(p_activation_token, '')))
    and d.status = 'activated'
    and p.is_active;
end;
$$;

revoke all on function public.resolve_pokedex_activation(text) from public;
revoke all on function public.resolve_transfer_recipient(text) from public;
grant execute on function public.resolve_pokedex_activation(text) to anon, authenticated;
grant execute on function public.resolve_transfer_recipient(text) to authenticated;
