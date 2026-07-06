-- QA: audit skip on org delete + card_events org_id cascade on move_board

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

  raise exception 'card_events is append-only';
end;
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

create or replace function public.delete_organization(p_org uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  if not exists (
    select 1
    from public.memberships m
    where m.org_id = p_org
      and m.user_id = v_uid
      and m.role = 'owner'::public.membership_role
  ) then
    raise exception 'forbidden';
  end if;

  perform set_config('app.audit_skip', '1', true);
  perform set_config('app.card_events_purge', '1', true);
  delete from public.card_events where org_id = p_org;
  delete from public.organizations where id = p_org;
  if not found then
    perform set_config('app.card_events_purge', '0', true);
    perform set_config('app.audit_skip', '0', true);
    raise exception 'org_not_found';
  end if;
  perform set_config('app.card_events_purge', '0', true);
  perform set_config('app.audit_skip', '0', true);
end;
$$;

create or replace function public.move_board_to_org(p_board uuid, p_target_org uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_source_org uuid;
  v_updated int;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select org_id into v_source_org from public.boards where id = p_board;
  if not found then
    raise exception 'board_not_found';
  end if;

  if v_source_org = p_target_org then
    raise exception 'same_org';
  end if;

  if not app.has_org_role(v_source_org, array['admin', 'owner']) then
    raise exception 'forbidden_source';
  end if;

  if not app.has_org_role(p_target_org, array['admin', 'owner']) then
    raise exception 'forbidden_target';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_board::text));
  perform set_config('app.card_events_cascade', '1', true);

  update public.boards set org_id = p_target_org where id = p_board;
  update public.columns set org_id = p_target_org where board_id = p_board;
  update public.stages set org_id = p_target_org where board_id = p_board;
  update public.cards set org_id = p_target_org where board_id = p_board;
  update public.tags set org_id = p_target_org where board_id = p_board;

  update public.card_tags ct
  set org_id = p_target_org
  from public.cards c
  where c.id = ct.card_id and c.board_id = p_board;

  update public.card_dependencies cd
  set org_id = p_target_org
  where cd.blocker_card_id in (select id from public.cards where board_id = p_board)
     or cd.blocked_card_id in (select id from public.cards where board_id = p_board);

  update public.card_events set org_id = p_target_org where board_id = p_board;
  update public.invitations set org_id = p_target_org where board_id = p_board;
  update public.notifications set org_id = p_target_org where board_id = p_board;
  update public.ical_feed_tokens set org_id = p_target_org where board_id = p_board;

  perform set_config('app.card_events_cascade', '0', true);

  select count(*) into v_updated from public.cards where board_id = p_board and org_id <> p_target_org;
  if v_updated > 0 then
    raise exception 'cascade_incomplete';
  end if;
end;
$$;
