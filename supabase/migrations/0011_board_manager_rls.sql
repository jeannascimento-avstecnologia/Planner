-- =====================================================================
-- 0011 - Gerente de projeto: can_manage_board_members + policies
-- =====================================================================

create or replace function app.can_manage_board_members(p_board uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.boards b
    where b.id = p_board and app.has_org_role(b.org_id, array['admin'])
  ) or exists (
    select 1 from public.board_members bm
    where bm.board_id = p_board
      and bm.user_id = (select auth.uid())
      and bm.role = 'manager'
  );
$$;

drop policy if exists board_members_write on public.board_members;
create policy board_members_write on public.board_members
  for all using (app.can_manage_board_members(board_id))
  with check (app.can_manage_board_members(board_id));

drop policy if exists invitations_write on public.invitations;
create policy invitations_write on public.invitations
  for all using (
    app.has_org_role(org_id, array['admin'])
    or app.can_manage_board_members(board_id)
  )
  with check (
    app.has_org_role(org_id, array['admin'])
    or app.can_manage_board_members(board_id)
  );

grant execute on function app.can_manage_board_members(uuid) to anon, authenticated;
