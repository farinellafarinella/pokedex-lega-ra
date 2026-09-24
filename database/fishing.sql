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

-- Poké Balls are a per-account, per-Rome-day resource, including missed throws.
create table if not exists public.fishing_game_rules (
 id boolean primary key default true check(id), ball_limit integer not null default 10 check(ball_limit between 1 and 100)
);
alter table public.fishing_game_rules alter column ball_limit set default 10;
insert into public.fishing_game_rules(id,ball_limit) values(true,10) on conflict(id) do update set ball_limit=excluded.ball_limit;
create table if not exists public.fishing_game_throws (
 id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade,
 entry_id uuid not null references public.fishing_game_entries(id), contest_day date not null,
 success boolean not null, response jsonb, created_at timestamptz not null default now()
);
create index if not exists fishing_game_throws_user_day on public.fishing_game_throws(user_id,contest_day);
alter table public.fishing_game_rules enable row level security;
alter table public.fishing_game_throws enable row level security;
revoke all on public.fishing_game_rules,public.fishing_game_throws from public,anon,authenticated;
alter table public.fishing_game_entries add column if not exists xp_rewarded boolean not null default false;
alter table public.fishing_game_entries add column if not exists xp_awarded integer not null default 0;
alter table public.fishing_game_entries add column if not exists outcome text;
-- Do not grant retroactive XP to encounters completed before this update.
update public.fishing_game_entries set xp_rewarded=true,outcome='legacy' where state<>'active' and not xp_rewarded;

create or replace function public.fishing_balls_left(p_user uuid)
returns integer language sql stable security definer set search_path='' as $$
 select greatest(0,(select ball_limit from public.fishing_game_rules where id)
 -(select count(*)::integer from public.fishing_game_throws t where t.user_id=p_user and t.contest_day=(now() at time zone 'Europe/Rome')::date)
 -- A capture made before this update already consumed at least one ball.
 -(select count(*)::integer from public.fishing_game_entries e where e.user_id=p_user and e.contest_day=(now() at time zone 'Europe/Rome')::date and e.state='caught' and not exists(select 1 from public.fishing_game_throws t where t.entry_id=e.id)));
$$;
revoke all on function public.fishing_balls_left(uuid) from public,anon,authenticated;

