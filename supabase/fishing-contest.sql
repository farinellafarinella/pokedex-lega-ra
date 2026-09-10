-- Gara di Pesca del martedì; test_mode la rende disponibile ogni giorno.
create table if not exists public.fishing_settings(id boolean primary key default true check(id),test_mode boolean not null default true);
insert into public.fishing_settings values(true,true) on conflict(id) do update set test_mode=true;
create table if not exists public.fishing_days(id uuid primary key default gen_random_uuid(),game_date date unique not null,winner_id uuid references public.profiles(id),prize_transaction_id uuid references public.transactions(id),finalized_at timestamptz);
create table if not exists public.fishing_catches(id uuid primary key default gen_random_uuid(),day_id uuid not null references public.fishing_days(id) on delete cascade,trainer_id uuid not null references public.profiles(id),pokemon text not null,length_cm numeric(8,2) not null,cost_transaction_id uuid references public.transactions(id),caught_at timestamptz default now());
create index if not exists fishing_rank_idx on public.fishing_catches(day_id,length_cm desc,caught_at);
alter table public.fishing_days enable row level security;alter table public.fishing_catches enable row level security;
drop policy if exists fishing_days_read on public.fishing_days;drop policy if exists fishing_catches_read on public.fishing_catches;
create policy fishing_days_read on public.fishing_days for select to authenticated using(true);create policy fishing_catches_read on public.fishing_catches for select to authenticated using(true);grant select on public.fishing_days,public.fishing_catches to authenticated;
create or replace function public.random_fish() returns text language plpgsql volatile as $$declare a text[]:=array['Magikarp','Goldeen','Poliwag','Horsea','Krabby','Tentacool','Shellder','Staryu','Chinchou','Remoraid','Corsola','Carvanha','Feebas'];begin return a[1+floor(random()*array_length(a,1))::int];end$$;
create or replace function public.fish_length(n text) returns numeric language sql volatile as $$select round(((case n when 'Magikarp' then 90 when 'Goldeen' then 60 when 'Poliwag' then 55 when 'Horsea' then 40 when 'Krabby' then 45 when 'Tentacool' then 90 when 'Shellder' then 35 when 'Staryu' then 80 when 'Chinchou' then 70 when 'Remoraid' then 60 when 'Corsola' then 65 when 'Carvanha' then 80 when 'Feebas' then 75 else 50 end)*(0.6+random()*0.8))::numeric,2)$$;
create or replace function public.play_fishing_contest(p_operation_id uuid) returns table(pokemon text,length_cm numeric,new_balance bigint,plays_left integer) language plpgsql security definer set search_path=public as $$declare p public.profiles;d public.fishing_days;n text;l numeric;used integer;t boolean;today date:=(now() at time zone 'Europe/Rome')::date;tx public.transactions;begin select test_mode into t from public.fishing_settings where id=true;if extract(dow from today)::int<>2 and not t then raise exception 'CLOSED';end if;select * into p from public.profiles where user_id=auth.uid() and is_active for update;insert into public.fishing_days(game_date) values(today) on conflict(game_date) do update set game_date=excluded.game_date returning * into d;select count(*)::int into used from public.fishing_catches where day_id=d.id and trainer_id=p.id;if used>=3 then raise exception 'LIMIT';end if;if p.balance<50 then raise exception 'INSUFFICIENT';end if;update public.profiles set balance=balance-50,updated_at=now() where id=p.id returning balance into p.balance;insert into public.transactions(operation_id,sender_id,amount,description,transaction_type,created_by) values(p_operation_id,p.id,50,'Pescata Gara di Pesca','admin_debit',p.id) returning * into tx;n:=public.random_fish();l:=public.fish_length(n);insert into public.fishing_catches(day_id,trainer_id,pokemon,length_cm,cost_transaction_id) values(d.id,p.id,n,l,tx.id);return query select n,l,p.balance,2-used;end$$;
create or replace function public.get_fishing_status() returns table(is_open boolean,plays_used integer,best_pokemon text,best_length numeric,leader_name text,leader_length numeric) language plpgsql security definer set search_path=public as $$declare pid uuid:=public.my_profile_id();today date:=(now() at time zone 'Europe/Rome')::date;d public.fishing_days;t boolean;begin select test_mode into t from public.fishing_settings where id=true;is_open:=extract(dow from today)::int=2 or t;select * into d from public.fishing_days where game_date=today;plays_used:=0;if d.id is not null then select count(*)::int into plays_used from public.fishing_catches where day_id=d.id and trainer_id=pid;select pokemon,length_cm into best_pokemon,best_length from public.fishing_catches where day_id=d.id and trainer_id=pid order by length_cm desc,caught_at limit 1;select p.trainer_name,c.length_cm into leader_name,leader_length from public.fishing_catches c join public.profiles p on p.id=c.trainer_id where c.day_id=d.id order by c.length_cm desc,c.caught_at limit 1;end if;return next;end$$;
create or replace function public.get_fishing_leaderboard() returns table(rank_no bigint,trainer_name text,pokemon text,length_cm numeric) language sql security definer set search_path=public as $$with d as(select id from public.fishing_days where game_date=(now() at time zone 'Europe/Rome')::date),b as(select distinct on(trainer_id) trainer_id,pokemon,length_cm,caught_at from public.fishing_catches,d where day_id=d.id order by trainer_id,length_cm desc,caught_at)select row_number() over(order by b.length_cm desc,b.caught_at),p.trainer_name,b.pokemon,b.length_cm from b join public.profiles p on p.id=b.trainer_id order by b.length_cm desc,b.caught_at$$;
create or replace function public.finalize_fishing_days() returns integer language plpgsql security definer set search_path=public as $$declare d public.fishing_days;w public.fishing_catches;tx public.transactions;n integer:=0;begin for d in select * from public.fishing_days where game_date<(now() at time zone 'Europe/Rome')::date and finalized_at is null for update loop select * into w from public.fishing_catches where day_id=d.id order by length_cm desc,caught_at limit 1;if found then update public.profiles set balance=balance+300,updated_at=now() where id=w.trainer_id;insert into public.transactions(operation_id,receiver_id,amount,description,transaction_type,created_by) values(gen_random_uuid(),w.trainer_id,300,'Vittoria Gara di Pesca','admin_credit',w.trainer_id) returning * into tx;update public.fishing_days set winner_id=w.trainer_id,prize_transaction_id=tx.id,finalized_at=now() where id=d.id;else update public.fishing_days set finalized_at=now() where id=d.id;end if;n:=n+1;end loop;return n;end$$;
revoke all on function public.play_fishing_contest(uuid),public.get_fishing_status(),public.get_fishing_leaderboard(),public.finalize_fishing_days() from public;grant execute on function public.play_fishing_contest(uuid),public.get_fishing_status(),public.get_fishing_leaderboard() to authenticated;
create extension if not exists pg_cron;do $$begin if not exists(select 1 from cron.job where jobname='finalize-fishing-days') then perform cron.schedule('finalize-fishing-days','*/15 * * * *','select public.finalize_fishing_days();');end if;end$$;

