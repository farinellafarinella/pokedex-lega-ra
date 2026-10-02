-- Laboratorio Fossili online. Apply after Route battles/events.
-- Local beta inventories are deliberately not imported into the real economy.
begin;
create table if not exists public.fossil_lab_catalog(id text primary key,data jsonb not null);
create table if not exists public.fossil_lab_games(
 user_id uuid primary key references auth.users(id),revision bigint not null default 0,
 day date not null default (clock_timestamp() at time zone 'Europe/Rome')::date,
 attempts integer not null default 0 check(attempts between 0 and 3),found_fossil boolean not null default false,
 inventory jsonb not null default '{}',dig jsonb,pending uuid references public.route_encounter_tickets(id),
 last_loot jsonb not null default '[]',result jsonb
);
alter table public.fossil_lab_catalog enable row level security;
alter table public.fossil_lab_games enable row level security;
revoke all on public.fossil_lab_catalog,public.fossil_lab_games from public,anon,authenticated;
grant all on public.fossil_lab_catalog,public.fossil_lab_games to service_role;

create or replace function public.fossil_lab_snapshot(p_user uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare g public.fossil_lab_games%rowtype;visible jsonb:='[]';cell jsonb;obj jsonb;catalog jsonb;idx integer;x integer;y integer;layer integer;day_value date:=(clock_timestamp() at time zone 'Europe/Rome')::date;
begin
 select * into g from public.fossil_lab_games where user_id=p_user;
 if g.dig is not null then
  for idx in 0..129 loop
   layer:=(g.dig->'layers'->>idx)::integer;cell:=jsonb_build_object('depth',layer);
   if layer=0 then
    for obj in select value from jsonb_array_elements(g.dig->'objects') loop
     if obj->'cells' @> jsonb_build_array(idx) then
      select data into catalog from public.fossil_lab_catalog where id=obj->>'id';x:=idx%13-(obj->>'x')::integer;y:=idx/13-(obj->>'y')::integer;
      cell:=cell||jsonb_build_object('spriteX',(catalog->>'x')::integer+x,'spriteY',(catalog->>'y')::integer+y);exit;
     end if;
    end loop;
   end if;
   visible:=visible||jsonb_build_array(cell);
  end loop;
 end if;
 return jsonb_build_object('revision',g.revision,'balance',(select balance from public.profiles where user_id=p_user),'inventory',g.inventory,
 'attempts',case when g.day<day_value and (g.dig is null or (g.dig->>'done')::boolean) then 0 else g.attempts end,
 'team',coalesce((select team from public.starter_games where user_id=p_user),'[]'::jsonb),
 'dig',case when g.dig is not null then jsonb_build_object('cells',visible,'health',g.dig->'health','done',g.dig->'done','count',jsonb_array_length(g.dig->'objects')) end,
 'loot',g.last_loot,'result',g.result,'pending',(select jsonb_build_object('token',t.id,'speciesId',t.species_id,'level',t.level,'source',t.source) from public.route_encounter_tickets t where t.id=g.pending));
end $$;

create or replace function public.get_fossil_laboratory()
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.profiles where user_id=auth.uid() and is_active for update;if not found then raise exception 'NOT_AUTHORIZED';end if;
 perform public.get_route_team();
 insert into public.fossil_lab_games(user_id) values(auth.uid()) on conflict do nothing;
 return public.fossil_lab_snapshot(auth.uid());
end $$;

create or replace function public.get_fossil_laboratory_inventory()
returns jsonb language plpgsql security definer set search_path='' as $$
declare items jsonb;
begin
 if not exists(select 1 from public.profiles where user_id=auth.uid() and is_active) then raise exception 'NOT_AUTHORIZED';end if;
 select coalesce(jsonb_agg(jsonb_build_object('id','fossil-lab:'||c.id,'labId',c.id,'name',c.data->>'name','quantity',v.value::integer,
 'category',case when c.data ? 'speciesId' then 'fossils' else 'items' end,'description','Reperto del Laboratorio Fossili.',
 'image',c.data->'image','sprite',c.data,'price',c.data->'price','laboratory',true)),'[]') into items
 from public.fossil_lab_games g cross join lateral jsonb_each_text(g.inventory) v join public.fossil_lab_catalog c on c.id=v.key
 where g.user_id=auth.uid() and v.value::integer>0;
 return items;
end $$;

create or replace function public.fossil_laboratory_command(p_action text,p_operation uuid,p_revision bigint,p_args jsonb default '{}')
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();g public.fossil_lab_games%rowtype;p public.profiles%rowtype;cached jsonb;answer jsonb;cat jsonb;item_id text;
 today date:=(clock_timestamp() at time zone 'Europe/Rome')::date;layers jsonb;objects jsonb;obj jsonb;cells jsonb;occupied jsonb:='[]';
 i integer;j integer;x integer;y integer;ox integer;oy integer;w integer;h integer;idx integer;hit integer;amount integer;health integer;damage integer;
 tries integer;count_items integer;placed boolean;done boolean;all_found boolean;found boolean;loot jsonb:='[]';delta bigint:=0;ticket uuid;lvl integer;sid integer;
begin
 select * into p from public.profiles where user_id=uid and is_active for update;if not found then raise exception 'NOT_AUTHORIZED';end if;
 if p_operation is null then raise exception 'INVALID_COMMAND';end if;
 select response into cached from public.route_event_operations where user_id=uid and kind='fossil-lab' and operation_id=p_operation;
 if cached is not null then return cached;end if;
 insert into public.fossil_lab_games(user_id) values(uid) on conflict do nothing;
 select * into g from public.fossil_lab_games where user_id=uid for update;
 if p_revision is distinct from g.revision then raise exception 'STALE_REVISION';end if;
 if g.day<today and (g.dig is null or (g.dig->>'done')::boolean) then g.day:=today;g.attempts:=0;g.found_fossil:=false;end if;
 if p_action='dig' then
  if g.pending is not null then raise exception 'BATTLE_ACTIVE';end if;
  if g.dig is not null and not (g.dig->>'done')::boolean then raise exception 'DIG_ACTIVE';end if;
  if g.attempts>=3 then raise exception 'DAILY_LIMIT';end if;
  if p.balance<50 then raise exception 'INSUFFICIENT_BALANCE';end if;
  delta:=-50;g.attempts:=g.attempts+1;layers:='[]';objects:='[]';
  for i in 0..129 loop layers:=layers||to_jsonb(2+floor(random()*4)::integer);end loop;
  count_items:=2+floor(random()*3)::integer;
  for i in 1..count_items loop
   select id,data into item_id,cat from public.fossil_lab_catalog where (i<>1 or g.attempts<>3 or g.found_fossil or data ? 'speciesId') order by random() limit 1;
   w:=(cat->>'w')::integer;h:=(cat->>'h')::integer;placed:=false;
   for tries in 1..100 loop
    ox:=floor(random()*(14-w))::integer;oy:=floor(random()*(11-h))::integer;cells:='[]';placed:=true;
    for y in 0..h-1 loop for x in 0..w-1 loop
     if (cat->'mask'->y->>x)::boolean then idx:=(oy+y)*13+ox+x;cells:=cells||to_jsonb(idx);if occupied @> to_jsonb(idx) then placed:=false;end if;end if;
    end loop;end loop;
    exit when placed;
   end loop;
   if placed then occupied:=occupied||cells;objects:=objects||jsonb_build_array(jsonb_build_object('id',item_id,'x',ox,'y',oy,'cells',cells));end if;
  end loop;
  if jsonb_array_length(objects)<2 then raise exception 'WALL_GENERATION_FAILED';end if;
  g.dig:=jsonb_build_object('layers',layers,'objects',objects,'health',49,'done',false);g.last_loot:='[]';
 elsif p_action in ('hit','abandon') then
  if g.dig is null or (g.dig->>'done')::boolean then raise exception 'NO_ACTIVE_DIG';end if;
  layers:=g.dig->'layers';objects:=g.dig->'objects';health:=(g.dig->>'health')::integer;
  if p_action='hit' then
   x:=(p_args->>'x')::integer;y:=(p_args->>'y')::integer;
   if x is null or y is null or x not between 0 and 12 or y not between 0 and 9 or p_args->>'tool' is null or p_args->>'tool' not in ('pick','hammer') then raise exception 'INVALID_COMMAND';end if;
   health:=greatest(0,health-case when p_args->>'tool'='hammer' then 2 else 1 end);
   for oy in greatest(0,y-1)..least(9,y+1) loop for ox in greatest(0,x-1)..least(12,x+1) loop
    damage:=case when p_args->>'tool'='hammer' then case when ox=x and oy=y then 3 when ox=x or oy=y then 2 else 1 end else case when ox=x and oy=y then 2 when ox=x or oy=y then 1 else 0 end end;
    idx:=oy*13+ox;layers:=jsonb_set(layers,array[idx::text],to_jsonb(greatest(0,(layers->>idx)::integer-damage)));
   end loop;end loop;
  else health:=0;end if;
  all_found:=true;
  for obj in select value from jsonb_array_elements(objects) loop
   found:=true;for idx in select value::integer from jsonb_array_elements_text(obj->'cells') loop if (layers->>idx)::integer>0 then found:=false;exit;end if;end loop;
   if found then loot:=loot||jsonb_build_array(obj->>'id');else all_found:=false;end if;
  end loop;
  done:=health=0 or all_found;
  if done then
   for item_id in select value from jsonb_array_elements_text(loot) loop
    g.inventory:=jsonb_set(g.inventory,array[item_id],to_jsonb(coalesce((g.inventory->>item_id)::integer,0)+1));
    if exists(select 1 from public.fossil_lab_catalog where id=item_id and data ? 'speciesId') then g.found_fossil:=true;end if;
   end loop;
   g.last_loot:=loot;
  end if;
  g.dig:=jsonb_build_object('layers',layers,'objects',objects,'health',health,'done',done);
 elsif p_action in ('sell','revive') then
  item_id:=p_args->>'item';select data into cat from public.fossil_lab_catalog where id=item_id;
  if cat is null or coalesce((g.inventory->>item_id)::integer,0)<1 then raise exception 'ITEM_NOT_OWNED';end if;
  if p_action='sell' then delta:=(cat->>'price')::bigint;
  else
   if not cat ? 'speciesId' then raise exception 'NOT_A_FOSSIL';end if;
   perform public.get_route_team();perform public.route_assert_event_available(uid);
   if g.pending is not null then raise exception 'BATTLE_ACTIVE';end if;
   if not exists(select 1 from public.starter_games st cross join lateral jsonb_array_elements(st.team) m where st.user_id=uid and (m->>'currentHp')::integer>0) then raise exception 'TEAM_EXHAUSTED';end if;
   select max((m->>'level')::integer) into lvl from public.starter_games st cross join lateral jsonb_array_elements(st.team) m where st.user_id=uid;
   sid:=(cat->>'speciesId')::integer;ticket:=gen_random_uuid();
   insert into public.route_encounter_tickets(id,user_id,species_id,level,source,event_key,can_capture,can_escape,metadata,expires_at)
   values(ticket,uid,sid,lvl,'FOSSIL_HUNT',ticket::text,false,true,jsonb_build_object('kind','fossil_lab','item',item_id),'infinity');
   g.pending:=ticket;g.result:=null;
  end if;
  g.inventory:=jsonb_set(g.inventory,array[item_id],to_jsonb((g.inventory->>item_id)::integer-1));
 else raise exception 'INVALID_COMMAND';end if;
 if delta<>0 then
  update public.profiles set balance=balance+delta,updated_at=clock_timestamp() where user_id=uid;
  insert into public.transactions(operation_id,sender_id,receiver_id,amount,description,transaction_type,created_by)
  values(p_operation,case when delta<0 then p.id end,case when delta>0 then p.id end,abs(delta),'Laboratorio Fossili','starter_arena',p.id);
 end if;
 update public.fossil_lab_games set revision=g.revision+1,day=g.day,attempts=g.attempts,found_fossil=g.found_fossil,inventory=g.inventory,dig=g.dig,pending=g.pending,last_loot=g.last_loot,result=g.result where user_id=uid;
 answer:=public.fossil_lab_snapshot(uid);
 insert into public.route_event_operations(user_id,kind,operation_id,response) values(uid,'fossil-lab',p_operation,answer);
 return answer;
end $$;

create or replace function public.route_settle_fossil_lab_result()
returns trigger language plpgsql security definer set search_path='' as $$
declare t public.route_encounter_tickets%rowtype;g public.fossil_lab_games%rowtype;pid uuid;reward integer;
begin
 select * into t from public.route_encounter_tickets where id=new.ticket_id;
 if t.metadata->>'kind' is distinct from 'fossil_lab' then return new;end if;
 select * into g from public.fossil_lab_games where user_id=new.user_id for update;
 if t.user_id is distinct from new.user_id or g.pending is distinct from t.id then raise exception 'INVALID_EVENT';end if;
 reward:=case when new.final_state->>'result'='win' then 200 else 0 end;
 if reward>0 then
  update public.profiles set balance=balance+reward,updated_at=clock_timestamp() where user_id=new.user_id returning id into pid;
  insert into public.transactions(operation_id,receiver_id,amount,description,transaction_type,created_by) values(t.id,pid,reward,'Laboratorio Fossili · vittoria','starter_arena',pid);
 end if;
 update public.fossil_lab_games set pending=null,revision=revision+1,result=jsonb_build_object('outcome',new.final_state->>'result','item',t.metadata->>'item','coins',reward) where user_id=new.user_id;
 new.settled_at:=clock_timestamp();return new;
end $$;
drop trigger if exists route_fossil_lab_reward on public.route_encounter_results;
create trigger route_fossil_lab_reward before insert on public.route_encounter_results for each row execute function public.route_settle_fossil_lab_result();
revoke all on function public.fossil_lab_snapshot(uuid),public.get_fossil_laboratory(),public.get_fossil_laboratory_inventory(),public.fossil_laboratory_command(text,uuid,bigint,jsonb),public.route_settle_fossil_lab_result() from public,anon,authenticated;
grant execute on function public.get_fossil_laboratory(),public.get_fossil_laboratory_inventory(),public.fossil_laboratory_command(text,uuid,bigint,jsonb) to authenticated;
-- Generated catalog and the four additional fossil species follow.
alter table public.route_pokemon_species drop constraint if exists route_pokemon_species_id_check;
alter table public.route_pokemon_species add constraint route_pokemon_species_id_check check(id between 1 and 251 or id in (345,347,408,410));
insert into public.route_pokemon_species(id,data) values(345,'{"id":345,"dex":345,"name":"Lileep","slug":"lileep","types":["rock","grass"],"baseStats":{"hp":66,"attack":41,"defense":77,"spAttack":61,"spDefense":87,"speed":23},"baseExp":99,"growth":"medium_fast","catchRate":45,"evolutions":[],"learnset":{"levelUp":[{"level":1,"move":"VINE_WHIP"},{"level":1,"move":"ANCIENTPOWER"},{"level":1,"move":"ROCK_THROW"},{"level":1,"move":"GROWL"}],"machine":[],"egg":[]},"sprites":{"front":"https://projectpokemon.org/images/normal-sprite/lileep.gif","back":"https://projectpokemon.org/images/sprites-models/normal-back/lileep.gif"}}') on conflict(id) do update set data=excluded.data;
insert into public.route_pokemon_species(id,data) values(347,'{"id":347,"dex":347,"name":"Anorith","slug":"anorith","types":["rock","bug"],"baseStats":{"hp":45,"attack":95,"defense":50,"spAttack":40,"spDefense":50,"speed":75},"baseExp":99,"growth":"medium_fast","catchRate":45,"evolutions":[],"learnset":{"levelUp":[{"level":1,"move":"SCRATCH"},{"level":1,"move":"ANCIENTPOWER"},{"level":1,"move":"ROCK_THROW"},{"level":1,"move":"GROWL"}],"machine":[],"egg":[]},"sprites":{"front":"https://projectpokemon.org/images/normal-sprite/anorith.gif","back":"https://projectpokemon.org/images/sprites-models/normal-back/anorith.gif"}}') on conflict(id) do update set data=excluded.data;
insert into public.route_pokemon_species(id,data) values(408,'{"id":408,"dex":408,"name":"Cranidos","slug":"cranidos","types":["rock"],"baseStats":{"hp":67,"attack":125,"defense":40,"spAttack":30,"spDefense":30,"speed":58},"baseExp":99,"growth":"medium_fast","catchRate":45,"evolutions":[],"learnset":{"levelUp":[{"level":1,"move":"TACKLE"},{"level":1,"move":"ROCK_THROW"},{"level":1,"move":"ANCIENTPOWER"},{"level":1,"move":"GROWL"}],"machine":[],"egg":[]},"sprites":{"front":"https://projectpokemon.org/images/normal-sprite/cranidos.gif","back":"https://projectpokemon.org/images/sprites-models/normal-back/cranidos.gif"}}') on conflict(id) do update set data=excluded.data;
insert into public.route_pokemon_species(id,data) values(410,'{"id":410,"dex":410,"name":"Shieldon","slug":"shieldon","types":["rock","steel"],"baseStats":{"hp":30,"attack":42,"defense":118,"spAttack":42,"spDefense":88,"speed":30},"baseExp":99,"growth":"medium_fast","catchRate":45,"evolutions":[],"learnset":{"levelUp":[{"level":1,"move":"TACKLE"},{"level":1,"move":"ROCK_THROW"},{"level":1,"move":"ANCIENTPOWER"},{"level":1,"move":"WITHDRAW"}],"machine":[],"egg":[]},"sprites":{"front":"https://projectpokemon.org/images/normal-sprite/shieldon.gif","back":"https://projectpokemon.org/images/sprites-models/normal-back/shieldon.gif"}}') on conflict(id) do update set data=excluded.data;
insert into public.fossil_lab_catalog values('Small Green Sphere','{"id":"Small Green Sphere","category":"SMALL_SPHERES","x":13,"y":0,"w":2,"h":2,"mask":[[true,true],[true,true]],"name":"Sfera Verde piccola","price":15}') on conflict(id) do update set data=excluded.data;
insert into public.fossil_lab_catalog values('Small Red Sphere','{"id":"Small Red Sphere","category":"SMALL_SPHERES","x":15,"y":0,"w":2,"h":2,"mask":[[true,true],[true,true]],"name":"Sfera Rossa piccola","price":15}') on conflict(id) do update set data=excluded.data;
insert into public.fossil_lab_catalog values('Small Blue Sphere','{"id":"Small Blue Sphere","category":"SMALL_SPHERES","x":17,"y":0,"w":2,"h":2,"mask":[[true,true],[true,true]],"name":"Sfera Blu piccola","price":15}') on conflict(id) do update set data=excluded.data;
insert into public.fossil_lab_catalog values('Small Prism Sphere','{"id":"Small Prism Sphere","category":"SMALL_SPHERES","x":19,"y":0,"w":2,"h":2,"mask":[[true,true],[true,true]],"name":"Sfera Prisma piccola","price":15}') on conflict(id) do update set data=excluded.data;
insert into public.fossil_lab_catalog values('Small Pale Sphere','{"id":"Small Pale Sphere","category":"SMALL_SPHERES","x":21,"y":0,"w":2,"h":2,"mask":[[true,true],[true,true]],"name":"Sfera Pallida piccola","price":15}') on conflict(id) do update set data=excluded.data;
insert into public.fossil_lab_catalog values('Large Green Sphere','{"id":"Large Green Sphere","category":"LARGE_SPHERES","x":13,"y":2,"w":3,"h":3,"mask":[[true,true,true],[true,true,true],[true,true,true]],"name":"Sfera Verde grande","price":40}') on conflict(id) do update set data=excluded.data;
insert into public.fossil_lab_catalog values('Large Red Sphere','{"id":"Large Red Sphere","category":"LARGE_SPHERES","x":16,"y":2,"w":3,"h":3,"mask":[[true,true,true],[true,true,true],[true,true,true]],"name":"Sfera Rossa grande","price":40}') on conflict(id) do update set data=excluded.data;
insert into public.fossil_lab_catalog values('Large Blue Sphere','{"id":"Large Blue Sphere","category":"LARGE_SPHERES","x":19,"y":2,"w":3,"h":3,"mask":[[true,true,true],[true,true,true],[true,true,true]],"name":"Sfera Blu grande","price":40}') on conflict(id) do update set data=excluded.data;
insert into public.fossil_lab_catalog values('Large Prism Sphere','{"id":"Large Prism Sphere","category":"LARGE_SPHERES","x":22,"y":2,"w":3,"h":3,"mask":[[true,true,true],[true,true,true],[true,true,true]],"name":"Sfera Prisma grande","price":40}') on conflict(id) do update set data=excluded.data;
insert into public.fossil_lab_catalog values('Large Pale Sphere','{"id":"Large Pale Sphere","category":"LARGE_SPHERES","x":25,"y":2,"w":3,"h":3,"mask":[[true,true,true],[true,true,true],[true,true,true]],"name":"Sfera Pallida grande","price":40}') on conflict(id) do update set data=excluded.data;
insert into public.fossil_lab_catalog values('Skull Fossil','{"id":"Skull Fossil","category":"FOSSILS","x":13,"y":5,"w":4,"h":4,"mask":[[true,true,true,true],[true,true,true,true],[true,true,true,true],[false,true,true,false]],"name":"Fossilcranio","price":300,"image":"fossilcranio.png","speciesId":408,"pokemon":"Cranidos"}') on conflict(id) do update set data=excluded.data;
insert into public.fossil_lab_catalog values('Armor Fossil','{"id":"Armor Fossil","category":"FOSSILS","x":17,"y":5,"w":5,"h":4,"mask":[[false,true,true,true,false],[false,true,true,true,false],[true,true,true,true,true],[false,true,true,true,false]],"name":"Fossilscudo","price":300,"image":"fossilscudo.png","speciesId":410,"pokemon":"Shieldon"}') on conflict(id) do update set data=excluded.data;
insert into public.fossil_lab_catalog values('Dome Fossil','{"id":"Dome Fossil","category":"FOSSILS","x":22,"y":5,"w":5,"h":4,"mask":[[true,true,true,true,true],[true,true,true,true,true],[true,true,true,true,true],[false,true,true,true,false]],"name":"Domofossile","price":250,"image":"domofossil.png","speciesId":140,"pokemon":"Kabuto"}') on conflict(id) do update set data=excluded.data;
insert into public.fossil_lab_catalog values('Helix Fossil','{"id":"Helix Fossil","category":"FOSSILS","x":27,"y":5,"w":4,"h":4,"mask":[[false,true,true,true],[true,true,true,true],[true,true,true,true],[true,true,true,false]],"name":"Fossilhelix","price":250,"image":"fossilhelix.png","speciesId":138,"pokemon":"Omanyte"}') on conflict(id) do update set data=excluded.data;
insert into public.fossil_lab_catalog values('Old Amber','{"id":"Old Amber","category":"FOSSILS","x":43,"y":5,"w":4,"h":4,"mask":[[false,true,true,true],[true,true,true,true],[true,true,true,true],[true,true,true,false]],"name":"Ambra Antica","price":400,"image":"ambra antica.png","speciesId":142,"pokemon":"Aerodactyl"}') on conflict(id) do update set data=excluded.data;
insert into public.fossil_lab_catalog values('Root Fossil','{"id":"Root Fossil","category":"FOSSILS","x":13,"y":9,"w":5,"h":5,"mask":[[true,true,true,true,false],[true,true,true,true,true],[true,true,false,true,true],[false,false,false,true,true],[false,false,true,true,false]],"name":"Radifossile","price":280,"image":"radiofossile.png","speciesId":345,"pokemon":"Lileep"}') on conflict(id) do update set data=excluded.data;
insert into public.fossil_lab_catalog values('Claw Fossil','{"id":"Claw Fossil","category":"FOSSILS","x":33,"y":9,"w":4,"h":5,"mask":[[false,false,true,true],[false,true,true,true],[false,true,true,true],[true,true,true,false],[true,true,false,false]],"name":"Fossilunghia","price":280,"image":"fossilunghia.png","speciesId":347,"pokemon":"Anorith"}') on conflict(id) do update set data=excluded.data;
insert into public.fossil_lab_catalog values('Leaf Stone','{"id":"Leaf Stone","category":"EVOLUTION_STONES","x":13,"y":14,"w":3,"h":4,"mask":[[false,true,false],[true,true,true],[true,true,true],[false,true,false]],"name":"Pietrafoglia","price":120}') on conflict(id) do update set data=excluded.data;
insert into public.fossil_lab_catalog values('Fire Stone','{"id":"Fire Stone","category":"EVOLUTION_STONES","x":20,"y":15,"w":3,"h":3,"mask":[[true,true,true],[true,true,true],[true,true,true]],"name":"Pietrafocaia","price":120}') on conflict(id) do update set data=excluded.data;
insert into public.fossil_lab_catalog values('Water Stone','{"id":"Water Stone","category":"EVOLUTION_STONES","x":23,"y":15,"w":3,"h":3,"mask":[[true,true,true],[true,true,true],[true,true,false]],"name":"Pietraidrica","price":120}') on conflict(id) do update set data=excluded.data;
insert into public.fossil_lab_catalog values('Thunder Stone','{"id":"Thunder Stone","category":"EVOLUTION_STONES","x":26,"y":15,"w":3,"h":3,"mask":[[false,true,true],[true,true,true],[true,true,false]],"name":"Pietratuono","price":120}') on conflict(id) do update set data=excluded.data;
insert into public.fossil_lab_catalog values('Moon stone','{"id":"Moon stone","category":"EVOLUTION_STONES","x":29,"y":16,"w":4,"h":2,"mask":[[false,true,true,true],[true,true,true,false]],"name":"Pietralunare","price":120}') on conflict(id) do update set data=excluded.data;
insert into public.fossil_lab_catalog values('Sun Stone','{"id":"Sun Stone","category":"EVOLUTION_STONES","x":35,"y":15,"w":3,"h":3,"mask":[[true,true,true],[true,true,true],[true,true,true]],"name":"Pietrasolare","price":120}') on conflict(id) do update set data=excluded.data;
insert into public.fossil_lab_catalog values('Green Shard','{"id":"Green Shard","category":"SHARDS","x":13,"y":18,"w":4,"h":3,"mask":[[true,true,true,true],[true,true,true,true],[true,true,false,true]],"name":"Coccio Verde","price":30}') on conflict(id) do update set data=excluded.data;
insert into public.fossil_lab_catalog values('Red Shard','{"id":"Red Shard","category":"SHARDS","x":17,"y":18,"w":3,"h":3,"mask":[[true,true,true],[true,true,false],[true,true,true]],"name":"Coccio Rosso","price":30}') on conflict(id) do update set data=excluded.data;
insert into public.fossil_lab_catalog values('Blue Shard','{"id":"Blue Shard","category":"SHARDS","x":20,"y":18,"w":3,"h":3,"mask":[[true,true,true],[true,true,true],[true,true,false]],"name":"Coccio Blu","price":30}') on conflict(id) do update set data=excluded.data;
insert into public.fossil_lab_catalog values('Yellow Shard','{"id":"Yellow Shard","category":"SHARDS","x":23,"y":18,"w":4,"h":3,"mask":[[true,false,true,false],[true,true,true,false],[true,true,true,true]],"name":"Coccio Giallo","price":30}') on conflict(id) do update set data=excluded.data;
insert into public.fossil_lab_catalog values('Heat Rock','{"id":"Heat Rock","category":"WEATHER_STONES","x":13,"y":21,"w":4,"h":3,"mask":[[true,false,true,false],[true,true,true,true],[true,true,true,true]],"name":"Roccia Calda","price":60}') on conflict(id) do update set data=excluded.data;
insert into public.fossil_lab_catalog values('Damp Rock','{"id":"Damp Rock","category":"WEATHER_STONES","x":17,"y":21,"w":3,"h":3,"mask":[[true,true,true],[true,true,true],[true,false,true]],"name":"Roccia Umida","price":60}') on conflict(id) do update set data=excluded.data;
insert into public.fossil_lab_catalog values('Icy Rock','{"id":"Icy Rock","category":"WEATHER_STONES","x":20,"y":21,"w":4,"h":4,"mask":[[false,true,true,false],[true,true,true,true],[true,true,true,true],[true,false,false,true]],"name":"Roccia Fredda","price":60}') on conflict(id) do update set data=excluded.data;
insert into public.fossil_lab_catalog values('Smooth Rock','{"id":"Smooth Rock","category":"WEATHER_STONES","x":24,"y":21,"w":4,"h":4,"mask":[[false,false,true,false],[true,true,true,false],[false,true,true,true],[false,true,false,false]],"name":"Roccia Liscia","price":60}') on conflict(id) do update set data=excluded.data;
insert into public.fossil_lab_catalog values('Revive','{"id":"Revive","category":"ITEMS","x":13,"y":25,"w":3,"h":3,"mask":[[false,true,false],[true,true,true],[false,true,false]],"name":"Revitalizzante","price":80}') on conflict(id) do update set data=excluded.data;
insert into public.fossil_lab_catalog values('Max Revive','{"id":"Max Revive","category":"ITEMS","x":16,"y":25,"w":3,"h":3,"mask":[[true,true,true],[true,true,true],[true,true,true]],"name":"Revitalizzante Max","price":80}') on conflict(id) do update set data=excluded.data;
insert into public.fossil_lab_catalog values('Star Piece','{"id":"Star Piece","category":"ITEMS","x":19,"y":25,"w":3,"h":3,"mask":[[false,true,false],[true,true,true],[false,true,false]],"name":"Pezzo Stella","price":80}') on conflict(id) do update set data=excluded.data;
insert into public.fossil_lab_catalog values('Heart Scale','{"id":"Heart Scale","category":"ITEMS","x":22,"y":26,"w":2,"h":2,"mask":[[true,false],[true,true]],"name":"Squama Cuore","price":80}') on conflict(id) do update set data=excluded.data;
insert into public.fossil_lab_catalog values('Hard Stone','{"id":"Hard Stone","category":"ITEMS","x":14,"y":28,"w":2,"h":2,"mask":[[true,true],[true,true]],"name":"Pietradura","price":80}') on conflict(id) do update set data=excluded.data;
insert into public.fossil_lab_catalog values('Everstone','{"id":"Everstone","category":"ITEMS","x":16,"y":28,"w":4,"h":2,"mask":[[true,true,true,true],[true,true,true,true]],"name":"Pietrastante","price":80}') on conflict(id) do update set data=excluded.data;
insert into public.fossil_lab_catalog values('Light Clay','{"id":"Light Clay","category":"ITEMS","x":20,"y":28,"w":4,"h":4,"mask":[[true,false,true,false],[true,true,true,false],[true,true,true,true],[false,true,false,true]],"name":"Creta Luce","price":80}') on conflict(id) do update set data=excluded.data;
insert into public.fossil_lab_catalog values('Iron Ball','{"id":"Iron Ball","category":"ITEMS","x":24,"y":28,"w":3,"h":3,"mask":[[true,true,true],[true,true,true],[true,true,true]],"name":"Ferropalla","price":80}') on conflict(id) do update set data=excluded.data;
insert into public.fossil_lab_catalog values('Oval Stone','{"id":"Oval Stone","category":"ITEMS","x":27,"y":28,"w":3,"h":3,"mask":[[true,true,true],[true,true,true],[true,true,true]],"name":"Pietraovale","price":80}') on conflict(id) do update set data=excluded.data;
insert into public.fossil_lab_catalog values('Rare Bone','{"id":"Rare Bone","category":"ITEMS","x":29,"y":18,"w":3,"h":6,"mask":[[true,true,true],[false,true,false],[false,true,false],[false,true,false],[false,true,false],[true,true,true]],"name":"Ossostesso","price":80}') on conflict(id) do update set data=excluded.data;
insert into public.fossil_lab_catalog values('Odd Keystone','{"id":"Odd Keystone","category":"ITEMS","x":38,"y":20,"w":4,"h":4,"mask":[[true,true,true,true],[true,true,true,true],[true,true,true,true],[true,true,true,true]],"name":"Roccianima","price":80}') on conflict(id) do update set data=excluded.data;
insert into public.fossil_lab_catalog values('Insect Plate','{"id":"Insect Plate","category":"PLATES","x":14,"y":32,"w":4,"h":3,"mask":[[true,true,true,true],[true,true,true,true],[true,true,true,true]],"name":"Lastra Insetto","price":150}') on conflict(id) do update set data=excluded.data;
insert into public.fossil_lab_catalog values('Dread Plate','{"id":"Dread Plate","category":"PLATES","x":18,"y":32,"w":4,"h":3,"mask":[[true,true,true,true],[true,true,true,true],[true,true,true,true]],"name":"Lastratimore","price":150}') on conflict(id) do update set data=excluded.data;
insert into public.fossil_lab_catalog values('Draco Plate','{"id":"Draco Plate","category":"PLATES","x":22,"y":32,"w":4,"h":3,"mask":[[true,true,true,true],[true,true,true,true],[true,true,true,true]],"name":"Lastradrakon","price":150}') on conflict(id) do update set data=excluded.data;
insert into public.fossil_lab_catalog values('Zap Plate','{"id":"Zap Plate","category":"PLATES","x":26,"y":32,"w":4,"h":3,"mask":[[true,true,true,true],[true,true,true,true],[true,true,true,true]],"name":"Lastrasaetta","price":150}') on conflict(id) do update set data=excluded.data;
insert into public.fossil_lab_catalog values('Fist Plate','{"id":"Fist Plate","category":"PLATES","x":30,"y":32,"w":4,"h":3,"mask":[[true,true,true,true],[true,true,true,true],[true,true,true,true]],"name":"Lastrapugno","price":150}') on conflict(id) do update set data=excluded.data;
insert into public.fossil_lab_catalog values('Flame Plate','{"id":"Flame Plate","category":"PLATES","x":34,"y":32,"w":4,"h":3,"mask":[[true,true,true,true],[true,true,true,true],[true,true,true,true]],"name":"Lastrarogo","price":150}') on conflict(id) do update set data=excluded.data;
insert into public.fossil_lab_catalog values('Sky Plate','{"id":"Sky Plate","category":"PLATES","x":38,"y":32,"w":4,"h":3,"mask":[[true,true,true,true],[true,true,true,true],[true,true,true,true]],"name":"Lastracielo","price":150}') on conflict(id) do update set data=excluded.data;
insert into public.fossil_lab_catalog values('Spooky Plate','{"id":"Spooky Plate","category":"PLATES","x":42,"y":32,"w":4,"h":3,"mask":[[true,true,true,true],[true,true,true,true],[true,true,true,true]],"name":"Lastratetra","price":150}') on conflict(id) do update set data=excluded.data;
insert into public.fossil_lab_catalog values('Meadow Plate','{"id":"Meadow Plate","category":"PLATES","x":14,"y":35,"w":4,"h":3,"mask":[[true,true,true,true],[true,true,true,true],[true,true,true,true]],"name":"Lastraprato","price":150}') on conflict(id) do update set data=excluded.data;
insert into public.fossil_lab_catalog values('Earth Plate','{"id":"Earth Plate","category":"PLATES","x":18,"y":35,"w":4,"h":3,"mask":[[true,true,true,true],[true,true,true,true],[true,true,true,true]],"name":"Lastraterra","price":150}') on conflict(id) do update set data=excluded.data;
insert into public.fossil_lab_catalog values('Icicle Plate','{"id":"Icicle Plate","category":"PLATES","x":22,"y":35,"w":4,"h":3,"mask":[[true,true,true,true],[true,true,true,true],[true,true,true,true]],"name":"Lastragelo","price":150}') on conflict(id) do update set data=excluded.data;
insert into public.fossil_lab_catalog values('Toxic Plate','{"id":"Toxic Plate","category":"PLATES","x":26,"y":35,"w":4,"h":3,"mask":[[true,true,true,true],[true,true,true,true],[true,true,true,true]],"name":"Lastrafiele","price":150}') on conflict(id) do update set data=excluded.data;
insert into public.fossil_lab_catalog values('Mind Plate','{"id":"Mind Plate","category":"PLATES","x":30,"y":35,"w":4,"h":3,"mask":[[true,true,true,true],[true,true,true,true],[true,true,true,true]],"name":"Lastramente","price":150}') on conflict(id) do update set data=excluded.data;
insert into public.fossil_lab_catalog values('Stone Plate','{"id":"Stone Plate","category":"PLATES","x":34,"y":35,"w":4,"h":3,"mask":[[true,true,true,true],[true,true,true,true],[true,true,true,true]],"name":"Lastrapietra","price":150}') on conflict(id) do update set data=excluded.data;
insert into public.fossil_lab_catalog values('Iron Plate','{"id":"Iron Plate","category":"PLATES","x":38,"y":35,"w":4,"h":3,"mask":[[true,true,true,true],[true,true,true,true],[true,true,true,true]],"name":"Lastraferro","price":150}') on conflict(id) do update set data=excluded.data;
insert into public.fossil_lab_catalog values('Splash Plate','{"id":"Splash Plate","category":"PLATES","x":42,"y":35,"w":4,"h":3,"mask":[[true,true,true,true],[true,true,true,true],[true,true,true,true]],"name":"Lastraidro","price":150}') on conflict(id) do update set data=excluded.data;
commit;
