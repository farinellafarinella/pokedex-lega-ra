-- Moduli Zona Palestra e Lista Rocket. Eseguire dopo schema.sql.
alter type public.transaction_type add value if not exists 'trainer_transfer';
alter type public.transaction_type add value if not exists 'gym_ticket_purchase';
alter type public.transaction_type add value if not exists 'gym_ticket_refund';
alter type public.transaction_type add value if not exists 'rocket_purchase';
alter type public.transaction_type add value if not exists 'rocket_refund';

create type public.ticket_status as enum ('valid','used','cancelled','refunded','expired');
create type public.order_status as enum ('pending','confirmed','ready','delivered','cancelled','refunded');

create table public.gyms (
 id uuid primary key default gen_random_uuid(), name text not null, description text not null,
 badge_id uuid not null references public.badges(id), event_date timestamptz not null, event_location text not null,
 ticket_price bigint not null check(ticket_price>=0), minimum_ranking_points integer not null default 0 check(minimum_ranking_points>=0),
 maximum_participants integer not null check(maximum_participants>0), registration_open_at timestamptz not null,
 registration_close_at timestamptz not null check(registration_close_at>registration_open_at), is_registration_open boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.gym_registrations (
 id uuid primary key default gen_random_uuid(), gym_id uuid not null references public.gyms(id), trainer_id uuid not null references public.profiles(id),
 ticket_code text unique not null, ticket_status public.ticket_status not null default 'valid', ticket_price bigint not null check(ticket_price>=0),
 operation_id uuid unique not null, purchase_transaction_id uuid unique references public.transactions(id), registered_at timestamptz not null default now(),
 checked_in_at timestamptz, checked_in_by uuid references public.profiles(id), refunded_at timestamptz, created_at timestamptz not null default now(),
 unique(gym_id,trainer_id)
);
create table public.rocket_items (
 id uuid primary key default gen_random_uuid(), item_code text unique not null, name text not null, description text not null,
 category text not null check(category in ('Pokémon','carte','bustine','accessori','stampe 3D','gadget','premi speciali','biglietti evento','oggetti misteriosi')),
 image_url text, price bigint not null check(price>=0), stock_quantity integer not null default 0 check(stock_quantity>=0),
 purchase_limit integer not null default 1 check(purchase_limit>0), rarity text, is_active boolean not null default true,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.orders (
 id uuid primary key default gen_random_uuid(), order_code text unique not null, trainer_id uuid not null references public.profiles(id),
 total_amount bigint not null check(total_amount>=0), status public.order_status not null default 'confirmed',
 delivery_method text not null check(delivery_method in ('event','venue','manual')), admin_note text, operation_id uuid unique not null,
 purchase_transaction_id uuid unique references public.transactions(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 delivered_at timestamptz, refunded_at timestamptz
);
create table public.order_items (
 id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete cascade,
 rocket_item_id uuid not null references public.rocket_items(id), quantity integer not null check(quantity>0), unit_price bigint not null check(unit_price>=0),
 total_price bigint generated always as (quantity*unit_price) stored, created_at timestamptz not null default now()
);
create index gyms_date_idx on public.gyms(event_date); create index gym_registrations_gym_idx on public.gym_registrations(gym_id,ticket_status);
create index rocket_items_active_idx on public.rocket_items(is_active,created_at desc); create index orders_trainer_idx on public.orders(trainer_id,created_at desc);

alter table public.gyms enable row level security; alter table public.gym_registrations enable row level security;
alter table public.rocket_items enable row level security; alter table public.orders enable row level security; alter table public.order_items enable row level security;
create policy gyms_public_read on public.gyms for select to anon,authenticated using(true);
create policy gyms_admin_write on public.gyms for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy registrations_public_read on public.gym_registrations for select to anon,authenticated using(ticket_status in ('valid','used') or trainer_id=public.my_profile_id() or public.is_admin());
create policy registrations_admin_update on public.gym_registrations for update to authenticated using(public.is_admin()) with check(public.is_admin());
create policy items_public_read on public.rocket_items for select to anon,authenticated using(is_active or public.is_admin());
create policy items_admin_write on public.rocket_items for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy orders_own_read on public.orders for select to authenticated using(trainer_id=public.my_profile_id() or public.is_admin());
create policy order_items_own_read on public.order_items for select to authenticated using(exists(select 1 from public.orders o where o.id=order_id and (o.trainer_id=public.my_profile_id() or public.is_admin())));

create or replace function public.purchase_gym_ticket(p_gym_id uuid,p_operation_id uuid) returns public.gym_registrations
language plpgsql security definer set search_path=public as $$
declare v_trainer profiles; v_gym gyms; v_reg gym_registrations; v_count integer; v_tx transactions;
begin
 select * into v_reg from gym_registrations where operation_id=p_operation_id; if found then return v_reg; end if;
 select * into v_trainer from profiles where user_id=auth.uid() for update; if not found or not v_trainer.is_active then raise exception 'ACCOUNT_NOT_ACTIVE'; end if;
 select * into v_gym from gyms where id=p_gym_id for update; if not found then raise exception 'GYM_NOT_FOUND'; end if;
 if not v_gym.is_registration_open or now() not between v_gym.registration_open_at and v_gym.registration_close_at then raise exception 'REGISTRATION_CLOSED'; end if;
 select count(*) into v_count from gym_registrations where gym_id=p_gym_id and ticket_status in ('valid','used');
 if v_count>=v_gym.maximum_participants then raise exception 'GYM_FULL'; end if;
 if v_trainer.ranking_points<v_gym.minimum_ranking_points then raise exception 'POINTS_REQUIRED'; end if;
 if v_trainer.balance<v_gym.ticket_price then raise exception 'INSUFFICIENT_BALANCE'; end if;
 if exists(select 1 from trainer_badges where trainer_id=v_trainer.id and badge_id=v_gym.badge_id) then raise exception 'BADGE_ALREADY_EARNED'; end if;
 update profiles set balance=balance-v_gym.ticket_price,updated_at=now() where id=v_trainer.id;
 insert into transactions(operation_id,sender_id,amount,description,transaction_type,created_by) values(p_operation_id,v_trainer.id,v_gym.ticket_price,'Biglietto palestra: '||v_gym.name,'gym_ticket_purchase',v_trainer.id) returning * into v_tx;
 insert into gym_registrations(gym_id,trainer_id,ticket_code,ticket_price,operation_id,purchase_transaction_id)
 values(v_gym.id,v_trainer.id,'GYM-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,12)),v_gym.ticket_price,p_operation_id,v_tx.id) returning * into v_reg; return v_reg;
end$$;

create or replace function public.purchase_rocket_item(p_item_id uuid,p_quantity integer,p_delivery_method text,p_operation_id uuid) returns public.orders
language plpgsql security definer set search_path=public as $$
declare v_trainer profiles; v_item rocket_items; v_order orders; v_total bigint; v_bought integer; v_tx transactions;
begin
 select * into v_order from orders where operation_id=p_operation_id; if found then return v_order; end if;
 if p_quantity<=0 or p_delivery_method not in ('event','venue','manual') then raise exception 'INVALID_REQUEST'; end if;
 select * into v_trainer from profiles where user_id=auth.uid() for update; if not found or not v_trainer.is_active then raise exception 'ACCOUNT_NOT_ACTIVE'; end if;
 select * into v_item from rocket_items where id=p_item_id for update; if not found or not v_item.is_active then raise exception 'ITEM_UNAVAILABLE'; end if;
 if v_item.stock_quantity<p_quantity then raise exception 'INSUFFICIENT_STOCK'; end if;
 select coalesce(sum(oi.quantity),0) into v_bought from order_items oi join orders o on o.id=oi.order_id where o.trainer_id=v_trainer.id and oi.rocket_item_id=v_item.id and o.status not in ('cancelled','refunded');
 if v_bought+p_quantity>v_item.purchase_limit then raise exception 'PURCHASE_LIMIT'; end if;
 v_total:=v_item.price*p_quantity; if v_trainer.balance<v_total then raise exception 'INSUFFICIENT_BALANCE'; end if;
 update profiles set balance=balance-v_total,updated_at=now() where id=v_trainer.id; update rocket_items set stock_quantity=stock_quantity-p_quantity,updated_at=now() where id=v_item.id;
 insert into transactions(operation_id,sender_id,amount,description,transaction_type,created_by) values(p_operation_id,v_trainer.id,v_total,'Acquisto Rocket: '||v_item.name,'rocket_purchase',v_trainer.id) returning * into v_tx;
 insert into orders(order_code,trainer_id,total_amount,delivery_method,operation_id,purchase_transaction_id) values('ORD-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,12)),v_trainer.id,v_total,p_delivery_method,p_operation_id,v_tx.id) returning * into v_order;
 insert into order_items(order_id,rocket_item_id,quantity,unit_price) values(v_order.id,v_item.id,p_quantity,v_item.price); return v_order;
end$$;
revoke all on function public.purchase_gym_ticket(uuid,uuid),public.purchase_rocket_item(uuid,integer,text,uuid) from public;
grant execute on function public.purchase_gym_ticket(uuid,uuid),public.purchase_rocket_item(uuid,integer,text,uuid) to authenticated;
revoke insert,update,delete on public.gym_registrations,public.orders,public.order_items from anon,authenticated;
