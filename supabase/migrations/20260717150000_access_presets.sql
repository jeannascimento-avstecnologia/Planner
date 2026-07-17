-- =====================================================================
-- 20260717150000 - Access presets (ADR-0016)
-- Catálogo → presets sistema/custom → board_members.preset_id
-- =====================================================================

-- ---------- tables ----------
create table public.access_presets (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  is_system boolean not null default false,
  system_key text,
  base_role public.membership_role not null default 'viewer',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint access_presets_system_org_chk check (
    (is_system = true and org_id is null and system_key is not null)
    or (is_system = false and org_id is not null and system_key is null)
  ),
  constraint access_presets_base_role_board_chk check (
    base_role in ('viewer'::public.membership_role, 'admin'::public.membership_role, 'manager'::public.membership_role)
  )
);

create unique index access_presets_system_key_uidx
  on public.access_presets (system_key)
  where is_system = true;

create unique index access_presets_org_name_uidx
  on public.access_presets (org_id, lower(name))
  where org_id is not null;

create index access_presets_org_idx on public.access_presets (org_id);

create table public.access_preset_permissions (
  preset_id uuid not null references public.access_presets(id) on delete cascade,
  permission_code text not null,
  primary key (preset_id, permission_code),
  constraint access_preset_permissions_code_chk check (
    permission_code in (
      'board.view',
      'board.edit_content',
      'board.manage_members',
      'board.manage_settings',
      'org.manage_members',
      'org.manage_identity'
    )
  )
);

alter table public.board_members
  add column if not exists preset_id uuid references public.access_presets(id) on delete set null;

create index if not exists board_members_preset_idx on public.board_members (preset_id);

alter table public.invitations
  add column if not exists preset_id uuid references public.access_presets(id) on delete set null;

