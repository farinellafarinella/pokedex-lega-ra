-- Gara di Pesca integrata. Eseguire nel SQL editor di Supabase prima del sito.
-- Nessun dato della vecchia gara o delle prove viene eliminato o importato.
begin;
create table if not exists public.fishing_game_species (
 id text primary key, rarity text not null, base_length numeric not null, base_weight numeric not null
);
insert into public.fishing_game_species(id,rarity,base_length,base_weight) values
('magikarp','common',0.9,10),
('goldeen','common',0.6,10),
('poliwag','common',0.6,10),
('tentacool','common',0.6,10),
('krabby','common',0.6,10),
('horsea','uncommon',0.6,10),
('shellder','uncommon',0.6,10),
('staryu','uncommon',0.6,10),
('chinchou','uncommon',0.6,10),
('remoraid','uncommon',0.6,10),
('corsola','rare',0.6,10),
('carvanha','rare',0.6,10),
('feebas','veryRare',0.6,10),
('psyduck','common',0.8,20),
('slowpoke','rare',1.2,36),
('dratini','veryRare',1.8,3)
on conflict(id) do update set rarity=excluded.rarity,base_length=excluded.base_length,base_weight=excluded.base_weight;
create table if not exists public.fishing_game_entries (
 id uuid primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 contest_day date not null,
 species text not null references public.fishing_game_species(id),
 state text not null default 'active' check(state in ('active','abandoned','caught')),
 cost numeric not null default 50 check(cost>=0),
 multiplier numeric, length_m numeric, weight_kg numeric,
 created_at timestamptz not null default now(), captured_at timestamptz
);
create index if not exists fishing_game_entries_user_day on public.fishing_game_entries(user_id,contest_day);
create unique index if not exists fishing_game_one_active on public.fishing_game_entries(user_id) where state='active';
alter table public.fishing_game_entries enable row level security;
alter table public.fishing_game_species enable row level security;
revoke all on public.fishing_game_entries,public.fishing_game_species from public,anon,authenticated;

create or replace function public.get_fishing_game_status()
returns table(is_open boolean,captures bigint,balance numeric,cost numeric,contest_day date)
language sql stable security definer set search_path='' as $$
 select extract(isodow from now() at time zone 'Europe/Rome')=2,
 (select count(*) from public.fishing_game_entries e where e.user_id=auth.uid() and e.contest_day=(now() at time zone 'Europe/Rome')::date and e.state='caught'),
 p.balance::numeric,50::numeric,
 (now() at time zone 'Europe/Rome')::date
 from public.profiles p where p.user_id=auth.uid() and p.is_active;
$$;

