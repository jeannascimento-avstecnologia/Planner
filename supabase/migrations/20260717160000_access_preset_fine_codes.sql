-- =====================================================================
-- 20260717160000 - Access preset fine permission codes (ADR-0016 addendum)
-- Ceiling fino + seeds sistema + has_board_permission alias resolution
-- =====================================================================

-- Ceiling = codes finos (custom ⊆ Administrador)
create or replace function app.access_preset_ceiling_codes()
returns text[]
language sql
immutable
set search_path = ''
as $$
  select array[
    'board.view',
    'board.cards.create',
    'board.cards.edit',
    'board.cards.move',
    'board.cards.delete',
    'board.cards.change_stage',
    'board.cards.plan_work',
    'board.columns.create',
    'board.columns.rename',
    'board.columns.delete',
    'board.stages.manage',
    'board.tags.create',
    'board.tags.assign',
    'board.tags.delete',
    'board.checklist.edit',
    'board.tree.edit',
    'board.whiteboard.edit',
    'board.appearance.edit',
    'board.manage_settings',
    'board.automations.manage',
    'board.tiflux.use',
    'board.tiflux.configure',
    'board.members.invite',
    'board.members.update',
    'board.members.remove'
  ]::text[];
$$;

-- CHECK aceita finos + aliases legado + org.*
alter table public.access_preset_permissions
  drop constraint if exists access_preset_permissions_code_chk;

alter table public.access_preset_permissions
  add constraint access_preset_permissions_code_chk check (
    permission_code in (
      'board.view',
      'board.cards.create',
      'board.cards.edit',
      'board.cards.move',
      'board.cards.delete',
      'board.cards.change_stage',
      'board.cards.plan_work',
      'board.columns.create',
      'board.columns.rename',
      'board.columns.delete',
      'board.stages.manage',
      'board.tags.create',
      'board.tags.assign',
      'board.tags.delete',
      'board.checklist.edit',
      'board.tree.edit',
      'board.whiteboard.edit',
      'board.appearance.edit',
      'board.manage_settings',
      'board.automations.manage',
      'board.tiflux.use',
      'board.tiflux.configure',
      'board.members.invite',
      'board.members.update',
      'board.members.remove',
      'board.edit_content',
      'board.manage_members',
      'org.manage_members',
      'org.manage_identity'
    )
  );

-- Alias expand helpers
create or replace function app.expand_board_permission_alias(p_code text)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select case p_code
    when 'board.edit_content' then array[
      'board.cards.create', 'board.cards.edit', 'board.cards.move', 'board.cards.delete',
      'board.cards.change_stage', 'board.cards.plan_work',
      'board.columns.create', 'board.columns.rename', 'board.columns.delete',
      'board.stages.manage', 'board.tags.create', 'board.tags.assign',
      'board.checklist.edit', 'board.tree.edit', 'board.whiteboard.edit',
      'board.appearance.edit', 'board.tiflux.use', 'board.automations.manage'
    ]::text[]
    when 'board.manage_members' then array[
      'board.members.invite', 'board.members.update', 'board.members.remove'
    ]::text[]
    else array[p_code]::text[]
  end;
$$;

create or replace function app.legacy_board_role_permission_codes(p_role public.membership_role)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select case p_role
    when 'manager'::public.membership_role then app.access_preset_ceiling_codes()
    when 'admin'::public.membership_role then array[
      'board.view',
      'board.cards.create', 'board.cards.edit', 'board.cards.move', 'board.cards.delete',
      'board.cards.change_stage', 'board.cards.plan_work',
      'board.columns.create', 'board.columns.rename', 'board.columns.delete',
      'board.stages.manage', 'board.tags.create', 'board.tags.assign',
      'board.checklist.edit', 'board.tree.edit', 'board.whiteboard.edit',
      'board.appearance.edit', 'board.tiflux.use', 'board.automations.manage'
    ]::text[]
    when 'viewer'::public.membership_role then array['board.view']::text[]
    else array[]::text[]
  end;
$$;

