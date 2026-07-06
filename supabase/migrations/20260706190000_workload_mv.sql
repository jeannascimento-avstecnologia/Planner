-- E: workload materialized view

create materialized view if not exists public.workload_by_member_week as
select
  c.org_id,
  c.assignee_id as user_id,
  date_trunc('week', coalesce(c.due_date, c.start_date, c.created_at))::date as week_start,
  coalesce(sum(c.estimated_hours), 0)::numeric as total_hours,
  coalesce(sum(c.story_points), 0)::int as total_points,
  count(*)::int as card_count
from public.cards c
where c.assignee_id is not null
  and coalesce(c.due_date, c.start_date) is not null
  and c.completed_at is null
group by 1, 2, 3;

create unique index if not exists workload_by_member_week_uidx
  on public.workload_by_member_week (org_id, user_id, week_start);

grant select on public.workload_by_member_week to authenticated;

do $cron$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'refresh-workload-mv';
    perform cron.schedule('refresh-workload-mv', '*/5 * * * *', $$refresh materialized view concurrently public.workload_by_member_week$$);
  end if;
exception when others then
  raise notice 'workload cron skipped: %', sqlerrm;
end;
$cron$;
