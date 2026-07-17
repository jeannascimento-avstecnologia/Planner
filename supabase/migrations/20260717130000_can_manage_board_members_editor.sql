-- ACL do board: org admin/owner OU board Gerente OU board Editor (admin).
-- Alinha UI (engrenagem / Convidar) com quem ja pode escrever no projeto.

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
      and bm.role in (
        'manager'::public.membership_role,
        'admin'::public.membership_role
      )
  );
$$;

grant execute on function app.can_manage_board_members(uuid) to anon, authenticated;
