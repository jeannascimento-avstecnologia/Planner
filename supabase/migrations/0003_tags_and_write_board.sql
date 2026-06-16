-- =====================================================================
-- 0003 - Tags + card_tags + can_write_board (compartilhamento editavel)
-- =====================================================================

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  color text not null,
  created_at timestamptz not null default now(),
  unique (org_id, name)
);
create index tags_org_idx on public.tags(org_id);

create table public.card_tags (
  card_id uuid not null references public.cards(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  primary key (card_id, tag_id)
);
create index card_tags_card_idx on public.card_tags(card_id);
create index card_tags_tag_idx on public.card_tags(tag_id);

-- Escrita: org admin OU board_member com role admin no board
create or replace function app.can_write_board(p_board uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.boards b
    where b.id = p_board and app.has_org_role(b.org_id, array['admin'])
  ) or exists (
    select 1 from public.board_members bm
    where bm.board_id = p_board
      and bm.user_id = (select auth.uid())
      and bm.role = 'admin'
  );
$$;

-- Atualiza policies de escrita para boards compartilhados
drop policy if exists columns_write on public.columns;
create policy columns_write on public.columns
  for all using (app.can_write_board(board_id))
  with check (app.can_write_board(board_id));

drop policy if exists cards_write on public.cards;
create policy cards_write on public.cards
  for all using (app.can_write_board(board_id))
  with check (app.can_write_board(board_id));

drop policy if exists card_deps_write on public.card_dependencies;
create policy card_deps_write on public.card_dependencies
  for all using (app.can_write_board(
    (select c.board_id from public.cards c where c.id = blocker_card_id limit 1)
  ))
  with check (app.can_write_board(
    (select c.board_id from public.cards c where c.id = blocker_card_id limit 1)
  ));

alter table public.tags enable row level security;
alter table public.card_tags enable row level security;

create policy tags_select on public.tags
  for select using (app.is_org_member(org_id));
create policy tags_write on public.tags
  for all using (app.has_org_role(org_id, array['admin']))
  with check (app.has_org_role(org_id, array['admin']));

create policy card_tags_select on public.card_tags
  for select using (exists (
    select 1 from public.cards c where c.id = card_id and app.can_access_board(c.board_id)
  ));
create policy card_tags_write on public.card_tags
  for all using (exists (
    select 1 from public.cards c where c.id = card_id and app.can_write_board(c.board_id)
  ))
  with check (exists (
    select 1 from public.cards c where c.id = card_id and app.can_write_board(c.board_id)
  ));

grant execute on function app.can_write_board(uuid) to anon, authenticated;
grant select, insert, update, delete on public.tags to authenticated;
grant select, insert, update, delete on public.card_tags to authenticated;
