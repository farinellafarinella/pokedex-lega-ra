-- Additivo: non modifica la vecchia Caccia ai Fossili.
-- Eseguire dopo schema.sql. Le sole scritture sono affidate alla Edge Function.
alter type public.transaction_type add value if not exists 'starter_arena';
create table if not exists public.starter_games (
 user_id uuid primary key references auth.users(id) on delete cascade,
 revision bigint not null default 0 check(revision>=0),
 state jsonb not null default '{"profile":null,"battle":null,"log":[]}'::jsonb,
 updated_at timestamptz not null default now()
);
create table if not exists public.starter_operations (
 user_id uuid not null references auth.users(id) on delete cascade,
 operation_id uuid not null,
 created_at timestamptz not null default now(),
 primary key(user_id,operation_id)
);
alter table public.starter_games enable row level security;
alter table public.starter_operations enable row level security;
revoke all on public.starter_games,public.starter_operations from anon,authenticated;
grant select on public.starter_games to authenticated;
drop policy if exists starter_own_read on public.starter_games;
create policy starter_own_read on public.starter_games for select to authenticated using(user_id=auth.uid());
grant all on public.starter_games,public.starter_operations to service_role;

create or replace function public.commit_starter_command(
 p_user uuid,p_revision bigint,p_operation uuid,p_state jsonb,p_delta bigint
) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_profile public.profiles;v_game public.starter_games;
begin
 -- Accessible uniquement via service_role, jamais avec la clé publique du navigateur.
 select * into v_profile from public.profiles where user_id=p_user for update;
 if not found or not v_profile.is_active then raise exception 'ACCOUNT_NOT_ACTIVE';end if;
 insert into public.starter_games(user_id) values(p_user) on conflict do nothing;
 select * into v_game from public.starter_games where user_id=p_user for update;
 if exists(select 1 from public.starter_operations where user_id=p_user and operation_id=p_operation) then
  return jsonb_build_object('state',v_game.state,'revision',v_game.revision,'balance',v_profile.balance);
 end if;
 if v_game.revision<>p_revision then raise exception 'STALE_REVISION';end if;
 if v_profile.balance+p_delta<0 then raise exception 'INSUFFICIENT_BALANCE';end if;
 if p_delta<>0 then
  update public.profiles set balance=balance+p_delta,updated_at=now() where id=v_profile.id;
  insert into public.transactions(operation_id,sender_id,receiver_id,amount,description,transaction_type,created_by)
  values(p_operation,case when p_delta<0 then v_profile.id end,case when p_delta>0 then v_profile.id end,
   abs(p_delta),'Il mio Starter · Arena Fossili', 'starter_arena',v_profile.id);
 end if;
 p_state=jsonb_set(p_state,'{profile,balance}',to_jsonb(v_profile.balance+p_delta));
 update public.starter_games set state=p_state,revision=revision+1,updated_at=now() where user_id=p_user returning * into v_game;
 insert into public.starter_operations(user_id,operation_id) values(p_user,p_operation);
 return jsonb_build_object('state',v_game.state,'revision',v_game.revision,'balance',v_profile.balance+p_delta);
end$$;
revoke all on function public.commit_starter_command(uuid,bigint,uuid,jsonb,bigint) from public,anon,authenticated;
grant execute on function public.commit_starter_command(uuid,bigint,uuid,jsonb,bigint) to service_role;