-- Resolve: pede code → tem code OU alias pai OU (pede alias e tem qualquer filho)
create or replace function app.preset_has_permission(p_preset uuid, p_code text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_stored text[];
  v_need text[];
  v_child text;
begin
  select coalesce(array_agg(permission_code), array[]::text[])
    into v_stored
  from public.access_preset_permissions
  where preset_id = p_preset;

  if p_code = any(v_stored) then
    return true;
  end if;

  -- Tem alias legado que cobre o code pedido
  if 'board.edit_content' = any(v_stored)
     and p_code = any(app.expand_board_permission_alias('board.edit_content')) then
    return true;
  end if;
  if 'board.manage_members' = any(v_stored)
     and p_code = any(app.expand_board_permission_alias('board.manage_members')) then
    return true;
  end if;

  -- Pediu alias: true se qualquer filho presente
  v_need := app.expand_board_permission_alias(p_code);
  if array_length(v_need, 1) > 1 or (p_code in ('board.edit_content', 'board.manage_members')) then
    foreach v_child in array v_need loop
      if v_child = any(v_stored) then
        return true;
      end if;
    end loop;
  end if;

  return false;
end;
$$;

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
begin
  select b.org_id, b.department_id into v_org, v_dept
  from public.boards b
  where b.id = p_board;
  if v_org is null then
    return false;
  end if;

  if app.has_org_role(v_org, array['admin']) then
    if p_code like 'board.%' then
      return true;
    end if;
    if p_code = 'org.manage_members' then
      return app.can_manage_org_members(v_org);
    end if;
    if p_code = 'org.manage_identity' then
      return app.is_org_owner(v_org);
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

  -- Dept write → conteúdo (+ view)
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
grant execute on function app.preset_has_permission(uuid, text) to authenticated;
grant execute on function app.expand_board_permission_alias(text) to authenticated;

-- RLS write = qualquer code de conteúdo (via alias)
create or replace function app.can_write_board(p_board uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select app.has_board_permission(p_board, 'board.edit_content');
$$;

grant execute on function app.can_write_board(uuid) to anon, authenticated;

-- ACL = qualquer members.*
create or replace function app.can_manage_board_members(p_board uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    exists (
      select 1 from public.boards b
      where b.id = p_board and app.has_org_role(b.org_id, array['admin'])
    )
    or app.has_board_permission(p_board, 'board.manage_members');
$$;

grant execute on function app.can_manage_board_members(uuid) to anon, authenticated;

-- Guard: custom só codes do ceiling (aliases legado ainda OK se no ceiling expand — rejeita alias na insert custom? 
-- Plano: custom grava finos; aliases no ceiling check via access_preset_ceiling_codes = só finos.
-- Alias legado em custom antigo: permitir se expand ⊆ ceiling)
create or replace function app.access_preset_permissions_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_is_system boolean;
  v_org uuid;
  v_code text;
  v_expanded text[];
  v_child text;
begin
  select ap.is_system, ap.org_id into v_is_system, v_org
  from public.access_presets ap
  where ap.id = coalesce(NEW.preset_id, OLD.preset_id);

  if v_is_system then
    if (select auth.uid()) is not null then
      raise exception 'system_preset_immutable' using errcode = 'P0001';
    end if;
  elsif TG_OP in ('INSERT', 'UPDATE') then
    v_code := NEW.permission_code;
    v_expanded := app.expand_board_permission_alias(v_code);
    foreach v_child in array v_expanded loop
      if not (v_child = any(app.access_preset_ceiling_codes())) then
        raise exception 'preset_ceiling_exceeded' using errcode = 'P0001';
      end if;
    end loop;
    if v_org is not null and not app.can_manage_access_presets(v_org) then
      raise exception 'forbidden' using errcode = 'P0001';
    end if;
  elsif TG_OP = 'DELETE' then
    if v_org is not null and (select auth.uid()) is not null
       and not app.can_manage_access_presets(v_org) then
      raise exception 'forbidden' using errcode = 'P0001';
    end if;
  end if;

  return coalesce(NEW, OLD);
end;
$$;

-- Reseed sistema com codes finos (auth.uid null → guard permite)
delete from public.access_preset_permissions
where preset_id in (
  'a0000000-0000-4000-8000-000000000001',
  'a0000000-0000-4000-8000-000000000002',
  'a0000000-0000-4000-8000-000000000003'
);

insert into public.access_preset_permissions (preset_id, permission_code)
select 'a0000000-0000-4000-8000-000000000001'::uuid, c
from unnest(app.access_preset_ceiling_codes()) as c;

insert into public.access_preset_permissions (preset_id, permission_code)
select 'a0000000-0000-4000-8000-000000000002'::uuid, c
from unnest(app.legacy_board_role_permission_codes('admin'::public.membership_role)) as c;

insert into public.access_preset_permissions (preset_id, permission_code)
values ('a0000000-0000-4000-8000-000000000003', 'board.view');
