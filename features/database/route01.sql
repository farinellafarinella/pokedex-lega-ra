-- Route 01: real economy uses profiles.balance as AVAILABLE funds.
-- Prerequisites: Route team, route-encounters and route-event-integration.
begin;
alter table public.profiles add column if not exists route01_sprite text not null default 'traveler';
create table if not exists public.route01_config(id boolean primary key default true check(id),opened boolean not null default false,map jsonb not null,move_keys jsonb not null,revision bigint not null default 1);
create table if not exists public.route01_rules(position integer primary key check(position between 1 and 5),stake bigint not null check(stake between 1 and 100000000),bot_name text not null,bot_sprite text not null default 'traveler',bot_team jsonb not null,reward bigint not null check(reward between 0 and 100000000),daily_limit integer not null default 1 check(daily_limit between 1 and 100),revision bigint not null default 1);
create table if not exists public.route01_players(user_id uuid not null references auth.users(id),test boolean not null,unlocked integer not null default 1 check(unlocked between 1 and 6),runs integer not null default 0,test_balance bigint not null default 10000 check(test_balance>=0),primary key(user_id,test));
create table if not exists public.route01_stations(position integer not null references public.route01_rules(position),test boolean not null,owner_id uuid references auth.users(id),owner_name text,sprite text,team jsonb,deposit bigint not null default 0 check(deposit>=0),wins integer not null default 0,battle_id uuid,reserved_by uuid references auth.users(id),reserved_until timestamptz,reservation_stake bigint,reset_pending boolean not null default false,primary key(position,test),unique(owner_id,test));
create table if not exists public.route01_battles(id uuid primary key default gen_random_uuid(),test boolean not null,position integer not null,attacker uuid not null references auth.users(id),defender uuid references auth.users(id),stake bigint not null,reward bigint not null,training boolean not null,day date not null,attack_team jsonb not null,defense_team jsonb not null,state jsonb,revision bigint not null default 0,status text not null default 'active' check(status in ('active','settled')),result text,reason text,created_at timestamptz not null default now(),activity_at timestamptz not null default now(),settled_at timestamptz,foreign key(position,test) references public.route01_stations(position,test));
alter table public.route01_battles add column if not exists fault_at timestamptz;
alter table public.route01_battles add column if not exists attacker_name text;
alter table public.route01_battles add column if not exists defender_name text;
create unique index if not exists route01_one_challenger on public.route01_battles(attacker,test) where status='active';
create unique index if not exists route01_one_station on public.route01_battles(position,test) where status='active' and not training;
create table if not exists public.route01_operations(user_id uuid not null,test boolean not null,operation uuid not null,command jsonb not null,response jsonb not null,primary key(user_id,test,operation));
create table if not exists public.route01_ledger(id uuid primary key default gen_random_uuid(),user_id uuid not null,test boolean not null,battle_id uuid,position integer,amount bigint not null,reason text not null,created_at timestamptz not null default now());
alter table public.route01_ledger add column if not exists user_name text;
create index if not exists route01_daily on public.route01_battles(day,attacker,defender,test);
create index if not exists route01_idle on public.route01_battles(activity_at) where status='active';
alter table public.route01_config enable row level security;alter table public.route01_rules enable row level security;alter table public.route01_players enable row level security;alter table public.route01_stations enable row level security;alter table public.route01_battles enable row level security;alter table public.route01_operations enable row level security;alter table public.route01_ledger enable row level security;
revoke all on public.route01_config,public.route01_rules,public.route01_players,public.route01_stations,public.route01_battles,public.route01_operations,public.route01_ledger from public,anon,authenticated;
-- Read/write access is exclusively through scoped SECURITY DEFINER RPCs.
create or replace function public.route01_lock() returns void language sql set search_path='' as $$ select pg_advisory_xact_lock(71012026); $$;
create or replace function public.route01_auth(p_admin boolean default false) returns uuid language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.profiles where user_id=auth.uid() and is_active and (not p_admin or role='admin')) then raise exception 'NOT_AUTHORIZED';end if;return auth.uid();
end $$;
create or replace function public.route01_balance(p_user uuid,p_test boolean) returns bigint language sql security definer set search_path='' as $$
 select case when p_test then (select test_balance from public.route01_players where user_id=p_user and test) else (select balance from public.profiles where user_id=p_user) end;
