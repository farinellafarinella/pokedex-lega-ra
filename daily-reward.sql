-- Premio giornaliero: 50 Pokédollari una volta al giorno per account.
create table if not exists public.daily_rewards (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.profiles(id) on delete cascade,
  reward_date date not null,
  amount bigint not null default 50 check (amount > 0),
  transaction_id uuid unique references public.transactions(id),
  claimed_at timestamptz not null default now(),
  unique (trainer_id, reward_date)
);

alter table public.daily_rewards enable row level security;
drop policy if exists daily_rewards_own_read on public.daily_rewards;
create policy daily_rewards_own_read
on public.daily_rewards for select to authenticated
using (trainer_id = public.my_profile_id() or public.is_admin());
grant select on public.daily_rewards to authenticated;

create or replace function public.claim_daily_reward()
returns table(claimed boolean, amount bigint, new_balance bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trainer public.profiles;
  v_reward public.daily_rewards;
  v_transaction public.transactions;
  v_today date := (now() at time zone 'Europe/Rome')::date;
begin
  select * into v_trainer
  from public.profiles
  where user_id = auth.uid() and is_active
  for update;

  if not found then
    raise exception 'NOT_FOUND_OR_INACTIVE';
  end if;

  insert into public.daily_rewards(trainer_id, reward_date, amount)
  values(v_trainer.id, v_today, 50)
  on conflict (trainer_id, reward_date) do nothing
  returning * into v_reward;

  if not found then
    return query select false, 0::bigint, v_trainer.balance;
    return;
  end if;

  update public.profiles
  set balance = balance + v_reward.amount, updated_at = now()
  where id = v_trainer.id
  returning balance into v_trainer.balance;

  insert into public.transactions(
    operation_id, receiver_id, amount, description, transaction_type, created_by
  ) values (
    gen_random_uuid(), v_trainer.id, v_reward.amount,
    'Premio accesso giornaliero', 'admin_credit', v_trainer.id
  ) returning * into v_transaction;

  update public.daily_rewards
  set transaction_id = v_transaction.id
  where id = v_reward.id;

  return query select true, v_reward.amount, v_trainer.balance;
end;
$$;

revoke all on function public.claim_daily_reward() from public;
grant execute on function public.claim_daily_reward() to authenticated;
