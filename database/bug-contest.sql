-- Gara Pigliamosche ufficiale: richiede profiles e starter_games già installate.
-- Nuove tabelle, senza importare prove o cancellare lo storico precedente.
begin;
create table if not exists public.bug_game_runs (
 id uuid primary key,user_id uuid not null references auth.users(id),contest_day date not null,
 state jsonb not null,revision bigint not null default 1,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 unique(user_id,contest_day)
);
create table if not exists public.bug_game_operations (
 user_id uuid not null references auth.users(id),operation_id uuid not null,contest_day date not null,
 primary key(user_id,operation_id)
);
create table if not exists public.bug_game_results (
 run_id uuid primary key references public.bug_game_runs(id),user_id uuid not null references auth.users(id),
 contest_day date not null,trainer_name text not null,pokemon jsonb not null,
 weight_score integer not null,rarity_bonus integer not null,total integer not null,
 submitted_at timestamptz not null,unique(user_id,contest_day)
);
create table if not exists public.bug_game_winners (
 contest_day date primary key,run_id uuid not null references public.bug_game_results(run_id),
 user_id uuid not null references auth.users(id),reward integer not null default 300,
 settled_at timestamptz not null default now()
);
create table if not exists public.bug_game_payments (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id),
 contest_day date not null,kind text not null check(kind in ('entry','prize')),
 amount integer not null check(amount>0),created_at timestamptz not null default now(),
 unique(user_id,contest_day,kind)
);
alter table public.bug_game_runs enable row level security;
alter table public.bug_game_operations enable row level security;
alter table public.bug_game_results enable row level security;
alter table public.bug_game_winners enable row level security;
alter table public.bug_game_payments enable row level security;
revoke all on public.bug_game_runs,public.bug_game_operations,public.bug_game_results,public.bug_game_winners,public.bug_game_payments from public,anon,authenticated;

-- Can be scheduled or safely called on access: one immutable winner/payment per day.
create or replace function public.settle_bug_game_days()
returns void language plpgsql security definer set search_path='' as $$
declare d date; winner public.bug_game_results%rowtype; today date:=(clock_timestamp() at time zone 'Europe/Rome')::date;
begin
 perform pg_advisory_xact_lock(hashtextextended('bug-game-settlement',0));
 for d in select distinct r.contest_day from public.bug_game_results r
  where r.contest_day<today and not exists(select 1 from public.bug_game_winners w where w.contest_day=r.contest_day)
  order by r.contest_day loop
  select * into winner from public.bug_game_results where contest_day=d
   order by total desc,rarity_bonus desc,(pokemon->>'weight')::numeric desc,submitted_at,run_id limit 1;
  insert into public.bug_game_winners(contest_day,run_id,user_id,reward) values(d,winner.run_id,winner.user_id,300);
  update public.profiles set balance=balance+300 where user_id=winner.user_id;
  if not found then raise exception 'WINNER_ACCOUNT_MISSING';end if;
  insert into public.bug_game_payments(user_id,contest_day,kind,amount) values(winner.user_id,d,'prize',300);
 end loop;
end;
$$;
revoke all on function public.settle_bug_game_days() from public,anon,authenticated;
grant execute on function public.settle_bug_game_days() to service_role;