$$;
create or replace function public.route01_money(p_user uuid,p_test boolean,p_delta bigint,p_reason text,p_position integer,p_battle uuid default null) returns void language plpgsql security definer set search_path='' as $$
declare pid uuid;actor_name text;entry uuid:=gen_random_uuid();begin
 if p_delta=0 then return;end if;
 select id,trainer_name into pid,actor_name from public.profiles where user_id=p_user for update;
 if public.route01_balance(p_user,p_test)+p_delta<0 then raise exception 'INSUFFICIENT_BALANCE';end if;
 if p_test then update public.route01_players set test_balance=test_balance+p_delta where user_id=p_user and test;
 else
  update public.profiles set balance=balance+p_delta where user_id=p_user;
  insert into public.transactions(operation_id,sender_id,receiver_id,amount,description,transaction_type,created_by)
  values(entry,case when p_delta<0 then pid end,case when p_delta>0 then pid end,abs(p_delta),'Route 01 · '||p_reason||' · Postazione '||p_position,'route01',pid);
 end if;
 insert into public.route01_ledger(id,user_id,test,battle_id,position,amount,reason,user_name) values(entry,p_user,p_test,p_battle,p_position,p_delta,p_reason,actor_name);
end $$;
create or replace function public.route01_snapshot_team(p_team jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare mon jsonb;species jsonb;stats jsonb;result jsonb:='[]';lvl integer;iv numeric;k text;base numeric;begin
 for mon in select value from jsonb_array_elements(p_team) loop
  select data into species from public.route_pokemon_species where id=(mon->>'speciesId')::integer;
  lvl:=(mon->>'level')::integer;iv:=coalesce((mon->>'iv')::numeric,10);stats:='{}';
  foreach k in array array['hp','attack','defense','spAttack','spDefense','speed'] loop
   base:=(species->'baseStats'->>k)::numeric;
   stats:=stats||jsonb_build_object(case when k='hp' then 'maxHp' else k end,floor((2*base+iv)*lvl/100)+case when k='hp' then lvl+10 else 5 end);
  end loop;
  result:=result||jsonb_build_array((mon-'battle')||jsonb_build_object('routeStats',stats,'currentHp',stats->'maxHp','status',null));
 end loop;return result;
end $$;
revoke all on function public.route01_snapshot_team(jsonb) from public,anon,authenticated;
create or replace function public.route01_team(p_spec jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare p jsonb;mon jsonb;team jsonb:='[]';moves jsonb;begin
 if jsonb_typeof(p_spec) is distinct from 'array' or jsonb_array_length(p_spec) not between 1 and 6 then raise exception 'INVALID_TEAM';end if;
 select move_keys into moves from public.route01_config where id;
 for p in select value from jsonb_array_elements(p_spec) loop
  if (p->>'speciesId')::integer not between 1 and 251 or (p->>'level')::integer not between 1 and 100 then raise exception 'INVALID_TEAM';end if;
  mon:=public.route_new_pokemon((p->>'speciesId')::integer,(p->>'level')::integer,'ROUTE01_BOT',false);
  if p ? 'moves' then
   if jsonb_typeof(p->'moves')<>'array' or jsonb_array_length(p->'moves') not between 1 and 4 or exists(select 1 from jsonb_array_elements_text(p->'moves') m where not moves ? m) then raise exception 'INVALID_MOVES';end if;
   mon:=jsonb_set(mon,'{moves}',p->'moves');
  end if;team:=team||jsonb_build_array(mon);
 end loop;return public.route01_snapshot_team(team);
end $$;
create or replace function public.route01_public_battle(p_id uuid) returns jsonb language sql security definer set search_path='' as $$
 select to_jsonb(b)||jsonb_build_object('state',b.state-'ai') from public.route01_battles b where id=p_id;
$$;
create or replace function public.route01_clear(p_position integer,p_test boolean) returns void language plpgsql security definer set search_path='' as $$
declare s public.route01_stations%rowtype;begin
 select * into s from public.route01_stations where position=p_position and test=p_test for update;
 if s.battle_id is not null then update public.route01_stations set reset_pending=true where position=p_position and test=p_test;return;end if;
 if s.owner_id is not null then perform public.route01_money(s.owner_id,p_test,s.deposit,'Restituzione deposito',p_position);end if;
 update public.route01_stations set owner_id=null,owner_name=null,sprite=null,team=null,deposit=0,wins=0,reserved_by=null,reserved_until=null,reservation_stake=null,reset_pending=false where position=p_position and test=p_test;
end $$;
create or replace function public.route01_settle(p_id uuid,p_result text,p_reason text default 'Battaglia') returns void language plpgsql security definer set search_path='' as $$
declare b public.route01_battles%rowtype;s public.route01_stations%rowtype;begin
 perform public.route01_lock();select * into b from public.route01_battles where id=p_id for update;
 if not found or b.status='settled' then return;end if;
 if p_result not in ('win','loss','draw') then raise exception 'INVALID_RESULT';end if;
 perform 1 from public.profiles where user_id in (b.attacker,b.defender) order by user_id for update;
 select * into s from public.route01_stations where position=b.position and test=b.test for update;
 if not b.training then
  if s.battle_id is distinct from b.id then raise exception 'STATION_MISMATCH';end if;
  if p_result='win' then
   perform public.route01_money(b.attacker,b.test,b.stake,'Restituzione posta',b.position,b.id);
   perform public.route01_money(b.attacker,b.test,case when b.defender is null then b.reward else b.stake end,case when b.defender is null then 'Premio bot' else 'Vittoria difesa avversaria' end,b.position,b.id);
   update public.route01_players set unlocked=greatest(unlocked,least(6,b.position+1)) where user_id=b.attacker and test=b.test;
   update public.route01_stations set owner_id=null,owner_name=null,sprite=null,team=null,deposit=0,wins=0,reserved_by=b.attacker,reserved_until=clock_timestamp()+interval '60 seconds',reservation_stake=b.stake where position=b.position and test=b.test;
  elsif p_result='loss' then
   if b.defender is not null then perform public.route01_money(b.defender,b.test,b.stake,'Vittoria in difesa',b.position,b.id);end if;
   update public.route01_stations set wins=wins+case when b.defender is null then 0 else 1 end where position=b.position and test=b.test;
  else perform public.route01_money(b.attacker,b.test,b.stake,'Rimborso pareggio o annullamento',b.position,b.id);
  end if;
  update public.route01_stations set battle_id=null where position=b.position and test=b.test;
 end if;
 update public.route01_battles set status='settled',result=p_result,reason=p_reason,settled_at=clock_timestamp() where id=b.id;
 if s.reset_pending and not b.training then perform public.route01_clear(b.position,b.test);end if;
end $$;
create or replace function public.route01_sweep() returns void language plpgsql security definer set search_path='' as $$
declare b record;s record;begin
 perform public.route01_lock();
 for b in select id,fault_at from public.route01_battles where status='active' and activity_at<=clock_timestamp()-interval '10 minutes' order by created_at loop perform public.route01_settle(b.id,case when b.fault_at is null then 'loss' else 'draw' end,case when b.fault_at is null then 'Inattività' else 'Annullamento per errore tecnico' end);end loop;
 for s in select position,test from public.route01_stations where reserved_until<=clock_timestamp() and battle_id is null loop perform public.route01_clear(s.position,s.test);end loop;
end $$;

create or replace function public.get_route01(p_test boolean default false,p_admin boolean default false) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid;data jsonb;t jsonb;begin
 uid:=public.route01_auth(coalesce(p_admin,false));if p_test is null then raise exception 'INVALID_MODE';end if;
 perform public.route01_lock();perform public.route01_sweep();insert into public.route01_players(user_id,test) values(uid,p_test) on conflict do nothing;
 t:=public.get_route_team();
 return jsonb_build_object('test',p_test,'userId',uid,'admin',exists(select 1 from public.profiles where user_id=uid and role='admin'),
 'balance',public.route01_balance(uid,p_test),'locked',coalesce((select sum(deposit) from public.route01_stations where owner_id=uid and test=p_test),0)+coalesce((select sum(stake) from public.route01_battles where attacker=uid and test=p_test and status='active' and not training),0),
 'sprite',(select route01_sprite from public.profiles where user_id=uid),'progress',(select to_jsonb(p) from public.route01_players p where user_id=uid and test=p_test),'team',t->'team',
 'config',(select to_jsonb(c)-'move_keys' from public.route01_config c where id),
 'stations',(select jsonb_agg(to_jsonb(s)||jsonb_build_object('rules',to_jsonb(r),'effectiveStake',case when s.owner_id is null then r.stake else s.deposit end,'displayTeam',coalesce(s.team,public.route01_team(r.bot_team)),'dailyWins',(select count(*) from public.route01_battles b where b.attacker=uid and b.defender is null and b.position=s.position and b.test=p_test and not b.training and b.status='settled' and b.result='win' and b.day=(clock_timestamp() at time zone 'Europe/Rome')::date),'pair',(select jsonb_build_object('winner',case when b.result='win' then b.attacker when b.result='loss' then b.defender end) from public.route01_battles b where b.test=p_test and not b.training and b.day=(clock_timestamp() at time zone 'Europe/Rome')::date and ((b.attacker=uid and b.defender=s.owner_id) or (b.defender=uid and b.attacker=s.owner_id)) order by b.created_at desc limit 1)) order by s.position) from public.route01_stations s join public.route01_rules r using(position) where s.test=p_test),
 'active',(select public.route01_public_battle(id) from public.route01_battles where attacker=uid and test=p_test and status='active'),
 'history',(select coalesce(jsonb_agg(to_jsonb(h)),'[]') from (select id,position,attacker,defender,attacker_name,defender_name,stake,reward,result,reason,status,training,created_at,settled_at from public.route01_battles where test=p_test and (p_admin or attacker=uid or defender=uid) order by created_at desc limit 100) h),
 'ledger',(select coalesce(jsonb_agg(to_jsonb(l)),'[]') from (select * from public.route01_ledger where test=p_test and (p_admin or user_id=uid) order by created_at desc limit 100) l));
end $$;

create or replace function public.route01_start(p_position integer,p_test boolean,p_operation uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid;g public.starter_games%rowtype;s public.route01_stations%rowtype;r public.route01_rules%rowtype;p public.route01_players%rowtype;b public.route01_battles%rowtype;old public.route01_operations%rowtype;cmd jsonb;training boolean;today date:=(clock_timestamp() at time zone 'Europe/Rome')::date;stake bigint;begin
 uid:=public.route01_auth();if p_test is null or p_operation is null then raise exception 'INVALID_COMMAND';end if;perform public.route01_lock();perform public.route01_sweep();
 cmd:=jsonb_build_object('type','start','position',p_position);select * into old from public.route01_operations where user_id=uid and test=p_test and operation=p_operation;
 if found then if old.command<>cmd then raise exception 'OPERATION_MISMATCH';end if;return public.route01_public_battle((old.response->>'id')::uuid);end if;
 if not p_test and not (select opened from public.route01_config where id) then raise exception 'ROUTE_CLOSED';end if;
 insert into public.route01_players(user_id,test) values(uid,p_test) on conflict do nothing;select * into p from public.route01_players where user_id=uid and test=p_test for update;
 if p_position>p.unlocked then raise exception 'STATION_LOCKED';end if;
 if exists(select 1 from public.route01_battles where attacker=uid and test=p_test and status='active') then raise exception 'BATTLE_ACTIVE';end if;
 select * into s from public.route01_stations where position=p_position and test=p_test for update;if not found then raise exception 'INVALID_STATION';end if;
 select * into r from public.route01_rules where position=p_position;
 if s.owner_id=uid then raise exception 'OWN_STATION';end if;
 if s.owner_id is not null and exists(select 1 from public.route01_battles where test=p_test and not route01_battles.training and day=today and ((attacker=uid and defender=s.owner_id) or (defender=uid and attacker=s.owner_id))) then raise exception 'PAIR_DAILY_LIMIT';end if;
 training:=s.owner_id is null and (select count(*) from public.route01_battles where attacker=uid and defender is null and position=p_position and test=p_test and day=today and result='win' and not route01_battles.training)>=r.daily_limit;
 if not training and (s.battle_id is not null or s.reserved_by is not null) then raise exception 'STATION_BUSY';end if;
 perform 1 from public.profiles where user_id in (uid,s.owner_id) order by user_id for update;
 perform public.get_route_team();select * into g from public.starter_games where user_id=uid;
 if g.team is null or jsonb_array_length(g.team)=0 then raise exception 'STARTER_REQUIRED';end if;
 -- Copies are isolated: profile PS/PP/status and EXP are never overwritten.
 stake:=case when training then 0 when s.owner_id is null then r.stake else s.deposit end;
 if public.route01_balance(uid,p_test)<stake then raise exception 'INSUFFICIENT_BALANCE';end if;
 insert into public.route01_battles(test,position,attacker,defender,stake,reward,training,day,attack_team,defense_team,attacker_name,defender_name)
 values(p_test,p_position,uid,s.owner_id,stake,case when training then 0 else r.reward end,training,today,public.route01_snapshot_team(g.team),coalesce(s.team,public.route01_team(r.bot_team)),(select trainer_name from public.profiles where user_id=uid),coalesce(s.owner_name,r.bot_name)) returning * into b;
 if not training then
  perform public.route01_money(uid,p_test,-stake,'Posta impegnata',p_position,b.id);
  update public.route01_stations set battle_id=b.id where position=p_position and test=p_test;
 end if;
 insert into public.route01_operations values(uid,p_test,p_operation,cmd,jsonb_build_object('id',b.id));return public.route01_public_battle(b.id);
end $$;

create or replace function public.route01_read_battle(p_user uuid,p_id uuid,p_operation uuid,p_command jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare b public.route01_battles%rowtype;o public.route01_operations%rowtype;begin
 perform public.route01_lock();perform public.route01_sweep();select * into b from public.route01_battles where id=p_id and attacker=p_user;
 if not found then raise exception 'NOT_AUTHORIZED';end if;
 select * into o from public.route01_operations where user_id=p_user and test=b.test and operation=p_operation;
 if found then if o.command<>p_command then raise exception 'OPERATION_MISMATCH';end if;return jsonb_build_object('cached',o.response);end if;
 return jsonb_build_object('battle',to_jsonb(b));
end $$;
create or replace function public.route01_fault(p_user uuid,p_id uuid,p_revision bigint) returns void language plpgsql security definer set search_path='' as $$
begin perform public.route01_lock();update public.route01_battles set fault_at=coalesce(fault_at,clock_timestamp()) where id=p_id and attacker=p_user and revision=p_revision and status='active';end $$;
revoke all on function public.route01_fault(uuid,uuid,bigint) from public,anon,authenticated;
grant execute on function public.route01_fault(uuid,uuid,bigint) to service_role;
create or replace function public.route01_commit(p_user uuid,p_id uuid,p_revision bigint,p_operation uuid,p_command jsonb,p_state jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare b public.route01_battles%rowtype;o public.route01_operations%rowtype;answer jsonb;begin
 perform public.route01_lock();perform public.route01_sweep();select * into b from public.route01_battles where id=p_id and attacker=p_user for update;if not found then raise exception 'NOT_AUTHORIZED';end if;
 select * into o from public.route01_operations where user_id=p_user and test=b.test and operation=p_operation;
 if found then if o.command<>p_command then raise exception 'OPERATION_MISMATCH';end if;return o.response;end if;
 if b.status<>'active' then return public.route01_public_battle(b.id);end if;
 if b.revision<>p_revision then raise exception 'STALE_BATTLE';end if;
 update public.route01_battles set state=p_state,revision=revision+1,fault_at=null,activity_at=clock_timestamp() where id=b.id;
 if p_state->>'phase'='ended' then perform public.route01_settle(b.id,p_state->>'result');end if;
 answer:=public.route01_public_battle(b.id);insert into public.route01_operations values(p_user,b.test,p_operation,p_command,answer);return answer;
end $$;

create or replace function public.route01_command(p_action text,p_test boolean,p_operation uuid,p_args jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid;pos integer:=(p_args->>'position')::integer;s public.route01_stations%rowtype;oldstation public.route01_stations%rowtype;p public.profiles%rowtype;cmd jsonb;o public.route01_operations%rowtype;next_team jsonb;begin
 uid:=public.route01_auth();if p_test is null or p_operation is null then raise exception 'INVALID_COMMAND';end if;perform public.route01_lock();perform public.route01_sweep();
 cmd:=jsonb_build_object('type',p_action,'args',p_args);select * into o from public.route01_operations where user_id=uid and test=p_test and operation=p_operation;
 if found then if o.command<>cmd then raise exception 'OPERATION_MISMATCH';end if;return public.get_route01(p_test);end if;
 insert into public.route01_players(user_id,test) values(uid,p_test) on conflict do nothing;
 select * into p from public.profiles where user_id=uid for update;
 select * into s from public.route01_stations where position=pos and test=p_test for update;
 if p_action='sprite' then
  if p_args->>'sprite' not in ('traveler','red','blue','ranger','girl') then raise exception 'INVALID_SPRITE';end if;
  update public.profiles set route01_sprite=p_args->>'sprite' where user_id=uid;
 elsif p_action='restart' then
  if not exists(select 1 from public.route01_players where user_id=uid and test=p_test and unlocked=6) then raise exception 'ROUTE_INCOMPLETE';end if;
  update public.route01_players set runs=runs+1 where user_id=uid and test=p_test;
 elsif p_action='pass' then
  if s.owner_id=uid or exists(select 1 from public.route01_battles where test=p_test and not training and day=(clock_timestamp() at time zone 'Europe/Rome')::date and ((attacker=uid and defender=s.owner_id and result='win') or (defender=uid and attacker=s.owner_id and result='loss'))) then
   update public.route01_players set unlocked=greatest(unlocked,least(6,pos+1)) where user_id=uid and test=p_test and unlocked>=pos;
  else raise exception 'PASS_NOT_ALLOWED';end if;
 elsif p_action in ('occupy','proceed') then
  if s.reserved_by is distinct from uid or s.reserved_until<=clock_timestamp() then raise exception 'RESERVATION_EXPIRED';end if;
  if p_action='proceed' then perform public.route01_clear(pos,p_test);
  else
   select * into oldstation from public.route01_stations where owner_id=uid and test=p_test for update;
   if oldstation.battle_id is not null then raise exception 'DEFENSE_ACTIVE';end if;
   if public.route01_balance(uid,p_test)+coalesce(oldstation.deposit,0)<s.reservation_stake then raise exception 'INSUFFICIENT_BALANCE';end if;
   next_team:=public.route01_snapshot_team(public.get_route_team()->'team');if jsonb_array_length(next_team)=0 then raise exception 'STARTER_REQUIRED';end if;
   if oldstation.owner_id is not null then perform public.route01_clear(oldstation.position,p_test);end if;
   perform public.route01_money(uid,p_test,-s.reservation_stake,'Deposito difesa',pos);
   update public.route01_stations set owner_id=uid,owner_name=p.trainer_name,sprite=p.route01_sprite,team=next_team,deposit=s.reservation_stake,wins=0,reserved_by=null,reserved_until=null,reservation_stake=null where position=pos and test=p_test;
   update public.route01_players set unlocked=greatest(unlocked,least(6,pos+1)) where user_id=uid and test=p_test;
  end if;
 elsif p_action in ('withdraw','update') then
  if s.owner_id is distinct from uid then raise exception 'NOT_OWNER';end if;if s.battle_id is not null then raise exception 'DEFENSE_ACTIVE';end if;
  if p_action='withdraw' then perform public.route01_clear(pos,p_test);
  else next_team:=public.get_route_team()->'team';update public.route01_stations set team=next_team,sprite=p.route01_sprite,owner_name=p.trainer_name where position=pos and test=p_test;end if;
 else raise exception 'INVALID_COMMAND';end if;
 insert into public.route01_operations values(uid,p_test,p_operation,cmd,'{}');return public.get_route01(p_test);
end $$;
create or replace function public.admin_route01(p_action text,p_test boolean,p_operation uuid,p_args jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid;pos integer;entry record;map jsonb;cmd jsonb;o public.route01_operations%rowtype;r public.route01_rules%rowtype;begin
 uid:=public.route01_auth(true);if p_test is null or p_operation is null then raise exception 'INVALID_COMMAND';end if;perform public.route01_lock();perform public.route01_sweep();
 cmd:=jsonb_build_object('type','admin:'||p_action,'args',p_args);select * into o from public.route01_operations where user_id=uid and test=p_test and operation=p_operation;
 if found then if o.command<>cmd then raise exception 'OPERATION_MISMATCH';end if;return public.get_route01(p_test,true);end if;
 if p_action='open' then update public.route01_config set opened=(p_args->>'opened')::boolean,revision=revision+1 where id;
 elsif p_action='rule' then
  pos:=(p_args->>'position')::integer;select * into r from public.route01_rules where position=pos for update;
  if not found then raise exception 'INVALID_STATION';end if;
  if r.revision is distinct from (p_args->>'revision')::bigint then raise exception 'STALE_CONFIG';end if;
  perform public.route01_team(p_args->'bot_team');
  if p_args->>'bot_sprite' not in ('traveler','red','blue','ranger','girl') or length(p_args->>'bot_name') not between 1 and 60 then raise exception 'INVALID_BOT';end if;
  update public.route01_rules set stake=(p_args->>'stake')::bigint,reward=(p_args->>'reward')::bigint,daily_limit=(p_args->>'daily_limit')::integer,bot_name=p_args->>'bot_name',bot_sprite=p_args->>'bot_sprite',bot_team=p_args->'bot_team',revision=revision+1 where position=pos;
 elsif p_action='map' then
  if (p_args->>'revision')::bigint is distinct from (select revision from public.route01_config where id) then raise exception 'STALE_CONFIG';end if;
  map:=p_args->'map';
  if not map ?& array['width','height','tile','blocked','stations','entry'] or (map->>'width')::integer<>400 or (map->>'height')::integer<>672 or (map->>'tile')::integer<>16 or jsonb_typeof(map->'blocked') is distinct from 'array' or jsonb_array_length(map->'blocked')>1050 or jsonb_array_length(map->'stations')<>5 then raise exception 'INVALID_MAP';end if;
  if exists(select 1 from jsonb_array_elements_text(map->'blocked') c where c::integer not between 0 and 1049) then raise exception 'INVALID_MAP';end if;
  for entry in select value p from jsonb_array_elements((map->'stations')||jsonb_build_array(map->'entry')) loop
   if not entry.p ?& array['x','y'] or (entry.p->>'x')::integer not between 16 and 383 or (entry.p->>'y')::integer not between 24 and 639 or map->'blocked' @> jsonb_build_array(floor((entry.p->>'y')::numeric/16)::integer*25+floor((entry.p->>'x')::numeric/16)::integer) then raise exception 'BLOCKED_POSITION';end if;
  end loop;
  update public.route01_config set map=map,revision=revision+1 where id;
 elsif p_action='reset' then
  for entry in select position from public.route01_stations where test=p_test and (not p_args ? 'position' or position=(p_args->>'position')::integer) order by position loop perform public.route01_clear(entry.position,p_test);end loop;
 elsif p_action='cancel' then
  if not exists(select 1 from public.route01_battles where id=(p_args->>'battle')::uuid and test=p_test) then raise exception 'INVALID_BATTLE';end if;
  perform public.route01_settle((p_args->>'battle')::uuid,'draw','Annullamento tecnico amministratore');
 else raise exception 'INVALID_COMMAND';end if;
 insert into public.route01_operations values(uid,p_test,p_operation,cmd,'{}');return public.get_route01(p_test,true);
end $$;
create or replace function public.get_route01_funds() returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=public.route01_auth();begin
 return jsonb_build_object('available',(select balance from public.profiles where user_id=uid),'locked',coalesce((select sum(deposit) from public.route01_stations where owner_id=uid and not test),0)+coalesce((select sum(stake) from public.route01_battles where attacker=uid and not test and not training and status='active'),0));
end $$;
revoke all on function public.get_route01_funds() from public,anon;
grant execute on function public.get_route01_funds() to authenticated;
-- PUBLIC functions derive identity exclusively from auth.uid(); private engine/settlement RPCs are service-only.
revoke all on function public.route01_lock(),public.route01_auth(boolean),public.route01_balance(uuid,boolean),public.route01_money(uuid,boolean,bigint,text,integer,uuid),public.route01_team(jsonb),public.route01_public_battle(uuid),public.route01_clear(integer,boolean),public.route01_settle(uuid,text,text),public.route01_sweep(),public.get_route01(boolean,boolean),public.route01_start(integer,boolean,uuid),public.route01_read_battle(uuid,uuid,uuid,jsonb),public.route01_commit(uuid,uuid,bigint,uuid,jsonb,jsonb),public.route01_command(text,boolean,uuid,jsonb),public.admin_route01(text,boolean,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.get_route01(boolean,boolean),public.route01_start(integer,boolean,uuid),public.route01_command(text,boolean,uuid,jsonb),public.admin_route01(text,boolean,uuid,jsonb) to authenticated;
grant execute on function public.route01_read_battle(uuid,uuid,uuid,jsonb),public.route01_commit(uuid,uuid,bigint,uuid,jsonb,jsonb),public.route01_sweep() to service_role;

insert into public.route01_config(id,map,move_keys) values(true,'{"width":400,"height":672,"tile":16,"blocked":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,64,65,66,67,68,69,70,71,72,73,74,75,76,98,99,100,101,123,124,125,126,133,134,148,149,150,151,158,159,173,174,175,176,183,184,198,199,200,201,208,209,223,224,225,226,233,234,248,249,250,251,258,259,273,274,275,276,283,284,298,299,300,301,302,303,304,305,306,307,308,309,323,324,325,326,348,349,350,351,373,374,375,376,398,399,400,401,402,403,410,411,412,413,414,415,423,424,425,426,427,428,429,430,431,432,433,434,435,436,437,438,439,440,448,449,450,451,473,474,475,476,498,499,500,501,523,524,525,526,548,549,550,551,552,553,559,560,561,562,563,564,565,566,567,568,569,570,571,572,573,574,575,576,598,599,600,601,623,624,625,626,627,628,629,630,631,632,633,634,635,636,648,649,650,651,652,653,654,655,656,657,658,659,660,661,673,674,675,676,677,678,679,680,681,682,683,684,685,686,698,699,700,701,718,719,720,721,723,724,725,726,748,749,750,751,773,774,775,776,798,799,800,801,823,824,825,826,848,849,850,851,873,874,875,876,898,899,900,901,923,924,925,926,948,949,950,951,973,974,975,976,977,978,979,980,981,982,983,984,990,991,992,993,994,995,996,997,998,999,1000,1001,1002,1003,1004,1005,1006,1007,1008,1009,1010,1011,1012,1013,1014,1015,1016,1017,1018,1019,1020,1021,1022,1023,1024,1025,1026,1027,1028,1029,1030,1031,1032,1033,1034,1035,1036,1037,1038,1039,1040,1041,1042,1043,1044,1045,1046,1047,1048,1049],"entry":{"x":208,"y":624},"stations":[{"x":208,"y":552},{"x":336,"y":472},{"x":112,"y":336},{"x":288,"y":232},{"x":208,"y":80}]}'::jsonb,'["POUND","KARATE_CHOP","DOUBLESLAP","COMET_PUNCH","MEGA_PUNCH","PAY_DAY","FIRE_PUNCH","ICE_PUNCH","THUNDERPUNCH","SCRATCH","VICEGRIP","GUILLOTINE","RAZOR_WIND","SWORDS_DANCE","CUT","GUST","WING_ATTACK","WHIRLWIND","FLY","BIND","SLAM","VINE_WHIP","STOMP","DOUBLE_KICK","MEGA_KICK","JUMP_KICK","ROLLING_KICK","SAND_ATTACK","HEADBUTT","HORN_ATTACK","FURY_ATTACK","HORN_DRILL","TACKLE","BODY_SLAM","WRAP","TAKE_DOWN","THRASH","DOUBLE_EDGE","TAIL_WHIP","POISON_STING","TWINEEDLE","PIN_MISSILE","LEER","BITE","GROWL","ROAR","SING","SUPERSONIC","SONICBOOM","DISABLE","ACID","EMBER","FLAMETHROWER","MIST","WATER_GUN","HYDRO_PUMP","SURF","ICE_BEAM","BLIZZARD","PSYBEAM","BUBBLEBEAM","AURORA_BEAM","HYPER_BEAM","PECK","DRILL_PECK","SUBMISSION","LOW_KICK","COUNTER","SEISMIC_TOSS","STRENGTH","ABSORB","MEGA_DRAIN","LEECH_SEED","GROWTH","RAZOR_LEAF","SOLARBEAM","POISONPOWDER","STUN_SPORE","SLEEP_POWDER","PETAL_DANCE","STRING_SHOT","DRAGON_RAGE","FIRE_SPIN","THUNDERSHOCK","THUNDERBOLT","THUNDER_WAVE","THUNDER","ROCK_THROW","EARTHQUAKE","FISSURE","DIG","TOXIC","CONFUSION","PSYCHIC_M","HYPNOSIS","MEDITATE","AGILITY","QUICK_ATTACK","RAGE","TELEPORT","NIGHT_SHADE","MIMIC","SCREECH","DOUBLE_TEAM","RECOVER","HARDEN","MINIMIZE","SMOKESCREEN","CONFUSE_RAY","WITHDRAW","DEFENSE_CURL","BARRIER","LIGHT_SCREEN","HAZE","REFLECT","FOCUS_ENERGY","BIDE","METRONOME","MIRROR_MOVE","SELFDESTRUCT","EGG_BOMB","LICK","SMOG","SLUDGE","BONE_CLUB","FIRE_BLAST","WATERFALL","CLAMP","SWIFT","SKULL_BASH","SPIKE_CANNON","CONSTRICT","AMNESIA","KINESIS","SOFTBOILED","HI_JUMP_KICK","GLARE","DREAM_EATER","POISON_GAS","BARRAGE","LEECH_LIFE","LOVELY_KISS","SKY_ATTACK","TRANSFORM","BUBBLE","DIZZY_PUNCH","SPORE","FLASH","PSYWAVE","SPLASH","ACID_ARMOR","CRABHAMMER","EXPLOSION","FURY_SWIPES","BONEMERANG","REST","ROCK_SLIDE","HYPER_FANG","SHARPEN","CONVERSION","TRI_ATTACK","SUPER_FANG","SLASH","SUBSTITUTE","STRUGGLE","SKETCH","TRIPLE_KICK","THIEF","SPIDER_WEB","MIND_READER","NIGHTMARE","FLAME_WHEEL","SNORE","CURSE","FLAIL","CONVERSION2","AEROBLAST","COTTON_SPORE","REVERSAL","SPITE","POWDER_SNOW","PROTECT","MACH_PUNCH","SCARY_FACE","FAINT_ATTACK","SWEET_KISS","BELLY_DRUM","SLUDGE_BOMB","MUD_SLAP","OCTAZOOKA","SPIKES","ZAP_CANNON","FORESIGHT","DESTINY_BOND","PERISH_SONG","ICY_WIND","DETECT","BONE_RUSH","LOCK_ON","OUTRAGE","SANDSTORM","GIGA_DRAIN","ENDURE","CHARM","ROLLOUT","FALSE_SWIPE","SWAGGER","MILK_DRINK","SPARK","FURY_CUTTER","STEEL_WING","MEAN_LOOK","ATTRACT","SLEEP_TALK","HEAL_BELL","RETURN","PRESENT","FRUSTRATION","SAFEGUARD","PAIN_SPLIT","SACRED_FIRE","MAGNITUDE","DYNAMICPUNCH","MEGAHORN","DRAGONBREATH","BATON_PASS","ENCORE","PURSUIT","RAPID_SPIN","SWEET_SCENT","IRON_TAIL","METAL_CLAW","VITAL_THROW","MORNING_SUN","SYNTHESIS","MOONLIGHT","HIDDEN_POWER","CROSS_CHOP","TWISTER","RAIN_DANCE","SUNNY_DAY","CRUNCH","MIRROR_COAT","PSYCH_UP","EXTREMESPEED","ANCIENTPOWER","SHADOW_BALL","FUTURE_SIGHT","ROCK_SMASH","WHIRLPOOL","BEAT_UP"]'::jsonb) on conflict do nothing;
insert into public.route01_rules(position,stake,reward,bot_name,bot_sprite,bot_team) values(1,20,20,'Bullo','red','[{"speciesId":19,"level":5},{"speciesId":16,"level":5}]'::jsonb) on conflict do nothing;
insert into public.route01_rules(position,stake,reward,bot_name,bot_sprite,bot_team) values(2,70,70,'Pigliamosche','ranger','[{"speciesId":10,"level":7},{"speciesId":13,"level":7},{"speciesId":11,"level":7}]'::jsonb) on conflict do nothing;
insert into public.route01_rules(position,stake,reward,bot_name,bot_sprite,bot_team) values(3,100,100,'Pupa','girl','[{"speciesId":161,"level":9},{"speciesId":163,"level":9},{"speciesId":69,"level":9}]'::jsonb) on conflict do nothing;
insert into public.route01_rules(position,stake,reward,bot_name,bot_sprite,bot_team) values(4,300,300,'Campeggiatore','traveler','[{"speciesId":21,"level":11},{"speciesId":32,"level":11},{"speciesId":56,"level":11}]'::jsonb) on conflict do nothing;
insert into public.route01_rules(position,stake,reward,bot_name,bot_sprite,bot_team) values(5,500,500,'Veterano','blue','[{"speciesId":17,"level":14},{"speciesId":20,"level":14},{"speciesId":12,"level":14},{"speciesId":74,"level":14}]'::jsonb) on conflict do nothing;
insert into public.route01_stations(position,test) select r.position,t from public.route01_rules r cross join (values(false),(true)) x(t) on conflict do nothing;
notify pgrst,'reload schema';
commit;
