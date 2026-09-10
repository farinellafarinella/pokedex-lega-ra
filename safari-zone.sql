-- Zona Safari del venerdì: una spedizione settimanale per Allenatore.
-- Eseguire dopo schema.sql e notifications.sql.

create table if not exists public.safari_expeditions (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.profiles(id) on delete cascade,
  expedition_date date not null default ((now() at time zone 'Europe/Rome')::date),
  expedition_status text not null default 'exploring'
    check (expedition_status in ('exploring','escaped','failed')),
  bounty bigint not null default 10 check (bounty >= 0),
  current_pokemon text,
  current_catch_chance smallint check (current_catch_chance between 1 and 100),
  captured_pokemon text[] not null default '{}',
  encounters integer not null default 0 check (encounters >= 0),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  payout_transaction_id uuid unique references public.transactions(id),
  unique(trainer_id,expedition_date)
);

create index if not exists safari_trainer_idx
on public.safari_expeditions(trainer_id,expedition_date desc);

alter table public.safari_expeditions enable row level security;
drop policy if exists safari_own_read on public.safari_expeditions;
create policy safari_own_read on public.safari_expeditions
for select to authenticated
using (trainer_id=public.my_profile_id() or public.is_admin());
grant select on public.safari_expeditions to authenticated;
revoke insert,update,delete on public.safari_expeditions from anon,authenticated;

create or replace function public.safari_is_open()
returns boolean language sql stable set search_path=public as $$
  select extract(isodow from now() at time zone 'Europe/Rome')=5
    or public.is_admin()
$$;
grant execute on function public.safari_is_open() to authenticated;

create or replace function public.safari_random_encounter()
returns table(pokemon text,catch_chance smallint)
language plpgsql volatile security definer set search_path=public as $$
declare
  v_pokemon text[]:=array[
    'Paras','Venonat','Raticate','Dodrio','Heracross','Scyther',
    'Pinsir','Tauros','Arcanine','Rapidash','Beedrill','Butterfree'
  ];
  v_chances smallint[]:=array[78,76,72,68,58,52,52,46,42,44,64,70];
  v_index integer;
begin
  v_index:=1+floor(random()*array_length(v_pokemon,1))::integer;
  pokemon:=v_pokemon[v_index];
  catch_chance:=v_chances[v_index];
  return next;
end $$;
revoke all on function public.safari_random_encounter() from public;

create or replace function public.get_safari_status()
returns table(
  is_open boolean,
  expedition_id uuid,
  expedition_status text,
  bounty bigint,
  current_pokemon text,
  current_catch_chance smallint,
  captured_pokemon text[],
  encounters integer
)
language plpgsql stable security definer set search_path=public as $$
declare v_expedition public.safari_expeditions;
begin
  if auth.uid() is null then raise exception 'AUTHENTICATION_REQUIRED'; end if;
  is_open:=public.safari_is_open();
  select * into v_expedition
  from public.safari_expeditions
  where trainer_id=public.my_profile_id()
    and expedition_date=(now() at time zone 'Europe/Rome')::date;
  if found then
    expedition_id:=v_expedition.id;
    expedition_status:=v_expedition.expedition_status;
    bounty:=v_expedition.bounty;
    current_pokemon:=v_expedition.current_pokemon;
    current_catch_chance:=v_expedition.current_catch_chance;
    captured_pokemon:=v_expedition.captured_pokemon;
    encounters:=v_expedition.encounters;
  else
    expedition_status:='available';
    bounty:=10;
    captured_pokemon:='{}';
    encounters:=0;
  end if;
  return next;
end $$;

create or replace function public.start_safari_expedition()
returns public.safari_expeditions
language plpgsql security definer set search_path=public as $$
declare
  v_trainer uuid:=public.my_profile_id();
  v_encounter record;
  v_expedition public.safari_expeditions;
begin
  if not public.safari_is_open() then raise exception 'SAFARI_CLOSED'; end if;
  if v_trainer is null then raise exception 'ACCOUNT_NOT_ACTIVE'; end if;
  perform 1 from public.profiles where id=v_trainer and is_active;
  if not found then raise exception 'ACCOUNT_NOT_ACTIVE'; end if;
  select * into v_encounter from public.safari_random_encounter();
  insert into public.safari_expeditions(
    trainer_id,bounty,current_pokemon,current_catch_chance,encounters
  ) values(v_trainer,10,v_encounter.pokemon,v_encounter.catch_chance,1)
  returning * into v_expedition;
  return v_expedition;
