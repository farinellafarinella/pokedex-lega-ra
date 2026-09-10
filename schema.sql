-- Pokémon Champion League — schema, sicurezza e operazioni atomiche
create extension if not exists pgcrypto;
create type public.user_role as enum ('trainer','admin');
create type public.transaction_type as enum ('transfer','trainer_transfer','gym_ticket_purchase','gym_ticket_refund','rocket_purchase','rocket_refund','admin_credit','admin_debit','reversal');
create type public.transaction_status as enum ('completed','reversed');

create table public.profiles (
  id uuid primary key default gen_random_uuid(), user_id uuid unique references auth.users(id) on delete cascade,
  trainer_code text unique not null check (trainer_code ~ '^(TR|AD)-[0-9]{4,}$'), trainer_name text not null check (char_length(trainer_name) between 2 and 60),
  registration_date date not null default current_date, ranking_points integer not null default 0 check (ranking_points>=0),
  balance bigint not null default 0 check (balance>=0), role public.user_role not null default 'trainer', is_active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.badges (id uuid primary key default gen_random_uuid(), name text unique not null, position smallint unique not null check(position between 1 and 8), icon_name text not null, created_at timestamptz not null default now());
create table public.trainer_badges (id uuid primary key default gen_random_uuid(), trainer_id uuid not null references public.profiles(id) on delete cascade, badge_id uuid not null references public.badges(id) on delete cascade, earned_at timestamptz not null default now(), assigned_by uuid references public.profiles(id), unique(trainer_id,badge_id));
create table public.transactions (
 id uuid primary key default gen_random_uuid(), operation_id uuid unique not null, sender_id uuid references public.profiles(id), receiver_id uuid references public.profiles(id),
 amount bigint not null check(amount>0), description text check(char_length(description)<=140), transaction_type public.transaction_type not null,
 created_at timestamptz not null default now(), created_by uuid not null references public.profiles(id), status public.transaction_status not null default 'completed',
 reversed_transaction_id uuid unique references public.transactions(id), check(sender_id is distinct from receiver_id)
);
create table public.admin_adjustments (id uuid primary key default gen_random_uuid(), trainer_id uuid not null references public.profiles(id), amount bigint not null check(amount<>0), reason text not null check(char_length(reason)>=3), admin_id uuid not null references public.profiles(id), transaction_id uuid unique not null references public.transactions(id), created_at timestamptz not null default now());
create index profiles_name_idx on public.profiles using gin(to_tsvector('simple',trainer_name));
create index profiles_ranking_idx on public.profiles(ranking_points desc);
create index transactions_sender_idx on public.transactions(sender_id,created_at desc);
create index transactions_receiver_idx on public.transactions(receiver_id,created_at desc);
create index trainer_badges_trainer_idx on public.trainer_badges(trainer_id);

create or replace function public.my_profile_id() returns uuid language sql stable security definer set search_path=public as $$select id from profiles where user_id=auth.uid()$$;
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from profiles where user_id=auth.uid() and role='admin' and is_active)$$;
revoke all on function public.my_profile_id() from public; grant execute on function public.my_profile_id() to authenticated;
revoke all on function public.is_admin() from public; grant execute on function public.is_admin() to authenticated,anon;

alter table public.profiles enable row level security; alter table public.badges enable row level security; alter table public.trainer_badges enable row level security; alter table public.transactions enable row level security; alter table public.admin_adjustments enable row level security;
-- Authenticated users can read public profile fields through the view below. Direct profile reads are own/admin only to protect balance.
create policy profiles_own_read on public.profiles for select to authenticated using(user_id=auth.uid() or public.is_admin());
create policy profiles_admin_write on public.profiles for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy badges_public_read on public.badges for select to anon,authenticated using(true);
create policy badges_admin_write on public.badges for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy trainer_badges_read on public.trainer_badges for select to anon,authenticated using(true);
create policy trainer_badges_admin_write on public.trainer_badges for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy transactions_participant_read on public.transactions for select to authenticated using(sender_id=public.my_profile_id() or receiver_id=public.my_profile_id() or public.is_admin());
create policy adjustments_admin_read on public.admin_adjustments for select to authenticated using(public.is_admin());

create view public.public_profiles with (security_invoker=true) as select id,trainer_code,trainer_name,registration_date,ranking_points,is_active,created_at,balance from public.profiles where role='trainer' and is_active;
grant select on public.public_profiles to anon,authenticated;
-- View access requires a permissive base-table policy while columns stay restricted by the view.
create policy profiles_public_select on public.profiles for select to anon,authenticated using(role='trainer' and is_active);
revoke select on public.profiles from anon,authenticated;
grant select(id,trainer_code,trainer_name,registration_date,ranking_points,is_active,created_at,balance) on public.profiles to anon,authenticated;
grant select(balance,role,user_id,updated_at) on public.profiles to authenticated;

