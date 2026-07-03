-- =====================================================================
-- 20260703090000 - Departamentos (subdivisoes) dentro de organizacoes
-- =====================================================================

create table public.departments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  icon text,
  color text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, name)
);
create index departments_org_idx on public.departments(org_id);

create table public.department_members (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references public.departments(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.membership_role not null default 'viewer',
  created_at timestamptz not null default now(),
  unique (department_id, user_id)
);
create index department_members_dept_idx on public.department_members(department_id);
create index department_members_user_idx on public.department_members(user_id);
create index department_members_org_idx on public.department_members(org_id);

alter table public.boards
  add column if not exists department_id uuid references public.departments(id) on delete set null;
create index if not exists boards_department_idx on public.boards(department_id);

create trigger trg_departments_updated before update on public.departments
  for each row execute function app.set_updated_at();

-- ---------- helpers ----------
create or replace function app.is_department_member(p_dept uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.department_members dm
    where dm.department_id = p_dept
      and dm.user_id = (select auth.uid())
  );
$$;

create or replace function app.has_department_role(p_dept uuid, p_roles text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.departments d
    join public.department_members dm on dm.department_id = d.id
    where d.id = p_dept
      and dm.user_id = (select auth.uid())
      and dm.role::text = any(p_roles)
  )
  or exists (
    select 1
    from public.departments d
    where d.id = p_dept
      and app.is_org_owner(d.org_id)
  );
$$;

create or replace function app.can_manage_org_departments(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select app.is_org_owner(p_org);
$$;

create or replace function app.can_manage_department_members(p_dept uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.departments d
    where d.id = p_dept
      and (
        app.is_org_owner(d.org_id)
        or app.has_department_role(p_dept, array['manager'])
      )
  );
$$;

create or replace function app.can_move_board_to_department(p_board uuid, p_target_dept uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_board public.boards;
  v_target public.departments;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then return false; end if;

  select * into v_board from public.boards where id = p_board;
  if not found then return false; end if;

  if app.is_org_owner(v_board.org_id) then return true; end if;

  if p_target_dept is not null then
    select * into v_target from public.departments where id = p_target_dept;
    if not found or v_target.org_id <> v_board.org_id then return false; end if;
  end if;

  if p_target_dept is null or v_board.department_id is null then
    return app.can_write_board(p_board);
  end if;

  if v_board.department_id = p_target_dept then return true; end if;

  return app.has_department_role(v_board.department_id, array['manager', 'admin'])
    and app.has_department_role(p_target_dept, array['manager', 'admin']);
end;
$$;

-- ---------- board access (department-aware) ----------
create or replace function app.can_access_board(p_board uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.boards b
    where b.id = p_board
      and (
        b.created_by = (select auth.uid())
        or exists (
          select 1 from public.board_members bm
          where bm.board_id = p_board and bm.user_id = (select auth.uid())
        )
        or (
          b.department_id is null
          and app.is_org_member(b.org_id)
        )
        or (
          b.department_id is not null
          and (
            app.is_org_owner(b.org_id)
            or app.is_department_member(b.department_id)
          )
        )
      )
  );
$$;

create or replace function app.can_write_board(p_board uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.boards b
    where b.id = p_board
      and (
        app.is_org_owner(b.org_id)
        or exists (
          select 1 from public.board_members bm
          where bm.board_id = p_board
            and bm.user_id = (select auth.uid())
            and bm.role = 'admin'::public.membership_role
        )
        or (
          b.department_id is null
          and app.has_org_role(b.org_id, array['admin'])
        )
        or (
          b.department_id is not null
          and app.has_department_role(b.department_id, array['admin', 'manager'])
        )
      )
  );
$$;

-- ---------- RLS departments ----------
alter table public.departments enable row level security;
alter table public.department_members enable row level security;

create policy departments_select on public.departments
  for select using (
    app.is_org_owner(org_id)
    or app.is_department_member(id)
  );

create policy departments_write on public.departments
  for all using (app.can_manage_org_departments(org_id))
  with check (app.can_manage_org_departments(org_id));

create policy department_members_select on public.department_members
  for select using (app.is_org_member(org_id));

create policy department_members_write on public.department_members
  for all using (app.can_manage_department_members(department_id))
  with check (app.can_manage_department_members(department_id));

-- ---------- boards insert policy ----------
drop policy if exists boards_insert on public.boards;
create policy boards_insert on public.boards
  for insert with check (
    app.has_org_role(org_id, array['admin'])
    or (
      department_id is not null
      and app.has_department_role(department_id, array['admin', 'manager'])
    )
  );

grant select, insert, update, delete on public.departments to authenticated;
grant select, insert, update, delete on public.department_members to authenticated;
grant execute on function app.is_department_member(uuid) to authenticated;
grant execute on function app.has_department_role(uuid, text[]) to authenticated;
grant execute on function app.can_manage_org_departments(uuid) to authenticated;
grant execute on function app.can_manage_department_members(uuid) to authenticated;
grant execute on function app.can_move_board_to_department(uuid, uuid) to authenticated;

-- ---------- RPCs ----------
create or replace function public.create_department(
  p_org uuid,
  p_name text,
  p_icon text default null,
  p_color text default null
)
returns public.departments
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_dept public.departments;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if not app.can_manage_org_departments(p_org) then raise exception 'forbidden'; end if;

  insert into public.departments (org_id, name, icon, color, created_by)
  values (p_org, trim(p_name), nullif(trim(p_icon), ''), nullif(trim(p_color), ''), v_uid)
  returning * into v_dept;

  insert into public.department_members (department_id, org_id, user_id, role)
  values (v_dept.id, p_org, v_uid, 'manager'::public.membership_role);

  return v_dept;
end;
$$;

create or replace function public.update_department(
  p_dept uuid,
  p_name text,
  p_icon text default null,
  p_color text default null
)
returns public.departments
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_dept public.departments;
begin
  if not app.can_manage_org_departments((select org_id from public.departments where id = p_dept)) then
    raise exception 'forbidden';
  end if;

  update public.departments
  set name = trim(p_name),
      icon = nullif(trim(p_icon), ''),
      color = nullif(trim(p_color), '')
  where id = p_dept
  returning * into v_dept;

  if not found then raise exception 'department_not_found'; end if;
  return v_dept;
end;
$$;

create or replace function public.delete_department(p_dept uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
begin
  select org_id into v_org from public.departments where id = p_dept;
  if not found then raise exception 'department_not_found'; end if;
  if not app.can_manage_org_departments(v_org) then raise exception 'forbidden'; end if;

  update public.boards set department_id = null where department_id = p_dept;
  delete from public.departments where id = p_dept;
end;
$$;

create or replace function public.set_board_department(p_board uuid, p_dept uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not app.can_move_board_to_department(p_board, p_dept) then
    raise exception 'forbidden';
  end if;

  update public.boards
  set department_id = p_dept
  where id = p_board;
end;
$$;

create or replace function public.set_department_member_role(
  p_dept uuid,
  p_user uuid,
  p_role public.membership_role
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if p_user = v_uid then raise exception 'cannot_change_own_role'; end if;
  if p_role = 'owner'::public.membership_role then raise exception 'invalid_department_role'; end if;

  select org_id into v_org from public.departments where id = p_dept;
  if not found then raise exception 'department_not_found'; end if;
  if not app.can_manage_department_members(p_dept) then raise exception 'forbidden'; end if;

  update public.department_members
  set role = p_role
  where department_id = p_dept and user_id = p_user;

  if not found then raise exception 'member_not_found'; end if;
end;
$$;

create or replace function public.remove_department_member(p_dept uuid, p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if p_user = v_uid then raise exception 'cannot_remove_self'; end if;
  if not app.can_manage_department_members(p_dept) then raise exception 'forbidden'; end if;

  delete from public.department_members
  where department_id = p_dept and user_id = p_user;

  if not found then raise exception 'member_not_found'; end if;
end;
$$;

create or replace function public.add_department_member(
  p_dept uuid,
  p_user uuid,
  p_role public.membership_role default 'viewer'
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
begin
  if p_role = 'owner'::public.membership_role then raise exception 'invalid_department_role'; end if;

  select org_id into v_org from public.departments where id = p_dept;
  if not found then raise exception 'department_not_found'; end if;
  if not app.can_manage_department_members(p_dept) then raise exception 'forbidden'; end if;
  if not app.is_org_member(v_org) then raise exception 'user_not_in_org'; end if;

  insert into public.department_members (department_id, org_id, user_id, role)
  values (p_dept, v_org, p_user, p_role)
  on conflict (department_id, user_id) do update set role = excluded.role;
end;
$$;

grant execute on function public.create_department(uuid, text, text, text) to authenticated;
grant execute on function public.update_department(uuid, text, text, text) to authenticated;
grant execute on function public.delete_department(uuid) to authenticated;
grant execute on function public.set_board_department(uuid, uuid) to authenticated;
grant execute on function public.set_department_member_role(uuid, uuid, public.membership_role) to authenticated;
grant execute on function public.remove_department_member(uuid, uuid) to authenticated;
grant execute on function public.add_department_member(uuid, uuid, public.membership_role) to authenticated;