exception when unique_violation then
  raise exception 'EXPEDITION_ALREADY_USED';
end $$;

create or replace function public.catch_safari_pokemon(p_expedition_id uuid)
returns table(
  caught boolean,
  expedition_status text,
  bounty bigint,
  caught_pokemon text,
  current_pokemon text,
  current_catch_chance smallint,
  captured_pokemon text[]
)
language plpgsql security definer set search_path=public as $$
declare
  v_expedition public.safari_expeditions;
  v_encounter record;
  v_caught_pokemon text;
begin
  if not public.safari_is_open() then raise exception 'SAFARI_CLOSED'; end if;
  select * into v_expedition from public.safari_expeditions
  where id=p_expedition_id and trainer_id=public.my_profile_id()
  for update;
  if not found then raise exception 'EXPEDITION_NOT_FOUND'; end if;
  if v_expedition.expedition_status<>'exploring' then raise exception 'EXPEDITION_FINISHED'; end if;

  v_caught_pokemon:=v_expedition.current_pokemon;
  caught:=floor(random()*100)::integer < v_expedition.current_catch_chance;
  caught_pokemon:=v_caught_pokemon;

  if not caught then
    update public.safari_expeditions
    set expedition_status='failed',bounty=0,current_pokemon=null,
        current_catch_chance=null,completed_at=now()
    where id=v_expedition.id returning * into v_expedition;
  else
    select * into v_encounter from public.safari_random_encounter();
    update public.safari_expeditions
    set bounty=bounty*2,
        captured_pokemon=array_append(captured_pokemon,v_caught_pokemon),
        current_pokemon=v_encounter.pokemon,
        current_catch_chance=v_encounter.catch_chance,
        encounters=encounters+1
    where id=v_expedition.id returning * into v_expedition;
  end if;

  expedition_status:=v_expedition.expedition_status;
  bounty:=v_expedition.bounty;
  current_pokemon:=v_expedition.current_pokemon;
  current_catch_chance:=v_expedition.current_catch_chance;
  captured_pokemon:=v_expedition.captured_pokemon;
  return next;
end $$;

create or replace function public.escape_safari(p_expedition_id uuid)
returns table(payout bigint,new_balance bigint)
language plpgsql security definer set search_path=public as $$
declare
  v_expedition public.safari_expeditions;
  v_tx public.transactions;
begin
  select * into v_expedition from public.safari_expeditions
  where id=p_expedition_id and trainer_id=public.my_profile_id()
  for update;
  if not found then raise exception 'EXPEDITION_NOT_FOUND'; end if;
  if v_expedition.expedition_status<>'exploring' then raise exception 'EXPEDITION_FINISHED'; end if;

  update public.profiles set balance=balance+v_expedition.bounty,updated_at=now()
  where id=v_expedition.trainer_id
  returning balance into new_balance;
  insert into public.transactions(
    operation_id,sender_id,receiver_id,amount,description,transaction_type,created_by
  ) values(
    gen_random_uuid(),null,v_expedition.trainer_id,v_expedition.bounty,
    'Bottino Zona Safari','transfer',v_expedition.trainer_id
  ) returning * into v_tx;
  update public.safari_expeditions
  set expedition_status='escaped',current_pokemon=null,current_catch_chance=null,
      completed_at=now(),payout_transaction_id=v_tx.id
  where id=v_expedition.id;
  payout:=v_expedition.bounty;
  return next;
end $$;

revoke all on function public.get_safari_status() from public;
revoke all on function public.start_safari_expedition() from public;
revoke all on function public.catch_safari_pokemon(uuid) from public;
revoke all on function public.escape_safari(uuid) from public;
grant execute on function public.get_safari_status() to authenticated;
grant execute on function public.start_safari_expedition() to authenticated;
grant execute on function public.catch_safari_pokemon(uuid) to authenticated;
grant execute on function public.escape_safari(uuid) to authenticated;
