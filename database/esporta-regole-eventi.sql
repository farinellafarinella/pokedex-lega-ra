-- SOLA LETTURA: esporta codice e struttura, non dati degli allenatori.
-- Supabase > SQL Editor > New query > incolla tutto > Run.
-- Il risultato è una sola cella JSON, da copiare nella conversazione.
select jsonb_pretty(jsonb_build_object(
 'functions', (select coalesce(jsonb_agg(jsonb_build_object(
   'name',p.proname,'arguments',pg_get_function_identity_arguments(p.oid),
   'definition',pg_get_functiondef(p.oid))) ,'[]'::jsonb)
   from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='public' and p.prokind='f'
     and p.proname ~ '(fishing|bug_game|safari|starter|route_team|fossil|region_travel)'),
 'columns', (select coalesce(jsonb_agg(to_jsonb(c)),'[]'::jsonb)
   from (select table_name,column_name,data_type,udt_name,is_nullable,column_default
     from information_schema.columns where table_schema='public'
     order by table_name,ordinal_position) c),
 'constraints', (select coalesce(jsonb_agg(jsonb_build_object('table',c.relname,'name',co.conname,'definition',pg_get_constraintdef(co.oid))),'[]'::jsonb)
   from pg_constraint co join pg_class c on c.oid=co.conrelid join pg_namespace n on n.oid=c.relnamespace
   where n.nspname='public'),
 'triggers', (select coalesce(jsonb_agg(jsonb_build_object('table',c.relname,'definition',pg_get_triggerdef(t.oid),'function',pg_get_functiondef(t.tgfoid))),'[]'::jsonb)
   from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace
   where n.nspname='public' and not t.tgisinternal
     and c.relname ~ '(fishing|bug|safari|starter|fossil)')
)) as regole_eventi;
