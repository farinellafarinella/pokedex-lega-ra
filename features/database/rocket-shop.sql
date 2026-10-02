-- Team Rocket shop. Requires the existing Route team, route-encounters.sql
-- and route-event-integration.sql. No offers or player data are seeded.
begin;
create table if not exists public.rocket_shop_offers (
 id uuid primary key default gen_random_uuid(), species_id integer not null references public.route_pokemon_species(id),
 level integer not null default 5 check(level between 1 and 100), price bigint not null check(price between 500 and 9007199254740991),
 stock integer check(stock>=0), active boolean not null default false, archived boolean not null default false,
 starts_at timestamptz, ends_at timestamptz, display_order integer not null default 0,
 description text not null default '' check(length(description)<=240), revision bigint not null default 1,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(ends_at is null or starts_at is null or ends_at>starts_at)
);
create table if not exists public.rocket_shop_purchases (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id), operation_id uuid not null,
 offer_id uuid not null references public.rocket_shop_offers(id), offer_revision bigint not null,
 trainer_name text not null, trainer_code text not null, pokemon_name text not null,
 species_id integer not null, level integer not null, price bigint not null,
 pokemon jsonb not null, released_pokemon jsonb, team_revision bigint not null,
 created_at timestamptz not null default now(), unique(user_id,operation_id)
);
alter table public.rocket_shop_offers enable row level security;
alter table public.rocket_shop_purchases enable row level security;
revoke all on public.rocket_shop_offers,public.rocket_shop_purchases from public,anon,authenticated;
grant select on public.rocket_shop_offers,public.rocket_shop_purchases to authenticated;
drop policy if exists rocket_shop_offers_read on public.rocket_shop_offers;
create policy rocket_shop_offers_read on public.rocket_shop_offers for select to authenticated using (
 exists(select 1 from public.profiles where user_id=auth.uid() and is_active and role='admin')
 or (active and not archived and (stock is null or stock>0) and (starts_at is null or starts_at<=now()) and (ends_at is null or ends_at>now()))
);
drop policy if exists rocket_shop_history_read on public.rocket_shop_purchases;
create policy rocket_shop_history_read on public.rocket_shop_purchases for select to authenticated using (
 user_id=auth.uid() or exists(select 1 from public.profiles where user_id=auth.uid() and is_active and role='admin')
);

create or replace function public.get_rocket_shop(p_admin boolean default false,p_offset integer default 0)
returns jsonb language plpgsql security definer set search_path='' as $$
declare p public.profiles%rowtype;t jsonb;
begin
 select * into p from public.profiles where user_id=auth.uid() and is_active for update;
 if not found then raise exception 'NOT_AUTHORIZED';end if;
 if p_admin and p.role<>'admin' then raise exception 'ADMIN_REQUIRED';end if;
 if p_offset is null or p_offset<0 then raise exception 'INVALID_OFFSET';end if;
 t:=public.get_route_team();
 return jsonb_build_object('balance',p.balance,'team',t->'team','teamRevision',t->'revision','pending',t->'pending',
 'offers',(select coalesce(jsonb_agg(to_jsonb(o) order by o.display_order,o.created_at,o.id),'[]') from public.rocket_shop_offers o where p_admin or (o.active and not o.archived and (o.stock is null or o.stock>0) and (o.starts_at is null or o.starts_at<=clock_timestamp()) and (o.ends_at is null or o.ends_at>clock_timestamp()))),
 'catalog',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',data->>'name','sprite',data#>>'{sprites,front}') order by id),'[]') from public.route_pokemon_species where id between 1 and 251),
 'history',(select coalesce(jsonb_agg(to_jsonb(h) order by h.created_at desc,h.id),'[]') from (select * from public.rocket_shop_purchases where p_admin or user_id=auth.uid() order by created_at desc,id offset p_offset limit 50) h));
end $$;