-- Il test_mode è utilizzabile soltanto dagli amministratori.
create or replace function public.play_fishing_contest(p_operation_id uuid)
returns table(pokemon text,length_cm numeric,new_balance bigint,plays_left integer)
language plpgsql security definer set search_path=public as $$
declare
  p public.profiles;d public.fishing_days;n text;l numeric;used integer;t boolean;
  today date:=(now() at time zone 'Europe/Rome')::date;tx public.transactions;
begin
  select test_mode into t from public.fishing_settings where id=true;
  if extract(dow from today)::int<>2 and not (coalesce(t,false) and public.is_admin()) then raise exception 'CLOSED';end if;
  select * into p from public.profiles where user_id=auth.uid() and is_active for update;
  insert into public.fishing_days(game_date) values(today)
    on conflict(game_date) do update set game_date=excluded.game_date returning * into d;
  select count(*)::int into used from public.fishing_catches where day_id=d.id and trainer_id=p.id;
  if used>=3 then raise exception 'LIMIT';end if;
  if p.balance<50 then raise exception 'INSUFFICIENT';end if;
  update public.profiles set balance=balance-50,updated_at=now() where id=p.id returning balance into p.balance;
  insert into public.transactions(operation_id,sender_id,amount,description,transaction_type,created_by)
  values(p_operation_id,p.id,50,'Pescata Gara di Pesca','admin_debit',p.id) returning * into tx;
  n:=public.random_fish();l:=public.fish_length(n);
  insert into public.fishing_catches(day_id,trainer_id,pokemon,length_cm,cost_transaction_id)
  values(d.id,p.id,n,l,tx.id);
  return query select n,l,p.balance,2-used;
end$$;

create or replace function public.get_fishing_status()
returns table(is_open boolean,plays_used integer,best_pokemon text,best_length numeric,leader_name text,leader_length numeric)
language plpgsql security definer set search_path=public as $$
declare
  pid uuid:=public.my_profile_id();today date:=(now() at time zone 'Europe/Rome')::date;
  d public.fishing_days;t boolean;
begin
  select test_mode into t from public.fishing_settings where id=true;
  is_open:=extract(dow from today)::int=2 or (coalesce(t,false) and public.is_admin());
  select * into d from public.fishing_days where game_date=today;
  plays_used:=0;
  if d.id is not null then
    select count(*)::int into plays_used from public.fishing_catches where day_id=d.id and trainer_id=pid;
    select pokemon,length_cm into best_pokemon,best_length from public.fishing_catches
      where day_id=d.id and trainer_id=pid order by length_cm desc,caught_at limit 1;
    select p.trainer_name,c.length_cm into leader_name,leader_length
      from public.fishing_catches c join public.profiles p on p.id=c.trainer_id
      where c.day_id=d.id order by c.length_cm desc,c.caught_at limit 1;
  end if;
  return next;
end$$;
