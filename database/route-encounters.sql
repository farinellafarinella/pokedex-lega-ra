-- Apply after install-team.sql. No raw client team writes are granted.
begin;
create table if not exists public.route_encounter_sources(source text primary key,enabled boolean not null default false);
insert into public.route_encounter_sources(source) values('FISHING'),('BUG_CONTEST'),('FOSSIL_HUNT'),('SAFARI'),('SPECIAL_EVENT') on conflict do nothing;
alter table public.route_encounter_sources enable row level security;
revoke all on public.route_encounter_sources from public,anon,authenticated;
grant all on public.route_encounter_sources to service_role;
create or replace function public.get_route_encounter_sources()
returns jsonb language sql security definer set search_path='' as $$
 select coalesce(jsonb_agg(source),'[]'::jsonb) from public.route_encounter_sources
 where enabled and exists(select 1 from public.profiles where user_id=auth.uid() and is_active);
$$;
revoke all on function public.get_route_encounter_sources() from public,anon;
grant execute on function public.get_route_encounter_sources() to authenticated;
create table if not exists public.route_encounter_tickets(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id),
 species_id integer not null references public.route_pokemon_species(id),level integer not null check(level between 1 and 100),
 source text not null,event_key text not null,can_capture boolean not null default true,can_escape boolean not null default true,
 balls integer check(balls>=0),ball_bonus numeric not null default 1 check(ball_bonus>0),
 expires_at timestamptz not null default now()+interval '1 day',unique(user_id,source,event_key)
);
create table if not exists public.route_encounters(
 id uuid primary key default gen_random_uuid(),ticket_id uuid unique references public.route_encounter_tickets(id),
 user_id uuid not null references auth.users(id),start_operation uuid not null,team_revision bigint not null,
 initial_team jsonb not null,options jsonb not null,state jsonb,response jsonb,
 revision integer not null default 0,saved boolean not null default false,created_at timestamptz not null default now(),
 unique(user_id,start_operation)
);
alter table public.route_encounter_tickets add column if not exists metadata jsonb not null default '{}';
create unique index if not exists route_one_active_encounter on public.route_encounters(user_id) where not saved;
create table if not exists public.route_encounter_operations(
 encounter_id uuid not null references public.route_encounters(id),operation_id uuid not null,response jsonb not null,
 primary key(encounter_id,operation_id)
);
-- Event backends consume this outbox idempotently to settle their rankings/rewards.
create table if not exists public.route_encounter_results(
 encounter_id uuid primary key references public.route_encounters(id),user_id uuid not null references auth.users(id),
 ticket_id uuid references public.route_encounter_tickets(id),source text not null,result jsonb not null,
 final_state jsonb not null,settled_at timestamptz
);
alter table public.route_encounter_tickets enable row level security;
alter table public.route_encounters enable row level security;
alter table public.route_encounter_operations enable row level security;
alter table public.route_encounter_results enable row level security;
revoke all on public.route_encounter_tickets,public.route_encounters,public.route_encounter_operations,public.route_encounter_results from public,anon,authenticated;
grant all on public.route_encounter_tickets,public.route_encounters,public.route_encounter_operations,public.route_encounter_results to service_role;

