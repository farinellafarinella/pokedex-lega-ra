-- Selected-recipient Pokémon gifts. Apply after the existing team and Route battle schema.
begin;
create table if not exists public.route_gift_batches(
 id uuid primary key,admin_user uuid not null references auth.users(id),species_id integer not null references public.route_pokemon_species(id),
 level integer not null check(level between 1 and 100),recipients uuid[] not null,created_at timestamptz not null default now()
);
create table if not exists public.route_pokemon_gifts(
 id uuid primary key default gen_random_uuid(),batch_id uuid not null references public.route_gift_batches(id),
 user_id uuid not null references auth.users(id),qr_token text not null unique references public.route_pokemon_qr(token),
 applied_at timestamptz,popup_seen_at timestamptz,created_at timestamptz not null default now(),unique(batch_id,user_id)
);
alter table public.route_gift_batches enable row level security;
alter table public.route_pokemon_gifts enable row level security;
revoke all on public.route_gift_batches,public.route_pokemon_gifts from public,anon,authenticated;

create or replace function public.route_deliver_pokemon_gifts(p_user uuid)
returns void language plpgsql security definer set search_path='' as $$
declare g public.starter_games%rowtype;gift record;member jsonb;
begin
 perform 1 from public.profiles where user_id=p_user and is_active for update;
 if not found then return;end if;
 select * into g from public.starter_games where user_id=p_user for update;
 if not found or g.state#>'{profile,starter}' is null or g.state#>'{profile,starter}'='null'::jsonb then return;end if;
 -- Never change the roster of a battle already in progress, including older Arena sessions.
 if exists(select 1 from public.route_encounters where user_id=p_user and not saved)
 or (g.state->'battle' is not null and g.state->'battle'<>'null'::jsonb and coalesce(g.state#>>'{battle,result}','')='') then return;end if;
 if jsonb_array_length(g.team)=0 then g.team:=public.route_sync_starter(g.team,g.state);end if;
 for gift in select x.id,x.qr_token,q.species_id,q.level,q.source from public.route_pokemon_gifts x
  join public.route_pokemon_qr q on q.token=x.qr_token
  where x.user_id=p_user and x.applied_at is null order by x.created_at,x.id for update of x,q loop
  exit when g.team_pending is not null;
  member:=public.route_new_pokemon(gift.species_id,gift.level,gift.source,false);
  if jsonb_array_length(g.team)<6 then
   g.team:=g.team||jsonb_build_array(member);
   update public.route_pokemon_qr set reserved_by=null,claimed_by=p_user,claimed_at=now() where token=gift.qr_token;
  else
   -- Reuse the existing protected, explicit replacement flow. No member is removed here.
   g.team_pending:=jsonb_build_object('pokemon',member,'token',gift.qr_token);
  end if;
  update public.route_pokemon_gifts set applied_at=now() where id=gift.id;
 end loop;
 update public.starter_games set team=g.team,team_pending=g.team_pending where user_id=p_user;
end $$;

create or replace function public.admin_send_pokemon_gift(p_operation uuid,p_recipients uuid[],p_species integer,p_level integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();recipient record;targets uuid[];old public.route_gift_batches%rowtype;token_value text;
begin
 if not exists(select 1 from public.profiles where user_id=uid and role='admin' and is_active) then raise exception 'ADMIN_REQUIRED';end if;
 if p_operation is null or p_level is null or p_level not between 1 and 100
 or not exists(select 1 from public.route_pokemon_species where id=p_species) then raise exception 'INVALID_POKEMON';end if;
 if p_recipients is null or cardinality(p_recipients) not between 1 and 100 then raise exception 'SELECT_RECIPIENTS';end if;
 select array_agg(distinct x order by x) into targets from unnest(p_recipients) x;
 if array_position(targets,null) is not null or cardinality(targets)<>cardinality(p_recipients) then raise exception 'INVALID_RECIPIENTS';end if;
 perform pg_advisory_xact_lock(hashtextextended('pokemon-gift:'||p_operation::text,0));
 select * into old from public.route_gift_batches where id=p_operation;
 if found then
  if old.admin_user<>uid or old.species_id<>p_species or old.level<>p_level or old.recipients<>targets then raise exception 'OPERATION_MISMATCH';end if;
  return jsonb_build_object('id',old.id,'count',cardinality(targets),'replayed',true);
 end if;
 if (select count(*) from public.profiles where id=any(targets) and is_active)<>cardinality(targets) then raise exception 'INVALID_RECIPIENTS';end if;
 insert into public.route_gift_batches(id,admin_user,species_id,level,recipients) values(p_operation,uid,p_species,p_level,targets);
 -- Global recipient lock order avoids deadlocks between overlapping admin sends.
 for recipient in select id,user_id from public.profiles where id=any(targets) order by user_id for update loop
  if not exists(select 1 from public.profiles where id=recipient.id and is_active) then raise exception 'INVALID_RECIPIENTS';end if;
  token_value:='GIFT-'||upper(gen_random_uuid()::text);
  insert into public.route_pokemon_qr(token,species_id,level,source,reserved_by) values(token_value,p_species,p_level,'ADMIN_GIFT',recipient.user_id);
  insert into public.route_pokemon_gifts(batch_id,user_id,qr_token) values(p_operation,recipient.user_id,token_value);
  perform public.route_deliver_pokemon_gifts(recipient.user_id);
  insert into public.notifications(trainer_id,title,body,notification_type,target_hash)
   values(recipient.id,'Hai ricevuto un regalo','Hai ricevuto un regalo, controlla la tua squadra Pokémon','pokemon_gift','#my-team');
 end loop;
 return jsonb_build_object('id',p_operation,'count',cardinality(targets),'replayed',false);
end $$;

create or replace function public.get_admin_pokemon_gifts()
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.profiles where user_id=auth.uid() and is_active and role='admin') then raise exception 'ADMIN_REQUIRED';end if;
 return jsonb_build_object(
 'trainers',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',trainer_name,'code',trainer_code) order by trainer_name,trainer_code),'[]') from public.profiles where is_active),
 'history',(select coalesce(jsonb_agg(to_jsonb(h)),'[]') from (
  select b.id,b.species_id,b.level,b.created_at,cardinality(b.recipients) as count,
   (select jsonb_agg(jsonb_build_object('name',p.trainer_name,'code',p.trainer_code) order by p.trainer_name) from public.profiles p where p.id=any(b.recipients)) as recipients
  from public.route_gift_batches b where admin_user=auth.uid() order by created_at desc,id limit 30
 ) h));
end $$;

create or replace function public.get_my_pokemon_gifts()
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.profiles where user_id=auth.uid() and is_active) then raise exception 'NOT_AUTHORIZED';end if;
 perform public.route_deliver_pokemon_gifts(auth.uid());
 return coalesce((select jsonb_agg(jsonb_build_object('id',g.id,'speciesId',q.species_id,'level',q.level,
 'unseen',g.popup_seen_at is null,'status',case when q.claimed_by=auth.uid() then 'delivered' when g.applied_at is not null then 'pending' else 'queued' end) order by g.created_at,g.id)
 from public.route_pokemon_gifts g join public.route_pokemon_qr q on q.token=g.qr_token
 where g.user_id=auth.uid() and (g.popup_seen_at is null or q.claimed_by is null)),'[]');
end $$;

create or replace function public.ack_pokemon_gifts(p_ids uuid[])
returns void language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.profiles where user_id=auth.uid() and is_active) then raise exception 'NOT_AUTHORIZED';end if;
 update public.route_pokemon_gifts set popup_seen_at=coalesce(popup_seen_at,now()) where user_id=auth.uid() and id=any(p_ids);
end $$;
revoke all on function public.route_deliver_pokemon_gifts(uuid),public.admin_send_pokemon_gift(uuid,uuid[],integer,integer),public.get_admin_pokemon_gifts(),public.get_my_pokemon_gifts(),public.ack_pokemon_gifts(uuid[]) from public,anon,authenticated;
grant execute on function public.admin_send_pokemon_gift(uuid,uuid[],integer,integer),public.get_admin_pokemon_gifts(),public.get_my_pokemon_gifts(),public.ack_pokemon_gifts(uuid[]) to authenticated;
notify pgrst,'reload schema';
commit;
