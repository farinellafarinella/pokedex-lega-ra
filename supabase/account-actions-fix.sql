-- Consente anche all'account amministratore attivo di provare cambio nome e QR premio.
create or replace function public.update_my_trainer_name(p_trainer_name text)
returns table(trainer_name text,updated_at timestamptz)
language plpgsql security definer set search_path=public as $$
declare v_name text:=trim(p_trainer_name); v_profile public.profiles;
begin
 if auth.uid() is null then raise exception 'AUTHENTICATION_REQUIRED'; end if;
 if length(v_name) not between 2 and 60 then raise exception 'INVALID_TRAINER_NAME'; end if;
 if v_name !~ '^[[:alnum:]][[:alnum:] ''._-]*$' then raise exception 'INVALID_TRAINER_NAME'; end if;
 update public.profiles set trainer_name=v_name,updated_at=now()
 where user_id=auth.uid() and is_active returning * into v_profile;
 if not found then raise exception 'PROFILE_NOT_FOUND_OR_INACTIVE'; end if;
 trainer_name:=v_profile.trainer_name;updated_at:=v_profile.updated_at;return next;
end$$;
revoke all on function public.update_my_trainer_name(text) from public;
grant execute on function public.update_my_trainer_name(text) to authenticated;

create or replace function public.claim_event_reward(p_token text,p_operation_id uuid)
returns table(new_balance bigint,amount bigint,event_name text)
language plpgsql security definer set search_path=public,extensions as $$
declare v_trainer public.profiles; v_reward public.event_reward_codes; v_tx public.transactions;
begin
 select * into v_trainer from public.profiles where user_id=auth.uid() and is_active for update;
 if not found then raise exception 'PROFILE_NOT_FOUND_OR_INACTIVE'; end if;
 select * into v_reward from public.event_reward_codes where upper(trim(token))=upper(trim(p_token)) for update;
 if not found or not v_reward.is_active then raise exception 'REWARD_NOT_AVAILABLE'; end if;
 if exists(select 1 from public.event_reward_claims where reward_code_id=v_reward.id and trainer_id=v_trainer.id) then
   raise exception 'REWARD_ALREADY_CLAIMED';
 end if;
 update public.profiles set balance=balance+v_reward.amount,updated_at=now() where id=v_trainer.id;
 insert into public.transactions(operation_id,receiver_id,amount,description,transaction_type,created_by)
 values(p_operation_id,v_trainer.id,v_reward.amount,'Premio partecipazione: '||v_reward.event_name,'admin_credit',v_trainer.id) returning * into v_tx;
 insert into public.event_reward_claims(reward_code_id,trainer_id,amount,transaction_id)
 values(v_reward.id,v_trainer.id,v_reward.amount,v_tx.id);
 new_balance:=v_trainer.balance+v_reward.amount;amount:=v_reward.amount;event_name:=v_reward.event_name;return next;
exception when unique_violation then raise exception 'REWARD_ALREADY_CLAIMED';
end$$;
revoke all on function public.claim_event_reward(text,uuid) from public;
grant execute on function public.claim_event_reward(text,uuid) to authenticated;
