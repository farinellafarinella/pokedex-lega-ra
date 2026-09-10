-- Caccia ai Fossili: gioco del lunedì, in modalità test tutti i giorni.
create table if not exists public.fossil_hunt_settings (
  id boolean primary key default true check(id),
  test_mode boolean not null default true,
  updated_at timestamptz not null default now()
);
insert into public.fossil_hunt_settings(id,test_mode) values(true,true)
on conflict(id) do update set test_mode=true,updated_at=now();

create table if not exists public.fossil_hunt_days (
  id uuid primary key default gen_random_uuid(),
  game_date date unique not null,
  created_at timestamptz not null default now()
);

create table if not exists public.fossil_hunt_cards (
  id uuid primary key default gen_random_uuid(),
  hunt_day_id uuid not null references public.fossil_hunt_days(id) on delete cascade,
  trainer_id uuid not null references public.profiles(id) on delete cascade,
  fossil_1 text not null,
  fossil_2 text not null,
  fossil_3 text not null,
  revealed_1 boolean not null default false,
  revealed_2 boolean not null default false,
  revealed_3 boolean not null default false,
  cost bigint not null default 50 check(cost=50),
  win_amount bigint not null default 0 check(win_amount>=0),
  purchase_transaction_id uuid unique references public.transactions(id),
  prize_transaction_id uuid unique references public.transactions(id),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists fossil_hunt_cards_player_idx
on public.fossil_hunt_cards(hunt_day_id,trainer_id,created_at);
create unique index if not exists fossil_hunt_one_open_card
on public.fossil_hunt_cards(hunt_day_id,trainer_id) where completed_at is null;

alter table public.fossil_hunt_days enable row level security;
alter table public.fossil_hunt_cards enable row level security;
drop policy if exists fossil_hunt_days_read on public.fossil_hunt_days;
drop policy if exists fossil_hunt_cards_admin_read on public.fossil_hunt_cards;
create policy fossil_hunt_days_read on public.fossil_hunt_days for select to authenticated using(true);
create policy fossil_hunt_cards_admin_read on public.fossil_hunt_cards for select to authenticated using(public.is_admin());
grant select on public.fossil_hunt_days,public.fossil_hunt_cards to authenticated;

create or replace function public.random_fossil_symbol()
returns text language plpgsql volatile set search_path=public as $$
declare r numeric:=random();
begin
  return case when r<0.35 then 'Fossilhelix' when r<0.60 then 'Domofossil'
    when r<0.77 then 'Radiofossile' when r<0.88 then 'Fossilunghia'
    when r<0.95 then 'Fossilcranio' when r<0.99 then 'Fossilscudo'
    else 'Ambra Antica' end;
end$$;

create or replace function public.fossil_prize(p_fossil text)
returns bigint language sql immutable as $$
  select case p_fossil when 'Fossilhelix' then 75 when 'Domofossil' then 100
    when 'Radiofossile' then 150 when 'Fossilunghia' then 225
    when 'Fossilcranio' then 300 when 'Fossilscudo' then 450
    when 'Ambra Antica' then 750 else 0 end
$$;

create or replace function public.buy_fossil_hunt_card(p_operation_id uuid)
returns table(card_id uuid,new_balance bigint,cards_left integer)
language plpgsql security definer set search_path=public as $$
declare v_profile public.profiles;v_day public.fossil_hunt_days;v_card public.fossil_hunt_cards;
v_today date:=(now() at time zone 'Europe/Rome')::date;v_test boolean;v_used integer;v_a text;v_b text;v_c text;v_tx public.transactions;
begin
  select test_mode into v_test from public.fossil_hunt_settings where id=true;
  if extract(dow from v_today)::integer<>1 and not (coalesce(v_test,false) and public.is_admin()) then raise exception 'GAME_CLOSED';end if;
  select * into v_profile from public.profiles where user_id=auth.uid() and is_active for update;
  if not found then raise exception 'PROFILE_NOT_FOUND';end if;
  insert into public.fossil_hunt_days(game_date) values(v_today)
    on conflict(game_date) do update set game_date=excluded.game_date returning * into v_day;
  select * into v_card from public.fossil_hunt_cards where hunt_day_id=v_day.id and trainer_id=v_profile.id and completed_at is null;
  if found then
    select count(*)::integer into v_used from public.fossil_hunt_cards where hunt_day_id=v_day.id and trainer_id=v_profile.id;
    return query select v_card.id,v_profile.balance,greatest(0,3-v_used);return;
  end if;
  select count(*)::integer into v_used from public.fossil_hunt_cards where hunt_day_id=v_day.id and trainer_id=v_profile.id;
  if v_used>=3 then raise exception 'PLAY_LIMIT_REACHED';end if;
  if v_profile.balance<50 then raise exception 'INSUFFICIENT_BALANCE';end if;
  if random()<0.30 then
    v_a:=public.random_fossil_symbol();v_b:=v_a;v_c:=v_a;
  else
    v_a:=public.random_fossil_symbol();v_b:=public.random_fossil_symbol();v_c:=public.random_fossil_symbol();
    if v_a=v_b and v_b=v_c then v_c:=case when v_a='Fossilhelix' then 'Domofossil' else 'Fossilhelix' end;end if;
  end if;
  update public.profiles set balance=balance-50,updated_at=now() where id=v_profile.id returning balance into v_profile.balance;
  insert into public.transactions(operation_id,sender_id,amount,description,transaction_type,created_by)
  values(p_operation_id,v_profile.id,50,'Partita Caccia ai Fossili','admin_debit',v_profile.id) returning * into v_tx;
  insert into public.fossil_hunt_cards(hunt_day_id,trainer_id,fossil_1,fossil_2,fossil_3,purchase_transaction_id)
  values(v_day.id,v_profile.id,v_a,v_b,v_c,v_tx.id) returning * into v_card;
  return query select v_card.id,v_profile.balance,2-v_used;
end$$;

create or replace function public.get_fossil_hunt_state()
returns table(is_open boolean,cards_used integer,cards_left integer,current_balance bigint,card_id uuid,
  revealed_1 boolean,revealed_2 boolean,revealed_3 boolean,fossil_1 text,fossil_2 text,fossil_3 text)
language plpgsql security definer set search_path=public as $$
declare v_profile public.profiles;v_day public.fossil_hunt_days;v_card public.fossil_hunt_cards;
v_today date:=(now() at time zone 'Europe/Rome')::date;v_test boolean;
begin
  select * into v_profile from public.profiles where user_id=auth.uid() and is_active;
  if not found then raise exception 'PROFILE_NOT_FOUND';end if;
  select test_mode into v_test from public.fossil_hunt_settings where id=true;
  is_open:=extract(dow from v_today)::integer=1 or (coalesce(v_test,false) and public.is_admin());current_balance:=v_profile.balance;
  select * into v_day from public.fossil_hunt_days where game_date=v_today;
  cards_used:=0;cards_left:=3;
  if v_day.id is not null then
    select count(*)::integer into cards_used from public.fossil_hunt_cards where hunt_day_id=v_day.id and trainer_id=v_profile.id;
    cards_left:=greatest(0,3-cards_used);
    select * into v_card from public.fossil_hunt_cards where hunt_day_id=v_day.id and trainer_id=v_profile.id and completed_at is null;
    if found then
      card_id:=v_card.id;revealed_1:=v_card.revealed_1;revealed_2:=v_card.revealed_2;revealed_3:=v_card.revealed_3;
      fossil_1:=case when v_card.revealed_1 then v_card.fossil_1 end;
      fossil_2:=case when v_card.revealed_2 then v_card.fossil_2 end;
      fossil_3:=case when v_card.revealed_3 then v_card.fossil_3 end;
    end if;
  end if;
  return next;
end$$;

create or replace function public.reveal_fossil_rock(p_card_id uuid,p_slot integer)
returns table(fossil text,is_complete boolean,win_amount bigint,new_balance bigint)
language plpgsql security definer set search_path=public as $$
declare v_profile public.profiles;v_card public.fossil_hunt_cards;v_symbol text;v_complete boolean;v_win bigint:=0;v_tx public.transactions;
begin
  if p_slot not between 1 and 3 then raise exception 'INVALID_SLOT';end if;
  select * into v_profile from public.profiles where user_id=auth.uid() and is_active for update;
  if not found then raise exception 'PROFILE_NOT_FOUND';end if;
  select * into v_card from public.fossil_hunt_cards where id=p_card_id and trainer_id=v_profile.id for update;
  if not found then raise exception 'CARD_NOT_FOUND';end if;
  if v_card.completed_at is not null then raise exception 'CARD_COMPLETED';end if;
  v_symbol:=case p_slot when 1 then v_card.fossil_1 when 2 then v_card.fossil_2 else v_card.fossil_3 end;
  update public.fossil_hunt_cards set
    revealed_1=case when p_slot=1 then true else revealed_1 end,
    revealed_2=case when p_slot=2 then true else revealed_2 end,
    revealed_3=case when p_slot=3 then true else revealed_3 end
  where id=v_card.id returning * into v_card;
  v_complete:=v_card.revealed_1 and v_card.revealed_2 and v_card.revealed_3;
  if v_complete then
    if v_card.fossil_1=v_card.fossil_2 and v_card.fossil_2=v_card.fossil_3 then v_win:=public.fossil_prize(v_card.fossil_1);end if;
    if v_win>0 then
      update public.profiles set balance=balance+v_win,updated_at=now() where id=v_profile.id returning balance into v_profile.balance;
      insert into public.transactions(operation_id,receiver_id,amount,description,transaction_type,created_by)
      values(gen_random_uuid(),v_profile.id,v_win,'Vincita Caccia ai Fossili','admin_credit',v_profile.id) returning * into v_tx;
    end if;
    update public.fossil_hunt_cards set win_amount=v_win,prize_transaction_id=v_tx.id,completed_at=now() where id=v_card.id;
  end if;
  return query select v_symbol,v_complete,v_win,v_profile.balance;
end$$;

revoke all on function public.random_fossil_symbol(),public.fossil_prize(text),public.buy_fossil_hunt_card(uuid),public.get_fossil_hunt_state(),public.reveal_fossil_rock(uuid,integer) from public;
grant execute on function public.buy_fossil_hunt_card(uuid),public.get_fossil_hunt_state(),public.reveal_fossil_rock(uuid,integer) to authenticated;
