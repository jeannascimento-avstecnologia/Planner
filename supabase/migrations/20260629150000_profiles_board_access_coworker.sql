-- Org admin / membro com acesso ao board ve perfis de board_members (cenario seed Roadmap)
create or replace function app.shares_board(p_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.board_members a
    join public.board_members b on a.board_id = b.board_id
    where a.user_id = (select auth.uid())
      and b.user_id = p_user
  )
  or exists (
    select 1
    from public.board_members bm
    where bm.user_id = p_user
      and app.can_access_board(bm.board_id)
  );
$$;

grant execute on function app.shares_board(uuid) to anon, authenticated;
