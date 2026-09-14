-- D.Timeline: SELECT card_dependencies via can_access_board (board do blocker)
-- Policy-only; sem DDL de tabela/coluna.

drop policy if exists card_deps_select on public.card_dependencies;

create policy card_deps_select on public.card_dependencies
for select using (
  exists (
    select 1
    from public.cards blocker
    where blocker.id = card_dependencies.blocker_card_id
      and blocker.org_id = card_dependencies.org_id
      and app.can_access_board(blocker.board_id)
  )
);