create or replace function public.start_fishing_game(p_operation_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 uid uuid:=auth.uid(); today date:=(now() at time zone 'Europe/Rome')::date;
 entry public.fishing_game_entries%rowtype; chosen public.fishing_game_species%rowtype;
 current_balance numeric; draw numeric; category text; price numeric:=50;
begin
 if uid is null or p_operation_id is null then raise exception 'NOT_AUTHORIZED'; end if;
 perform pg_advisory_xact_lock(hashtextextended('fishing-game:'||uid::text,0));
 select balance into current_balance from public.profiles where user_id=uid and is_active for update;
 if not found then raise exception 'NOT_AUTHORIZED'; end if;
 select * into entry from public.fishing_game_entries where id=p_operation_id and user_id=uid;
 if found then
  if entry.contest_day<>today or entry.state<>'active' then raise exception 'ENCOUNTER_EXPIRED'; end if;
 else
  if extract(isodow from today)<>2 then raise exception 'CONTEST_CLOSED'; end if;
  if (select count(*) from public.fishing_game_entries where user_id=uid and contest_day=today and state='caught')>=3 then raise exception 'CAPTURE_LIMIT'; end if;
  if current_balance<price then raise exception 'INSUFFICIENT_BALANCE'; end if;
  draw:=random()*100;
  category:=case when draw<55 then 'common' when draw<83 then 'uncommon' when draw<96 then 'rare' else 'veryRare' end;
  select * into chosen from public.fishing_game_species where rarity=category order by random() limit 1;
  update public.fishing_game_entries set state='abandoned' where user_id=uid and state='active';
  insert into public.fishing_game_entries(id,user_id,contest_day,species,cost) values(p_operation_id,uid,today,chosen.id,price) returning * into entry;
  update public.profiles set balance=balance-price where user_id=uid returning balance into current_balance;
 end if;
 return jsonb_build_object('id',entry.id,'species',entry.species,'rarity',(select rarity from public.fishing_game_species where id=entry.species),'balance',current_balance,'cost',entry.cost,'contest_day',entry.contest_day);
end;
$$;

create or replace function public.finish_fishing_game(p_operation_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 uid uuid:=auth.uid(); today date:=(now() at time zone 'Europe/Rome')::date;
 entry public.fishing_game_entries%rowtype; fish public.fishing_game_species%rowtype;
 size_factor numeric; total bigint;
begin
 if uid is null or not exists(select 1 from public.profiles where user_id=uid and is_active) then raise exception 'NOT_AUTHORIZED'; end if;
 perform pg_advisory_xact_lock(hashtextextended('fishing-game:'||uid::text,0));
 select * into entry from public.fishing_game_entries where id=p_operation_id and user_id=uid for update;
 if not found then raise exception 'ENCOUNTER_NOT_FOUND'; end if;
 if entry.state<>'caught' then
  if entry.state<>'active' or entry.contest_day<>today then raise exception 'ENCOUNTER_EXPIRED'; end if;
  if extract(isodow from today)<>2 then raise exception 'CONTEST_CLOSED'; end if;
  if (select count(*) from public.fishing_game_entries where user_id=uid and contest_day=today and state='caught')>=3 then raise exception 'CAPTURE_LIMIT'; end if;
  if now()<entry.created_at+interval '2 seconds' then raise exception 'ENCOUNTER_NOT_READY'; end if;
  select * into fish from public.fishing_game_species where id=entry.species;
  size_factor:=.7+random();
  update public.fishing_game_entries set state='caught',multiplier=size_factor,length_m=round(fish.base_length*size_factor,2),weight_kg=round(fish.base_weight*size_factor,2),captured_at=now() where id=entry.id returning * into entry;
 end if;
 select * into fish from public.fishing_game_species where id=entry.species;
 select count(*) into total from public.fishing_game_entries where user_id=uid and contest_day=today and state='caught';
 return jsonb_build_object('species',entry.species,'rarity',fish.rarity,'length',entry.length_m,'weight',entry.weight_kg,'multiplier',entry.multiplier,'rating',case when entry.multiplier<.9 then 'Piccolo' when entry.multiplier<1.1 then 'Normale' when entry.multiplier<1.3 then 'Grande' when entry.multiplier<1.5 then 'Enorme' else 'Record' end,'date',entry.captured_at,'captures',total);
end;
$$;

create or replace function public.get_fishing_game_leaderboard()
returns table(rank_no bigint,trainer_name text,pokemon text,length_m numeric,is_me boolean,captures bigint)
language sql stable security definer set search_path='' as $$
 with ranked as (
 select e.*,p.trainer_name::text as name,
 row_number() over(partition by e.user_id order by e.length_m desc,e.captured_at,e.id) as best,
 count(*) over(partition by e.user_id) as total
 from public.fishing_game_entries e join public.profiles p on p.user_id=e.user_id
 where auth.uid() is not null and p.is_active and e.state='caught'
 and e.contest_day=(now() at time zone 'Europe/Rome')::date
 )
 select rank() over(order by r.length_m desc),r.name,r.species,r.length_m,r.user_id=auth.uid(),r.total
 from ranked r where r.best=1 order by r.length_m desc,r.captured_at,r.id;
$$;

revoke all on function public.get_fishing_game_status() from public,anon;
revoke all on function public.start_fishing_game(uuid) from public,anon;
revoke all on function public.finish_fishing_game(uuid) from public,anon;
revoke all on function public.get_fishing_game_leaderboard() from public,anon;
grant execute on function public.get_fishing_game_status() to authenticated;
grant execute on function public.start_fishing_game(uuid) to authenticated;
grant execute on function public.finish_fishing_game(uuid) to authenticated;
grant execute on function public.get_fishing_game_leaderboard() to authenticated;
-- The entry is also the immutable receipt for the launch charge.
create or replace function public.get_fishing_game_payments()
returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',e.id,'from',p.id,'to',null,'amount',e.cost,'note','Gara di Pesca · lancio della lenza','type','fishing','date',e.created_at,'status','completed') order by e.created_at desc),'[]'::jsonb)
 from public.fishing_game_entries e join public.profiles p on p.user_id=e.user_id
 where e.user_id=auth.uid() and p.is_active and e.cost>0;
$$;
revoke all on function public.get_fishing_game_payments() from public,anon;
grant execute on function public.get_fishing_game_payments() to authenticated;
commit;