-- ---------- helpers ----------
create or replace function app.can_manage_access_presets(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select app.can_manage_org_members(p_org);
$$;

grant execute on function app.can_manage_access_presets(uuid) to authenticated;

-- Ceiling = Administrador do projeto (board.* only for custom)
create or replace function app.access_preset_ceiling_codes()
returns text[]
language sql
immutable
set search_path = ''
as $$
  select array[
    'board.view',
    'board.edit_content',
    'board.manage_members',
    'board.manage_settings'
  ]::text[];
$$;

create or replace function app.legacy_board_role_permission_codes(p_role public.membership_role)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select case p_role
    when 'manager'::public.membership_role then array[
      'board.view', 'board.edit_content', 'board.manage_members', 'board.manage_settings'
    ]::text[]
    when 'admin'::public.membership_role then array[
      'board.view', 'board.edit_content'
    ]::text[]
    when 'viewer'::public.membership_role then array['board.view']::text[]
    else array[]::text[]
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
begin
  select b.org_id, b.department_id into v_org, v_dept
  from public.boards b
  where b.id = p_board;
  if v_org is null then
    return false;
  end if;

  -- Org owner/admin: bypass board ACL
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
    if exists (
      select 1 from public.access_preset_permissions app
      where app.preset_id = v_preset and app.permission_code = p_code
    ) then
      return true;
    end if;
  elsif v_role is not null then
    v_codes := app.legacy_board_role_permission_codes(v_role);
    if p_code = any(v_codes) then
      return true;
    end if;
  end if;

  -- Dept write → edit_content (+ view)
  if v_dept is not null and p_code in ('board.view', 'board.edit_content') then
    if exists (
      select 1 from public.department_members dm
      where dm.department_id = v_dept
        and dm.user_id = (select auth.uid())
        and dm.role in ('admin'::public.membership_role, 'manager'::public.membership_role)
    ) then
      return true;
    end if;
  end if;

  -- Board access for view via can_access_board when only viewer-level
  if p_code = 'board.view' and app.can_access_board(p_board) then
    return true;
  end if;

  return false;
end;
$$;

grant execute on function app.has_board_permission(uuid, text) to anon, authenticated;

-- Sync role from preset base_role on board_members write
create or replace function app.board_members_sync_preset_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_base public.membership_role;
  v_org uuid;
  v_preset_org uuid;
  v_is_system boolean;
begin
  if new.preset_id is null then
    return new;
  end if;

  select ap.base_role, ap.org_id, ap.is_system
    into v_base, v_preset_org, v_is_system
  from public.access_presets ap
  where ap.id = new.preset_id;

  if v_base is null then
    raise exception 'preset_not_found' using errcode = 'P0001';
  end if;

  select b.org_id into v_org from public.boards b where b.id = new.board_id;
  if not v_is_system and v_preset_org is distinct from v_org then
    raise exception 'preset_org_mismatch' using errcode = 'P0001';
  end if;

  new.role := v_base;
  return new;
end;
$$;

drop trigger if exists board_members_sync_preset_role on public.board_members;
create trigger board_members_sync_preset_role
  before insert or update of preset_id on public.board_members
  for each row
  when (NEW.preset_id is not null)
  execute function app.board_members_sync_preset_role();

-- Ceiling + system immutability for permissions
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
begin
  select ap.is_system, ap.org_id into v_is_system, v_org
  from public.access_presets ap
  where ap.id = coalesce(NEW.preset_id, OLD.preset_id);

  if v_is_system then
    -- allow seed (service/migration) only when no JWT user
    if (select auth.uid()) is not null then
      raise exception 'system_preset_immutable' using errcode = 'P0001';
    end if;
  elsif TG_OP in ('INSERT', 'UPDATE') then
    v_code := NEW.permission_code;
    if not (v_code = any(app.access_preset_ceiling_codes())) then
      raise exception 'preset_ceiling_exceeded' using errcode = 'P0001';
    end if;
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

drop trigger if exists access_preset_permissions_guard on public.access_preset_permissions;
create trigger access_preset_permissions_guard
  before insert or update or delete on public.access_preset_permissions
  for each row execute function app.access_preset_permissions_guard();

create or replace function app.access_presets_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if TG_OP = 'INSERT' then
    if NEW.is_system then
      if (select auth.uid()) is not null then
        raise exception 'cannot_create_system_preset' using errcode = 'P0001';
      end if;
    else
      if not app.can_manage_access_presets(NEW.org_id) then
        raise exception 'forbidden' using errcode = 'P0001';
      end if;
      NEW.created_by := coalesce(NEW.created_by, (select auth.uid()));
    end if;
    return NEW;
  end if;

  if TG_OP = 'UPDATE' then
    if OLD.is_system or NEW.is_system then
      if (select auth.uid()) is not null then
        raise exception 'system_preset_immutable' using errcode = 'P0001';
      end if;
    end if;
    if OLD.org_id is not null and not app.can_manage_access_presets(OLD.org_id) then
      raise exception 'forbidden' using errcode = 'P0001';
    end if;
    NEW.updated_at := now();
    return NEW;
  end if;

  -- DELETE
  if OLD.is_system then
    if (select auth.uid()) is not null then
      raise exception 'system_preset_immutable' using errcode = 'P0001';
    end if;
  else
    if not app.can_manage_access_presets(OLD.org_id) then
      raise exception 'forbidden' using errcode = 'P0001';
    end if;
    if exists (select 1 from public.board_members bm where bm.preset_id = OLD.id) then
      raise exception 'preset_in_use' using errcode = 'P0001';
    end if;
  end if;
  return OLD;
end;
$$;

drop trigger if exists access_presets_guard on public.access_presets;
create trigger access_presets_guard
  before insert or update or delete on public.access_presets
  for each row execute function app.access_presets_guard();

-- ---------- RLS ----------
alter table public.access_presets enable row level security;
alter table public.access_preset_permissions enable row level security;

drop policy if exists access_presets_select on public.access_presets;
create policy access_presets_select on public.access_presets
  for select using (
    is_system
    or (
      org_id is not null
      and exists (
        select 1 from public.memberships m
        where m.org_id = access_presets.org_id
          and m.user_id = (select auth.uid())
      )
    )
  );

drop policy if exists access_presets_insert on public.access_presets;
create policy access_presets_insert on public.access_presets
  for insert with check (
    is_system = false
    and org_id is not null
    and app.can_manage_access_presets(org_id)
  );

drop policy if exists access_presets_update on public.access_presets;
create policy access_presets_update on public.access_presets
  for update using (
    is_system = false and app.can_manage_access_presets(org_id)
  )
  with check (
    is_system = false and app.can_manage_access_presets(org_id)
  );

drop policy if exists access_presets_delete on public.access_presets;
create policy access_presets_delete on public.access_presets
  for delete using (
    is_system = false and app.can_manage_access_presets(org_id)
  );

drop policy if exists access_preset_permissions_select on public.access_preset_permissions;
create policy access_preset_permissions_select on public.access_preset_permissions
  for select using (
    exists (
      select 1 from public.access_presets ap
      where ap.id = access_preset_permissions.preset_id
        and (
          ap.is_system
          or (
            ap.org_id is not null
            and exists (
              select 1 from public.memberships m
              where m.org_id = ap.org_id and m.user_id = (select auth.uid())
            )
          )
        )
    )
  );

drop policy if exists access_preset_permissions_write on public.access_preset_permissions;
create policy access_preset_permissions_write on public.access_preset_permissions
  for all using (
    exists (
      select 1 from public.access_presets ap
      where ap.id = access_preset_permissions.preset_id
        and ap.is_system = false
        and app.can_manage_access_presets(ap.org_id)
    )
  )
  with check (
    exists (
      select 1 from public.access_presets ap
      where ap.id = access_preset_permissions.preset_id
        and ap.is_system = false
        and app.can_manage_access_presets(ap.org_id)
        and permission_code = any(app.access_preset_ceiling_codes())
    )
  );

-- ---------- seeds sistema (auth.uid() null → guard permite) ----------
insert into public.access_presets (id, org_id, name, description, is_system, system_key, base_role)
values
  (
    'a0000000-0000-4000-8000-000000000001',
    null,
    'Administrador',
    'Escrever, gerenciar membros e configuracoes do projeto',
    true,
    'board_admin',
    'manager'
  ),
  (
    'a0000000-0000-4000-8000-000000000002',
    null,
    'Editor',
    'Escrever cards e colunas sem gerenciar ACL',
    true,
    'board_editor',
    'admin'
  ),
  (
    'a0000000-0000-4000-8000-000000000003',
    null,
    'Visualizador',
    'Somente leitura do projeto',
    true,
    'board_viewer',
    'viewer'
  )
on conflict (id) do nothing;

insert into public.access_preset_permissions (preset_id, permission_code) values
  ('a0000000-0000-4000-8000-000000000001', 'board.view'),
  ('a0000000-0000-4000-8000-000000000001', 'board.edit_content'),
  ('a0000000-0000-4000-8000-000000000001', 'board.manage_members'),
  ('a0000000-0000-4000-8000-000000000001', 'board.manage_settings'),
  ('a0000000-0000-4000-8000-000000000002', 'board.view'),
  ('a0000000-0000-4000-8000-000000000002', 'board.edit_content'),
  ('a0000000-0000-4000-8000-000000000003', 'board.view')
on conflict do nothing;

-- Backfill board_members.preset_id from role
update public.board_members bm
set preset_id = case bm.role
  when 'manager'::public.membership_role then 'a0000000-0000-4000-8000-000000000001'::uuid
  when 'admin'::public.membership_role then 'a0000000-0000-4000-8000-000000000002'::uuid
  when 'viewer'::public.membership_role then 'a0000000-0000-4000-8000-000000000003'::uuid
  else bm.preset_id
end
where bm.preset_id is null
  and bm.role in (
    'manager'::public.membership_role,
    'admin'::public.membership_role,
    'viewer'::public.membership_role
  );

-- Accept invitation: propaga preset_id (+ sync role via trigger)
create or replace function public.accept_board_invitation(p_token text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_inv public.invitations%rowtype;
  v_uid uuid := auth.uid();
  v_email text;
  v_name text;
  v_preset uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select coalesce(
    nullif(trim(auth.jwt() ->> 'email'), ''),
    (select trim(email) from auth.users where id = v_uid)
  ) into v_email;

  select * into v_inv from public.invitations
  where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
    and accepted_at is null
    and expires_at > now();
  if not found then
    raise exception 'invalid or expired invitation';
  end if;
  if lower(trim(v_inv.email)) <> lower(trim(coalesce(v_email, ''))) then
    raise exception 'email mismatch';
  end if;

  select coalesce(full_name, v_email) into v_name from public.profiles where id = v_uid;

  insert into public.notifications (org_id, user_id, type, title, body, entity_type, entity_id, board_id)
  select v_inv.org_id, bm.user_id, 'member_added',
         'Novo membro no projeto',
         coalesce(v_name, 'Alguem') || ' entrou no projeto',
         'board', v_inv.board_id, v_inv.board_id
  from public.board_members bm
  where bm.board_id = v_inv.board_id and bm.user_id <> v_uid;

  v_preset := v_inv.preset_id;
  if v_preset is null then
    v_preset := case v_inv.role
      when 'manager'::public.membership_role then 'a0000000-0000-4000-8000-000000000001'::uuid
      when 'admin'::public.membership_role then 'a0000000-0000-4000-8000-000000000002'::uuid
      else 'a0000000-0000-4000-8000-000000000003'::uuid
    end;
  end if;

  insert into public.board_members (board_id, user_id, role, preset_id)
  values (v_inv.board_id, v_uid, v_inv.role, v_preset)
  on conflict (board_id, user_id) do update
    set role = excluded.role,
        preset_id = excluded.preset_id;
  update public.invitations set accepted_at = now() where id = v_inv.id;
  return v_inv.board_id;
end;
$$;
