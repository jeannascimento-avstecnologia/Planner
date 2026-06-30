-- Permite excluir apontamentos finalizados (historico) pelo dono do registro.
create policy time_entries_delete_completed on public.time_entries
  for delete using (
    user_id = (select auth.uid())
    and ended_at is not null
    and exists (
      select 1 from public.cards c
      where c.id = card_id and app.can_access_board(c.board_id)
    )
  );
