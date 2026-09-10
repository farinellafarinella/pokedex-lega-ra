-- QR palestra per assegnare una medaglia una sola volta a ogni allenatore.
create table public.gym_badge_codes (
 id uuid primary key default gen_random_uuid(), token text unique not null check(length(token)>=24),
 badge_id uuid not null references public.badges(id), label text not null check(length(trim(label)) between 2 and 100),
 is_active boolean not null default true, created_by uuid not null references public.profiles(id),
 created_at timestamptz not null default now(), disabled_at timestamptz
);
create table public.gym_badge_claims (
 id uuid primary key default gen_random_uuid(), badge_code_id uuid not null references public.gym_badge_codes(id),
 trainer_id uuid not null references public.profiles(id), trainer_badge_id uuid not null references public.trainer_badges(id),
 claimed_at timestamptz not null default now(), unique(badge_code_id,trainer_id)
);
alter table public.gym_badge_codes enable row level security;
alter table public.gym_badge_claims enable row level security;
create policy gym_badge_codes_admin_read on public.gym_badge_codes for select to authenticated using(public.is_admin());
create policy gym_badge_claims_own_read on public.gym_badge_claims for select to authenticated using(trainer_id=public.my_profile_id() or public.is_admin());
grant select on public.gym_badge_codes,public.gym_badge_claims to authenticated;

create or replace function public.generate_gym_badge_code(p_badge_id uuid,p_label text)
returns table(id uuid,token text,label text,badge_name text,created_at timestamptz)
language plpgsql security definer set search_path=public,extensions as $$
declare v_admin uuid:=public.my_profile_id(); v_code public.gym_badge_codes; v_badge public.badges;
begin
 if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
 select * into v_badge from public.badges where badges.id=p_badge_id;
 if not found then raise exception 'BADGE_NOT_FOUND'; end if;
 insert into public.gym_badge_codes(token,badge_id,label,created_by)
 values('BDG-'||upper(encode(gen_random_bytes(18),'hex')),p_badge_id,trim(p_label),v_admin) returning * into v_code;
 id:=v_code.id;token:=v_code.token;label:=v_code.label;badge_name:=v_badge.name;created_at:=v_code.created_at;return next;
end$$;

create or replace function public.claim_gym_badge(p_token text)
returns table(badge_name text,earned_at timestamptz)
language plpgsql security definer set search_path=public,extensions as $$
declare v_profile public.profiles; v_code public.gym_badge_codes; v_trainer_badge public.trainer_badges; v_badge public.badges;
begin
 select * into v_profile from public.profiles where user_id=auth.uid() and is_active for update;
 if not found then raise exception 'TRAINER_NOT_FOUND_OR_INACTIVE'; end if;
 select * into v_code from public.gym_badge_codes where upper(trim(token))=upper(trim(p_token)) for update;
 if not found or not v_code.is_active then raise exception 'BADGE_CODE_NOT_AVAILABLE'; end if;
 if exists(select 1 from public.trainer_badges where trainer_id=v_profile.id and badge_id=v_code.badge_id) then raise exception 'BADGE_ALREADY_EARNED'; end if;
 insert into public.trainer_badges(trainer_id,badge_id,assigned_by)
 values(v_profile.id,v_code.badge_id,v_code.created_by) returning * into v_trainer_badge;
 insert into public.gym_badge_claims(badge_code_id,trainer_id,trainer_badge_id)
 values(v_code.id,v_profile.id,v_trainer_badge.id);
 select * into v_badge from public.badges where id=v_code.badge_id;
 badge_name:=v_badge.name;earned_at:=v_trainer_badge.earned_at;return next;
exception when unique_violation then raise exception 'BADGE_ALREADY_EARNED';
end$$;

revoke all on function public.generate_gym_badge_code(uuid,text),public.claim_gym_badge(text) from public;
grant execute on function public.generate_gym_badge_code(uuid,text),public.claim_gym_badge(text) to authenticated;
revoke insert,update,delete on public.gym_badge_codes,public.gym_badge_claims from anon,authenticated;
