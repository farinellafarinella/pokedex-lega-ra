-- Apply AFTER route-encounters.sql and deploy the four Edge Functions before enabling sources.
-- Existing accounting/weekly ranking functions are reused unchanged.
begin;
create table if not exists public.route_event_operations(
 user_id uuid not null references auth.users(id),kind text not null,operation_id uuid not null,response jsonb not null,
 primary key(user_id,kind,operation_id)
);
alter table public.route_event_operations enable row level security;
revoke all on public.route_event_operations from public,anon,authenticated;
grant all on public.route_event_operations to service_role;

create or replace function public.route_event_operation(p_user uuid,p_kind text,p_operation uuid)
returns jsonb language sql security definer set search_path='' as $$
 select response from public.route_event_operations where user_id=p_user and kind=p_kind and operation_id=p_operation;
$$;

create or replace function public.route_issue_ticket(p_user uuid,p_ticket jsonb)
returns void language plpgsql security definer set search_path='' as $$
begin
 insert into public.route_encounter_tickets(id,user_id,species_id,level,source,event_key,balls,ball_bonus,can_capture,can_escape,metadata,expires_at)
 values((p_ticket->>'id')::uuid,p_user,(p_ticket->>'speciesId')::integer,(p_ticket->>'level')::integer,p_ticket->>'source',p_ticket->>'id',
 (p_ticket->>'balls')::integer,coalesce((p_ticket->>'ballBonus')::numeric,1),coalesce((p_ticket->>'canCapture')::boolean,true),coalesce((p_ticket->>'canEscape')::boolean,true),coalesce(p_ticket->'metadata','{}'), 'infinity');
end $$;

create or replace function public.route_assert_event_available(p_user uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from public.route_encounters where user_id=p_user and not saved)
 or exists(select 1 from public.route_encounter_tickets t where t.user_id=p_user and t.metadata ? 'kind'
   and not exists(select 1 from public.route_encounters e where e.ticket_id=t.id)) then raise exception 'BATTLE_ACTIVE';end if;
end $$;

