-- Lista Rocket mensile. Eseguire dopo schema.sql.
alter type public.transaction_type add value if not exists 'rocket_purchase';
create type public.rocket_purchase_status as enum ('confirmed','collected','cancelled','refunded');

create table public.rocket_events (
 id uuid primary key default gen_random_uuid(), name text not null, event_month date unique not null check(date_trunc('month',event_month)=event_month),
 event_date timestamptz not null, is_active boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index rocket_one_active_event on public.rocket_events(is_active) where is_active;

create table public.rocket_pokemon (
 id uuid primary key default gen_random_uuid(), rocket_event_id uuid not null references public.rocket_events(id) on delete cascade,
 pokemon_name text not null check(length(trim(pokemon_name)) between 1 and 80), price bigint not null check(price>=0),
 stock_quantity integer not null default 0 check(stock_quantity>=0), is_available boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(rocket_event_id,pokemon_name)
);

create table public.rocket_purchases (
 id uuid primary key default gen_random_uuid(), rocket_event_id uuid not null references public.rocket_events(id),
 rocket_pokemon_id uuid not null references public.rocket_pokemon(id), trainer_id uuid not null references public.profiles(id),
 price_paid bigint not null check(price_paid>=0), purchase_status public.rocket_purchase_status not null default 'confirmed',
 operation_id uuid unique not null, transaction_id uuid unique not null references public.transactions(id),
 purchased_at timestamptz not null default now(), collected_at timestamptz, confirmed_by uuid references public.profiles(id)
);
create index rocket_pokemon_event_idx on public.rocket_pokemon(rocket_event_id,is_available);
create index rocket_purchases_trainer_idx on public.rocket_purchases(trainer_id,purchased_at desc);
create index rocket_purchases_event_idx on public.rocket_purchases(rocket_event_id,purchase_status);

alter table public.rocket_events enable row level security; alter table public.rocket_pokemon enable row level security; alter table public.rocket_purchases enable row level security;
create policy rocket_events_public_read on public.rocket_events for select to anon,authenticated using(true);
create policy rocket_events_admin_write on public.rocket_events for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy rocket_pokemon_public_read on public.rocket_pokemon for select to anon,authenticated using(true);
create policy rocket_pokemon_admin_write on public.rocket_pokemon for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy rocket_purchases_own_read on public.rocket_purchases for select to authenticated using(trainer_id=public.my_profile_id() or public.is_admin());
create policy rocket_purchases_admin_update on public.rocket_purchases for update to authenticated using(public.is_admin()) with check(public.is_admin());

create or replace function public.purchase_rocket_pokemon(p_rocket_pokemon_id uuid,p_operation_id uuid)
returns public.rocket_purchases language plpgsql security definer set search_path=public as $$
declare v_trainer profiles; v_pokemon rocket_pokemon; v_event rocket_events; v_purchase rocket_purchases; v_tx transactions;
begin
 select * into v_purchase from rocket_purchases where operation_id=p_operation_id;
 if found then
   if v_purchase.trainer_id<>public.my_profile_id() then raise exception 'INVALID_OPERATION_ID'; end if; return v_purchase;
 end if;
 select * into v_trainer from profiles where user_id=auth.uid() for update;
 if not found or not v_trainer.is_active then raise exception 'ACCOUNT_NOT_ACTIVE'; end if;
 select * into v_pokemon from rocket_pokemon where id=p_rocket_pokemon_id for update;
 if not found or not v_pokemon.is_available then raise exception 'POKEMON_NOT_AVAILABLE'; end if;
 select * into v_event from rocket_events where id=v_pokemon.rocket_event_id and is_active for update;
 if not found then raise exception 'EVENT_NOT_ACTIVE'; end if;
 if v_pokemon.stock_quantity<=0 then raise exception 'POKEMON_SOLD_OUT'; end if;
 if v_trainer.balance<v_pokemon.price then raise exception 'INSUFFICIENT_BALANCE'; end if;
 update profiles set balance=balance-v_pokemon.price,updated_at=now() where id=v_trainer.id;
 update rocket_pokemon set stock_quantity=stock_quantity-1,updated_at=now() where id=v_pokemon.id;
 insert into transactions(operation_id,sender_id,amount,description,transaction_type,created_by)
 values(p_operation_id,v_trainer.id,v_pokemon.price,'Team Rocket: '||v_pokemon.pokemon_name,'rocket_purchase',v_trainer.id) returning * into v_tx;
 insert into rocket_purchases(rocket_event_id,rocket_pokemon_id,trainer_id,price_paid,operation_id,transaction_id)
 values(v_event.id,v_pokemon.id,v_trainer.id,v_pokemon.price,p_operation_id,v_tx.id) returning * into v_purchase;
 return v_purchase;
end$$;

create or replace function public.confirm_rocket_collection(p_purchase_id uuid)
returns public.rocket_purchases language plpgsql security definer set search_path=public as $$
declare v_purchase rocket_purchases; v_admin uuid:=public.my_profile_id();
begin
 if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
 select * into v_purchase from rocket_purchases where id=p_purchase_id for update;
 if not found or v_purchase.purchase_status<>'confirmed' then raise exception 'PURCHASE_NOT_COLLECTABLE'; end if;
 update rocket_purchases set purchase_status='collected',collected_at=now(),confirmed_by=v_admin where id=p_purchase_id returning * into v_purchase;
 return v_purchase;
end$$;
revoke all on function public.purchase_rocket_pokemon(uuid,uuid),public.confirm_rocket_collection(uuid) from public;
grant execute on function public.purchase_rocket_pokemon(uuid,uuid),public.confirm_rocket_collection(uuid) to authenticated;
revoke insert,update,delete on public.rocket_purchases from anon,authenticated;
