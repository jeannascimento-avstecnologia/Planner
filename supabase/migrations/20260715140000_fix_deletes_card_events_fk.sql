-- Fix deletes: card_events append-only bloqueava ON DELETE SET NULL dos FKs
-- e audit AFTER DELETE inseria card_id/board_id ja removidos (FK violation).

create or replace function app.deny_card_events_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_setting('app.card_events_purge', true) = '1' then
    return case TG_OP when 'DELETE' then OLD else NEW end;
  end if;

  if current_setting('app.card_events_cascade', true) = '1'
     and TG_OP = 'UPDATE'
     and OLD.id = NEW.id
     and OLD.org_id is distinct from NEW.org_id
     and OLD.board_id is not distinct from NEW.board_id
     and OLD.card_id is not distinct from NEW.card_id
     and OLD.event_scope is not distinct from NEW.event_scope
     and OLD.event_type is not distinct from NEW.event_type
     and OLD.payload is not distinct from NEW.payload
     and OLD.automation_depth is not distinct from NEW.automation_depth
     and OLD.root_event_id is not distinct from NEW.root_event_id
  then
    return NEW;
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

  -- Permite SET NULL vindo dos FKs card_events_card_id_fkey / board_id_fkey
  -- (sem isso, DELETE em cards/boards/columns falha com "card_events is append-only").
  if TG_OP = 'UPDATE'
     and OLD.id = NEW.id
     and OLD.org_id is not distinct from NEW.org_id
     and OLD.event_scope is not distinct from NEW.event_scope
     and OLD.event_type is not distinct from NEW.event_type
     and OLD.payload is not distinct from NEW.payload
     and OLD.actor_id is not distinct from NEW.actor_id
     and OLD.occurred_at is not distinct from NEW.occurred_at
     and OLD.automation_depth is not distinct from NEW.automation_depth
     and OLD.root_event_id is not distinct from NEW.root_event_id
     and (
       (OLD.card_id is not null and NEW.card_id is null and OLD.board_id is not distinct from NEW.board_id)
       or (OLD.board_id is not null and NEW.board_id is null and OLD.card_id is not distinct from NEW.card_id)
       or (
         OLD.card_id is not null and NEW.card_id is null
         and OLD.board_id is not null and NEW.board_id is null
       )
     )
  then
    return NEW;
  end if;

  raise exception 'card_events is append-only';
end;
$$;

-- Audit card: no DELETE nao referenciar card_id removido (mantem demais eventos do analytics)
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
  if current_setting('app.audit_skip', true) = '1' then
    return coalesce(NEW, OLD);
  end if;

  if TG_OP = 'INSERT' then
    perform app.emit_event(
      NEW.org_id, 'card', 'card_created',
      jsonb_build_object('title', NEW.title, 'column_id', NEW.column_id),
      NEW.board_id, NEW.id, coalesce(v_actor, NEW.created_by)
    );
    return NEW;
  elsif TG_OP = 'DELETE' then
    -- board ainda costuma existir; se cascade inverter ordem, evita FK morta
    perform app.emit_event(
      OLD.org_id, 'card', 'card_deleted',
      jsonb_build_object('title', OLD.title, 'card_id', OLD.id, 'board_id', OLD.board_id),
      case when exists (select 1 from public.boards b where b.id = OLD.board_id) then OLD.board_id else null end,
      null,
      v_actor
    );
    return OLD;
  elsif TG_OP = 'UPDATE' then
    if NEW.column_id is distinct from OLD.column_id then
      perform app.emit_event(
        NEW.org_id, 'card', 'card_moved',
        jsonb_build_object('from_column_id', OLD.column_id, 'to_column_id', NEW.column_id),
        NEW.board_id, NEW.id, v_actor
      );
    end if;
    if NEW.assignee_id is distinct from OLD.assignee_id then
      perform app.emit_event(
        NEW.org_id, 'card', 'card_assigned',
        jsonb_build_object('old_assignee_id', OLD.assignee_id, 'new_assignee_id', NEW.assignee_id),
        NEW.board_id, NEW.id, v_actor
      );
    end if;
    if NEW.priority is distinct from OLD.priority then
      perform app.emit_event(
        NEW.org_id, 'card', 'priority_changed',
        jsonb_build_object('from', OLD.priority, 'to', NEW.priority),
        NEW.board_id, NEW.id, v_actor
      );
    end if;
    if NEW.stage_id is distinct from OLD.stage_id then
      perform app.emit_event(
        NEW.org_id, 'card', 'stage_changed',
        jsonb_build_object('from_stage_id', OLD.stage_id, 'to_stage_id', NEW.stage_id),
        NEW.board_id, NEW.id, v_actor
      );
    end if;
    if OLD.completed_at is null and NEW.completed_at is not null then
      perform app.emit_event(
        NEW.org_id, 'card', 'card_completed',
        jsonb_build_object('completed_at', NEW.completed_at, 'stage_id', NEW.stage_id),
        NEW.board_id, NEW.id, v_actor
      );
    elsif OLD.completed_at is not null and NEW.completed_at is null then
      perform app.emit_event(
        NEW.org_id, 'card', 'card_reopened',
        jsonb_build_object('previous_completed_at', OLD.completed_at),
        NEW.board_id, NEW.id, v_actor
      );
    end if;
    if NEW.title is distinct from OLD.title then v_fields := array_append(v_fields, 'title'); end if;
    if NEW.description is distinct from OLD.description then v_fields := array_append(v_fields, 'description'); end if;
    if NEW.due_date is distinct from OLD.due_date then v_fields := array_append(v_fields, 'due_date'); end if;
    if NEW.start_date is distinct from OLD.start_date then v_fields := array_append(v_fields, 'start_date'); end if;
    if array_length(v_fields, 1) > 0 then
      perform app.emit_event(
        NEW.org_id, 'card', 'card_updated',
        jsonb_build_object('changed_fields', to_jsonb(v_fields)),
        NEW.board_id, NEW.id, v_actor
      );
    end if;
    return NEW;
  end if;
  return coalesce(NEW, OLD);
