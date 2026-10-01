-- Apply after route-event-integration.sql. Keeps entry cost, rarity odds, dimensions and ranking.
begin;
create or replace function public.start_fishing_game(p_operation_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();today date:=(now() at time zone 'Europe/Rome')::date;
 entry public.fishing_game_entries%rowtype;fish public.fishing_game_species%rowtype;t public.route_encounter_tickets%rowtype;
 team_state jsonb;starter jsonb;bal bigint;category text;draw numeric;species_value integer;level_value integer;
begin
 if uid is null or p_operation_id is null then raise exception 'NOT_AUTHORIZED';end if;
 select balance into bal from public.profiles where user_id=uid and is_active for update;
 if not found then raise exception 'NOT_AUTHORIZED';end if;
 team_state:=public.get_route_team();
 select * into entry from public.fishing_game_entries where id=p_operation_id and user_id=uid for update;
 if found then
  select * into t from public.route_encounter_tickets where user_id=uid and source='FISHING' and event_key=p_operation_id::text;
  if found then return jsonb_build_object('id',entry.id,'species',entry.species,'rarity',(select rarity from public.fishing_game_species where id=entry.species),'balance',bal,'cost',entry.cost,'contest_day',entry.contest_day,'balls_left',public.fishing_balls_left(uid),'speciesId',t.species_id,'level',t.level,'encounterToken',t.id);end if;
  if entry.state<>'active' then raise exception 'ENCOUNTER_EXPIRED';end if;
 end if;
 if not exists(select 1 from public.route_encounter_sources where source='FISHING' and enabled) then raise exception 'EVENT_DISABLED';end if;
 perform public.route_assert_event_available(uid);
 select p into starter from jsonb_array_elements(team_state->'team') p where p->>'isStarter'='true';
 if starter is null then raise exception 'STARTER_REQUIRED';end if;
 if not exists(select 1 from jsonb_array_elements(team_state->'team') p where (p->>'currentHp')::integer>0) then raise exception 'TEAM_EXHAUSTED';end if;
 if entry.id is null then
  if extract(isodow from today)<>2 then raise exception 'CONTEST_CLOSED';end if;
  if public.fishing_balls_left(uid)<=0 then raise exception 'BALL_LIMIT';end if;
  if (select count(*) from public.fishing_game_entries where user_id=uid and contest_day=today and state='caught')>=3 then raise exception 'CAPTURE_LIMIT';end if;
  if bal<50 then raise exception 'INSUFFICIENT_BALANCE';end if;
  draw:=random()*100;category:=case when draw<55 then 'common' when draw<83 then 'uncommon' when draw<96 then 'rare' else 'veryRare' end;
  select f.* into fish from public.fishing_game_species f join public.route_pokemon_species p on p.data->>'slug'=f.id where f.rarity=category order by random() limit 1;
  if not found then raise exception 'NO_SUPPORTED_FISH';end if;
  update public.fishing_game_entries set state='abandoned',xp_rewarded=true,xp_awarded=0,outcome='flee' where user_id=uid and state='active';
  insert into public.fishing_game_entries(id,user_id,contest_day,species,cost) values(p_operation_id,uid,today,fish.id,50) returning * into entry;
  update public.profiles set balance=balance-50 where user_id=uid returning balance into bal;
 end if;
 select id into species_value from public.route_pokemon_species where data->>'slug'=entry.species;
 if species_value is null then raise exception 'SPECIES_OUTSIDE_CRYSTAL';end if;
 level_value:=greatest(1,(starter->>'level')::integer-1);
 perform public.route_issue_ticket(uid,jsonb_build_object('id',p_operation_id,'source','FISHING','speciesId',species_value,'level',level_value,'balls',public.fishing_balls_left(uid),'metadata',jsonb_build_object('kind','fishing','entryId',entry.id,'day',entry.contest_day)));
 return jsonb_build_object('id',entry.id,'species',entry.species,'rarity',(select rarity from public.fishing_game_species where id=entry.species),'balance',bal,'cost',entry.cost,'contest_day',entry.contest_day,'balls_left',public.fishing_balls_left(uid),'speciesId',species_value,'level',level_value,'encounterToken',p_operation_id);
end $$;

create or replace function public.route_record_fishing_turn(p_user uuid,p_ticket uuid,p_previous jsonb,p_state jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare t public.route_encounter_tickets%rowtype;before_balls integer;after_balls integer;
begin
 select * into t from public.route_encounter_tickets where id=p_ticket and user_id=p_user and metadata->>'kind'='fishing';
 if not found then raise exception 'ENCOUNTER_NOT_FOUND';end if;
 before_balls:=coalesce((p_previous->>'balls')::integer,t.balls);after_balls:=(p_state->>'balls')::integer;
 if after_balls is null or after_balls<0 or before_balls-after_balls not between 0 and 1 then raise exception 'INVALID_BALLS';end if;
 if before_balls=after_balls then return;end if;
 -- Each throw is logged with the same transaction as the saved turn, including failures.
 insert into public.fishing_game_throws(id,user_id,entry_id,contest_day,success,response)
 values(gen_random_uuid(),p_user,(t.metadata->>'entryId')::uuid,(t.metadata->>'day')::date,coalesce(p_state->>'result'='capture',false),jsonb_build_object('routeTicket',p_ticket,'balls_left',after_balls));
end $$;

create or replace function public.route_fishing_result(p_user uuid,p_entry uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare e public.fishing_game_entries%rowtype;rarity_value text;
begin
 select * into e from public.fishing_game_entries where id=p_entry and user_id=p_user;
 if not found then raise exception 'ENCOUNTER_NOT_FOUND';end if;
 select rarity into rarity_value from public.fishing_game_species where id=e.species;
 return jsonb_build_object('species',e.species,'rarity',rarity_value,'length',e.length_m,'weight',e.weight_kg,'multiplier',e.multiplier,'level',(select level from public.route_encounter_tickets where user_id=p_user and source='FISHING' and event_key=e.id::text),
 'rating',case when e.multiplier<.9 then 'Piccolo' when e.multiplier<1.1 then 'Normale' when e.multiplier<1.3 then 'Grande' when e.multiplier<1.5 then 'Enorme' else 'Record' end,
 'date',e.captured_at,'captures',(select count(*) from public.fishing_game_entries where user_id=p_user and contest_day=(now() at time zone 'Europe/Rome')::date and state='caught'),
 'balls_left',public.fishing_balls_left(p_user),'xp_awarded',0,'coins',0);
end $$;

create or replace function public.route_settle_fishing(p_user uuid,p_ticket uuid,p_update jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare t public.route_encounter_tickets%rowtype;e public.fishing_game_entries%rowtype;fish public.fishing_game_species%rowtype;factor numeric;expired boolean;
begin
 select * into t from public.route_encounter_tickets where id=p_ticket and user_id=p_user and metadata->>'kind'='fishing';
 if not found then raise exception 'ENCOUNTER_NOT_FOUND';end if;
 select * into e from public.fishing_game_entries where id=(t.metadata->>'entryId')::uuid and user_id=p_user for update;
 if not found or e.state<>'active' then raise exception 'STALE_EVENT';end if;
 expired:=e.contest_day<>(now() at time zone 'Europe/Rome')::date;
 if p_update->>'result'='capture' and not expired then
  if (select count(*) from public.fishing_game_entries where user_id=p_user and contest_day=e.contest_day and state='caught')>=3 then raise exception 'CAPTURE_LIMIT';end if;
  select * into fish from public.fishing_game_species where id=e.species;factor:=.7+random();
  update public.fishing_game_entries set state='caught',multiplier=factor,length_m=round(fish.base_length*factor,2),weight_kg=round(fish.base_weight*factor,2),captured_at=now(),xp_rewarded=true,xp_awarded=0,outcome='caught' where id=e.id;
 else
  update public.fishing_game_entries set state='abandoned',xp_rewarded=true,xp_awarded=0,outcome=case when expired then 'flee' else p_update->>'result' end where id=e.id;
 end if;
 return public.route_fishing_result(p_user,e.id)||jsonb_build_object('expired',expired);
end $$;

-- Older clients cannot roll a second capture or award legacy XP alongside Route.
create or replace function public.throw_fishing_ball(p_entry_id uuid,p_throw_id uuid,p_hp integer,p_max_hp integer)
returns jsonb language plpgsql security definer set search_path='' as $$
begin raise exception 'ROUTE_BATTLE_REQUIRED';end $$;
create or replace function public.finish_fishing_game(p_operation_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.fishing_game_entries where id=p_operation_id and user_id=auth.uid() and state='caught') then raise exception 'CAPTURE_NOT_CONFIRMED';end if;
 return public.route_fishing_result(auth.uid(),p_operation_id);
end $$;
create or replace function public.close_fishing_battle(p_entry_id uuid,p_outcome text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();e public.fishing_game_entries%rowtype;
begin
 perform 1 from public.profiles where user_id=uid and is_active for update;if not found then raise exception 'NOT_AUTHORIZED';end if;
 if p_outcome is distinct from 'flee' then raise exception 'ROUTE_BATTLE_REQUIRED';end if;
 select * into e from public.fishing_game_entries where id=p_entry_id and user_id=uid for update;
 if not found then raise exception 'ENCOUNTER_NOT_FOUND';end if;
 if exists(select 1 from public.route_encounter_tickets where user_id=uid and source='FISHING' and event_key=p_entry_id::text) then raise exception 'ROUTE_BATTLE_REQUIRED';end if;
 if e.state='active' then update public.fishing_game_entries set state='abandoned',xp_rewarded=true,xp_awarded=0,outcome='flee' where id=p_entry_id;end if;
 return public.route_fishing_result(uid,p_entry_id);
end $$;
revoke all on function public.complete_fishing_game(uuid),public.award_fishing_xp(uuid,text),public.route_record_fishing_turn(uuid,uuid,jsonb,jsonb),public.route_fishing_result(uuid,uuid),public.route_settle_fishing(uuid,uuid,jsonb) from public,anon,authenticated;
revoke all on function public.start_fishing_game(uuid),public.throw_fishing_ball(uuid,uuid,integer,integer),public.close_fishing_battle(uuid,text),public.finish_fishing_game(uuid) from public,anon;
grant execute on function public.start_fishing_game(uuid),public.close_fishing_battle(uuid,text),public.finish_fishing_game(uuid) to authenticated;
notify pgrst,'reload schema';
commit;
