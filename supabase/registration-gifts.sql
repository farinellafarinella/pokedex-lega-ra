-- Regali di benvenuto tramite codice: scelta con scorte e QR di consegna.
-- Eseguire dopo schema.sql e notifications.sql.

create table if not exists public.gift_campaigns (
  id uuid primary key default gen_random_uuid(),
  gift_code text unique not null check (gift_code ~ '^[A-Z0-9_-]{4,32}$'),
  campaign_name text not null check (char_length(campaign_name) between 3 and 80),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid not null references public.profiles(id)
);

create table if not exists public.gift_options (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.gift_campaigns(id) on delete cascade,
  pokemon_name text not null check (char_length(pokemon_name) between 2 and 40),
  initial_stock integer not null check (initial_stock >= 0),
  remaining_stock integer not null check (remaining_stock >= 0),
  display_order smallint not null check (display_order between 1 and 6),
  unique(campaign_id,pokemon_name),
  unique(campaign_id,display_order),
  check(remaining_stock <= initial_stock)
);

create table if not exists public.registration_gift_claims (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid unique not null references public.profiles(id) on delete cascade,
  campaign_id uuid not null references public.gift_campaigns(id),
  option_id uuid not null references public.gift_options(id),
  qr_token uuid unique not null default gen_random_uuid(),
  claim_status text not null default 'issued' check (claim_status in ('issued','redeemed')),
  claimed_at timestamptz not null default now(),
  redeemed_at timestamptz,
  redeemed_by uuid references public.profiles(id)
);

create index if not exists gift_options_campaign_idx on public.gift_options(campaign_id,display_order);
create index if not exists gift_claims_token_idx on public.registration_gift_claims(qr_token);

alter table public.gift_campaigns enable row level security;
alter table public.gift_options enable row level security;
alter table public.registration_gift_claims enable row level security;

drop policy if exists gift_campaigns_admin_read on public.gift_campaigns;
drop policy if exists gift_options_admin_read on public.gift_options;
drop policy if exists gift_claims_own_admin_read on public.registration_gift_claims;
create policy gift_campaigns_admin_read on public.gift_campaigns for select to authenticated using(public.is_admin());
create policy gift_options_admin_read on public.gift_options for select to authenticated using(public.is_admin());
create policy gift_claims_own_admin_read on public.registration_gift_claims for select to authenticated
using(trainer_id=public.my_profile_id() or public.is_admin());
grant select on public.gift_campaigns,public.gift_options,public.registration_gift_claims to authenticated;
revoke insert,update,delete on public.gift_campaigns,public.gift_options,public.registration_gift_claims from anon,authenticated;

create or replace function public.create_gift_campaign(
  p_gift_code text,
  p_campaign_name text,
  p_pokemon_names text[],
  p_stocks integer[]
)
returns uuid language plpgsql security definer set search_path=public as $$
declare
  v_campaign public.gift_campaigns;
  v_code text:=upper(trim(coalesce(p_gift_code,'')));
  v_index integer;
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  if v_code !~ '^[A-Z0-9_-]{4,32}$' then raise exception 'INVALID_CODE'; end if;
  if char_length(trim(coalesce(p_campaign_name,''))) not between 3 and 80 then raise exception 'INVALID_NAME'; end if;
  if array_length(p_pokemon_names,1)<>6 or array_length(p_stocks,1)<>6 then raise exception 'SIX_OPTIONS_REQUIRED'; end if;
  if exists(select 1 from unnest(p_stocks) s where s<0) then raise exception 'INVALID_STOCK'; end if;
  if exists(select 1 from unnest(p_pokemon_names) n where char_length(trim(n)) not between 2 and 40) then raise exception 'INVALID_POKEMON'; end if;

  insert into public.gift_campaigns(gift_code,campaign_name,created_by)
  values(v_code,trim(p_campaign_name),public.my_profile_id())
  returning * into v_campaign;
  for v_index in 1..6 loop
    insert into public.gift_options(campaign_id,pokemon_name,initial_stock,remaining_stock,display_order)
    values(v_campaign.id,trim(p_pokemon_names[v_index]),p_stocks[v_index],p_stocks[v_index],v_index);
  end loop;
  return v_campaign.id;