create or replace function public.read_bug_game(p_user uuid,p_day date default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare stamp timestamptz; today date; chosen_day date; bal numeric; run public.bug_game_runs%rowtype; companion jsonb;
begin
 perform public.settle_bug_game_days();
 stamp:=clock_timestamp();today:=(stamp at time zone 'Europe/Rome')::date;chosen_day:=coalesce(p_day,today);
 select balance into bal from public.profiles where user_id=p_user and is_active;
 if not found then raise exception 'NOT_AUTHORIZED';end if;
 select state#>'{profile,starter}' into companion from public.starter_games where user_id=p_user;
 select * into run from public.bug_game_runs where user_id=p_user and contest_day=chosen_day;
 return jsonb_build_object('day',chosen_day,'today',today,'serverNow',stamp,
  'isOpen',extract(isodow from today)=4 and chosen_day=today,
  'closesAt',(chosen_day+1)::timestamp at time zone 'Europe/Rome',
  'cost',50,'reward',300,'balance',bal,'starter',companion,
  'state',run.state,'revision',coalesce(run.revision,0));
end;
$$;
revoke all on function public.read_bug_game(uuid,date) from public,anon,authenticated;
grant execute on function public.read_bug_game(uuid,date) to service_role;

create or replace function public.get_bug_game_status()
returns jsonb language sql security definer set search_path='' as $$select public.read_bug_game(auth.uid())$$;
revoke all on function public.get_bug_game_status() from public,anon;
grant execute on function public.get_bug_game_status() to authenticated;

create or replace function public.get_bug_game_operation(p_user uuid,p_operation uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare d date;
begin
 select contest_day into d from public.bug_game_operations where user_id=p_user and operation_id=p_operation;
 if not found then return null;end if;
 return public.read_bug_game(p_user,d);
end;
$$;
revoke all on function public.get_bug_game_operation(uuid,uuid) from public,anon,authenticated;
grant execute on function public.get_bug_game_operation(uuid,uuid) to service_role;

create or replace function public.commit_bug_game(p_user uuid,p_day date,p_revision bigint,p_operation uuid,p_kind text,p_state jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare bal numeric; trainer text; run public.bug_game_runs%rowtype; stamp timestamptz;
 chosen jsonb; score integer; bonus integer; previous_day date; response jsonb;
begin
 -- Same lock order as other games: profile before game state.
 select balance,trainer_name into bal,trainer from public.profiles where user_id=p_user and is_active for update;
 if not found then raise exception 'NOT_AUTHORIZED';end if;
 select contest_day into previous_day from public.bug_game_operations where user_id=p_user and operation_id=p_operation;
 if found then
  -- Do not settle other users' rewards while holding an account lock.
  select * into run from public.bug_game_runs where user_id=p_user and contest_day=previous_day;
  stamp:=clock_timestamp();
  return jsonb_build_object('day',previous_day,'today',(stamp at time zone 'Europe/Rome')::date,'serverNow',stamp,
   'isOpen',extract(isodow from stamp at time zone 'Europe/Rome')=4 and previous_day=(stamp at time zone 'Europe/Rome')::date,
   'closesAt',(previous_day+1)::timestamp at time zone 'Europe/Rome','cost',50,'reward',300,'balance',bal,
   'starter',run.state->'starter','state',run.state,'revision',run.revision);
 end if;
 stamp:=clock_timestamp();
 if p_day is null or p_day<>(stamp at time zone 'Europe/Rome')::date or extract(isodow from p_day)<>4 then raise exception 'CONTEST_CLOSED';end if;
 if p_operation is null or p_revision is null or p_state is null then raise exception 'INVALID_COMMAND';end if;
 select * into run from public.bug_game_runs where user_id=p_user and contest_day=p_day for update;
 if p_kind='start' then
  if found then raise exception 'ALREADY_STARTED';end if;
  if p_revision<>0 or p_state->>'phase'<>'ready' or (p_state->>'pokeballs')::integer<>10 or (p_state->>'encounters')::integer<>0 then raise exception 'INVALID_COMMAND';end if;
  if bal<50 then raise exception 'INSUFFICIENT_BALANCE';end if;
  if not exists(select 1 from public.starter_games where user_id=p_user and state#>'{profile,starter}'=p_state->'starter') then raise exception 'STARTER_CHANGED';end if;
  insert into public.bug_game_runs(id,user_id,contest_day,state) values((p_state->>'id')::uuid,p_user,p_day,p_state) returning * into run;
  update public.profiles set balance=balance-50 where user_id=p_user returning balance into bal;
  insert into public.bug_game_payments(user_id,contest_day,kind,amount) values(p_user,p_day,'entry',50);
 else
  if not found then raise exception 'CONTEST_NOT_FOUND';end if;
  if run.revision<>p_revision then raise exception 'STALE_REVISION';end if;
  if p_state->>'id'<>run.id::text or p_state->'starter'<>run.state->'starter'
   or (p_state->>'pokeballs')::integer>(run.state->>'pokeballs')::integer
   or (p_state->>'encounters')::integer<(run.state->>'encounters')::integer
   or (p_state->>'pokeballs')::integer not between 0 and 10
   or (p_state->>'encounters')::integer not between 0 and 5 then raise exception 'INVALID_COMMAND';end if;
  if p_kind='present' then
   if run.state->>'phase'<>'selection' or p_state->>'phase'<>'judged' then raise exception 'INVALID_COMMAND';end if;
   chosen:=p_state#>'{judgment,pokemon}';
   if not exists(select 1 from jsonb_array_elements(run.state->'caughtPokemon') p where p=chosen) then raise exception 'INVALID_POKEMON';end if;
   bonus:=(chosen->>'rarityScore')::integer;score:=round((chosen->>'weight')::numeric*1.1)::integer;
   p_state:=jsonb_set(p_state,'{judgment}',jsonb_build_object('contestId',run.id,'day',p_day,'date',stamp,
    'pokemon',chosen,'weightScore',score,'rarityBonus',bonus,'total',score+bonus));
   insert into public.bug_game_results(run_id,user_id,contest_day,trainer_name,pokemon,weight_score,rarity_bonus,total,submitted_at)
    values(run.id,p_user,p_day,trainer,chosen,score,bonus,score+bonus,stamp);
  end if;
  update public.bug_game_runs set state=p_state,revision=revision+1,updated_at=stamp where id=run.id returning * into run;
 end if;
 insert into public.bug_game_operations(user_id,operation_id,contest_day) values(p_user,p_operation,p_day);
 return jsonb_build_object('day',p_day,'today',p_day,'serverNow',stamp,'isOpen',true,
  'closesAt',(p_day+1)::timestamp at time zone 'Europe/Rome','cost',50,'reward',300,'balance',bal,
  'starter',run.state->'starter','state',run.state,'revision',run.revision);
end;
$$;
revoke all on function public.commit_bug_game(uuid,date,bigint,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.commit_bug_game(uuid,date,bigint,uuid,text,jsonb) to service_role;

create or replace function public.get_bug_game_ranking(p_day date default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare stamp timestamptz; today date; requested date; closing timestamptz; entries jsonb; previous date;
begin
 if not exists(select 1 from public.profiles where user_id=auth.uid() and is_active) then raise exception 'NOT_AUTHORIZED';end if;
 perform public.settle_bug_game_days();
 stamp:=clock_timestamp();today:=(stamp at time zone 'Europe/Rome')::date;requested:=coalesce(p_day,today);
 if requested>today then raise exception 'FUTURE_DAY';end if;
 previous:=today-((extract(isodow from today)::integer-4+7)%7);if previous=today then previous:=previous-7;end if;
 closing:=(requested+1)::timestamp at time zone 'Europe/Rome';
 with ranked as (select *,row_number() over(order by total desc,rarity_bonus desc,(pokemon->>'weight')::numeric desc,submitted_at,run_id) position
 from public.bug_game_results where contest_day=requested)
 select coalesce(jsonb_agg(jsonb_build_object('position',position,'trainerName',trainer_name,
  'pokemonName',pokemon->>'name','species',pokemon->>'species','rarity',pokemon->>'rarity',
  'weight',(pokemon->>'weight')::numeric,'total',total,'isMe',user_id=auth.uid()) order by position),'[]'::jsonb) into entries from ranked;
 return jsonb_build_object('day',requested,'today',today,'previousDay',previous,'serverNow',stamp,
  'closesAt',closing,'closed',stamp>=closing,'rows',entries,'reward',300,
  'winner',case when stamp>=closing then entries->0 else null end,
  'rewardPaid',exists(select 1 from public.bug_game_winners where contest_day=requested));
end;
$$;
revoke all on function public.get_bug_game_ranking(date) from public,anon;
grant execute on function public.get_bug_game_ranking(date) to authenticated;

create or replace function public.get_bug_game_payments()
returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id','bug-game:'||t.id::text,
  'from',case when t.kind='entry' then p.id end,'to',case when t.kind='prize' then p.id end,
  'amount',t.amount,'note',case when t.kind='entry' then 'Iscrizione Gara Pigliamosche' else 'Premio Gara Pigliamosche · '||t.contest_day::text end,
  'type','bug_game','date',t.created_at,'status','completed') order by t.created_at desc),'[]'::jsonb)
 from public.bug_game_payments t join public.profiles p on p.user_id=t.user_id
 where t.user_id=auth.uid() and p.is_active;
$$;
revoke all on function public.get_bug_game_payments() from public,anon;
grant execute on function public.get_bug_game_payments() to authenticated;

-- Retire old write endpoints without deleting old games, balances or receipts.
do $$declare fn regprocedure;begin
 for fn in select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname in ('prepare_bug_contest_round','catch_bug_contest_pokemon','submit_bug_test_pokemon') loop
  execute 'revoke execute on function '||fn||' from public,anon,authenticated';
 end loop;
end$$;
-- Supabase Cron: every minute, including the first minute after midnight.
-- https://supabase.com/docs/guides/cron/install
create extension if not exists pg_cron with schema pg_catalog;
-- Read endpoints also settle overdue prizes, so retries and missed jobs are safe.
do $$begin
 if exists(select 1 from pg_extension where extname='pg_cron') then
  perform cron.schedule('bug-game-daily-winner','* * * * *','select public.settle_bug_game_days()');
 end if;
end$$;
notify pgrst, 'reload schema';
commit;
