-- Enrich audit payloads with display names (profiles, presets, columns, card title)
-- so UI/export descriptions stay identifiable even before load-time join enrichment.

create or replace function app.audit_profile_name(p_user_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select nullif(trim(p.full_name), '')
  from public.profiles p
  where p.id = p_user_id;
$$;

create or replace function app.audit_preset_name(p_preset_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select nullif(trim(ap.name), '')
  from public.access_presets ap
  where ap.id = p_preset_id;
$$;

create or replace function app.audit_column_name(p_column_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select nullif(trim(c.name), '')
  from public.columns c
  where c.id = p_column_id;
$$;

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
  v_board_name text;
  v_user_name text;
  v_preset_id uuid;
  v_preset_name text;
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
      v_user_name := app.audit_profile_name(NEW.user_id);
      perform app.emit_event(
        v_org, 'org', 'member_invited',
        jsonb_build_object('user_id', NEW.user_id, 'user_name', v_user_name, 'role', NEW.role),
        null, null, v_actor
      );
    elsif TG_OP = 'DELETE' then
      v_user_name := app.audit_profile_name(OLD.user_id);
      perform app.emit_event(
        v_org, 'org', 'member_removed',
        jsonb_build_object('user_id', OLD.user_id, 'user_name', v_user_name, 'role', OLD.role),
        null, null, v_actor
      );
    elsif TG_OP = 'UPDATE' and NEW.role is distinct from OLD.role then
      v_user_name := app.audit_profile_name(NEW.user_id);
      perform app.emit_event(
        v_org, 'org', 'role_changed',
        jsonb_build_object(
          'user_id', NEW.user_id,
          'user_name', v_user_name,
          'old_role', OLD.role,
          'new_role', NEW.role
        ),
        null, null, v_actor
      );
    end if;
    return coalesce(NEW, OLD);
  elsif TG_TABLE_NAME = 'board_members' then
    v_board := coalesce(NEW.board_id, OLD.board_id);
    select b.org_id, b.name into v_org, v_board_name from public.boards b where b.id = v_board;
    if TG_OP = 'INSERT' and v_org is not null then
      v_user_name := app.audit_profile_name(NEW.user_id);
      v_preset_id := NEW.preset_id;
      v_preset_name := case when v_preset_id is not null then app.audit_preset_name(v_preset_id) else null end;
      perform app.emit_event(
        v_org, 'board', 'board_member_added',
        jsonb_build_object(
          'user_id', NEW.user_id,
          'user_name', v_user_name,
          'role', NEW.role,
          'preset_id', v_preset_id,
          'preset_name', v_preset_name,
          'board_name', v_board_name
        ),
        v_board, null, v_actor
      );
    elsif TG_OP = 'DELETE' and v_org is not null then
      v_user_name := app.audit_profile_name(OLD.user_id);
      v_preset_id := OLD.preset_id;
      v_preset_name := case when v_preset_id is not null then app.audit_preset_name(v_preset_id) else null end;
      perform app.emit_event(
        v_org, 'board', 'board_member_removed',
        jsonb_build_object(
          'user_id', OLD.user_id,
          'user_name', v_user_name,
          'role', OLD.role,
          'preset_id', v_preset_id,
          'preset_name', v_preset_name,
          'board_name', v_board_name
        ),
        v_board, null, v_actor
      );
    end if;
    return coalesce(NEW, OLD);
  elsif TG_TABLE_NAME = 'columns' then
    v_org := coalesce(NEW.org_id, OLD.org_id);
    v_board := coalesce(NEW.board_id, OLD.board_id);
    select b.name into v_board_name from public.boards b where b.id = v_board;
    if TG_OP = 'INSERT' then
      perform app.emit_event(
        v_org, 'board', 'column_created',
        jsonb_build_object('name', NEW.name, 'column_id', NEW.id, 'board_name', v_board_name),
        v_board, null, v_actor
      );
    elsif TG_OP = 'UPDATE' and NEW.name is distinct from OLD.name then
      perform app.emit_event(
        v_org, 'board', 'column_renamed',
        jsonb_build_object('column_id', NEW.id, 'old_name', OLD.name, 'new_name', NEW.name, 'board_name', v_board_name),
        v_board, null, v_actor
      );
    elsif TG_OP = 'DELETE' then
      if not exists (select 1 from public.boards b where b.id = v_board) then
        v_board := null;
        v_board_name := null;
      end if;
      perform app.emit_event(
        v_org, 'board', 'column_deleted',
        jsonb_build_object('name', OLD.name, 'column_id', OLD.id, 'board_id', OLD.board_id, 'board_name', v_board_name),
        v_board, null, v_actor
      );
    end if;
    return coalesce(NEW, OLD);
  elsif TG_TABLE_NAME = 'departments' then
    v_org := coalesce(NEW.org_id, OLD.org_id);
    if TG_OP = 'UPDATE' and NEW.parent_id is distinct from OLD.parent_id then
      perform app.emit_event(
        v_org, 'org', 'department_moved',
        jsonb_build_object(
          'department_id', NEW.id,
          'department_name', NEW.name,
          'old_parent_id', OLD.parent_id,
          'new_parent_id', NEW.parent_id
        ),
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

create or replace function app.audit_emit_card()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_fields text[] := array[]::text[];
  v_from_col text;
  v_to_col text;
  v_old_assignee text;
  v_new_assignee text;
begin
  if current_setting('app.audit_skip', true) = '1' then
    return coalesce(NEW, OLD);
  end if;

  if TG_OP = 'INSERT' then
    perform app.emit_event(
      NEW.org_id, 'card', 'card_created',
      jsonb_build_object('title', NEW.title, 'column_id', NEW.column_id, 'column_name', app.audit_column_name(NEW.column_id)),
      NEW.board_id, NEW.id, coalesce(v_actor, NEW.created_by)
    );
    return NEW;
  elsif TG_OP = 'DELETE' then
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
      v_from_col := app.audit_column_name(OLD.column_id);
      v_to_col := app.audit_column_name(NEW.column_id);
      perform app.emit_event(
        NEW.org_id, 'card', 'card_moved',
        jsonb_build_object(
          'title', NEW.title,
          'from_column_id', OLD.column_id,
          'to_column_id', NEW.column_id,
          'from_column_name', v_from_col,
          'to_column_name', v_to_col
        ),
        NEW.board_id, NEW.id, v_actor
      );
    end if;
    if NEW.assignee_id is distinct from OLD.assignee_id then
      v_old_assignee := case when OLD.assignee_id is not null then app.audit_profile_name(OLD.assignee_id) else null end;
      v_new_assignee := case when NEW.assignee_id is not null then app.audit_profile_name(NEW.assignee_id) else null end;
      perform app.emit_event(
        NEW.org_id, 'card', 'card_assigned',
        jsonb_build_object(
          'title', NEW.title,
          'old_assignee_id', OLD.assignee_id,
          'new_assignee_id', NEW.assignee_id,
          'old_assignee_name', v_old_assignee,
          'new_assignee_name', v_new_assignee
        ),
        NEW.board_id, NEW.id, v_actor
      );
    end if;
    if NEW.priority is distinct from OLD.priority then
      perform app.emit_event(
        NEW.org_id, 'card', 'priority_changed',
        jsonb_build_object('title', NEW.title, 'from', OLD.priority, 'to', NEW.priority),
        NEW.board_id, NEW.id, v_actor
      );
    end if;
    if NEW.stage_id is distinct from OLD.stage_id then
      perform app.emit_event(
        NEW.org_id, 'card', 'stage_changed',
        jsonb_build_object('title', NEW.title, 'from_stage_id', OLD.stage_id, 'to_stage_id', NEW.stage_id),
        NEW.board_id, NEW.id, v_actor
      );
    end if;
    if OLD.completed_at is null and NEW.completed_at is not null then
      perform app.emit_event(
        NEW.org_id, 'card', 'card_completed',
        jsonb_build_object('title', NEW.title, 'completed_at', NEW.completed_at, 'stage_id', NEW.stage_id),
        NEW.board_id, NEW.id, v_actor
      );
    elsif OLD.completed_at is not null and NEW.completed_at is null then
      perform app.emit_event(
        NEW.org_id, 'card', 'card_reopened',
        jsonb_build_object('title', NEW.title, 'previous_completed_at', OLD.completed_at),
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
        jsonb_build_object('title', NEW.title, 'changed_fields', to_jsonb(v_fields)),
        NEW.board_id, NEW.id, v_actor
      );
    end if;
    return NEW;
  end if;
  return coalesce(NEW, OLD);
end;
$$;