exception when unique_violation then raise exception 'CODE_ALREADY_EXISTS';
end $$;

create or replace function public.set_gift_campaign_active(p_campaign_id uuid,p_is_active boolean)
returns boolean language plpgsql security definer set search_path=public as $$
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  update public.gift_campaigns set is_active=p_is_active where id=p_campaign_id;
  if not found then raise exception 'CAMPAIGN_NOT_FOUND'; end if;
  return p_is_active;
end $$;

create or replace function public.delete_gift_campaign(p_campaign_id uuid)
returns integer language plpgsql security definer set search_path=public as $$
declare v_claims integer;
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  perform 1 from public.gift_campaigns where id=p_campaign_id for update;
  if not found then raise exception 'CAMPAIGN_NOT_FOUND'; end if;
  select count(*)::integer into v_claims
  from public.registration_gift_claims where campaign_id=p_campaign_id;
  delete from public.registration_gift_claims where campaign_id=p_campaign_id;
  delete from public.gift_campaigns where id=p_campaign_id;
  return v_claims;
end $$;

create or replace function public.preview_registration_gift(p_gift_code text)
returns table(
  campaign_id uuid,
  campaign_name text,
  option_id uuid,
  pokemon_name text,
  remaining_stock integer,
  display_order smallint
)
language plpgsql stable security definer set search_path=public as $$
declare
  v_profile public.profiles;
  v_campaign public.gift_campaigns;
begin
  select * into v_profile from public.profiles where user_id=auth.uid() and is_active;
  if not found then raise exception 'PROFILE_NOT_FOUND'; end if;
  if now()>v_profile.created_at+interval '7 days' and not public.is_admin() then raise exception 'REGISTRATION_WINDOW_EXPIRED'; end if;
  if exists(select 1 from public.registration_gift_claims where trainer_id=v_profile.id) then raise exception 'GIFT_ALREADY_CLAIMED'; end if;
  select * into v_campaign from public.gift_campaigns
  where gift_code=upper(trim(coalesce(p_gift_code,''))) and is_active;
  if not found then raise exception 'INVALID_OR_INACTIVE_CODE'; end if;
  return query
  select v_campaign.id,v_campaign.campaign_name,o.id,o.pokemon_name,o.remaining_stock,o.display_order
  from public.gift_options o
  where o.campaign_id=v_campaign.id and o.remaining_stock>0
  order by o.display_order;
end $$;

create or replace function public.claim_registration_gift(p_gift_code text,p_option_id uuid)
returns table(qr_token uuid,pokemon_name text,campaign_name text,claim_status text)
language plpgsql security definer set search_path=public as $$
declare
  v_profile public.profiles;
  v_campaign public.gift_campaigns;
  v_option public.gift_options;
  v_claim public.registration_gift_claims;
begin
  select * into v_profile from public.profiles where user_id=auth.uid() and is_active for update;
  if not found then raise exception 'PROFILE_NOT_FOUND'; end if;
  if now()>v_profile.created_at+interval '7 days' and not public.is_admin() then raise exception 'REGISTRATION_WINDOW_EXPIRED'; end if;
  if exists(select 1 from public.registration_gift_claims where trainer_id=v_profile.id) then raise exception 'GIFT_ALREADY_CLAIMED'; end if;
  select * into v_campaign from public.gift_campaigns
  where gift_code=upper(trim(coalesce(p_gift_code,''))) and is_active;
  if not found then raise exception 'INVALID_OR_INACTIVE_CODE'; end if;
  select * into v_option from public.gift_options
  where id=p_option_id and campaign_id=v_campaign.id for update;
  if not found then raise exception 'OPTION_NOT_FOUND'; end if;
  if v_option.remaining_stock<=0 then raise exception 'OUT_OF_STOCK'; end if;

  update public.gift_options set remaining_stock=remaining_stock-1 where id=v_option.id;
  insert into public.registration_gift_claims(trainer_id,campaign_id,option_id)
  values(v_profile.id,v_campaign.id,v_option.id) returning * into v_claim;
  insert into public.notifications(trainer_id,title,body,notification_type,target_hash)
  values(v_profile.id,'Regalo di benvenuto',
    'Hai scelto '||v_option.pokemon_name||'. Mostra il QR al primo evento.',
    'gift','#gifts');
  qr_token:=v_claim.qr_token;
  pokemon_name:=v_option.pokemon_name;
  campaign_name:=v_campaign.campaign_name;
  claim_status:=v_claim.claim_status;
  return next;
