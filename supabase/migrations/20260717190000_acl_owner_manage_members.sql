-- Org admin: write de conteudo no board, SEM gerenciar acessos (members.*).
-- ACL do board: so Proprietario (owner) OU quem tem board.manage_members / members.* (Administrador do projeto).

create or replace function app.has_board_permission(p_board uuid, p_code text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_dept uuid;
  v_preset uuid;
  v_role public.membership_role;
  v_codes text[];
  v_child text;
  v_need text[];
  v_is_owner boolean;
  v_is_org_admin boolean;
begin
  select b.org_id, b.department_id into v_org, v_dept
  from public.boards b
  where b.id = p_board;
  if v_org is null then
    return false;
  end if;

  v_is_owner := app.is_org_owner(v_org);
  v_is_org_admin := app.has_org_role(v_org, array['admin']);

  -- Proprietario: todos os board.* (+ org identity ja via is_org_owner)
  if v_is_owner then
    if p_code like 'board.%' then
      return true;
    end if;
    if p_code = 'org.manage_members' then
      return true;
    end if;
    if p_code = 'org.manage_identity' then
      return true;
    end if;
  end if;

  -- Org admin (nao owner): board.* EXCETO ACL (members.* / manage_members)
  if v_is_org_admin and not v_is_owner then
    if p_code = 'org.manage_members' then
      return app.can_manage_org_members(v_org);
    end if;
    if p_code = 'org.manage_identity' then
      return false;
    end if;
    if p_code like 'board.%'
       and p_code not like 'board.members.%'
       and p_code <> 'board.manage_members' then
      return true;
    end if;
  end if;

  select bm.preset_id, bm.role into v_preset, v_role
  from public.board_members bm
  where bm.board_id = p_board
    and bm.user_id = (select auth.uid());

  if v_preset is not null then
    if app.preset_has_permission(v_preset, p_code) then
      return true;
    end if;
  elsif v_role is not null then
    v_codes := app.legacy_board_role_permission_codes(v_role);
    if p_code = any(v_codes) then
      return true;
    end if;
    v_need := app.expand_board_permission_alias(p_code);
    foreach v_child in array v_need loop
      if v_child = any(v_codes) then
        return true;
      end if;
    end loop;
  end if;

  -- Dept write → conteudo (+ view)
  if v_dept is not null and (
    p_code = 'board.view'
    or p_code = 'board.edit_content'
    or p_code = any(app.expand_board_permission_alias('board.edit_content'))
  ) then
    if exists (
      select 1 from public.department_members dm
      where dm.department_id = v_dept
        and dm.user_id = (select auth.uid())
        and dm.role in ('admin'::public.membership_role, 'manager'::public.membership_role)
    ) then
      return true;
    end if;
  end if;

  if p_code = 'board.view' and app.can_access_board(p_board) then
    return true;
  end if;

  return false;
end;
$$;

grant execute on function app.has_board_permission(uuid, text) to anon, authenticated;

-- ACL: owner OU permission members (Administrador do projeto / preset)
create or replace function app.can_manage_board_members(p_board uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.boards b
    where b.id = p_board and app.is_org_owner(b.org_id)
  )
  or app.has_board_permission(p_board, 'board.manage_members');
$$;

grant execute on function app.can_manage_board_members(uuid) to anon, authenticated;

comment on function app.can_manage_board_members(uuid) is
  'Owner org OU board.manage_members / members.*. Org admin sem papel no board NAO gerencia ACL.';
