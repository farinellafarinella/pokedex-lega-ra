-- Run in Supabase SQL Editor after route01.sql. Required for unattended expiry.
create extension if not exists pg_cron;
do $$ declare job bigint; begin
 for job in select jobid from cron.job where jobname='route01-expiry' loop perform cron.unschedule(job);end loop;
 perform cron.schedule('route01-expiry','* * * * *','select public.route01_sweep();');
end $$;
-- Verify: select * from cron.job where jobname='route01-expiry';
-- Activity: select * from cron.job_run_details order by start_time desc limit 20;
