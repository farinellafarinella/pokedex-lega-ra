-- Attivazione Pokédex tramite QR. Eseguire dopo schema.sql.
create type public.pokedex_status as enum ('available','activated','disabled','replaced');

create table public.pokedex_devices (
 id uuid primary key default gen_random_uuid(),
 activation_token text unique not null check(length(activation_token)>=24),
 status public.pokedex_status not null default 'available',
 trainer_id uuid references public.profiles(id),
 created_at timestamptz not null default now(), activated_at timestamptz, disabled_at timestamptz, replaced_at timestamptz,
 replaced_by_pokedex_id uuid references public.pokedex_devices(id), created_by uuid not null references public.profiles(id), updated_at timestamptz not null default now(),
 check((status='activated' and trainer_id is not null and activated_at is not null) or status<>'activated')
);
-- Un solo Pokédex attivo per allenatore; i device sostituiti restano nello storico.
create unique index pokedex_one_active_per_trainer on public.pokedex_devices(trainer_id) where status='activated';
create index pokedex_token_idx on public.pokedex_devices(activation_token);
create index pokedex_status_idx on public.pokedex_devices(status);
create index pokedex_trainer_idx on public.pokedex_devices(trainer_id);

create table public.pokedex_activation_attempts (
 id bigint generated always as identity primary key, token_hash text not null, actor_user_id uuid references auth.users(id),
 result text not null, attempted_at timestamptz not null default now()
);
create index pokedex_attempt_actor_idx on public.pokedex_activation_attempts(actor_user_id,attempted_at desc);
create index pokedex_attempt_hash_idx on public.pokedex_activation_attempts(token_hash,attempted_at desc);

create table public.pokedex_admin_log (
 id uuid primary key default gen_random_uuid(), pokedex_id uuid references public.pokedex_devices(id) on delete set null,
 admin_id uuid not null references public.profiles(id), action text not null, details jsonb not null default '{}', created_at timestamptz not null default now()
);

alter table public.pokedex_devices enable row level security;
alter table public.pokedex_activation_attempts enable row level security;
alter table public.pokedex_admin_log enable row level security;
create policy pokedex_admin_read on public.pokedex_devices for select to authenticated using(public.is_admin());
create policy pokedex_admin_log_read on public.pokedex_admin_log for select to authenticated using(public.is_admin());
-- Nessuna policy INSERT/UPDATE client: tutte le modifiche passano dalle RPC SECURITY DEFINER.

create sequence if not exists public.trainer_code_seq start 1001;

create or replace function public.generate_pokedex_devices(p_quantity integer)
returns table(id uuid,activation_token text,status public.pokedex_status,created_at timestamptz)
language plpgsql security definer set search_path=public,extensions as $$
declare v_admin uuid:=public.my_profile_id(); v_i integer; v_device pokedex_devices;
begin
 if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
 if p_quantity not between 1 and 100 then raise exception 'INVALID_QUANTITY'; end if;
 for v_i in 1..p_quantity loop
   insert into pokedex_devices(activation_token,created_by)
   values('PDX-'||upper(encode(gen_random_bytes(18),'hex')),v_admin) returning * into v_device;
   insert into pokedex_admin_log(pokedex_id,admin_id,action) values(v_device.id,v_admin,'generated');
   id:=v_device.id; activation_token:=v_device.activation_token; status:=v_device.status; created_at:=v_device.created_at; return next;
 end loop;
end$$;

-- Risolve una scansione senza esporre il token nei log. In produzione aggiungere rate limiting per IP nell'Edge Function/reverse proxy.
create or replace function public.resolve_pokedex_activation(p_activation_token text)
returns table(device_status public.pokedex_status,trainer_code text)
language plpgsql security definer set search_path=public,extensions as $$
declare v_device pokedex_devices; v_hash text:=encode(digest(coalesce(p_activation_token,''),'sha256'),'hex'); v_exists boolean:=false;
begin
 if (select count(*) from pokedex_activation_attempts where token_hash=v_hash and attempted_at>now()-interval '15 minutes')>=20 then
   raise exception 'TOO_MANY_ATTEMPTS';
 end if;
 select * into v_device from pokedex_devices where activation_token=p_activation_token;
 v_exists:=found;
 insert into pokedex_activation_attempts(token_hash,actor_user_id,result) values(v_hash,auth.uid(),case when v_exists then v_device.status::text else 'invalid' end);
 if not v_exists then return; end if;
 device_status:=v_device.status;
 if v_device.status='activated' then select p.trainer_code into trainer_code from profiles p where p.id=v_device.trainer_id; end if;
 return next;
end$$;

