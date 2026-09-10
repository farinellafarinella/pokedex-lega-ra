-- Consente anche all'account amministratore attivo di provare i QR medaglia.
create or replace function public.claim_gym_badge(p_token text)
returns table(badge_name text,earned_at timestamptz)
language plpgsql security definer set search_path=public,extensions as $$
declare v_profile public.profiles; v_code public.gym_badge_codes; v_trainer_badge public.trainer_badges; v_badge public.badges;
begin
 select * into v_profile from public.profiles where user_id=auth.uid() and is_active for update;
 if not found then raise exception 'PROFILE_NOT_FOUND_OR_INACTIVE'; end if;
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
revoke all on function public.claim_gym_badge(text) from public;
grant execute on function public.claim_gym_badge(text) to authenticated;
