-- =====================================================================
-- 0013 - Marcadores por projeto (board_id)
-- =====================================================================

alter table public.tags add column if not exists board_id uuid references public.boards(id) on delete cascade;

update public.tags t
set board_id = sub.board_id
from (
  select distinct on (ct.tag_id) ct.tag_id, c.board_id
  from public.card_tags ct
  join public.cards c on c.id = ct.card_id
  order by ct.tag_id, c.created_at
) sub
where t.id = sub.tag_id and t.board_id is null;

update public.tags t
set board_id = (
  select b.id from public.boards b where b.org_id = t.org_id order by b.created_at limit 1
)
where t.board_id is null;

delete from public.tags where board_id is null;

alter table public.tags alter column board_id set not null;

alter table public.tags drop constraint if exists tags_org_id_name_key;
drop index if exists tags_org_id_name_key;
create unique index tags_board_name_idx on public.tags (board_id, name);
create index if not exists tags_board_idx on public.tags (board_id);

drop policy if exists tags_select on public.tags;
create policy tags_select on public.tags
  for select using (
    exists (
      select 1 from public.boards b
      where b.id = board_id and app.is_org_member(b.org_id)
    )
  );

drop policy if exists tags_write on public.tags;
create policy tags_write on public.tags
  for all using (
    app.has_org_role(org_id, array['admin'])
    and exists (select 1 from public.boards b where b.id = board_id)
  )
  with check (
    app.has_org_role(org_id, array['admin'])
    and exists (
      select 1 from public.boards b
      where b.id = board_id and b.org_id = org_id
    )
  );