create or replace function public.transfer_pokedollars(p_receiver_code text,p_amount bigint,p_description text,p_operation_id uuid)
returns public.transactions language plpgsql security definer set search_path=public as $$
declare v_sender profiles; v_receiver profiles; v_tx transactions;
begin
 if p_amount<=0 then raise exception 'INVALID_AMOUNT'; end if;
 select * into v_tx from transactions where operation_id=p_operation_id;
 if found then
   if v_tx.created_by<>public.my_profile_id() then raise exception 'INVALID_OPERATION_ID'; end if; return v_tx;
 end if;
 select * into v_sender from profiles where user_id=auth.uid() for update;
 if not found or not v_sender.is_active then raise exception 'ACCOUNT_NOT_ACTIVE'; end if;
 select * into v_receiver from profiles where trainer_code=upper(trim(p_receiver_code)) and role='trainer' for update;
 if not found or not v_receiver.is_active then raise exception 'RECEIVER_NOT_FOUND'; end if;
 if v_sender.id=v_receiver.id then raise exception 'SELF_TRANSFER'; end if;
 if v_sender.balance<p_amount then raise exception 'INSUFFICIENT_BALANCE'; end if;
 update profiles set balance=balance-p_amount,updated_at=now() where id=v_sender.id;
 update profiles set balance=balance+p_amount,updated_at=now() where id=v_receiver.id;
 insert into transactions(operation_id,sender_id,receiver_id,amount,description,transaction_type,created_by)
 values(p_operation_id,v_sender.id,v_receiver.id,p_amount,nullif(trim(p_description),''),'transfer',v_sender.id) returning * into v_tx;
 return v_tx;
end$$;
revoke all on function public.transfer_pokedollars(text,bigint,text,uuid) from public; grant execute on function public.transfer_pokedollars(text,bigint,text,uuid) to authenticated;

create or replace function public.admin_adjust_balance(p_trainer_id uuid,p_amount bigint,p_reason text,p_operation_id uuid)
returns public.transactions language plpgsql security definer set search_path=public as $$
declare v_admin uuid:=public.my_profile_id(); v_tx transactions; v_type transaction_type;
begin
 if not public.is_admin() then raise exception 'FORBIDDEN'; end if; if p_amount=0 or length(trim(p_reason))<3 then raise exception 'INVALID_ADJUSTMENT'; end if;
 select * into v_tx from transactions where operation_id=p_operation_id; if found then return v_tx; end if;
 perform 1 from profiles where id=p_trainer_id for update; if not found then raise exception 'TRAINER_NOT_FOUND'; end if;
 if (select balance+p_amount from profiles where id=p_trainer_id)<0 then raise exception 'INSUFFICIENT_BALANCE'; end if;
 update profiles set balance=balance+p_amount,updated_at=now() where id=p_trainer_id;
 v_type:=case when p_amount>0 then 'admin_credit'::transaction_type else 'admin_debit'::transaction_type end;
 insert into transactions(operation_id,sender_id,receiver_id,amount,description,transaction_type,created_by)
 values(p_operation_id,case when p_amount<0 then p_trainer_id end,case when p_amount>0 then p_trainer_id end,abs(p_amount),p_reason,v_type,v_admin) returning * into v_tx;
 insert into admin_adjustments(trainer_id,amount,reason,admin_id,transaction_id) values(p_trainer_id,p_amount,p_reason,v_admin,v_tx.id); return v_tx;
end$$;
revoke all on function public.admin_adjust_balance(uuid,bigint,text,uuid) from public; grant execute on function public.admin_adjust_balance(uuid,bigint,text,uuid) to authenticated;

-- Block all direct balance and transaction mutations from API roles; only SECURITY DEFINER RPCs may perform them.
revoke insert,update,delete on public.transactions,public.admin_adjustments from anon,authenticated;

create or replace function public.update_my_trainer_name(p_trainer_name text)
returns table(trainer_name text,updated_at timestamptz)
language plpgsql security definer set search_path=public as $$
declare v_name text:=trim(p_trainer_name); v_profile profiles;
begin
 if auth.uid() is null then raise exception 'AUTHENTICATION_REQUIRED'; end if;
 if length(v_name) not between 2 and 60 or v_name !~ '^[[:alnum:]][[:alnum:] ''._-]*$' then raise exception 'INVALID_TRAINER_NAME'; end if;
 update profiles set trainer_name=v_name,updated_at=now() where user_id=auth.uid() and is_active returning * into v_profile;
 if not found then raise exception 'TRAINER_NOT_FOUND_OR_INACTIVE'; end if;
 trainer_name:=v_profile.trainer_name;updated_at:=v_profile.updated_at;return next;
end$$;
revoke all on function public.update_my_trainer_name(text) from public;
grant execute on function public.update_my_trainer_name(text) to authenticated;
