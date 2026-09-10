-- Centro notifiche interno e sottoscrizioni Web Push.
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  notification_type text not null default 'info',
  target_hash text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.notifications enable row level security;
alter table public.push_subscriptions enable row level security;
drop policy if exists notifications_own_read on public.notifications;
drop policy if exists notifications_own_update on public.notifications;
drop policy if exists subscriptions_own_all on public.push_subscriptions;
create policy notifications_own_read on public.notifications for select to authenticated using(trainer_id=public.my_profile_id() or public.is_admin());
create policy notifications_own_update on public.notifications for update to authenticated using(trainer_id=public.my_profile_id()) with check(trainer_id=public.my_profile_id());
create policy subscriptions_own_all on public.push_subscriptions for all to authenticated using(trainer_id=public.my_profile_id()) with check(trainer_id=public.my_profile_id());
grant select,update on public.notifications to authenticated;
grant select,insert,update,delete on public.push_subscriptions to authenticated;

create or replace function public.notify_received_pokedollars() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  if new.receiver_id is not null then
    insert into notifications(trainer_id,title,body,notification_type,target_hash)
    values(new.receiver_id,'Pokédollari ricevuti','Hai ricevuto '||new.amount||' Pokédollari.','balance','#transactions');
  end if;
  return new;
end$$;
drop trigger if exists transactions_notify_receiver on public.transactions;
create trigger transactions_notify_receiver after insert on public.transactions for each row execute function public.notify_received_pokedollars();

create or replace function public.notify_badge_earned() returns trigger
language plpgsql security definer set search_path=public as $$
declare v_name text;
begin
  select name into v_name from badges where id=new.badge_id;
  insert into notifications(trainer_id,title,body,notification_type,target_hash)
  values(new.trainer_id,'Nuova medaglia','Hai conquistato la medaglia '||coalesce(v_name,'Pokémon')||'.','badge','#dashboard');
  return new;
end$$;
drop trigger if exists trainer_badges_notify on public.trainer_badges;
create trigger trainer_badges_notify after insert on public.trainer_badges for each row execute function public.notify_badge_earned();

create or replace function public.notify_ticket_change() returns trigger
language plpgsql security definer set search_path=public as $$
declare v_gym text;
begin
  select name into v_gym from gyms where id=new.gym_id;
  if tg_op='INSERT' then
    insert into notifications(trainer_id,title,body,notification_type,target_hash)
    values(new.trainer_id,'Biglietto acquistato','Biglietto confermato per '||v_gym||'.','ticket','#my-tickets');
  elsif new.ticket_status is distinct from old.ticket_status then
    insert into notifications(trainer_id,title,body,notification_type,target_hash)
    values(new.trainer_id,'Biglietto aggiornato','Il biglietto per '||v_gym||' è ora: '||new.ticket_status||'.','ticket','#my-tickets');
  end if;
  return new;
end$$;
drop trigger if exists gym_ticket_notify on public.gym_registrations;
create trigger gym_ticket_notify after insert or update on public.gym_registrations for each row execute function public.notify_ticket_change();

create or replace function public.notify_new_gym() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  insert into notifications(trainer_id,title,body,notification_type,target_hash)
  select id,'Nuova palestra',new.name||' è stata aggiunta al calendario.','event','#gym' from profiles where role='trainer' and is_active;
  return new;
end$$;
drop trigger if exists gyms_notify_new on public.gyms;
create trigger gyms_notify_new after insert on public.gyms for each row execute function public.notify_new_gym();

create or replace function public.notify_new_rocket_event() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  if new.is_active then
    insert into notifications(trainer_id,title,body,notification_type,target_hash)
    select id,'Nuovo evento Team Rocket',new.name||' è disponibile nella Lista Rocket.','event','#rocket-list' from profiles where role='trainer' and is_active;
  end if;
  return new;
end$$;
drop trigger if exists rocket_events_notify_new on public.rocket_events;
create trigger rocket_events_notify_new after insert on public.rocket_events for each row execute function public.notify_new_rocket_event();
