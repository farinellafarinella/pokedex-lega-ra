-- FINAL activation step, after all migrations and all four Edge Function deployments.
begin;
do $$ begin
 if to_regprocedure('public.route_settle_event(uuid,uuid,uuid,jsonb)') is null
 or to_regprocedure('public.route_settle_fishing(uuid,uuid,jsonb)') is null
 or to_regprocedure('public.route_commit_event(uuid,text,bigint,bigint,uuid,text,jsonb,bigint,jsonb,jsonb,jsonb)') is null
 then raise exception 'Installare prima le tre migrazioni Route.';end if;
end $$;
update public.route_encounter_sources set enabled=true where source in ('FISHING','FOSSIL_HUNT','BUG_CONTEST','SAFARI','SPECIAL_EVENT');
commit;
