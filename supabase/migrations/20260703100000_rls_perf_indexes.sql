-- =====================================================================
-- 20260703100000 - RLS perf: composite indexes + auth.uid() subselect
-- =====================================================================

-- ---------- performance indexes ----------
create index if not exists board_members_board_user_idx
  on public.board_members (board_id, user_id);

create index if not exists department_members_dept_user_idx
  on public.department_members (department_id, user_id);

create index if not exists department_members_user_idx
  on public.department_members (user_id);

create index if not exists cards_board_column_position_idx
  on public.cards (board_id, column_id, position);

create index if not exists cards_assignee_active_idx
  on public.cards (assignee_id)
  where completed_at is null;

create index if not exists notifications_user_read_idx
  on public.notifications (user_id, read_at);

create index if not exists memberships_user_org_idx
  on public.memberships (user_id, org_id);

create index if not exists boards_department_idx
  on public.boards (department_id);

-- ---------- helpers: (select auth.uid()) for stable RLS evaluation ----------
create or replace function app.is_org_member(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.memberships m
    where m.org_id = p_org
      and m.user_id = (select auth.uid())
  );
$$;

create or replace function app.has_org_role(p_org uuid, p_roles text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.memberships m
    where m.org_id = p_org
      and m.user_id = (select auth.uid())
      and (
        m.role::text = any(p_roles)
        or (m.role = 'owner'::public.membership_role and 'admin' = any(p_roles))
      )
  );
$$;

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
          select 1
          from public.board_members bm
          where bm.board_id = p_board
            and bm.user_id = (select auth.uid())
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

-- ---------- departments RLS: restrict policies to authenticated ----------
drop policy if exists departments_select on public.departments;
create policy departments_select on public.departments
  for select to authenticated
  using (
    app.is_org_owner(org_id)
    or app.is_department_member(id)
  );

drop policy if exists departments_write on public.departments;
create policy departments_write on public.departments
  for all to authenticated
  using (app.can_manage_org_departments(org_id))
  with check (app.can_manage_org_departments(org_id));

drop policy if exists department_members_select on public.department_members;
create policy department_members_select on public.department_members
  for select to authenticated
  using (app.is_org_member(org_id));

drop policy if exists department_members_write on public.department_members;
create policy department_members_write on public.department_members
  for all to authenticated
  using (app.can_manage_department_members(department_id))
  with check (app.can_manage_department_members(department_id));
