-- Torre di Lavandonia, ottobre 2026. Requires Route battles/events and admin-pokemon-gifts.sql.
-- Additive migration. Rewards are settled atomically by the existing trusted battle-result write.
begin;
create table if not exists public.halloween_settings(
 id boolean primary key default true check(id),season integer not null,enabled boolean not null default true
);
insert into public.halloween_settings(id,season) values(true,2026) on conflict do nothing;
create table if not exists public.halloween_progress(
 user_id uuid not null references auth.users(id),season integer not null,
 candies integer not null default 0 check(candies>=0),scope_at timestamptz,cubone_at timestamptz,
 boss_ticket uuid references public.route_encounter_tickets(id),primary key(user_id,season)
);
create table if not exists public.halloween_floors(
 user_id uuid not null references auth.users(id),season integer not null,floor integer not null check(floor between 1 and 31),
 mode text check(mode in ('quiz','battle')),ticket uuid references public.route_encounter_tickets(id),completed_at timestamptz,
 primary key(user_id,season,floor)
);
alter table public.halloween_floors add column if not exists quiz_failed boolean not null default false;
create table if not exists public.halloween_questions(
 floor integer primary key check(floor between 1 and 31),question text not null,options jsonb not null,answer integer not null check(answer between 0 and 3)
);
alter table public.halloween_settings enable row level security;
alter table public.halloween_progress enable row level security;
alter table public.halloween_floors enable row level security;
alter table public.halloween_questions enable row level security;
revoke all on public.halloween_settings,public.halloween_progress,public.halloween_floors,public.halloween_questions from public,anon,authenticated;
-- An automatic event gift has no sending administrator. Existing admin batches are unchanged.
alter table public.route_gift_batches alter column admin_user drop not null;

create or replace function public.get_halloween_event()
returns jsonb language plpgsql security definer set search_path='' as $$
declare cfg public.halloween_settings%rowtype;p public.halloween_progress%rowtype;today date:=(clock_timestamp() at time zone 'Europe/Rome')::date;opened integer;pending jsonb;
begin
 if not exists(select 1 from public.profiles where user_id=auth.uid() and is_active) then raise exception 'NOT_AUTHORIZED';end if;
 select * into cfg from public.halloween_settings where id;
 select * into p from public.halloween_progress where user_id=auth.uid() and season=cfg.season;
 opened:=greatest(0,least(31,today-make_date(cfg.season,10,1)+1));
 select jsonb_build_object('token',t.id,'speciesId',t.species_id,'level',t.level,'source',t.source,'canCapture',false,'canEscape',true) into pending
 from public.route_encounter_tickets t left join public.route_encounters e on e.ticket_id=t.id
 where t.user_id=auth.uid() and t.metadata->>'kind'='halloween' and (e.id is null or not e.saved)
 order by t.expires_at,t.id limit 1;
 return jsonb_build_object('season',cfg.season,'open',cfg.enabled and today between make_date(cfg.season,10,1) and make_date(cfg.season,10,31),
 'unlocked',opened,'candies',coalesce(p.candies,0),'scope',p.scope_at is not null,'cubone',p.cubone_at is not null,'pending',pending,
 'floors',(select jsonb_agg(jsonb_build_object('floor',n,'unlocked',n<=opened,'completed',f.completed_at is not null,'mode',f.mode,'quizFailed',coalesce(f.quiz_failed,false),
 'quiz',case when f.mode='quiz' and not f.quiz_failed and f.completed_at is null then jsonb_build_object('question',q.question,'options',q.options) else null end) order by n)
 from generate_series(1,31) n left join public.halloween_floors f on f.floor=n and f.user_id=auth.uid() and f.season=cfg.season
 left join public.halloween_questions q on q.floor=n));
end $$;

create or replace function public.get_halloween_inventory()
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.profiles where user_id=auth.uid() and is_active) then raise exception 'NOT_AUTHORIZED';end if;
 return case when exists(select 1 from public.halloween_progress where user_id=auth.uid() and scope_at is not null)
 then '[{"id":"halloween:scope","name":"Spettrosonda","description":"Rivela lo spettro della stanza speciale di Lavandonia. Non si consuma con l’utilizzo.","category":"items","quantity":1}]'::jsonb else '[]'::jsonb end;
