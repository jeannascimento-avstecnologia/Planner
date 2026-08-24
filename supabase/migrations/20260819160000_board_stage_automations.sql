-- Board stage/column automations: stage_changed, set_stage, apply_column_default_stage, due_overdue + add_tag
-- Loop guard: payload.triggered_by_automation on events emitted during automation runs

-- Extend allowed trigger events
alter table public.automation_rules drop constraint if exists automation_rules_trigger_event_check;
alter table public.automation_rules add constraint automation_rules_trigger_event_check
  check (trigger_event in (
    'card_created', 'card_moved', 'priority_changed', 'stage_changed', 'due_overdue'
  ));

-- Mark automation-originated events to break stage <-> column cycles
create or replace function app.emit_event(
  p_org_id uuid,
  p_event_scope text,
  p_event_type text,
  p_payload jsonb default '{}'::jsonb,
  p_board_id uuid default null,
  p_card_id uuid default null,
  p_actor_id uuid default null
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id bigint;
  v_actor uuid := coalesce(p_actor_id, auth.uid());
  v_depth int := coalesce(nullif(current_setting('app.automation_depth', true), ''), '0')::int;
  v_root bigint := nullif(current_setting('app.automation_root_event_id', true), '')::bigint;
  v_payload jsonb := coalesce(p_payload, '{}'::jsonb);
begin
  if p_event_scope not in ('card', 'board', 'org') then
    raise exception 'invalid event_scope';
  end if;

  if current_setting('app.automation_running', true) = '1' then
    v_payload := v_payload || jsonb_build_object('triggered_by_automation', true);
  end if;

  insert into public.card_events (
    org_id, board_id, card_id, actor_id,
    event_scope, event_type, payload, occurred_at,
    automation_depth, root_event_id
  )
  values (
    p_org_id,
    p_board_id,
    p_card_id,
    v_actor,
    p_event_scope,
    p_event_type,
    v_payload,
    now(),
    v_depth,
    v_root
  )
  returning id into v_id;

  if v_root is null and v_depth = 0 then
    perform set_config('app.card_events_root_fixup', '1', true);
    update public.card_events set root_event_id = v_id where id = v_id and root_event_id is null;
    perform set_config('app.card_events_root_fixup', '0', true);
  end if;

  return v_id;
end;
$$;

create or replace function private.automation_conditions_match(
  p_conditions jsonb,
  p_event public.card_events,
  p_card public.cards
)
returns boolean
language plpgsql
stable
set search_path = ''
as $$
declare
  v_col text;
  v_pri text;
  v_stage text;
begin
  if p_conditions is null or p_conditions = '{}'::jsonb then
    return true;
  end if;

  if p_conditions ? 'column_id' then
    v_col := p_conditions->>'column_id';
    if p_event.event_type = 'card_moved' then
      if coalesce(p_event.payload->>'to_column_id', '') <> v_col then
        return false;
      end if;
    elsif p_event.event_type = 'card_created' then
      if coalesce(p_event.payload->>'column_id', p_card.column_id::text, '') <> v_col then
        return false;
      end if;
    elsif coalesce(p_card.column_id::text, '') <> v_col then
      return false;
    end if;
  end if;

  if p_conditions ? 'stage_id' then
    v_stage := p_conditions->>'stage_id';
    if p_event.event_type = 'stage_changed' then
      if coalesce(p_event.payload->>'to_stage_id', '') <> v_stage then
        return false;
      end if;
    elsif coalesce(p_card.stage_id::text, '') <> v_stage then
      return false;
    end if;
  end if;

  if p_conditions ? 'priority' then
    v_pri := p_conditions->>'priority';
    if p_event.event_type = 'priority_changed' then
      if coalesce(p_event.payload->>'to', '') <> v_pri then
        return false;
      end if;
    elsif coalesce(p_card.priority::text, '') <> v_pri then
      return false;
    end if;
  end if;

  return true;
end;
$$;

create or replace function private.ensure_board_tag(
  p_board_id uuid,
  p_org_id uuid,
  p_tag_name text,
  p_color text default '#DC2626'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tag_id uuid;
begin
  select id into v_tag_id
  from public.tags
  where board_id = p_board_id and lower(trim(name)) = lower(trim(p_tag_name))
  limit 1;

  if v_tag_id is not null then
    return v_tag_id;
  end if;

  insert into public.tags (org_id, board_id, name, color)
  values (p_org_id, p_board_id, trim(p_tag_name), p_color)
  on conflict (board_id, name) do update set name = excluded.name
  returning id into v_tag_id;

  return v_tag_id;
end;
$$;

create or replace function private.apply_automation_action(
  p_action jsonb,
  p_card_id uuid,
  p_org uuid default null,
  p_board uuid default null,
  p_rule uuid default null,
  p_event bigint default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_type text := p_action->>'type';
  v_org uuid;
  v_board uuid;
  v_tag_id uuid;
  v_default_stage uuid;
begin
  select org_id, board_id into v_org, v_board from public.cards where id = p_card_id;
  v_org := coalesce(p_org, v_org);
  v_board := coalesce(p_board, v_board);

  case v_type
    when 'move_card' then
      update public.cards
      set column_id = (p_action->>'target_column_id')::uuid,
          updated_at = now()
      where id = p_card_id;
    when 'set_priority' then
      update public.cards
      set priority = (p_action->>'value')::public.card_priority,
          updated_at = now()
      where id = p_card_id;
    when 'set_assignee' then
      update public.cards
      set assignee_id = nullif(p_action->>'user_id', '')::uuid,
          updated_at = now()
      where id = p_card_id;
    when 'set_stage' then
      update public.cards
      set stage_id = nullif(p_action->>'stage_id', '')::uuid,
          updated_at = now()
      where id = p_card_id;
    when 'apply_column_default_stage' then
      select col.default_stage_id into v_default_stage
      from public.cards c
      join public.columns col on col.id = c.column_id
      where c.id = p_card_id;

      if v_default_stage is not null then
        update public.cards
        set stage_id = v_default_stage,
            updated_at = now()
        where id = p_card_id
          and stage_id is null;
      end if;
    when 'add_tag' then
      if nullif(trim(p_action->>'tag_id'), '') is not null then
        v_tag_id := (p_action->>'tag_id')::uuid;
      else
        v_tag_id := private.ensure_board_tag(
          v_board,
          v_org,
          coalesce(nullif(trim(p_action->>'tag_name'), ''), 'Atrasado'),
          coalesce(nullif(trim(p_action->>'tag_color'), ''), '#DC2626')
        );
      end if;

      insert into public.card_tags (card_id, tag_id, org_id)
      values (p_card_id, v_tag_id, v_org)
      on conflict do nothing;
    when 'send_slack', 'send_email', 'webhook' then
      perform private.enqueue_automation_outbox(v_org, v_board, p_rule, p_card_id, p_event, p_action);
    else
      raise exception 'unknown_automation_action: %', v_type;
  end case;
end;
$$;

create or replace function private.execute_automations_for_event(p_event_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event public.card_events;
  v_card public.cards;
  v_rule public.automation_rules;
  v_action jsonb;
  v_next_depth int;
  v_root bigint;
  v_prev_depth text;
  v_prev_root text;
  v_prev_running text;
begin
  v_prev_depth := coalesce(current_setting('app.automation_depth', true), '');
  v_prev_root := coalesce(current_setting('app.automation_root_event_id', true), '');
  v_prev_running := coalesce(current_setting('app.automation_running', true), '');

  select * into v_event from public.card_events where id = p_event_id;
  if not found then return; end if;

  if coalesce(v_event.payload->>'triggered_by_automation', 'false') = 'true' then
    return;
  end if;

  if v_event.automation_depth >= 3 then
    raise exception 'automation_depth_exceeded' using errcode = 'P0001';
  end if;
  if v_event.card_id is null or v_event.board_id is null then return; end if;

  select * into v_card from public.cards where id = v_event.card_id;
  if not found then return; end if;

  v_next_depth := v_event.automation_depth + 1;
  v_root := coalesce(v_event.root_event_id, v_event.id);

  perform set_config('app.automation_depth', v_next_depth::text, true);
  perform set_config('app.automation_root_event_id', v_root::text, true);
  perform set_config('app.automation_running', '1', true);

  for v_rule in
    select * from public.automation_rules r
    where r.board_id = v_event.board_id
      and r.active = true
      and r.trigger_event = v_event.event_type
  loop
    if not private.automation_conditions_match(v_rule.conditions, v_event, v_card) then
      continue;
    end if;
    for v_action in select * from jsonb_array_elements(v_rule.actions)
    loop
      perform private.apply_automation_action(
        v_action, v_card.id, v_rule.org_id, v_rule.board_id, v_rule.id, p_event_id
      );
      select * into v_card from public.cards where id = v_card.id;
    end loop;
  end loop;

  perform set_config('app.automation_depth', v_prev_depth, true);
  perform set_config('app.automation_root_event_id', v_prev_root, true);
  perform set_config('app.automation_running', v_prev_running, true);
end;
$$;

-- Overdue cards: apply due_overdue rules (visual tag only)
create or replace function private.card_is_overdue(p_card public.cards)
returns boolean
language plpgsql
stable
set search_path = ''
as $$
declare
  v_stage_key text;
begin
  if p_card.completed_at is not null or p_card.due_date is null then
    return false;
  end if;
  if p_card.due_date::date >= current_date then
    return false;
  end if;
  if p_card.stage_id is not null then
    select system_key into v_stage_key from public.stages where id = p_card.stage_id;
    if v_stage_key = 'concluido' then
      return false;
    end if;
  end if;
  return true;
end;
$$;

create or replace function public.sync_board_overdue_automations(p_board_id uuid)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rule public.automation_rules;
  v_card public.cards;
  v_action jsonb;
  v_count int := 0;
begin
  if not app.can_access_board(p_board_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  for v_rule in
    select * from public.automation_rules
    where board_id = p_board_id
      and active = true
      and trigger_event = 'due_overdue'
  loop
    for v_card in
      select c.*
      from public.cards c
      where c.board_id = p_board_id
        and private.card_is_overdue(c)
    loop
      for v_action in select * from jsonb_array_elements(v_rule.actions)
      loop
        perform private.apply_automation_action(
          v_action, v_card.id, v_rule.org_id, v_rule.board_id, v_rule.id, null
        );
      end loop;
      v_count := v_count + 1;
    end loop;
  end loop;

  return v_count;
end;
$$;

grant execute on function public.sync_board_overdue_automations(uuid) to authenticated;

create or replace function private.run_due_overdue_automations()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_board_id uuid;
begin
  for v_board_id in
    select distinct board_id
    from public.automation_rules
    where active = true and trigger_event = 'due_overdue'
  loop
    perform public.sync_board_overdue_automations(v_board_id);
  end loop;
end;
$$;

do $cron$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid)
    from cron.job
    where jobname = 'board-due-overdue-automations';
    perform cron.schedule(
      'board-due-overdue-automations',
      '5 3 * * *',
      $$select private.run_due_overdue_automations()$$
    );
  end if;
exception when others then
  raise notice 'pg_cron board-due-overdue-automations: %', sqlerrm;
end;
$cron$;

revoke all on function private.ensure_board_tag(uuid, uuid, text, text) from public;
revoke all on function private.card_is_overdue(public.cards) from public;
revoke all on function private.run_due_overdue_automations() from public;
