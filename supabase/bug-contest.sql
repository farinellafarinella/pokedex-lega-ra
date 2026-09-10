-- Gara Pigliamosche online: ogni giovedì, massimo 3 Net Ball da 50 ₽.
create table if not exists public.bug_contest_settings (
  id boolean primary key default true check (id),
  test_mode boolean not null default true,
  updated_at timestamptz not null default now()
);
insert into public.bug_contest_settings(id,test_mode)
values(true,true) on conflict(id) do update set test_mode=true,updated_at=now();

create table if not exists public.bug_contests (
  id uuid primary key default gen_random_uuid(),
  contest_date date unique not null,
  prize_amount bigint not null default 300 check (prize_amount > 0),
  winner_id uuid references public.profiles(id),
  winning_round_id uuid,
  prize_transaction_id uuid unique references public.transactions(id),
  finalized_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.bug_contest_rounds (
  id uuid primary key default gen_random_uuid(),
  contest_id uuid not null references public.bug_contests(id) on delete cascade,
  trainer_id uuid not null references public.profiles(id) on delete cascade,
  pokemon_1 text not null,
  weight_1 numeric(7,2) not null check (weight_1 > 0),
  pokemon_2 text not null,
  weight_2 numeric(7,2) not null check (weight_2 > 0),
  pokemon_3 text not null,
  weight_3 numeric(7,2) not null check (weight_3 > 0),
  chosen_slot smallint check (chosen_slot between 1 and 3),
  caught_pokemon text,
  caught_weight numeric(7,2),
  cost bigint not null default 50 check (cost = 50),
  transaction_id uuid unique references public.transactions(id),
  prepared_at timestamptz not null default now(),
  caught_at timestamptz
);

alter table public.bug_contests
  drop constraint if exists bug_contests_winning_round_id_fkey; 
alter table public.bug_contests
  add constraint bug_contests_winning_round_id_fkey
  foreign key (winning_round_id) references public.bug_contest_rounds(id);

create unique index if not exists bug_contest_one_pending_round
on public.bug_contest_rounds(contest_id, trainer_id)
where chosen_slot is null;
create index if not exists bug_contest_round_ranking
on public.bug_contest_rounds(contest_id, caught_weight desc, caught_at asc)
where chosen_slot is not null;

alter table public.bug_contests enable row level security;
alter table public.bug_contest_rounds enable row level security;
drop policy if exists bug_contests_read on public.bug_contests;
drop policy if exists bug_contest_rounds_admin_read on public.bug_contest_rounds;
create policy bug_contests_read on public.bug_contests
for select to authenticated using (true);
create policy bug_contest_rounds_admin_read on public.bug_contest_rounds
for select to authenticated using (public.is_admin());
grant select on public.bug_contests, public.bug_contest_rounds to authenticated;

create or replace function public.bug_weight(p_name text)
returns numeric
language sql volatile
set search_path = public
as $$
  select round((case p_name
    when 'Caterpie' then 2.9 when 'Metapod' then 9.9
    when 'Butterfree' then 32.0 when 'Weedle' then 3.2
    when 'Kakuna' then 10.0 when 'Beedrill' then 29.5
    when 'Paras' then 5.4 when 'Venonat' then 30.0
    when 'Scyther' then 56.0 when 'Pinsir' then 55.0
    when 'Ledyba' then 10.8 when 'Spinarak' then 8.5
    when 'Heracross' then 54.0 else 20.0 end
    * (0.60 + random() * 0.80))::numeric, 2)
$$;

create or replace function public.prepare_bug_contest_round()
returns table(
  round_id uuid, pokemon_1 text, pokemon_2 text, pokemon_3 text,
  plays_used integer, plays_left integer, current_balance bigint
)
language plpgsql security definer set search_path = public
as $$
declare
  v_profile public.profiles;
  v_contest public.bug_contests;
  v_round public.bug_contest_rounds;
  v_today date := (now() at time zone 'Europe/Rome')::date;
  v_names text[];
  v_used integer;
  v_test_mode boolean;
begin
  select test_mode into v_test_mode from public.bug_contest_settings where id=true;
  if extract(dow from v_today)::integer <> 4 and not coalesce(v_test_mode,false) then
    raise exception 'CONTEST_CLOSED';
  end if;
  select * into v_profile from public.profiles
  where user_id = auth.uid() and is_active for update;
  if not found then raise exception 'PROFILE_NOT_FOUND'; end if;

  insert into public.bug_contests(contest_date)
  values(v_today) on conflict(contest_date) do update set contest_date=excluded.contest_date
  returning * into v_contest;

  select count(*)::integer into v_used from public.bug_contest_rounds
  where contest_id=v_contest.id and trainer_id=v_profile.id and chosen_slot is not null;
  if v_used >= 3 then raise exception 'PLAY_LIMIT_REACHED'; end if;

  select * into v_round from public.bug_contest_rounds
  where contest_id=v_contest.id and trainer_id=v_profile.id and chosen_slot is null;

  if not found then
    select array_agg(name) into v_names from (
      select name from unnest(array['Caterpie','Metapod','Butterfree','Weedle','Kakuna','Beedrill','Paras','Venonat','Scyther','Pinsir','Ledyba','Spinarak','Heracross']) as u(name)
      order by random() limit 3
    ) picked;
    insert into public.bug_contest_rounds(
      contest_id,trainer_id,pokemon_1,weight_1,pokemon_2,weight_2,pokemon_3,weight_3
    ) values (
      v_contest.id,v_profile.id,
      v_names[1],public.bug_weight(v_names[1]),
      v_names[2],public.bug_weight(v_names[2]),
      v_names[3],public.bug_weight(v_names[3])
    ) returning * into v_round;
  end if;

  return query select v_round.id,v_round.pokemon_1,v_round.pokemon_2,v_round.pokemon_3,
    v_used,3-v_used,v_profile.balance;
end;
$$;

create or replace function public.catch_bug_contest_pokemon(p_round_id uuid,p_slot integer,p_operation_id uuid)
returns table(caught_pokemon text,caught_weight numeric,new_balance bigint,plays_left integer)
language plpgsql security definer set search_path = public
as $$
declare
  v_profile public.profiles;
  v_round public.bug_contest_rounds;
  v_contest public.bug_contests;
  v_name text;
  v_weight numeric;
  v_used integer;
  v_tx public.transactions;
  v_today date := (now() at time zone 'Europe/Rome')::date;
  v_test_mode boolean;
begin
  select test_mode into v_test_mode from public.bug_contest_settings where id=true;
  if extract(dow from v_today)::integer <> 4 and not coalesce(v_test_mode,false) then raise exception 'CONTEST_CLOSED'; end if;
  if p_slot not between 1 and 3 then raise exception 'INVALID_SLOT'; end if;
  select * into v_profile from public.profiles
  where user_id=auth.uid() and is_active for update;
  if not found then raise exception 'PROFILE_NOT_FOUND'; end if;
  select * into v_round from public.bug_contest_rounds
  where id=p_round_id and trainer_id=v_profile.id for update;
  if not found then raise exception 'ROUND_NOT_FOUND'; end if;
  if v_round.chosen_slot is not null then
    return query select v_round.caught_pokemon,v_round.caught_weight,v_profile.balance,
      greatest(0,3-(select count(*)::integer from public.bug_contest_rounds where contest_id=v_round.contest_id and trainer_id=v_profile.id and chosen_slot is not null));
    return;
  end if;
  select * into v_contest from public.bug_contests where id=v_round.contest_id and contest_date=v_today;
  if not found then raise exception 'CONTEST_CLOSED'; end if;
  select count(*)::integer into v_used from public.bug_contest_rounds
  where contest_id=v_contest.id and trainer_id=v_profile.id and chosen_slot is not null;
  if v_used>=3 then raise exception 'PLAY_LIMIT_REACHED'; end if;
  if v_profile.balance<50 then raise exception 'INSUFFICIENT_BALANCE'; end if;

  v_name:=case p_slot when 1 then v_round.pokemon_1 when 2 then v_round.pokemon_2 else v_round.pokemon_3 end;
  v_weight:=case p_slot when 1 then v_round.weight_1 when 2 then v_round.weight_2 else v_round.weight_3 end;
  update public.profiles set balance=balance-50,updated_at=now() where id=v_profile.id
  returning balance into v_profile.balance;
  insert into public.transactions(operation_id,sender_id,amount,description,transaction_type,created_by)
  values(p_operation_id,v_profile.id,50,'Net Ball Gara Pigliamosche','admin_debit',v_profile.id)
  returning * into v_tx;
  update public.bug_contest_rounds set chosen_slot=p_slot,caught_pokemon=v_name,
    caught_weight=v_weight,transaction_id=v_tx.id,caught_at=now() where id=v_round.id;
  return query select v_name,v_weight,v_profile.balance,2-v_used;
end;
$$;

create or replace function public.get_bug_contest_status()
returns table(
  contest_date date, is_open boolean, plays_used integer, best_pokemon text,
  best_weight numeric, leader_name text, leader_weight numeric, prize_amount bigint
)
language plpgsql security definer set search_path = public
as $$
declare
  v_profile_id uuid:=public.my_profile_id();
  v_today date:=(now() at time zone 'Europe/Rome')::date;
  v_date date;
  v_contest public.bug_contests;
  v_test_mode boolean;
begin
  select test_mode into v_test_mode from public.bug_contest_settings where id=true;
  v_date:=case when coalesce(v_test_mode,false) then v_today else v_today-((extract(dow from v_today)::integer-4+7)%7) end;
  select * into v_contest from public.bug_contests where bug_contests.contest_date=v_date;
  contest_date:=v_date;is_open:=extract(dow from v_today)::integer=4 or coalesce(v_test_mode,false);prize_amount:=300;
  plays_used:=0;
  if v_contest.id is null then return next;return;end if;
  select count(*)::integer into plays_used from public.bug_contest_rounds r
    where r.contest_id=v_contest.id and r.trainer_id=v_profile_id and r.chosen_slot is not null;
  select r.caught_pokemon,r.caught_weight into best_pokemon,best_weight
    from public.bug_contest_rounds r where r.contest_id=v_contest.id and r.trainer_id=v_profile_id
    and r.chosen_slot is not null order by r.caught_weight desc,r.caught_at asc limit 1;
  select p.trainer_name,r.caught_weight into leader_name,leader_weight
    from public.bug_contest_rounds r join public.profiles p on p.id=r.trainer_id
    where r.contest_id=v_contest.id and r.chosen_slot is not null
    order by r.caught_weight desc,r.caught_at asc limit 1;
  return next;
end;
$$;

create or replace function public.get_bug_contest_leaderboard()
returns table("position" bigint,trainer_name text,pokemon_name text,weight numeric,caught_at timestamptz)
language sql stable security definer set search_path=public
as $$
  with local_day as (
    select (now() at time zone 'Europe/Rome')::date d
  ), settings as (
    select coalesce((select test_mode from public.bug_contest_settings where id=true),false) test_mode
  ), contest as (
    select c.id from public.bug_contests c,local_day l,settings s
    where c.contest_date=case when s.test_mode then l.d else l.d-((extract(dow from l.d)::integer-4+7)%7) end
  ), best as (
    select distinct on(r.trainer_id) r.trainer_id,r.caught_pokemon,r.caught_weight,r.caught_at
    from public.bug_contest_rounds r join contest c on c.id=r.contest_id
    where r.chosen_slot is not null order by r.trainer_id,r.caught_weight desc,r.caught_at asc
  )
  select row_number() over(order by b.caught_weight desc,b.caught_at asc),p.trainer_name,
    b.caught_pokemon,b.caught_weight,b.caught_at
  from best b join public.profiles p on p.id=b.trainer_id
  order by b.caught_weight desc,b.caught_at asc
$$;

create or replace function public.finalize_bug_contests()
returns integer language plpgsql security definer set search_path=public as $$
declare v_contest public.bug_contests;v_winner public.bug_contest_rounds;v_count integer:=0;v_tx public.transactions;
begin
  for v_contest in select * from public.bug_contests
    where contest_date < (now() at time zone 'Europe/Rome')::date and finalized_at is null for update
  loop
    select * into v_winner from public.bug_contest_rounds
    where contest_id=v_contest.id and chosen_slot is not null
    order by caught_weight desc,caught_at asc limit 1;
    if found then
      update public.profiles set balance=balance+v_contest.prize_amount,updated_at=now() where id=v_winner.trainer_id;
      insert into public.transactions(operation_id,receiver_id,amount,description,transaction_type,created_by)
      values(gen_random_uuid(),v_winner.trainer_id,v_contest.prize_amount,'Vittoria Gara Pigliamosche','admin_credit',v_winner.trainer_id)
      returning * into v_tx;
      update public.bug_contests set winner_id=v_winner.trainer_id,winning_round_id=v_winner.id,
        prize_transaction_id=v_tx.id,finalized_at=now() where id=v_contest.id;
    else
      update public.bug_contests set finalized_at=now() where id=v_contest.id;
    end if;
    v_count:=v_count+1;
  end loop;
  return v_count;
end;
$$;

revoke all on function public.bug_weight(text),public.prepare_bug_contest_round(),public.catch_bug_contest_pokemon(uuid,integer,uuid),public.get_bug_contest_status(),public.get_bug_contest_leaderboard(),public.finalize_bug_contests() from public;
grant execute on function public.prepare_bug_contest_round(),public.catch_bug_contest_pokemon(uuid,integer,uuid),public.get_bug_contest_status(),public.get_bug_contest_leaderboard() to authenticated;

-- Chiusura automatica: il controllo ogni 15 minuti assegna il premio dopo la mezzanotte italiana.
create extension if not exists pg_cron;
do $$
begin
  if not exists(select 1 from cron.job where jobname='finalize-bug-contests') then
    perform cron.schedule('finalize-bug-contests','*/15 * * * *','select public.finalize_bug_contests();');
  end if;
end$$;