end $$;

create or replace function public.halloween_command(p_action text,p_floor integer default null,p_answer integer default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();cfg public.halloween_settings%rowtype;p public.halloween_progress%rowtype;f public.halloween_floors%rowtype;
 today date:=(clock_timestamp() at time zone 'Europe/Rome')::date;g public.starter_games%rowtype;ticket_id uuid;sid integer;lvl integer;correct integer;message text;
begin
 perform 1 from public.profiles where user_id=uid and is_active for update;
 if not found then raise exception 'NOT_AUTHORIZED';end if;
 select * into cfg from public.halloween_settings where id;
 if not cfg.enabled or today not between make_date(cfg.season,10,1) and make_date(cfg.season,10,31) then raise exception 'HALLOWEEN_CLOSED';end if;
 if p_action is null or p_action not in ('quiz','answer','battle','scope','boss') then raise exception 'INVALID_COMMAND';end if;
 -- Lock in the same order as the battle writer: profile, team, then event progress.
 select * into g from public.starter_games where user_id=uid for update;
 insert into public.halloween_progress(user_id,season) values(uid,cfg.season) on conflict do nothing;
 select * into p from public.halloween_progress where user_id=uid and season=cfg.season for update;
 if p_action='scope' then
  if p.scope_at is null then
   if p.candies<250 then raise exception 'NOT_ENOUGH_CANDIES';end if;
   update public.halloween_progress set candies=candies-250,scope_at=clock_timestamp() where user_id=uid and season=cfg.season;
  end if;
  return public.get_halloween_event()||jsonb_build_object('message','La Spettrosonda è nel tuo zaino!');
 end if;
 if p_action='boss' then
  if p.scope_at is null then raise exception 'SCOPE_REQUIRED';end if;
  if p.cubone_at is not null then return public.get_halloween_event();end if;
  if p.boss_ticket is not null then return public.get_halloween_event();end if;
 else
  if p_floor is null or p_floor not between 1 and 31 or p_floor>extract(day from today)::integer then raise exception 'FLOOR_LOCKED';end if;
  insert into public.halloween_floors(user_id,season,floor) values(uid,cfg.season,p_floor) on conflict do nothing;
  select * into f from public.halloween_floors where user_id=uid and season=cfg.season and floor=p_floor for update;
  if f.completed_at is not null then return public.get_halloween_event()||jsonb_build_object('message','Questo piano ha già assegnato le sue caramelle.');end if;
  if f.ticket is not null then return public.get_halloween_event();end if;
 end if;
 if p_action in ('quiz','answer') and f.quiz_failed then
  return public.get_halloween_event()||jsonb_build_object('message','Hai sbagliato il quiz: completa questo piano scegliendo Scherzetto.');
 end if;
 perform public.route_assert_event_available(uid);
 if p_action='quiz' then
  update public.halloween_floors set mode='quiz' where user_id=uid and season=cfg.season and floor=p_floor;
  return public.get_halloween_event();
 elsif p_action='answer' then
  if f.mode is distinct from 'quiz' then raise exception 'CHOOSE_QUIZ_FIRST';end if;
  select answer into correct from public.halloween_questions where floor=p_floor;
  if correct is null then raise exception 'QUIZ_UNAVAILABLE';end if;
  if p_answer is null or p_answer not between 0 and 3 then raise exception 'INVALID_ANSWER';end if;
  if p_answer=correct then
   update public.halloween_floors set completed_at=clock_timestamp() where user_id=uid and season=cfg.season and floor=p_floor;
   update public.halloween_progress set candies=candies+10 where user_id=uid and season=cfg.season;
   message:='Risposta esatta! Piano completato: +10 caramelle.';
  else
   update public.halloween_floors set quiz_failed=true where user_id=uid and season=cfg.season and floor=p_floor;
   message:='Risposta sbagliata! Ora puoi completare questo piano soltanto con Scherzetto.';
  end if;
  return public.get_halloween_event()||jsonb_build_object('message',message);
 end if;
 -- The server chooses enemy and level. A client cannot request a weaker enemy or enable captures.
 perform public.get_route_team();
 select * into g from public.starter_games where user_id=uid for update;
 if not found or jsonb_array_length(g.team)=0 then raise exception 'STARTER_REQUIRED';end if;
 if not exists(select 1 from jsonb_array_elements(g.team) m where (m->>'currentHp')::integer>0) then raise exception 'TEAM_EXHAUSTED';end if;
 select greatest(5,least(100,max((m->>'level')::integer)+case when p_action='boss' then 2 else 0 end)) into lvl from jsonb_array_elements(g.team) m;
 sid:=case when p_action='boss' then 105 else (array[92,93,200])[1+floor(random()*3)::integer] end;
 ticket_id:=gen_random_uuid();
 insert into public.route_encounter_tickets(id,user_id,species_id,level,source,event_key,can_capture,can_escape,metadata,expires_at)
 values(ticket_id,uid,sid,lvl,'SPECIAL_EVENT',ticket_id::text,false,true,jsonb_build_object('kind','halloween','season',cfg.season,'floor',case when p_action='boss' then 0 else p_floor end),'infinity');
 if p_action='boss' then update public.halloween_progress set boss_ticket=ticket_id where user_id=uid and season=cfg.season;
 else update public.halloween_floors set mode='battle',ticket=ticket_id where user_id=uid and season=cfg.season and floor=p_floor;end if;
 return public.get_halloween_event();
end $$;

create or replace function public.route_settle_halloween_result()
returns trigger language plpgsql security definer set search_path='' as $$
declare t public.route_encounter_tickets%rowtype;yr integer;fl integer;p public.halloween_progress%rowtype;f public.halloween_floors%rowtype;
 today date:=(clock_timestamp() at time zone 'Europe/Rome')::date;won boolean;batch uuid;token_value text;pid uuid;
begin
 select * into t from public.route_encounter_tickets where id=new.ticket_id;
 if t.metadata->>'kind' is distinct from 'halloween' then return new;end if;
 if t.user_id is distinct from new.user_id then raise exception 'INVALID_EVENT';end if;
 yr:=(t.metadata->>'season')::integer;fl:=(t.metadata->>'floor')::integer;
 select * into p from public.halloween_progress where user_id=new.user_id and season=yr for update;
 if not found then raise exception 'INVALID_EVENT';end if;
 won:=new.final_state->>'result'='win' and today between make_date(yr,10,1) and make_date(yr,10,31)
 and exists(select 1 from public.halloween_settings where id and season=yr and enabled);
 if fl=0 then
  if p.boss_ticket is distinct from t.id or p.scope_at is null then raise exception 'INVALID_EVENT';end if;
  update public.halloween_progress set boss_ticket=null where user_id=new.user_id and season=yr;
  if won and p.cubone_at is null then
   batch:=gen_random_uuid();token_value:='GIFT-'||upper(gen_random_uuid()::text);
   select id into pid from public.profiles where user_id=new.user_id;
   insert into public.route_gift_batches(id,admin_user,species_id,level,recipients) values(batch,null,104,5,array[pid]);
   insert into public.route_pokemon_qr(token,species_id,level,source,reserved_by) values(token_value,104,5,'HALLOWEEN_GIFT',new.user_id);
   insert into public.route_pokemon_gifts(batch_id,user_id,qr_token) values(batch,new.user_id,token_value);
   insert into public.notifications(trainer_id,title,body,notification_type,target_hash) values(pid,'Il regalo di Lavandonia','Hai ricevuto un regalo, controlla la tua squadra Pokémon','pokemon_gift','#my-team');
   update public.halloween_progress set cubone_at=clock_timestamp() where user_id=new.user_id and season=yr;
   -- Delivery happens after this battle is saved, through the existing protected gift queue.
  end if;
 else
  select * into f from public.halloween_floors where user_id=new.user_id and season=yr and floor=fl for update;
  if not found or f.ticket is distinct from t.id then raise exception 'INVALID_EVENT';end if;
  update public.halloween_floors set ticket=null,mode=case when won then 'battle' else null end,
   completed_at=case when won then clock_timestamp() else completed_at end where user_id=new.user_id and season=yr and floor=fl;
  if won and f.completed_at is null then update public.halloween_progress set candies=candies+10 where user_id=new.user_id and season=yr;end if;
 end if;
 new.settled_at:=clock_timestamp();
 return new;
end $$;
drop trigger if exists route_halloween_reward on public.route_encounter_results;
create trigger route_halloween_reward before insert on public.route_encounter_results for each row execute function public.route_settle_halloween_result();
revoke all on function public.get_halloween_event(),public.get_halloween_inventory(),public.halloween_command(text,integer,integer),public.route_settle_halloween_result() from public,anon,authenticated;
grant execute on function public.get_halloween_event(),public.get_halloween_inventory(),public.halloween_command(text,integer,integer) to authenticated;

-- Answers stay on the server; the public RPC returns only the selected question and its options.
insert into public.halloween_questions(floor,question,options,answer) values
(1,'In Pokémon Rosso/Blu, da cosa dipende principalmente la probabilità base di effettuare un brutto colpo?','["Livello","Velocità base","Statistica Speciale","IV in Velocità"]'::jsonb,1),
(2,'In prima generazione, cosa fa realmente Focalenergia a causa di un bug?','["Non produce alcun effetto","Raddoppia la probabilità di critico","Divide circa per 4 la probabilità di critico","Garantisce il critico alla mossa successiva"]'::jsonb,2),
(3,'Qual è la probabilità massima teorica di brutto colpo raggiungibile in prima generazione, a causa del limite interno?','["100%","255/256","254/255","99/100"]'::jsonb,1),
(4,'In seconda generazione, quali DV determinano il tipo di Introforza?','["PS e Velocità","Attacco e Difesa","Speciale e Velocità","Tutti i DV allo stesso modo"]'::jsonb,1),
(5,'Quale dei seguenti tipi NON può mai essere il tipo di Introforza?','["Buio","Drago","Normale","Acciaio"]'::jsonb,2),
(6,'In seconda generazione, qual è la potenza minima possibile di Introforza?','["20","30","31","40"]'::jsonb,2),
(7,'Dalla terza alla quinta generazione, qual è invece la potenza minima possibile di Introforza?','["20","30","31","40"]'::jsonb,1),
(8,'Dalla sesta generazione, quale potenza possiede sempre Introforza?','["50","60","65","70"]'::jsonb,1),
(9,'In seconda e terza generazione, la categoria fisica/speciale di Introforza dipende da:','["Attacco e Attacco Speciale dell''utilizzatore","Natura del Pokémon","Tipo ottenuto da Introforza","IV più alto"]'::jsonb,2),
(10,'In prima generazione, quale valore massimo può raggiungere internamente una statistica in battaglia attraverso alcuni glitch di modifica delle statistiche?','["255","511","999","1024"]'::jsonb,2),
(11,'Quale di questi Pokémon ha un valore di esperienza necessario per raggiungere il livello 100 diverso dagli altri tre?','["Mew","Celebi","Jirachi","Arceus"]'::jsonb,3),
(12,'Quale di questi Pokémon appartiene al gruppo esperienza “Fluttuante”, uno dei più lenti ai livelli bassi ma più veloci al 100?','["Shroomish","Dratini","Larvitar","Beldum"]'::jsonb,0),
(13,'Quale Pokémon possiede la più bassa statistica base di Velocità tra questi?','["Munchlax","Shuckle","Pyukumuku","Torkoal"]'::jsonb,0),
(14,'Quale Pokémon possiede contemporaneamente 230 di Difesa base e 230 di Difesa Speciale base?','["Regirock","Shuckle","Carbink","Deoxys Difesa"]'::jsonb,1),
(15,'Quale Pokémon ha una statistica base PS pari a 1?','["Shedinja","Diglett","Wishiwashi","Sunkern"]'::jsonb,0),
(16,'Quale dei seguenti Pokémon possiede una statistica base totale di 180?','["Magikarp","Sunkern","Caterpie","Weedle"]'::jsonb,1),
(17,'Quale Pokémon ha una BST inferiore a quella di Magikarp?','["Feebas","Sunkern","Caterpie","Unown"]'::jsonb,1),
(18,'Quale di questi Pokémon ha esattamente la stessa distribuzione delle statistiche base di Magikarp?','["Feebas","Wishiwashi","Goldeen","Remoraid"]'::jsonb,0),
(19,'In prima generazione, quale tipo risulta erroneamente immune a Spettro a causa della tabella delle debolezze?','["Psico","Normale","Lotta","Veleno"]'::jsonb,0),
(20,'Quale mossa di tipo Spettro di prima generazione infligge danno fisso pari al livello dell''utilizzatore?','["Leccata","Ombra Notturna","Confusoraggio","Mangiasogni"]'::jsonb,1),
(21,'In prima generazione, quale delle seguenti mosse di tipo Coleottero è superefficace contro Psico?','["Missilspillo","Doppio Ago","Ira di Drago","Pungiglione"]'::jsonb,1),
(22,'Quale Pokémon della prima generazione può apprendere naturalmente Doppio Ago?','["Butterfree","Beedrill","Pinsir","Scyther"]'::jsonb,1),
(23,'Quale dei seguenti tipi non possedeva praticamente alcuna mossa offensiva realmente efficace in prima generazione nonostante fosse teoricamente forte contro Psico?','["Coleottero","Ghiaccio","Terra","Elettro"]'::jsonb,0),
(24,'Quale Pokémon può ottenere legalmente contemporaneamente valori DV perfetti in tutte le statistiche in seconda generazione?','["Un Pokémon cromatico","Nessun Pokémon cromatico","Solo Ditto","Solo Pokémon leggendari"]'::jsonb,1),
(25,'In seconda generazione, il fatto che un Pokémon sia cromatico dipende principalmente da:','["PID","Natura","Determinati DV","ID segreto"]'::jsonb,2),
(26,'Prima della sesta generazione, quale tipo era l''unico a possedere una resistenza al tipo Spettro poi rimossa?','["Buio","Acciaio","Psico","Lotta"]'::jsonb,1),
(27,'Sempre prima della sesta generazione, Acciaio resisteva anche a:','["Buio","Fuoco","Terra","Lotta"]'::jsonb,0),
(28,'In Pokémon Rosso/Blu, quale particolare effetto può verificarsi quando viene modificata una statistica del Pokémon del giocatore dopo aver ottenuto determinate medaglie?','["Le statistiche possono ricevere nuovamente il bonus delle medaglie","Gli IV vengono temporaneamente aumentati","Gli EV vengono ricalcolati","La statistica Speciale viene dimezzata"]'::jsonb,0),
(29,'In prima generazione, se un Pokémon paralizzato subisce determinate modifiche alle statistiche durante la lotta, quale valore può essere ridotto ripetutamente a causa di un bug?','["Difesa","Speciale","Velocità","Precisione"]'::jsonb,2),
(30,'Lo stesso tipo di bug può causare a un Pokémon scottato una riduzione ripetuta di quale statistica?','["Attacco","Difesa","Speciale","PS"]'::jsonb,0),
(31,'In Pokémon Rosso/Blu, Riposo può eccezionalmente fallire a causa di un bug quando la differenza tra PS massimi e PS attuali:','["È esattamente 255","È divisibile per 255","Lascia resto 255 nella divisione per 256","Supera 256"]'::jsonb,2)
on conflict(floor) do update set question=excluded.question,options=excluded.options,answer=excluded.answer;

-- Preserve the gift source for event rewards as well as admin sends.
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


revoke all on function public.route_deliver_pokemon_gifts(uuid) from public,anon,authenticated;
notify pgrst,'reload schema';
commit;