create or replace function public.route_begin_encounter(p_token uuid,p_species integer,p_level integer,p_source text,p_capture boolean,p_escape boolean,p_operation uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare g public.starter_games%rowtype;t public.route_encounter_tickets%rowtype;e public.route_encounters%rowtype;opts jsonb;
begin
 perform 1 from public.profiles where user_id=auth.uid() and is_active for update;
 if not found then raise exception 'NOT_AUTHORIZED';end if;
 perform public.get_route_team();
 select * into g from public.starter_games where user_id=auth.uid() for update;
 select * into e from public.route_encounters where user_id=auth.uid() and (start_operation=p_operation or (p_token is not null and ticket_id=p_token) or (p_token is null and not saved and options->>'source'=p_source and (options->>'speciesId')::integer=p_species and (options->>'level')::integer=p_level));
 if found then return jsonb_build_object('id',e.id,'revision',e.revision,'team',e.initial_team,'options',e.options,'response',e.response);end if;
 if not exists(select 1 from jsonb_array_elements(g.team) p where (p->>'currentHp')::integer>0) then raise exception 'Nessun Pokémon utilizzabile: cura la squadra prima di combattere.';end if;
 if exists(select 1 from public.route_encounters where user_id=auth.uid() and not saved) then raise exception 'Concludi prima l’incontro in corso.';end if;
 if p_token is null then
  if p_source is distinct from 'SPECIAL_EVENT' or not exists(select 1 from public.profiles where user_id=auth.uid() and role='admin' and is_active) then raise exception 'Questo evento deve fornire un ticket incontro autorizzato.';end if;
  if p_level is null or p_level not between 1 and 100 or not exists(select 1 from public.route_pokemon_species where id=p_species) then raise exception 'INVALID_ENCOUNTER';end if;
  opts:=jsonb_build_object('speciesId',p_species,'level',p_level,'source',p_source,'canCapture',p_capture,'canEscape',p_escape);
 else
  select * into t from public.route_encounter_tickets where id=p_token and user_id=auth.uid() and expires_at>now() for update;
  if not found then raise exception 'ENCOUNTER_EXPIRED';end if;
  if t.species_id<>p_species or t.level<>p_level or t.source<>p_source then raise exception 'INVALID_ENCOUNTER';end if;
  opts:=jsonb_build_object('speciesId',t.species_id,'level',t.level,'source',t.source,'canCapture',t.can_capture,'canEscape',t.can_escape,'balls',t.balls,'ballBonus',t.ball_bonus,'testMode',coalesce((t.metadata->>'testMode')::boolean,false),'wildHealthFraction',t.metadata->'wildHealthFraction');
 end if;
 insert into public.route_encounters(ticket_id,user_id,start_operation,team_revision,initial_team,options)
 values(p_token,auth.uid(),p_operation,g.team_revision,g.team,opts) returning * into e;
 return jsonb_build_object('id',e.id,'revision',e.revision,'team',e.initial_team,'options',opts);
end $$;

create or replace function public.route_read_encounter(p_id uuid,p_user uuid,p_operation uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare e public.route_encounters%rowtype;cached jsonb;
begin
 select * into e from public.route_encounters where id=p_id and user_id=p_user;
 if not found then raise exception 'ENCOUNTER_NOT_FOUND';end if;
 select response into cached from public.route_encounter_operations where encounter_id=p_id and operation_id=p_operation;
 return jsonb_build_object('id',e.id,'revision',e.revision,'state',e.state,'saved',e.saved,'cached',cached,'response',e.response,'ticket',(select jsonb_build_object('id',t.id,'metadata',t.metadata) from public.route_encounter_tickets t where t.id=e.ticket_id));
end $$;

create or replace function public.route_store_encounter(p_id uuid,p_user uuid,p_revision integer,p_operation uuid,p_response jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare e public.route_encounters%rowtype;g public.starter_games%rowtype;cached jsonb;answer jsonb;old_starter jsonb;new_starter jsonb;event_result jsonb;
begin
 -- Use the same lock order as team commands and encounter start.
 perform 1 from public.profiles where user_id=p_user and is_active for update;
 if not found then raise exception 'NOT_AUTHORIZED';end if;
 select * into g from public.starter_games where user_id=p_user for update;
 select * into e from public.route_encounters where id=p_id and user_id=p_user for update;
 if not found then raise exception 'ENCOUNTER_NOT_FOUND';end if;
 select response into cached from public.route_encounter_operations where encounter_id=p_id and operation_id=p_operation;
 if cached is not null then return cached;end if;
 if e.saved or e.revision<>p_revision then raise exception 'STALE_ENCOUNTER';end if;
 if g.team_revision<>e.team_revision then raise exception 'STALE_TEAM';end if;
 if exists(select 1 from public.route_encounter_tickets t where t.id=e.ticket_id and t.metadata->>'kind'='fishing') then
  if to_regprocedure('public.route_record_fishing_turn(uuid,uuid,jsonb,jsonb)') is null then raise exception 'EVENT_INTEGRATION_REQUIRED';end if;
  execute 'select public.route_record_fishing_turn($1,$2,$3,$4)' using p_user,e.ticket_id,e.state,p_response->'state';
 end if;
 if (p_response->>'saved')::boolean then
  if p_response#>>'{state,phase}'<>'ended' then raise exception 'BATTLE_ACTIVE';end if;
  select p into old_starter from jsonb_array_elements(g.team) p where p->>'isStarter'='true';
  select p into new_starter from jsonb_array_elements(p_response->'team') p where p->>'isStarter'='true';
  if old_starter->>'uid' is distinct from new_starter->>'uid' then raise exception 'STARTER_PROTECTED';end if;
  -- Battles can update progress, never recruit or replace roster members.
  if (select jsonb_agg(p->>'uid' order by n) from jsonb_array_elements(g.team) with ordinality x(p,n))
   is distinct from (select jsonb_agg(p->>'uid' order by n) from jsonb_array_elements(p_response->'team') with ordinality x(p,n)) then raise exception 'BATTLE_ROSTER_PROTECTED';end if;
  -- Event settlement must succeed in this same transaction, before any team write.
  -- The adapter is supplied by the event migration after its existing SQL is reviewed.
  if exists(select 1 from public.route_encounter_tickets t where t.id=e.ticket_id and t.metadata->>'kind' in ('arena','bug','safari','fishing')) then
   if p_response->'eventUpdate' is null or to_regprocedure('public.route_settle_event(uuid,uuid,uuid,jsonb)') is null then raise exception 'EVENT_INTEGRATION_REQUIRED';end if;
   execute 'select public.route_settle_event($1,$2,$3,$4)' into event_result using p_user,e.ticket_id,p_operation,p_response->'eventUpdate';
   if event_result is not null then p_response:=jsonb_set(p_response,'{result,eventResult}',event_result);end if;
  end if;
  perform set_config('route.encounter_write','on',true);
  update public.starter_games set team=p_response->'team' where user_id=p_user;
  insert into public.route_encounter_results(encounter_id,user_id,ticket_id,source,result,final_state,settled_at)
  values(p_id,p_user,e.ticket_id,e.options->>'source',p_response->'result',p_response->'state',case when event_result is not null then now() end);
 end if;
 answer:=(p_response-'eventUpdate')||jsonb_build_object('encounterId',p_id,'revision',e.revision+1);
 update public.route_encounters set state=p_response->'state',response=answer,revision=revision+1,saved=coalesce((p_response->>'saved')::boolean,false) where id=p_id;
 insert into public.route_encounter_operations values(p_id,p_operation,answer);
 return answer;
end $$;

create or replace function public.route_lock_battle_team()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.team is distinct from old.team and coalesce(current_setting('route.encounter_write',true),'')<>'on' and exists(select 1 from public.route_encounters where user_id=new.user_id and not saved) then raise exception 'BATTLE_ACTIVE';end if;
 return new;
end $$;
drop trigger if exists zz_route_battle_team_lock on public.starter_games;
create trigger zz_route_battle_team_lock before update on public.starter_games for each row execute function public.route_lock_battle_team();
revoke all on function public.route_begin_encounter(uuid,integer,integer,text,boolean,boolean,uuid),public.route_read_encounter(uuid,uuid,uuid),public.route_store_encounter(uuid,uuid,integer,uuid,jsonb),public.route_lock_battle_team() from public,anon,authenticated;
grant execute on function public.route_begin_encounter(uuid,integer,integer,text,boolean,boolean,uuid) to authenticated;
grant execute on function public.route_read_encounter(uuid,uuid,uuid),public.route_store_encounter(uuid,uuid,integer,uuid,jsonb) to service_role;
create table if not exists public.route_heal_operations(
 user_id uuid not null references auth.users(id),operation_id uuid not null,
 primary key(user_id,operation_id)
);
alter table public.route_heal_operations enable row level security;
revoke all on public.route_heal_operations from public,anon,authenticated;
create or replace function public.heal_route_team(p_operation uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();g public.starter_games%rowtype;healed jsonb;
begin
 if p_operation is null then raise exception 'INVALID_COMMAND';end if;
 perform 1 from public.profiles where user_id=uid and is_active for update;
 if not found then raise exception 'NOT_AUTHORIZED';end if;
 perform public.get_route_team();
 select * into g from public.starter_games where user_id=uid for update;
 if exists(select 1 from public.route_heal_operations where user_id=uid and operation_id=p_operation) then return public.get_route_team();end if;
 if exists(select 1 from public.route_encounters where user_id=uid and not saved) then raise exception 'BATTLE_ACTIVE';end if;
 select coalesce(jsonb_agg(p||jsonb_build_object('currentHp',public.route_max_hp((p->>'speciesId')::integer,(p->>'level')::integer),'status',null) order by n),'[]'::jsonb)
 into healed from jsonb_array_elements(g.team) with ordinality x(p,n);
 update public.starter_games set team=healed where user_id=uid;
 insert into public.route_heal_operations values(uid,p_operation);
 return public.get_route_team();
end $$;
revoke all on function public.heal_route_team(uuid) from public,anon;
grant execute on function public.heal_route_team(uuid) to authenticated;
-- Once migrated, starter EXP/moves/evolutions come from Route, never from legacy XP.
do $$ begin
 if to_regprocedure('public.route_sync_starter_legacy(jsonb,jsonb)') is null then
  alter function public.route_sync_starter(jsonb,jsonb) rename to route_sync_starter_legacy;
 end if;
end $$;
create or replace function public.route_sync_starter(p_team jsonb,p_state jsonb)
returns jsonb language plpgsql volatile set search_path='' as $$
begin
 if exists(select 1 from jsonb_array_elements(p_team) p where p->>'isStarter'='true' and p->>'progressSystem'='ROUTE') then return p_team;end if;
 return public.route_sync_starter_legacy(p_team,p_state);
end $$;
revoke all on function public.route_sync_starter(jsonb,jsonb),public.route_sync_starter_legacy(jsonb,jsonb) from public,anon,authenticated;
notify pgrst,'reload schema';
commit;