-- Internal only. Lock order matches commit_starter_command: profile, then starter.
create or replace function public.award_fishing_xp(p_entry uuid,p_outcome text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 entry public.fishing_game_entries%rowtype; game_state jsonb; starter jsonb;
 reward integer; level_now integer; xp_now integer; required integer;
begin
 select * into entry from public.fishing_game_entries where id=p_entry for update;
 if not found then raise exception 'ENCOUNTER_NOT_FOUND'; end if;
 perform 1 from public.profiles where user_id=entry.user_id for update;
 select state into game_state from public.starter_games where user_id=entry.user_id for update;
 starter:=game_state#>'{profile,starter}';
 if starter is null or starter='null'::jsonb then raise exception 'STARTER_REQUIRED'; end if;
 if entry.xp_rewarded then return jsonb_build_object('xp_awarded',entry.xp_awarded,'starter',starter); end if;
 reward:=case when p_outcome in ('caught','win') then 20 when p_outcome in ('loss','exhausted') then 5 else 0 end;
 level_now:=(starter->>'level')::integer; xp_now:=(starter->>'xp')::integer;
 if level_now>=50 then reward:=0; end if;
 if reward>0 then
  xp_now:=xp_now+reward;
  while level_now<50 loop
   required:=round(220+5*power(level_now::double precision,1.7))::integer;
   exit when xp_now<required;
   xp_now:=xp_now-required;level_now:=level_now+1;
  end loop;
  if level_now>=50 then xp_now:=0; end if;
  starter:=jsonb_set(jsonb_set(starter,'{xp}',to_jsonb(xp_now)),'{level}',to_jsonb(level_now));
  game_state:=jsonb_set(game_state,'{profile,starter}',starter);
  game_state:=jsonb_set(game_state,'{profile,totalXP}',to_jsonb(coalesce((game_state#>>'{profile,totalXP}')::bigint,0)+reward));
  game_state:=jsonb_set(game_state,'{profile,encounters}',to_jsonb(coalesce((game_state#>>'{profile,encounters}')::bigint,0)+1));
  update public.starter_games set state=game_state,revision=revision+1,updated_at=now() where user_id=entry.user_id;
 end if;
 update public.fishing_game_entries set xp_rewarded=true,xp_awarded=reward,outcome=p_outcome where id=p_entry;
 return jsonb_build_object('xp_awarded',reward,'starter',starter);
end;
$$;
revoke all on function public.award_fishing_xp(uuid,text) from public,anon,authenticated;

drop function if exists public.get_fishing_game_status();
create function public.get_fishing_game_status()
returns table(is_open boolean,captures bigint,balance numeric,cost numeric,contest_day date,balls_left integer,ball_limit integer)
language sql stable security definer set search_path='' as $$
 select extract(isodow from now() at time zone 'Europe/Rome')=2,
 (select count(*) from public.fishing_game_entries e where e.user_id=auth.uid() and e.contest_day=(now() at time zone 'Europe/Rome')::date and e.state='caught'),
 p.balance::numeric,50::numeric,
 (now() at time zone 'Europe/Rome')::date,public.fishing_balls_left(auth.uid()),(select r.ball_limit from public.fishing_game_rules r where r.id)
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
 if public.fishing_balls_left(uid)<=0 then raise exception 'BALL_LIMIT';end if;
 if not exists(select 1 from public.starter_games where user_id=uid and state#>'{profile,starter}' is not null and state#>'{profile,starter}'<>'null'::jsonb) then raise exception 'STARTER_REQUIRED';end if;
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
 return jsonb_build_object('id',entry.id,'species',entry.species,'rarity',(select rarity from public.fishing_game_species where id=entry.species),'balance',current_balance,'cost',entry.cost,'contest_day',entry.contest_day,'balls_left',public.fishing_balls_left(uid));
end;
$$;

create or replace function public.complete_fishing_game(p_operation_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 uid uuid:=auth.uid(); today date:=(now() at time zone 'Europe/Rome')::date;
 entry public.fishing_game_entries%rowtype; fish public.fishing_game_species%rowtype;
 size_factor numeric; total bigint; reward jsonb;
begin
 if uid is null or not exists(select 1 from public.profiles where user_id=uid and is_active) then raise exception 'NOT_AUTHORIZED'; end if;
 perform pg_advisory_xact_lock(hashtextextended('fishing-game:'||uid::text,0));
 perform 1 from public.profiles where user_id=uid for update;
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
 reward:=public.award_fishing_xp(p_operation_id,'caught');
 select * into fish from public.fishing_game_species where id=entry.species;
 select count(*) into total from public.fishing_game_entries where user_id=uid and contest_day=today and state='caught';
 return jsonb_build_object('species',entry.species,'rarity',fish.rarity,'length',entry.length_m,'weight',entry.weight_kg,'multiplier',entry.multiplier,'rating',case when entry.multiplier<.9 then 'Piccolo' when entry.multiplier<1.1 then 'Normale' when entry.multiplier<1.3 then 'Grande' when entry.multiplier<1.5 then 'Enorme' else 'Record' end,'date',entry.captured_at,'captures',total,'balls_left',public.fishing_balls_left(uid))||reward;
end;
$$;

-- Legacy retry endpoint: only a server-confirmed successful throw can finish.
create or replace function public.finish_fishing_game(p_operation_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.fishing_game_entries where id=p_operation_id and user_id=auth.uid() and state='caught') then raise exception 'CAPTURE_NOT_CONFIRMED'; end if;
 return public.complete_fishing_game(p_operation_id);
end;
$$;
revoke all on function public.complete_fishing_game(uuid) from public,anon,authenticated;

create or replace function public.throw_fishing_ball(p_entry_id uuid,p_throw_id uuid,p_hp integer,p_max_hp integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 uid uuid:=auth.uid();today date:=(now() at time zone 'Europe/Rome')::date;
 entry public.fishing_game_entries%rowtype;previous public.fishing_game_throws%rowtype;
 chance double precision;rarity text;success boolean;answer jsonb;
begin
 if uid is null or p_throw_id is null then raise exception 'NOT_AUTHORIZED'; end if;
 perform pg_advisory_xact_lock(hashtextextended('fishing-game:'||uid::text,0));
 perform 1 from public.profiles where user_id=uid and is_active for update;
 if not found then raise exception 'NOT_AUTHORIZED'; end if;
 select * into previous from public.fishing_game_throws where id=p_throw_id;
 if found then
  if previous.user_id<>uid or previous.entry_id<>p_entry_id then raise exception 'INVALID_OPERATION';end if;
  answer:=previous.response||jsonb_build_object('balls_left',public.fishing_balls_left(uid));
  if previous.success then
   answer:=jsonb_set(answer,'{result}',(answer->'result')||jsonb_build_object('balls_left',public.fishing_balls_left(uid),'captures',(select count(*) from public.fishing_game_entries where user_id=uid and contest_day=today and state='caught'),'starter',(select state#>'{profile,starter}' from public.starter_games where user_id=uid)));
  end if;
  return answer;
 end if;
 select * into entry from public.fishing_game_entries where id=p_entry_id and user_id=uid for update;
 if not found then raise exception 'ENCOUNTER_NOT_FOUND';end if;
 if entry.state<>'active' or entry.contest_day<>today then raise exception 'ENCOUNTER_EXPIRED';end if;
 if extract(isodow from today)<>2 then raise exception 'CONTEST_CLOSED';end if;
 if public.fishing_balls_left(uid)<=0 then raise exception 'BALL_LIMIT';end if;
 if (select count(*) from public.fishing_game_entries where user_id=uid and contest_day=today and state='caught')>=3 then raise exception 'CAPTURE_LIMIT';end if;
 if p_hp is null or p_max_hp is null or p_hp<1 or p_max_hp<1 or p_hp>p_max_hp or p_max_hp>10000 then raise exception 'INVALID_HP';end if;
 if now()<entry.created_at+interval '2 seconds' then raise exception 'ENCOUNTER_NOT_READY';end if;
 select s.rarity into rarity from public.fishing_game_species s where s.id=entry.species;
 chance:=(case rarity when 'common' then .58 when 'uncommon' then .44 when 'rare' then .30 else .19 end)*(case when p_hp::numeric/p_max_hp>=.7 then .45 when p_hp::numeric/p_max_hp>=.4 then .95 else 1.5 end);
 success:=random()<greatest(.05,least(.95,chance));
 insert into public.fishing_game_throws(id,user_id,entry_id,contest_day,success) values(p_throw_id,uid,p_entry_id,today,success);
 answer:=jsonb_build_object('success',success,'balls_left',public.fishing_balls_left(uid));
 if success then answer:=answer||jsonb_build_object('result',public.complete_fishing_game(p_entry_id));end if;
 update public.fishing_game_throws set response=answer where id=p_throw_id;
 return answer;
end;
$$;
revoke all on function public.throw_fishing_ball(uuid,uuid,integer,integer) from public,anon;
grant execute on function public.throw_fishing_ball(uuid,uuid,integer,integer) to authenticated;

create or replace function public.close_fishing_battle(p_entry_id uuid,p_outcome text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();entry public.fishing_game_entries%rowtype;reward jsonb;
begin
 if uid is null or p_outcome not in ('win','loss','flee','exhausted') or p_outcome is null then raise exception 'INVALID_OUTCOME';end if;
 perform pg_advisory_xact_lock(hashtextextended('fishing-game:'||uid::text,0));
 perform 1 from public.profiles where user_id=uid and is_active for update;
 if not found then raise exception 'NOT_AUTHORIZED';end if;
 select * into entry from public.fishing_game_entries where id=p_entry_id and user_id=uid for update;
 if not found then raise exception 'ENCOUNTER_NOT_FOUND';end if;
 if entry.xp_rewarded then return public.award_fishing_xp(p_entry_id,entry.outcome)||jsonb_build_object('balls_left',public.fishing_balls_left(uid));end if;
 if entry.state<>'active' or entry.contest_day<>(now() at time zone 'Europe/Rome')::date then raise exception 'ENCOUNTER_EXPIRED';end if;
 if now()<entry.created_at+interval '2 seconds' and p_outcome<>'flee' then raise exception 'ENCOUNTER_NOT_READY';end if;
 if p_outcome='exhausted' and public.fishing_balls_left(uid)>0 then raise exception 'BALLS_REMAIN';end if;
 reward:=public.award_fishing_xp(p_entry_id,p_outcome);
 update public.fishing_game_entries set state='abandoned' where id=p_entry_id;
 return reward||jsonb_build_object('balls_left',public.fishing_balls_left(uid));
end;
$$;
revoke all on function public.close_fishing_battle(uuid,text) from public,anon;
grant execute on function public.close_fishing_battle(uuid,text) to authenticated;

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
notify pgrst, 'reload schema';
commit;
