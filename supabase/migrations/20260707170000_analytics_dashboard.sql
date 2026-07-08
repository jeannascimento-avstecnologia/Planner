-- Analytics events (stage/completion) + dashboard MVs + RPCs

-- Extend card audit trigger
create or replace function app.audit_emit_card()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_fields text[] := array[]::text[];
  v_old_key text;
  v_new_key text;
begin
  if TG_OP = 'INSERT' then
    perform app.emit_event(NEW.org_id, 'card', 'card_created', jsonb_build_object('title', NEW.title, 'column_id', NEW.column_id), NEW.board_id, NEW.id, coalesce(v_actor, NEW.created_by));
    return NEW;
  elsif TG_OP = 'DELETE' then
    perform app.emit_event(OLD.org_id, 'card', 'card_deleted', jsonb_build_object('title', OLD.title), OLD.board_id, OLD.id, v_actor);
    return OLD;
  elsif TG_OP = 'UPDATE' then
    if NEW.column_id is distinct from OLD.column_id then
      perform app.emit_event(NEW.org_id, 'card', 'card_moved', jsonb_build_object('from_column_id', OLD.column_id, 'to_column_id', NEW.column_id), NEW.board_id, NEW.id, v_actor);
    end if;
    if NEW.assignee_id is distinct from OLD.assignee_id then
      perform app.emit_event(NEW.org_id, 'card', 'card_assigned', jsonb_build_object('old_assignee_id', OLD.assignee_id, 'new_assignee_id', NEW.assignee_id), NEW.board_id, NEW.id, v_actor);
    end if;
    if NEW.priority is distinct from OLD.priority then
      perform app.emit_event(NEW.org_id, 'card', 'priority_changed', jsonb_build_object('from', OLD.priority, 'to', NEW.priority), NEW.board_id, NEW.id, v_actor);
    end if;
    if NEW.stage_id is distinct from OLD.stage_id then
      perform app.emit_event(
        NEW.org_id,
        'card',
        'stage_changed',
        jsonb_build_object('from_stage_id', OLD.stage_id, 'to_stage_id', NEW.stage_id),
        NEW.board_id,
        NEW.id,
        v_actor
      );
    end if;
    if OLD.completed_at is null and NEW.completed_at is not null then
      perform app.emit_event(
        NEW.org_id,
        'card',
        'card_completed',
        jsonb_build_object('completed_at', NEW.completed_at, 'stage_id', NEW.stage_id),
        NEW.board_id,
        NEW.id,
        v_actor
      );
    elsif OLD.completed_at is not null and NEW.completed_at is null then
      perform app.emit_event(
        NEW.org_id,
        'card',
        'card_reopened',
        jsonb_build_object('previous_completed_at', OLD.completed_at),
        NEW.board_id,
        NEW.id,
        v_actor
      );
    end if;
    if NEW.title is distinct from OLD.title then v_fields := array_append(v_fields, 'title'); end if;
    if NEW.description is distinct from OLD.description then v_fields := array_append(v_fields, 'description'); end if;
    if NEW.due_date is distinct from OLD.due_date then v_fields := array_append(v_fields, 'due_date'); end if;
    if NEW.start_date is distinct from OLD.start_date then v_fields := array_append(v_fields, 'start_date'); end if;
    if array_length(v_fields, 1) > 0 then
      perform app.emit_event(NEW.org_id, 'card', 'card_updated', jsonb_build_object('changed_fields', to_jsonb(v_fields)), NEW.board_id, NEW.id, v_actor);
    end if;
    return NEW;
  end if;
  return coalesce(NEW, OLD);
end;
$$;

drop materialized view if exists public.throughput_by_board_week;
create materialized view public.throughput_by_board_week as
select
  e.org_id,
  e.board_id,
  date_trunc('week', e.occurred_at)::date as week_start,
  count(*)::int as completed_count
from public.card_events e
where e.event_type = 'card_completed'
  and e.board_id is not null
group by 1, 2, 3;

create unique index if not exists throughput_by_board_week_uidx
  on public.throughput_by_board_week (board_id, week_start);

drop materialized view if exists public.cycle_time_by_card;
create materialized view public.cycle_time_by_card as
with moves as (
  select
    e.board_id,
    e.card_id,
    e.occurred_at,
    (e.payload->>'to_column_id')::uuid as column_id,
    lag(e.occurred_at) over (partition by e.card_id order by e.occurred_at) as prev_at,
    lag((e.payload->>'to_column_id')::uuid) over (partition by e.card_id order by e.occurred_at) as prev_column_id
  from public.card_events e
  where e.event_type = 'card_moved'
    and e.board_id is not null
    and e.card_id is not null
)
select
  m.board_id,
  m.card_id,
  m.prev_column_id as column_id,
  extract(epoch from (m.occurred_at - m.prev_at)) / 3600.0 as dwell_hours
from moves m
where m.prev_at is not null
  and m.prev_column_id is not null;

create index if not exists cycle_time_by_card_board_idx on public.cycle_time_by_card (board_id);

drop materialized view if exists public.cfd_by_board_day;
create materialized view public.cfd_by_board_day as
select
  c.board_id,
  c.org_id,
  current_date as day,
  col.id as column_id,
  col.name as column_name,
  count(*)::int as card_count
from public.cards c
join public.columns col on col.id = c.column_id
where c.completed_at is null
group by 1, 2, 3, 4, 5;

create index if not exists cfd_by_board_day_board_idx on public.cfd_by_board_day (board_id, day);

create or replace function public.get_board_dashboard_bundle(p_board uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_result jsonb;
begin
  if not app.can_access_board(p_board) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select org_id into v_org from public.boards where id = p_board;
  if v_org is null then
    raise exception 'board_not_found' using errcode = 'P0002';
  end if;

  select jsonb_build_object(
    'throughput', coalesce((
      select jsonb_agg(jsonb_build_object('weekStart', week_start, 'count', completed_count) order by week_start)
      from (
        select week_start, completed_count
        from public.throughput_by_board_week
        where board_id = p_board
        order by week_start desc
        limit 12
      ) t
    ), '[]'::jsonb),
    'cfd', coalesce((
      select jsonb_agg(jsonb_build_object('columnId', column_id, 'columnName', column_name, 'count', card_count) order by column_name)
      from public.cfd_by_board_day
      where board_id = p_board
    ), '[]'::jsonb),
    'bottlenecks', coalesce((
      select jsonb_agg(jsonb_build_object('columnId', column_id, 'avgDwellHours', round(avg(dwell_hours)::numeric, 2), 'samples', count(*)) order by avg(dwell_hours) desc)
      from public.cycle_time_by_card
      where board_id = p_board
      group by column_id
      limit 8
    ), '[]'::jsonb),
    'leadTime', coalesce((
      select jsonb_build_object(
        'avgHours', round(avg(extract(epoch from (c.completed_at - c.created_at)) / 3600.0)::numeric, 2),
        'samples', count(*)
      )
      from public.cards c
      where c.board_id = p_board and c.completed_at is not null
    ), jsonb_build_object('avgHours', 0, 'samples', 0))
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.get_board_dashboard_bundle(uuid) from public;
grant execute on function public.get_board_dashboard_bundle(uuid) to authenticated;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid)
    from cron.job
    where jobname = 'refresh-analytics-mvs';
    perform cron.schedule(
      'refresh-analytics-mvs',
      '*/10 * * * *',
      $job$refresh materialized view public.throughput_by_board_week; refresh materialized view public.cycle_time_by_card; refresh materialized view public.cfd_by_board_day;$job$
    );
  end if;
exception when others then
  null;
end $$;