create or replace function public.admin_save_rocket_offer(p_id uuid,p_revision bigint,p_offer jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare o public.rocket_shop_offers%rowtype;
begin
 perform 1 from public.profiles where user_id=auth.uid() and is_active and role='admin' for update;
 if not found then raise exception 'ADMIN_REQUIRED';end if;
 if p_id is null or jsonb_typeof(p_offer) is distinct from 'object' then raise exception 'INVALID_OFFER';end if;
 perform pg_advisory_xact_lock(hashtextextended('rocket-offer:'||p_id,0));
 select * into o from public.rocket_shop_offers where id=p_id for update;
 if (found and o.revision is distinct from p_revision) or (not found and p_revision is distinct from 0::bigint) then raise exception 'OFFER_CHANGED';end if;
 if (p_offer->>'species_id')::integer not between 1 and 251 then raise exception 'INVALID_SPECIES';end if;
 insert into public.rocket_shop_offers(id,species_id,level,price,stock,active,archived,starts_at,ends_at,display_order,description)
 values(p_id,(p_offer->>'species_id')::integer,coalesce((p_offer->>'level')::integer,5),(p_offer->>'price')::bigint,
 (p_offer->>'stock')::integer,coalesce((p_offer->>'active')::boolean,false),coalesce((p_offer->>'archived')::boolean,false),
 (p_offer->>'starts_at')::timestamptz,(p_offer->>'ends_at')::timestamptz,coalesce((p_offer->>'display_order')::integer,0),coalesce(p_offer->>'description',''))
 on conflict(id) do update set species_id=excluded.species_id,level=excluded.level,price=excluded.price,stock=excluded.stock,
 active=excluded.active,archived=excluded.archived,starts_at=excluded.starts_at,ends_at=excluded.ends_at,
 display_order=excluded.display_order,description=excluded.description,revision=rocket_shop_offers.revision+1,updated_at=now()
 returning * into o;
 return to_jsonb(o);
end $$;

create or replace function public.buy_rocket_pokemon(p_offer uuid,p_revision bigint,p_team_revision bigint,p_operation uuid,p_release text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();p public.profiles%rowtype;o public.rocket_shop_offers%rowtype;g public.starter_games%rowtype;
 old public.rocket_shop_purchases%rowtype;member jsonb;released jsonb;next_team jsonb;purchase_id uuid:=gen_random_uuid();name text;
begin
 select * into p from public.profiles where user_id=uid and is_active for update;
 if not found then raise exception 'NOT_AUTHORIZED';end if;
 if p_operation is null then raise exception 'INVALID_OPERATION';end if;
 select * into old from public.rocket_shop_purchases where user_id=uid and operation_id=p_operation;
 if found then
  if old.offer_id is distinct from p_offer or old.offer_revision is distinct from p_revision
   or old.team_revision is distinct from p_team_revision or (old.released_pokemon->>'uid') is distinct from p_release then raise exception 'OPERATION_MISMATCH';end if;
  return jsonb_build_object('purchase',to_jsonb(old),'replayed',true);
 end if;
 perform public.get_route_team();
 select * into g from public.starter_games where user_id=uid for update;
 if not found or jsonb_array_length(g.team)=0 then raise exception 'STARTER_REQUIRED';end if;
 if g.team_revision is distinct from p_team_revision then raise exception 'TEAM_CHANGED';end if;
 if g.team_pending is not null then raise exception 'TEAM_PENDING';end if;
 perform public.route_assert_event_available(uid);
 if g.state->'battle' is not null and g.state->'battle'<>'null'::jsonb and coalesce(g.state#>>'{battle,result}','')='' then raise exception 'BATTLE_ACTIVE';end if;
 select * into o from public.rocket_shop_offers where id=p_offer for update;
 if not found then raise exception 'OFFER_UNAVAILABLE';end if;
 if o.revision is distinct from p_revision then raise exception 'OFFER_CHANGED';end if;
 if not o.active or o.archived or (o.starts_at is not null and o.starts_at>clock_timestamp()) or (o.ends_at is not null and o.ends_at<=clock_timestamp()) then raise exception 'OFFER_UNAVAILABLE';end if;
 if o.stock=0 then raise exception 'SOLD_OUT';end if;
 if p.balance<o.price then raise exception 'INSUFFICIENT_BALANCE';end if;
 next_team:=g.team;
 if p_release is not null then
  select value into released from jsonb_array_elements(g.team) where value->>'uid'=p_release;
  if released is null then raise exception 'NOT_OWNED';end if;
  if released->>'isStarter'='true' then raise exception 'STARTER_PROTECTED';end if;
  if jsonb_array_length(g.team)<>6 then raise exception 'TEAM_CHANGED';end if;
  select coalesce(jsonb_agg(value order by n),'[]') into next_team from jsonb_array_elements(g.team) with ordinality x(value,n) where value->>'uid'<>p_release;
 elsif jsonb_array_length(g.team)>=6 then raise exception 'RELEASE_REQUIRED';end if;
 member:=public.route_new_pokemon(o.species_id,o.level,'TEAM_ROCKET',false);
 select data->>'name' into name from public.route_pokemon_species where id=o.species_id;
 update public.starter_games set team=next_team||jsonb_build_array(member) where user_id=uid;
 update public.profiles set balance=balance-o.price where id=p.id;
 -- Increment limited-stock revisions so an admin cannot overwrite stock using a stale editor.
 update public.rocket_shop_offers set stock=case when stock is null then null else stock-1 end,revision=revision+case when stock is null then 0 else 1 end where id=o.id;
 insert into public.rocket_shop_purchases(id,user_id,operation_id,offer_id,offer_revision,trainer_name,trainer_code,pokemon_name,species_id,level,price,pokemon,released_pokemon,team_revision)
 values(purchase_id,uid,p_operation,o.id,o.revision,p.trainer_name,p.trainer_code,name,o.species_id,o.level,o.price,member,released,p_team_revision) returning * into old;
 insert into public.transactions(operation_id,sender_id,receiver_id,amount,description,transaction_type,created_by)
 values(purchase_id,p.id,null,o.price,'Team Rocket · '||name||' Lv. '||o.level,'rocket_purchase',p.id);
 return jsonb_build_object('purchase',to_jsonb(old),'replayed',false);
end $$;
revoke all on function public.get_rocket_shop(boolean,integer),public.admin_save_rocket_offer(uuid,bigint,jsonb),public.buy_rocket_pokemon(uuid,bigint,bigint,uuid,text) from public,anon,authenticated;
grant execute on function public.get_rocket_shop(boolean,integer),public.admin_save_rocket_offer(uuid,bigint,jsonb),public.buy_rocket_pokemon(uuid,bigint,bigint,uuid,text) to authenticated;
-- Definer RPCs retain their existing ability to adjust balances. Direct API writes cannot.
create or replace function public.rocket_guard_direct_balance()
returns trigger language plpgsql set search_path='' as $$
begin
 if current_user in ('authenticated','anon') and (new.balance is distinct from old.balance or new.role is distinct from old.role or new.user_id is distinct from old.user_id or new.id is distinct from old.id) then raise exception 'DIRECT_BALANCE_WRITE_FORBIDDEN';end if;
 return new;
end $$;
drop trigger if exists rocket_direct_balance_guard on public.profiles;
create trigger rocket_direct_balance_guard before update on public.profiles for each row execute function public.rocket_guard_direct_balance();
revoke all on function public.rocket_guard_direct_balance() from public,anon,authenticated;
revoke insert,update,delete on public.transactions from anon,authenticated;
notify pgrst,'reload schema';
commit;