create or replace function public.route_commit_event(p_user uuid,p_kind text,p_revision bigint,p_team_revision bigint,p_operation uuid,p_command text,p_state jsonb,p_delta bigint,p_ticket jsonb,p_team jsonb,p_context jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare answer jsonb;g public.starter_games%rowtype;source_name text;
begin
 perform 1 from public.profiles where user_id=p_user and is_active for update;
 if not found then raise exception 'NOT_AUTHORIZED';end if;
 answer:=public.route_event_operation(p_user,p_kind,p_operation);if answer is not null then return answer;end if;
 insert into public.starter_games(user_id) values(p_user) on conflict do nothing;
 select * into g from public.starter_games where user_id=p_user for update;
 if g.team_revision is distinct from p_team_revision then raise exception 'STALE_TEAM';end if;
 perform public.route_assert_event_available(p_user);
 source_name:=case p_kind when 'starter' then 'FOSSIL_HUNT' when 'bug' then 'BUG_CONTEST' when 'safari' then 'SAFARI' when 'safari-test' then 'SAFARI' end;
 if source_name is null then raise exception 'INVALID_COMMAND';end if;
 if (p_command in ('start','next','step','encounter') or p_ticket is not null) and not exists(select 1 from public.route_encounter_sources where source=source_name and enabled) then raise exception 'EVENT_DISABLED';end if;
 if p_ticket is not null and p_ticket->>'source' is distinct from source_name then raise exception 'INVALID_ENCOUNTER';end if;
 if p_kind='starter' then
  if p_command='encounter' and extract(isodow from clock_timestamp() at time zone 'Europe/Rome')<>1 then raise exception 'ARENA_CLOSED_MONDAY_ONLY';end if;
  answer:=public.commit_starter_command(p_user,p_revision,p_operation,p_state,p_delta);
 elsif p_kind='bug' then
  answer:=public.commit_bug_game(p_user,(p_context->>'day')::date,p_revision,p_operation,p_command,p_state);
 else
  answer:=public.commit_safari_command(p_user,p_kind='safari-test',p_revision,p_operation,p_state,p_delta,(p_context->>'startDate')::date);
 end if;
 if p_team is not null then
  if p_kind<>'starter' or p_command not in ('buy','equip') then raise exception 'INVALID_COMMAND';end if;
  update public.starter_games set team=p_team where user_id=p_user;
 end if;
 if p_ticket is not null then perform public.route_issue_ticket(p_user,p_ticket);end if;
 insert into public.route_event_operations values(p_user,p_kind,p_operation,answer);
 return answer;
end $$;

create or replace function public.route_event_snapshot(p_user uuid,p_ticket uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare t public.route_encounter_tickets%rowtype;state_value jsonb;revision_value bigint;bal bigint;day_value date;expired boolean:=false;
begin
 select * into t from public.route_encounter_tickets where id=p_ticket and user_id=p_user;
 if not found then raise exception 'ENCOUNTER_NOT_FOUND';end if;
 select balance into bal from public.profiles where user_id=p_user and is_active;
 if not found then raise exception 'NOT_AUTHORIZED';end if;
 case t.metadata->>'kind'
 when 'arena' then select state,revision into state_value,revision_value from public.starter_games where user_id=p_user;
 when 'safari' then select state,revision into state_value,revision_value from public.safari_games where user_id=p_user and test_mode=coalesce((t.metadata->>'testMode')::boolean,false);
 when 'bug' then
  day_value:=(t.metadata->>'day')::date;
  select state,revision into state_value,revision_value from public.bug_game_runs where user_id=p_user and contest_day=day_value;
  expired:=day_value<>(clock_timestamp() at time zone 'Europe/Rome')::date;
 else raise exception 'INVALID_EVENT';end case;
 if state_value is null then raise exception 'EVENT_NOT_FOUND';end if;
 return jsonb_build_object('state',state_value,'revision',revision_value,'balance',bal,'expired',expired);
end $$;

create or replace function public.route_settle_event(p_user uuid,p_ticket uuid,p_operation uuid,p_update jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare t public.route_encounter_tickets%rowtype;snapshot jsonb;answer jsonb;kind_value text;day_value date;
begin
 select * into t from public.route_encounter_tickets where id=p_ticket and user_id=p_user for update;
 if not found then raise exception 'ENCOUNTER_NOT_FOUND';end if;
 kind_value:=t.metadata->>'kind';
 if kind_value='fishing' then
  return public.route_settle_fishing(p_user,p_ticket,p_update);
 end if;
 snapshot:=public.route_event_snapshot(p_user,p_ticket);
 if kind_value='bug' and (snapshot->>'expired')::boolean then
  -- The already closed ranking cannot gain a late entry; clear only the pending encounter.
  update public.bug_game_runs set state=(state-'encounter'-'battle')||'{"phase":"selection","encounter":null,"battle":null}',revision=revision+1,updated_at=now()
   where user_id=p_user and contest_day=(t.metadata->>'day')::date and state#>>'{encounter,encounterToken}'=p_ticket::text;
  return jsonb_build_object('expired',true,'coins',0);
 end if;
 if p_update->>'kind' is distinct from kind_value or (p_update->>'revision')::bigint is distinct from (snapshot->>'revision')::bigint then raise exception 'STALE_EVENT';end if;
 case kind_value
 when 'arena' then
  if snapshot#>>'{state,routeEncounter,token}' is distinct from p_ticket::text then raise exception 'STALE_EVENT';end if;
  answer:=public.commit_starter_command(p_user,(p_update->>'revision')::bigint,p_operation,p_update->'state',(p_update->>'delta')::bigint);
 when 'safari' then
  if snapshot#>>'{state,session,encounter,encounterToken}' is distinct from p_ticket::text then raise exception 'STALE_EVENT';end if;
  answer:=public.commit_safari_command(p_user,coalesce((t.metadata->>'testMode')::boolean,false),(p_update->>'revision')::bigint,p_operation,p_update->'state',(p_update->>'delta')::bigint,null);
 when 'bug' then
  if snapshot#>>'{state,encounter,encounterToken}' is distinct from p_ticket::text then raise exception 'STALE_EVENT';end if;
  answer:=public.commit_bug_game(p_user,(t.metadata->>'day')::date,(p_update->>'revision')::bigint,p_operation,'route-finish',p_update->'state');
 else raise exception 'INVALID_EVENT';end case;
 return jsonb_build_object('coins',coalesce((p_update->>'delta')::bigint,0),'balance',answer->'balance');
end $$;

-- Recovery also works after the weekly event closes or the browser loses its local state.
create or replace function public.get_route_active_encounter()
returns jsonb language sql security definer set search_path='' as $$
 select jsonb_build_object('token',t.id,'speciesId',t.species_id,'level',t.level,'source',t.source)
 from public.route_encounter_tickets t left join public.route_encounters e on e.ticket_id=t.id
 where t.user_id=auth.uid() and (e.id is null or not e.saved) and t.metadata ? 'kind'
 and exists(select 1 from public.profiles where user_id=auth.uid() and is_active)
 order by e.created_at nulls last,t.id limit 1;
$$;
revoke all on function public.route_event_operation(uuid,text,uuid),public.route_issue_ticket(uuid,jsonb),public.route_assert_event_available(uuid),public.route_commit_event(uuid,text,bigint,bigint,uuid,text,jsonb,bigint,jsonb,jsonb,jsonb),public.route_event_snapshot(uuid,uuid),public.route_settle_event(uuid,uuid,uuid,jsonb),public.get_route_active_encounter() from public,anon,authenticated;
grant execute on function public.route_event_operation(uuid,text,uuid),public.route_commit_event(uuid,text,bigint,bigint,uuid,text,jsonb,bigint,jsonb,jsonb,jsonb),public.route_event_snapshot(uuid,uuid) to service_role;
grant execute on function public.get_route_active_encounter() to authenticated;
revoke all on function public.commit_starter_command(uuid,bigint,uuid,jsonb,bigint),public.commit_bug_game(uuid,date,bigint,uuid,text,jsonb),public.commit_safari_command(uuid,boolean,bigint,uuid,jsonb,bigint,date),public.read_bug_game(uuid,date),public.get_bug_game_operation(uuid,uuid) from public,anon,authenticated;
grant execute on function public.commit_starter_command(uuid,bigint,uuid,jsonb,bigint),public.commit_bug_game(uuid,date,bigint,uuid,text,jsonb),public.commit_safari_command(uuid,boolean,bigint,uuid,jsonb,bigint,date),public.read_bug_game(uuid,date),public.get_bug_game_operation(uuid,uuid) to service_role;
notify pgrst,'reload schema';
commit;
