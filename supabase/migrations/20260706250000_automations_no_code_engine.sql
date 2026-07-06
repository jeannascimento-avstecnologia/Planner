-- Épico A: Motor de automações no-code (trigger Postgres + private.execute_automations_for_event)

create schema if not exists private;

-- Colunas de controle de recursão em card_events
alter table public.card_events
  add column if not exists automation_depth int not null default 0,
  add column if not exists root_event_id bigint references public.card_events(id) on delete set null;

-- Normaliza automation_rules para schema no-code
do $migrate$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'automation_rules' and column_name = 'enabled'
  ) then
    alter table public.automation_rules rename column enabled to active;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'automation_rules' and column_name = 'trigger_event_type'
  ) then
    alter table public.automation_rules rename column trigger_event_type to trigger_event;
  end if;
exception when others then
  raise notice 'automation_rules migrate: %', sqlerrm;
end;
$migrate$;

create table if not exists public.automation_rules (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  board_id uuid not null references public.boards(id) on delete cascade,
  name text not null,
  trigger_event text not null check (trigger_event in ('card_created', 'card_moved', 'priority_changed')),
  conditions jsonb not null default '{}'::jsonb,
  actions jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.automation_rules
  add column if not exists active boolean not null default true,
  add column if not exists trigger_event text,
  add column if not exists updated_at timestamptz not null default now();

update public.automation_rules set trigger_event = 'card_moved' where trigger_event is null;

alter table public.automation_rules
  alter column board_id set not null,
  alter column conditions set default '{}'::jsonb;

create index if not exists automation_rules_org_idx on public.automation_rules (org_id);
create index if not exists automation_rules_board_idx on public.automation_rules (board_id);

drop trigger if exists trg_automation_rules_updated on public.automation_rules;
create trigger trg_automation_rules_updated
  before update on public.automation_rules
  for each row execute function app.set_updated_at();

alter table public.automation_rules enable row level security;

drop policy if exists automation_rules_select on public.automation_rules;
drop policy if exists automation_rules_write on public.automation_rules;

create policy automation_rules_select on public.automation_rules
  for select using (app.can_access_board(board_id));

create policy automation_rules_insert on public.automation_rules
  for insert with check (app.can_write_board(board_id));

create policy automation_rules_update on public.automation_rules
  for update using (app.can_write_board(board_id))
  with check (app.can_write_board(board_id));

create policy automation_rules_delete on public.automation_rules
  for delete using (app.can_write_board(board_id));

grant select, insert, update, delete on public.automation_rules to authenticated;

-- emit_event propaga profundidade de automação
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
begin
  if p_event_scope not in ('card', 'board', 'org') then
    raise exception 'invalid event_scope';
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
    coalesce(p_payload, '{}'::jsonb),
    now(),
    v_depth,
    v_root
  )
  returning id into v_id;

  if v_root is null and v_depth = 0 then
    update public.card_events set root_event_id = v_id where id = v_id;
  end if;

  return v_id;
end;
$$;

-- Audit: emite priority_changed explicitamente
create or replace function app.audit_emit_card()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_fields text[] := array[]::text[];
begin
  if current_setting('app.automation_running', true) = '1' then
    -- ainda emite eventos; profundidade vem de app.automation_depth
  end if;

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
    elsif coalesce(p_card.column_id::text, '') <> v_col then
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

create or replace function private.apply_automation_action(
  p_action jsonb,
  p_card_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_type text := p_action->>'type';
begin
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
  v_event public.card_events%rowtype;
  v_card public.cards%rowtype;
  v_rule record;
  v_action jsonb;
  v_root bigint;
  v_next_depth int;
begin
  select * into v_event from public.card_events where id = p_event_id;
  if not found then
    return;
  end if;

  if v_event.automation_depth >= 3 then
    raise exception 'automation_depth_exceeded' using errcode = 'P0001';
  end if;

  if v_event.board_id is null or v_event.card_id is null then
    return;
  end if;

  select * into v_card from public.cards where id = v_event.card_id;
  if not found then
    return;
  end if;

  v_root := coalesce(v_event.root_event_id, v_event.id);
  v_next_depth := v_event.automation_depth + 1;

  perform set_config('app.automation_depth', v_next_depth::text, true);
  perform set_config('app.automation_root_event_id', v_root::text, true);
  perform set_config('app.automation_running', '1', true);

  for v_rule in
    select *
    from public.automation_rules r
    where r.board_id = v_event.board_id
      and r.active = true
      and r.trigger_event = v_event.event_type
  loop
    if private.automation_conditions_match(v_rule.conditions, v_event, v_card) then
      for v_action in select jsonb_array_elements(v_rule.actions)
      loop
        perform private.apply_automation_action(v_action, v_card.id);
        select * into v_card from public.cards where id = v_event.card_id;
      end loop;
    end if;
  end loop;

  perform set_config('app.automation_running', '0', true);
end;
$$;

revoke all on function private.execute_automations_for_event(bigint) from public;
revoke all on function private.automation_conditions_match(jsonb, public.card_events, public.cards) from public;
revoke all on function private.apply_automation_action(jsonb, uuid) from public;

create or replace function app.trg_after_card_event_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if NEW.event_scope = 'card' and NEW.board_id is not null and NEW.card_id is not null then
    perform private.execute_automations_for_event(NEW.id);
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_after_card_event_insert on public.card_events;
create trigger trg_after_card_event_insert
  after insert on public.card_events
  for each row execute function app.trg_after_card_event_insert();
