-- =====================================================================
-- 20260717140000 - ACL MVP: papéis fixos (ADR-0015)
-- - can_manage_org_members = owner|admin (não manager)
-- - can_manage_board_members = org admin/owner OU board manager (reverte Editor)
-- =====================================================================

create or replace function app.can_manage_org_members(p_org uuid)
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
      and m.role in (
        'owner'::public.membership_role,
        'admin'::public.membership_role
      )
  );
$$;

grant execute on function app.can_manage_org_members(uuid) to authenticated;

-- ACL do board: org admin/owner OU board Administrador (manager). Editor (admin) NÃO gerencia.
create or replace function app.can_manage_board_members(p_board uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.boards b
    where b.id = p_board and app.has_org_role(b.org_id, array['admin'])
  ) or exists (
    select 1 from public.board_members bm
    where bm.board_id = p_board
      and bm.user_id = (select auth.uid())
      and bm.role = 'manager'::public.membership_role
  );
$$;

grant execute on function app.can_manage_board_members(uuid) to anon, authenticated;
