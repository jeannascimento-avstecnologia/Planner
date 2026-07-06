-- F.1 audit retention: pg_cron daily purge (400 days)

do $cron$
begin
  create extension if not exists pg_cron;
exception when others then
  raise notice 'pg_cron unavailable: %', sqlerrm;
end;
$cron$;

do $schedule$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'purge-audit-events';
    perform cron.schedule(
      'purge-audit-events',
      '0 3 * * *',
      $$select app.purge_card_events_before(now() - interval '400 days')$$
    );
  end if;
exception when others then
  raise notice 'cron schedule skipped: %', sqlerrm;
end;
$schedule$;
