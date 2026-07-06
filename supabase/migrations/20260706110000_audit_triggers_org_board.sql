-- F.1 audit triggers: org + board scope

create or replace function app.audit_emit_org_board()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_board uuid;
  v_scope text;
  v_type text;
  v_payload jsonb := '{}'::jsonb;
  v_actor uuid := auth.uid();
begin
  if TG_TABLE_NAME = 'boards' then
    if TG_OP = 'INSERT' then
      perform app.emit_event(NEW.org_id, 'board', 'board_created', jsonb_build_object('name', NEW.name), NEW.id, null, v_actor);
      return NEW;
    elsif TG_OP = 'UPDATE' then
      if NEW.name is distinct from OLD.name then
        perform app.emit_event(NEW.org_id, 'board', 'board_renamed', jsonb_build_object('old_name', OLD.name, 'new_name', NEW.name), NEW.id, null, v_actor);
      end if;
      return NEW;
    elsif TG_OP = 'DELETE' then
      perform app.emit_event(OLD.org_id, 'board', 'board_deleted', jsonb_build_object('name', OLD.name), OLD.id, null, v_actor);
      return OLD;
    end if;
  elsif TG_TABLE_NAME = 'memberships' then
    v_org := coalesce(NEW.org_id, OLD.org_id);
    if TG_OP = 'INSERT' then
      perform app.emit_event(v_org, 'org', 'member_invited', jsonb_build_object('user_id', NEW.user_id, 'role', NEW.role), null, null, v_actor);
    elsif TG_OP = 'DELETE' then
      perform app.emit_event(v_org, 'org', 'member_removed', jsonb_build_object('user_id', OLD.user_id, 'role', OLD.role), null, null, v_actor);
    elsif TG_OP = 'UPDATE' and NEW.role is distinct from OLD.role then
      perform app.emit_event(v_org, 'org', 'role_changed', jsonb_build_object('user_id', NEW.user_id, 'old_role', OLD.role, 'new_role', NEW.role), null, null, v_actor);
    end if;
    return coalesce(NEW, OLD);
  elsif TG_TABLE_NAME = 'board_members' then
    v_board := coalesce(NEW.board_id, OLD.board_id);
    select b.org_id into v_org from public.boards b where b.id = v_board;
    if TG_OP = 'INSERT' then
      perform app.emit_event(v_org, 'board', 'board_member_added', jsonb_build_object('user_id', NEW.user_id, 'role', NEW.role), v_board, null, v_actor);
    elsif TG_OP = 'DELETE' then
      perform app.emit_event(v_org, 'board', 'board_member_removed', jsonb_build_object('user_id', OLD.user_id, 'role', OLD.role), v_board, null, v_actor);
    end if;
    return coalesce(NEW, OLD);
  elsif TG_TABLE_NAME = 'columns' then
    v_org := coalesce(NEW.org_id, OLD.org_id);
    v_board := coalesce(NEW.board_id, OLD.board_id);
    if TG_OP = 'INSERT' then
      perform app.emit_event(v_org, 'board', 'column_created', jsonb_build_object('name', NEW.name, 'column_id', NEW.id), v_board, null, v_actor);
    elsif TG_OP = 'UPDATE' and NEW.name is distinct from OLD.name then
      perform app.emit_event(v_org, 'board', 'column_renamed', jsonb_build_object('column_id', NEW.id, 'old_name', OLD.name, 'new_name', NEW.name), v_board, null, v_actor);
    elsif TG_OP = 'DELETE' then
      perform app.emit_event(v_org, 'board', 'column_deleted', jsonb_build_object('name', OLD.name, 'column_id', OLD.id), v_board, null, v_actor);
    end if;
    return coalesce(NEW, OLD);
  elsif TG_TABLE_NAME = 'departments' then
    v_org := coalesce(NEW.org_id, OLD.org_id);
    if TG_OP = 'UPDATE' and NEW.parent_id is distinct from OLD.parent_id then
      perform app.emit_event(v_org, 'org', 'department_moved', jsonb_build_object('department_id', NEW.id, 'old_parent_id', OLD.parent_id, 'new_parent_id', NEW.parent_id), null, null, v_actor);
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

drop trigger if exists audit_boards on public.boards;
create trigger audit_boards after insert or update or delete on public.boards
  for each row execute function app.audit_emit_org_board();

drop trigger if exists audit_memberships on public.memberships;
create trigger audit_memberships after insert or update or delete on public.memberships
  for each row execute function app.audit_emit_org_board();

drop trigger if exists audit_board_members on public.board_members;
create trigger audit_board_members after insert or delete on public.board_members
  for each row execute function app.audit_emit_org_board();

drop trigger if exists audit_columns on public.columns;
create trigger audit_columns after insert or update or delete on public.columns
  for each row execute function app.audit_emit_org_board();

drop trigger if exists audit_departments on public.departments;
create trigger audit_departments after update on public.departments
  for each row execute function app.audit_emit_org_board();

drop trigger if exists audit_organizations on public.organizations;
create trigger audit_organizations after update on public.organizations
  for each row execute function app.audit_emit_org_board();
