-- Visita una regione. Richiede profiles già installata.
-- Johto resta in preparazione finché starter e fossili non sono integrati.
begin;
create table if not exists public.travel_regions (
 id text primary key,
 name text not null,
 ticket_price integer not null check(ticket_price > 0),
 available boolean not null default false
);
insert into public.travel_regions(id,name,ticket_price,available)
 values('johto','Johto',2000,false) on conflict(id) do nothing;
create table if not exists public.trainer_regions (
 user_id uuid not null references auth.users(id) on delete cascade,
 region_id text not null references public.travel_regions(id),
 paid integer not null check(paid > 0),
 unlocked_at timestamptz not null default now(),
 primary key(user_id,region_id)
);
alter table public.travel_regions enable row level security;
alter table public.trainer_regions enable row level security;
revoke all on public.travel_regions,public.trainer_regions from public,anon,authenticated;

create or replace function public.get_region_travel()
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); current_balance numeric;
begin
 select balance into current_balance from public.profiles where user_id=uid and is_active;
 if not found then raise exception 'NOT_AUTHORIZED'; end if;
 return jsonb_build_object('balance',current_balance,'regions',(
  select coalesce(jsonb_agg(jsonb_build_object(
   'id',r.id,'name',r.name,'price',r.ticket_price,'available',r.available,
   'unlocked',t.user_id is not null,'unlockedAt',t.unlocked_at
  ) order by r.id),'[]'::jsonb)
  from public.travel_regions r left join public.trainer_regions t on t.region_id=r.id and t.user_id=uid
 ));
end;
$$;

-- The account row serializes purchases with other balance operations.
-- A region is purchased once, including retries and requests from another device.
create or replace function public.buy_region_ticket(p_region text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); current_balance numeric; destination public.travel_regions%rowtype;
begin
 select balance into current_balance from public.profiles where user_id=uid and is_active for update;
 if not found then raise exception 'NOT_AUTHORIZED'; end if;
 select * into destination from public.travel_regions where id=p_region for share;
 if not found then raise exception 'REGION_NOT_FOUND'; end if;
 if exists(select 1 from public.trainer_regions where user_id=uid and region_id=p_region) then
  return public.get_region_travel();
 end if;
 if not destination.available then raise exception 'REGION_NOT_READY'; end if;
 if current_balance<destination.ticket_price then raise exception 'INSUFFICIENT_BALANCE'; end if;
 insert into public.trainer_regions(user_id,region_id,paid) values(uid,p_region,destination.ticket_price);
 update public.profiles set balance=balance-destination.ticket_price where user_id=uid;
 return public.get_region_travel();
end;
$$;

create or replace function public.get_region_travel_payments()
returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object(
  'id','region:'||t.region_id||':'||t.user_id::text,'from',p.id,'to',null,
  'amount',t.paid,'note','Biglietto aereo per '||r.name,
  'type','region_ticket','date',t.unlocked_at,'status','completed'
 ) order by t.unlocked_at desc),'[]'::jsonb)
 from public.trainer_regions t join public.travel_regions r on r.id=t.region_id
 join public.profiles p on p.user_id=t.user_id
 where t.user_id=auth.uid() and p.is_active;
$$;
revoke all on function public.get_region_travel() from public,anon,authenticated;
revoke all on function public.buy_region_ticket(text) from public,anon,authenticated;
revoke all on function public.get_region_travel_payments() from public,anon,authenticated;
grant execute on function public.get_region_travel(),public.buy_region_ticket(text),public.get_region_travel_payments() to authenticated;
-- Johto: destructive starter replacement, guarded by unlock and content readiness.
create table if not exists public.region_starter_changes (
 operation_id uuid primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 starter text not null check(starter in ('chikorita','cyndaquil','totodile')),
 created_at timestamptz not null default now()
);
alter table public.region_starter_changes enable row level security;
revoke all on public.region_starter_changes from public,anon,authenticated;

create or replace function public.replace_johto_starter(p_starter text,p_revision bigint,p_operation_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $
declare
 uid uuid:=auth.uid(); current_balance numeric; game public.starter_games%rowtype;
 previous public.region_starter_changes%rowtype; starting_moves jsonb; next_state jsonb;
begin
 if uid is null or p_operation_id is null or p_revision is null or p_revision<0 then raise exception 'NOT_AUTHORIZED';end if;
 if p_starter is null or p_starter not in ('chikorita','cyndaquil','totodile') then raise exception 'INVALID_JOHTO_STARTER';end if;
 select balance into current_balance from public.profiles where user_id=uid and is_active for update;
 if not found then raise exception 'NOT_AUTHORIZED';end if;
 if not exists(select 1 from public.trainer_regions where user_id=uid and region_id='johto') then raise exception 'JOHTO_LOCKED';end if;
 select * into game from public.starter_games where user_id=uid for update;
 if not found or game.state#>'{profile,starter}' is null or game.state#>'{profile,starter}'='null'::jsonb then raise exception 'STARTER_REQUIRED';end if;
 select * into previous from public.region_starter_changes where operation_id=p_operation_id;
 if found then
  if previous.user_id<>uid or previous.starter<>p_starter then raise exception 'OPERATION_CONFLICT';end if;
  return jsonb_build_object('state',game.state,'revision',game.revision,'balance',current_balance);
 end if;
 if not exists(select 1 from public.travel_regions where id='johto' and available) then raise exception 'REGION_NOT_READY';end if;
 if game.revision<>p_revision then raise exception 'STALE_REVISION';end if;
 if game.state->'battle' is not null and game.state->'battle'<>'null'::jsonb and coalesce(game.state#>>'{battle,result}','')='' then raise exception 'BATTLE_ACTIVE';end if;
 if exists(select 1 from public.fishing_game_entries where user_id=uid and state='active') then raise exception 'FISHING_ACTIVE';end if;
 starting_moves:=case p_starter
  when 'chikorita' then '["vine","tackle","growl","recover"]'::jsonb
  when 'cyndaquil' then '["ember","quick","smoke","recover"]'::jsonb
  else '["gun","scratch","growl","recover"]'::jsonb end;
 next_state:=jsonb_set(game.state,'{profile,starter}',jsonb_build_object(
  'origin',p_starter,'species',p_starter,'level',5,'xp',0,'equipped',starting_moves,'knownMoves',starting_moves));
 next_state:=jsonb_set(next_state,'{profile,totalXP}','0'::jsonb);
 next_state:=jsonb_set(next_state,'{profile,encounters}','0'::jsonb);
 next_state:=jsonb_set(next_state,'{profile,balance}',to_jsonb(current_balance));
 next_state:=jsonb_set(next_state,'{battle}','null'::jsonb);
 next_state:=jsonb_set(next_state,'{log}','[]'::jsonb);
 -- Preserve challenge counters, inventory, pending fossils and all other account data.
 update public.starter_games set state=next_state,revision=revision+1,updated_at=now()
  where user_id=uid returning * into game;
 insert into public.region_starter_changes(operation_id,user_id,starter) values(p_operation_id,uid,p_starter);
 return jsonb_build_object('state',game.state,'revision',game.revision,'balance',current_balance);
end;
$;
revoke all on function public.replace_johto_starter(text,bigint,uuid) from public,anon,authenticated;
grant execute on function public.replace_johto_starter(text,bigint,uuid) to authenticated;

notify pgrst, 'reload schema';
commit;
