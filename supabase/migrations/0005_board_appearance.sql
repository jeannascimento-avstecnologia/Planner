-- =====================================================================
-- 0005 - Aparencia do board: icon + color
-- =====================================================================

alter table public.boards
  add column if not exists icon text,
  add column if not exists color text;

-- Granularidade de escrita:
--  - INSERT/DELETE board: somente admin da org
--  - UPDATE board (ex: aparencia): admin da org OU admin do board (can_write_board)
drop policy if exists boards_write on public.boards;

create policy boards_insert on public.boards
  for insert with check (app.has_org_role(org_id, array['admin']));

create policy boards_update on public.boards
  for update using (app.can_write_board(id))
  with check (app.can_write_board(id));

create policy boards_delete on public.boards
  for delete using (app.has_org_role(org_id, array['admin']));