create or replace function public.activate_pokedex(p_activation_token text,p_trainer_name text)
returns table(trainer_id uuid,trainer_code text)
language plpgsql security definer set search_path=public,extensions as $$
declare v_device pokedex_devices; v_profile profiles; v_hash text:=encode(digest(coalesce(p_activation_token,''),'sha256'),'hex'); v_code text;
begin
 if auth.uid() is null then raise exception 'AUTHENTICATION_REQUIRED'; end if;
 if length(trim(p_trainer_name)) not between 2 and 60 then raise exception 'INVALID_TRAINER_NAME'; end if;
 if (select count(*) from pokedex_activation_attempts where actor_user_id=auth.uid() and attempted_at>now()-interval '15 minutes')>=10 then raise exception 'TOO_MANY_ATTEMPTS'; end if;
 select * into v_device from pokedex_devices where activation_token=p_activation_token for update;
 if not found then insert into pokedex_activation_attempts(token_hash,actor_user_id,result) values(v_hash,auth.uid(),'invalid'); raise exception 'INVALID_POKEDEX'; end if;
 if v_device.status<>'available' then insert into pokedex_activation_attempts(token_hash,actor_user_id,result) values(v_hash,auth.uid(),v_device.status::text); raise exception 'POKEDEX_NOT_AVAILABLE'; end if;
 if exists(select 1 from profiles where user_id=auth.uid()) or exists(select 1 from pokedex_devices d join profiles p on p.id=d.trainer_id where p.user_id=auth.uid() and d.status='activated') then raise exception 'ACCOUNT_ALREADY_ASSOCIATED'; end if;
 v_code:='TR-'||lpad(nextval('trainer_code_seq')::text,4,'0');
 insert into profiles(user_id,trainer_code,trainer_name,registration_date,ranking_points,balance,role,is_active)
 values(auth.uid(),v_code,trim(p_trainer_name),current_date,0,coalesce(current_setting('app.default_initial_balance',true),'1000')::bigint,'trainer',true) returning * into v_profile;
 update pokedex_devices set status='activated',trainer_id=v_profile.id,activated_at=now(),updated_at=now() where id=v_device.id;
 insert into pokedex_activation_attempts(token_hash,actor_user_id,result) values(v_hash,auth.uid(),'activated');
 trainer_id:=v_profile.id; trainer_code:=v_profile.trainer_code; return next;
end$$;

create or replace function public.replace_pokedex(p_pokedex_id uuid)
returns table(id uuid,activation_token text) language plpgsql security definer set search_path=public,extensions as $$
declare v_admin uuid:=public.my_profile_id(); v_old pokedex_devices; v_new pokedex_devices;
begin
 if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
 select * into v_old from pokedex_devices where pokedex_devices.id=p_pokedex_id for update;
 if not found or v_old.status<>'activated' then raise exception 'POKEDEX_NOT_REPLACEABLE'; end if;
 update pokedex_devices set status='replaced',replaced_at=now(),updated_at=now() where pokedex_devices.id=v_old.id;
 insert into pokedex_devices(activation_token,status,trainer_id,activated_at,created_by)
 values('PDX-'||upper(encode(gen_random_bytes(18),'hex')),'activated',v_old.trainer_id,now(),v_admin) returning * into v_new;
 update pokedex_devices set replaced_by_pokedex_id=v_new.id where pokedex_devices.id=v_old.id;
 insert into pokedex_admin_log(pokedex_id,admin_id,action,details) values(v_old.id,v_admin,'replaced',jsonb_build_object('replacement_id',v_new.id));
 id:=v_new.id;activation_token:=v_new.activation_token;return next;
end$$;

create or replace function public.delete_unassigned_pokedex(p_pokedex_id uuid)
returns boolean language plpgsql security definer set search_path=public,extensions as $$
declare v_admin uuid:=public.my_profile_id(); v_device pokedex_devices;
begin
 if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
 select * into v_device from pokedex_devices where id=p_pokedex_id for update;
 if not found then raise exception 'POKEDEX_NOT_FOUND'; end if;
 if v_device.status not in ('available','disabled') or v_device.trainer_id is not null then raise exception 'POKEDEX_CANNOT_BE_DELETED'; end if;
 insert into pokedex_admin_log(pokedex_id,admin_id,action,details)
 values(v_device.id,v_admin,'deleted',jsonb_build_object('token_hash',encode(digest(v_device.activation_token,'sha256'),'hex'),'previous_status',v_device.status));
 delete from pokedex_devices where id=v_device.id;
 return true;
end$$;

revoke all on function public.generate_pokedex_devices(integer),public.resolve_pokedex_activation(text),public.activate_pokedex(text,text),public.replace_pokedex(uuid),public.delete_unassigned_pokedex(uuid) from public;
grant execute on function public.resolve_pokedex_activation(text) to anon,authenticated;
grant execute on function public.activate_pokedex(text,text) to authenticated;
grant execute on function public.generate_pokedex_devices(integer),public.replace_pokedex(uuid),public.delete_unassigned_pokedex(uuid) to authenticated;
revoke select,insert,update,delete on public.pokedex_devices,public.pokedex_activation_attempts,public.pokedex_admin_log from anon,authenticated;
-- Gli amministratori autenticati possono leggere i device grazie alla policy pokedex_admin_read.
grant select on public.pokedex_devices to authenticated;
