-- create_board: SECURITY DEFINER (padrao create_organization).
-- Evita falha RLS boards_insert + chicken-egg board_members apos ACL
-- (can_manage_board_members exige owner OU ja ter board.manage_members).

create or replace function public.create_board(
  p_org uuid,
  p_name text,
  p_description text default null,
  p_icon text default null,
  p_color text default null,
  p_department_id uuid default null
)
returns public.boards
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_board public.boards;
  v_dept_org uuid;
  v_preset uuid := 'a0000000-0000-4000-8000-000000000002'::uuid; -- board_editor
  v_allowed boolean;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  if p_name is null or length(trim(p_name)) = 0 then
    raise exception 'invalid_name';
  end if;

  if p_department_id is not null then
    select d.org_id into v_dept_org
    from public.departments d
    where d.id = p_department_id;
    if v_dept_org is null then
      raise exception 'department_not_found';
    end if;
    if v_dept_org <> p_org then
      raise exception 'department_org_mismatch';
    end if;
  end if;

  v_allowed := app.has_org_role(p_org, array['admin'])
    or (
      p_department_id is not null
      and app.has_department_role(p_department_id, array['admin', 'manager'])
    );

  if not v_allowed then
    raise exception 'forbidden';
  end if;

  insert into public.boards (
    org_id, name, description, icon, color, department_id, created_by
  ) values (
    p_org,
    trim(p_name),
    nullif(trim(coalesce(p_description, '')), ''),
    nullif(trim(coalesce(p_icon, '')), ''),
    nullif(trim(coalesce(p_color, '')), ''),
    p_department_id,
    v_uid
  )
  returning * into v_board;

  -- Criador = Editor (role admin + preset sistema). Bypass RLS chicken-egg.
  insert into public.board_members (board_id, user_id, role, preset_id)
  values (v_board.id, v_uid, 'admin'::public.membership_role, v_preset)
  on conflict (board_id, user_id) do update
    set role = excluded.role,
        preset_id = coalesce(public.board_members.preset_id, excluded.preset_id);

  return v_board;
end;
$$;

revoke all on function public.create_board(uuid, text, text, text, text, uuid) from public;
grant execute on function public.create_board(uuid, text, text, text, text, uuid) to authenticated;

comment on function public.create_board(uuid, text, text, text, text, uuid) is
  'Cria board + board_members (Editor). Owner/admin org ou admin/manager do departamento.';
