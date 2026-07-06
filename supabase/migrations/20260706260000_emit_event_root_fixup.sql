-- Fix: root_event_id self-update em card_events append-only

create or replace function app.deny_card_events_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_setting('app.card_events_purge', true) = '1' then
    return case TG_OP when 'DELETE' then OLD else NEW end;
  end if;

  if current_setting('app.card_events_root_fixup', true) = '1'
     and TG_OP = 'UPDATE'
     and OLD.id = NEW.id
     and OLD.root_event_id is null
     and NEW.root_event_id = NEW.id
     and OLD.org_id is not distinct from NEW.org_id
     and OLD.board_id is not distinct from NEW.board_id
     and OLD.card_id is not distinct from NEW.card_id
     and OLD.event_scope is not distinct from NEW.event_scope
     and OLD.event_type is not distinct from NEW.event_type
     and OLD.payload is not distinct from NEW.payload
     and OLD.automation_depth is not distinct from NEW.automation_depth
  then
    return NEW;
  end if;

  raise exception 'card_events is append-only';
end;
$$;

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
    perform set_config('app.card_events_root_fixup', '1', true);
    update public.card_events set root_event_id = v_id where id = v_id and root_event_id is null;
    perform set_config('app.card_events_root_fixup', '0', true);
  end if;

  return v_id;
end;
$$;
