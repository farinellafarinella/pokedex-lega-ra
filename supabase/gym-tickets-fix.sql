-- Lettura biglietti personali/admin e check-in sicuro tramite QR.
grant select on public.gym_registrations to authenticated;

create or replace function public.admin_checkin_gym_ticket(p_ticket_code text)
returns public.gym_registrations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ticket public.gym_registrations;
  v_admin uuid := public.my_profile_id();
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;

  select * into v_ticket
  from public.gym_registrations
  where upper(trim(ticket_code)) = upper(trim(p_ticket_code))
  for update;

  if not found then raise exception 'TICKET_NOT_FOUND'; end if;
  if v_ticket.ticket_status <> 'valid' then raise exception 'TICKET_NOT_VALID'; end if;

  update public.gym_registrations
  set ticket_status = 'used', checked_in_at = now(), checked_in_by = v_admin
  where id = v_ticket.id
  returning * into v_ticket;

  return v_ticket;
end;
$$;

revoke all on function public.admin_checkin_gym_ticket(text) from public;
grant execute on function public.admin_checkin_gym_ticket(text) to authenticated;
