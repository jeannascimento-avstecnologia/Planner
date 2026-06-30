-- Perfis visiveis para colegas no mesmo board (convidados board-only sem membership na org)
create or replace function app.shares_board(p_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.board_members a
    join public.board_members b on a.board_id = b.board_id
    where a.user_id = (select auth.uid())
      and b.user_id = p_user
  );
$$;

grant execute on function app.shares_board(uuid) to anon, authenticated;

drop policy if exists profiles_select on public.profiles;

create policy profiles_select on public.profiles
  for select using (
    id = (select auth.uid())
    or app.shares_org(id)
    or app.shares_board(id)
  );