exception when unique_violation then raise exception 'GIFT_ALREADY_CLAIMED';
end $$;

create or replace function public.get_my_registration_gift()
returns table(
  qr_token uuid,
  pokemon_name text,
  campaign_name text,
  claim_status text,
  claimed_at timestamptz,
  redeemed_at timestamptz,
  eligible_until timestamptz
)
language sql stable security definer set search_path=public as $$
  select c.qr_token,o.pokemon_name,g.campaign_name,c.claim_status,c.claimed_at,c.redeemed_at,
         p.created_at+interval '7 days'
  from public.profiles p
  left join public.registration_gift_claims c on c.trainer_id=p.id
  left join public.gift_options o on o.id=c.option_id
  left join public.gift_campaigns g on g.id=c.campaign_id
  where p.user_id=auth.uid() and p.is_active
$$;

create or replace function public.redeem_registration_gift(p_qr_token uuid)
returns table(trainer_name text,trainer_code text,pokemon_name text,campaign_name text,claim_status text)
language plpgsql security definer set search_path=public as $$
declare
  v_claim public.registration_gift_claims;
  v_profile public.profiles;
  v_option public.gift_options;
  v_campaign public.gift_campaigns;
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  select * into v_claim from public.registration_gift_claims where qr_token=p_qr_token for update;
  if not found then raise exception 'GIFT_NOT_FOUND'; end if;
  select * into v_profile from public.profiles where id=v_claim.trainer_id;
  select * into v_option from public.gift_options where id=v_claim.option_id;
  select * into v_campaign from public.gift_campaigns where id=v_claim.campaign_id;
  if v_claim.claim_status='issued' then
    update public.registration_gift_claims
    set claim_status='redeemed',redeemed_at=now(),redeemed_by=public.my_profile_id()
    where id=v_claim.id returning * into v_claim;
  end if;
  trainer_name:=v_profile.trainer_name;
  trainer_code:=v_profile.trainer_code;
  pokemon_name:=v_option.pokemon_name;
  campaign_name:=v_campaign.campaign_name;
  claim_status:=v_claim.claim_status;
  return next;
end $$;

create or replace function public.admin_reset_my_gift_test()
returns boolean language plpgsql security definer set search_path=public as $$
declare
  v_claim public.registration_gift_claims;
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  select * into v_claim
  from public.registration_gift_claims
  where trainer_id=public.my_profile_id()
  for update;
  if not found then return false; end if;
  perform 1 from public.gift_options where id=v_claim.option_id for update;
  update public.gift_options
  set remaining_stock=remaining_stock+1
  where id=v_claim.option_id;
  delete from public.registration_gift_claims where id=v_claim.id;
  return true;
end $$;

revoke all on function public.create_gift_campaign(text,text,text[],integer[]) from public;
revoke all on function public.set_gift_campaign_active(uuid,boolean) from public;
revoke all on function public.delete_gift_campaign(uuid) from public;
revoke all on function public.preview_registration_gift(text) from public;
revoke all on function public.claim_registration_gift(text,uuid) from public;
revoke all on function public.get_my_registration_gift() from public;
revoke all on function public.redeem_registration_gift(uuid) from public;
revoke all on function public.admin_reset_my_gift_test() from public;
grant execute on function public.create_gift_campaign(text,text,text[],integer[]) to authenticated;
grant execute on function public.set_gift_campaign_active(uuid,boolean) to authenticated;
grant execute on function public.delete_gift_campaign(uuid) to authenticated;
grant execute on function public.preview_registration_gift(text) to authenticated;
grant execute on function public.claim_registration_gift(text,uuid) to authenticated;
grant execute on function public.get_my_registration_gift() to authenticated;
grant execute on function public.redeem_registration_gift(uuid) to authenticated;
grant execute on function public.admin_reset_my_gift_test() to authenticated;