end;
$$;

-- Audit org/board: no DELETE de board, board_id null + id no payload
create or replace function app.audit_emit_org_board()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_board uuid;
  v_actor uuid := auth.uid();
begin
  if current_setting('app.audit_skip', true) = '1' then
    return coalesce(NEW, OLD);
  end if;

  if TG_TABLE_NAME = 'boards' then
    if TG_OP = 'INSERT' then
      perform app.emit_event(NEW.org_id, 'board', 'board_created', jsonb_build_object('name', NEW.name), NEW.id, null, v_actor);
      return NEW;
    elsif TG_OP = 'UPDATE' then
      if NEW.name is distinct from OLD.name then
        perform app.emit_event(
          NEW.org_id, 'board', 'board_renamed',
          jsonb_build_object('old_name', OLD.name, 'new_name', NEW.name),
          NEW.id, null, v_actor
        );
      end if;
      return NEW;
    elsif TG_OP = 'DELETE' then
      perform app.emit_event(
        OLD.org_id, 'board', 'board_deleted',
        jsonb_build_object('name', OLD.name, 'board_id', OLD.id),
        null, null, v_actor
      );
      return OLD;
    end if;
  elsif TG_TABLE_NAME = 'memberships' then
    v_org := coalesce(NEW.org_id, OLD.org_id);
    if TG_OP = 'INSERT' then
      perform app.emit_event(v_org, 'org', 'member_invited', jsonb_build_object('user_id', NEW.user_id, 'role', NEW.role), null, null, v_actor);
    elsif TG_OP = 'DELETE' then
      perform app.emit_event(v_org, 'org', 'member_removed', jsonb_build_object('user_id', OLD.user_id, 'role', OLD.role), null, null, v_actor);
    elsif TG_OP = 'UPDATE' and NEW.role is distinct from OLD.role then
      perform app.emit_event(
        v_org, 'org', 'role_changed',
        jsonb_build_object('user_id', NEW.user_id, 'old_role', OLD.role, 'new_role', NEW.role),
        null, null, v_actor
      );
    end if;
    return coalesce(NEW, OLD);
  elsif TG_TABLE_NAME = 'board_members' then
    v_board := coalesce(NEW.board_id, OLD.board_id);
    select b.org_id into v_org from public.boards b where b.id = v_board;
    if TG_OP = 'INSERT' and v_org is not null then
      perform app.emit_event(v_org, 'board', 'board_member_added', jsonb_build_object('user_id', NEW.user_id, 'role', NEW.role), v_board, null, v_actor);
    elsif TG_OP = 'DELETE' and v_org is not null then
      perform app.emit_event(v_org, 'board', 'board_member_removed', jsonb_build_object('user_id', OLD.user_id, 'role', OLD.role), v_board, null, v_actor);
    end if;
    return coalesce(NEW, OLD);
  elsif TG_TABLE_NAME = 'columns' then
    v_org := coalesce(NEW.org_id, OLD.org_id);
    v_board := coalesce(NEW.board_id, OLD.board_id);
    if TG_OP = 'INSERT' then
      perform app.emit_event(v_org, 'board', 'column_created', jsonb_build_object('name', NEW.name, 'column_id', NEW.id), v_board, null, v_actor);
    elsif TG_OP = 'UPDATE' and NEW.name is distinct from OLD.name then
      perform app.emit_event(
        v_org, 'board', 'column_renamed',
        jsonb_build_object('column_id', NEW.id, 'old_name', OLD.name, 'new_name', NEW.name),
        v_board, null, v_actor
      );
    elsif TG_OP = 'DELETE' then
      -- Em cascade de board, o board pode ja ter sumido antes deste AFTER DELETE.
      if not exists (select 1 from public.boards b where b.id = v_board) then
        v_board := null;
      end if;
      perform app.emit_event(
        v_org, 'board', 'column_deleted',
        jsonb_build_object('name', OLD.name, 'column_id', OLD.id, 'board_id', OLD.board_id),
        v_board, null, v_actor
      );
    end if;
    return coalesce(NEW, OLD);
  elsif TG_TABLE_NAME = 'departments' then
    v_org := coalesce(NEW.org_id, OLD.org_id);
    if TG_OP = 'UPDATE' and NEW.parent_id is distinct from OLD.parent_id then
      perform app.emit_event(
        v_org, 'org', 'department_moved',
        jsonb_build_object('department_id', NEW.id, 'old_parent_id', OLD.parent_id, 'new_parent_id', NEW.parent_id),
        null, null, v_actor
      );
    end if;
    return coalesce(NEW, OLD);
  elsif TG_TABLE_NAME = 'organizations' then
    if TG_OP = 'UPDATE' and NEW.name is distinct from OLD.name then
      perform app.emit_event(NEW.id, 'org', 'org_renamed', jsonb_build_object('old_name', OLD.name, 'new_name', NEW.name), null, null, v_actor);
    elsif TG_OP = 'UPDATE' and NEW.logo_url is distinct from OLD.logo_url then
      perform app.emit_event(NEW.id, 'org', 'org_logo_updated', jsonb_build_object('has_logo', NEW.logo_url is not null), null, null, v_actor);
    end if;
    return NEW;
  end if;
  return coalesce(NEW, OLD);
end;
$$;

-- Restaura emit_event completo (root_fixup) caso tenha sido sobrescrito em debug local
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
