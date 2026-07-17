-- Org admin/owner escreve em TODOS os boards da org (incl. com department_id).
-- Board editor: board_members.admin OU board_members.manager.
-- Dept admin/manager continua escrevendo nos boards do proprio dept.

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
        or app.has_org_role(b.org_id, array['admin'])
        or exists (
          select 1 from public.board_members bm
          where bm.board_id = p_board
            and bm.user_id = (select auth.uid())
            and bm.role in (
              'admin'::public.membership_role,
              'manager'::public.membership_role
            )
        )
        or (
          b.department_id is not null
          and app.has_department_role(b.department_id, array['admin', 'manager'])
        )
      )
  );
$$;

grant execute on function app.can_write_board(uuid) to anon, authenticated;
