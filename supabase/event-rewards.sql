-- QR premio evento: 100 Pokédollari, riscattabile una sola volta per allenatore.
create table public.event_reward_codes (
 id uuid primary key default gen_random_uuid(), token text unique not null check(length(token)>=24),
 event_name text not null check(length(trim(event_name)) between 2 and 100), amount bigint not null default 100 check(amount=100),
 is_active boolean not null default true, created_by uuid not null references public.profiles(id),
 created_at timestamptz not null default now(), disabled_at timestamptz
);
create table public.event_reward_claims (
 id uuid primary key default gen_random_uuid(), reward_code_id uuid not null references public.event_reward_codes(id),
 trainer_id uuid not null references public.profiles(id), amount bigint not null check(amount=100),
 transaction_id uuid unique not null references public.transactions(id), claimed_at timestamptz not null default now(),
 unique(reward_code_id,trainer_id)
);
create index event_rewards_active_idx on public.event_reward_codes(is_active,created_at desc);
create index event_reward_claims_trainer_idx on public.event_reward_claims(trainer_id,claimed_at desc);
alter table public.event_reward_codes enable row level security;
alter table public.event_reward_claims enable row level security;
create policy event_rewards_admin_read on public.event_reward_codes for select to authenticated using(public.is_admin());
create policy event_claims_own_read on public.event_reward_claims for select to authenticated using(trainer_id=public.my_profile_id() or public.is_admin());
grant select on public.event_reward_codes,public.event_reward_claims to authenticated;

create or replace function public.generate_event_reward_code(p_event_name text)
returns table(id uuid,token text,event_name text,amount bigint,created_at timestamptz)
language plpgsql security definer set search_path=public,extensions as $$
declare v_admin uuid:=public.my_profile_id(); v_reward public.event_reward_codes;
begin
 if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
 if length(trim(p_event_name)) not between 2 and 100 then raise exception 'INVALID_EVENT_NAME'; end if;
 insert into public.event_reward_codes(token,event_name,created_by)
 values('RWD-'||upper(encode(gen_random_bytes(18),'hex')),trim(p_event_name),v_admin) returning * into v_reward;
 id:=v_reward.id;token:=v_reward.token;event_name:=v_reward.event_name;amount:=v_reward.amount;created_at:=v_reward.created_at;return next;
end$$;

create or replace function public.claim_event_reward(p_token text,p_operation_id uuid)
returns table(new_balance bigint,amount bigint,event_name text)
language plpgsql security definer set search_path=public,extensions as $$
declare v_trainer public.profiles; v_reward public.event_reward_codes; v_claim public.event_reward_claims; v_tx public.transactions;
begin
 select * into v_trainer from public.profiles where user_id=auth.uid() and is_active for update;
 if not found then raise exception 'TRAINER_NOT_FOUND_OR_INACTIVE'; end if;
 select * into v_reward from public.event_reward_codes where upper(trim(token))=upper(trim(p_token)) for update;
 if not found or not v_reward.is_active then raise exception 'REWARD_NOT_AVAILABLE'; end if;
 select * into v_claim from public.event_reward_claims where reward_code_id=v_reward.id and trainer_id=v_trainer.id;
 if found then raise exception 'REWARD_ALREADY_CLAIMED'; end if;
 update public.profiles set balance=balance+v_reward.amount,updated_at=now() where profiles.id=v_trainer.id;
 insert into public.transactions(operation_id,receiver_id,amount,description,transaction_type,created_by)
 values(p_operation_id,v_trainer.id,v_reward.amount,'Premio partecipazione: '||v_reward.event_name,'admin_credit',v_trainer.id) returning * into v_tx;
 insert into public.event_reward_claims(reward_code_id,trainer_id,amount,transaction_id)
 values(v_reward.id,v_trainer.id,v_reward.amount,v_tx.id);
 new_balance:=v_trainer.balance+v_reward.amount;amount:=v_reward.amount;event_name:=v_reward.event_name;return next;
exception when unique_violation then raise exception 'REWARD_ALREADY_CLAIMED';
end$$;

revoke all on function public.generate_event_reward_code(text),public.claim_event_reward(text,uuid) from public;
grant execute on function public.generate_event_reward_code(text),public.claim_event_reward(text,uuid) to authenticated;
revoke insert,update,delete on public.event_reward_codes,public.event_reward_claims from anon,authenticated;
