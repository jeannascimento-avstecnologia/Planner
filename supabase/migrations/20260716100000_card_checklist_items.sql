-- D.Tree.Visual: card_checklist_items (to-dos ≠ subtarefas parent_id)

create table public.card_checklist_items (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  board_id uuid not null references public.boards(id) on delete cascade,
  card_id uuid not null references public.cards(id) on delete cascade,
  title text not null,
  done boolean not null default false,
  position text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint card_checklist_items_title_len check (
    char_length(btrim(title)) >= 1 and char_length(title) <= 200
  )
);

create index card_checklist_items_card_position_idx
  on public.card_checklist_items (card_id, position);
create index card_checklist_items_board_idx
  on public.card_checklist_items (board_id);
create index card_checklist_items_org_idx
  on public.card_checklist_items (org_id);

create trigger card_checklist_items_set_updated_at
  before update on public.card_checklist_items
  for each row execute function app.set_updated_at();

-- Align org_id/board_id with parent card on write
create or replace function app.assert_checklist_item_card_align()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_card public.cards%rowtype;
begin
  select * into v_card from public.cards where id = new.card_id;
  if not found then
    raise exception 'checklist_card_missing' using errcode = 'P0001';
  end if;
  if new.org_id is distinct from v_card.org_id
     or new.board_id is distinct from v_card.board_id then
    raise exception 'checklist_card_mismatch' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger card_checklist_items_align_card
  before insert or update of card_id, org_id, board_id on public.card_checklist_items
  for each row execute function app.assert_checklist_item_card_align();

alter table public.card_checklist_items enable row level security;

create policy card_checklist_items_select on public.card_checklist_items
  for select using (app.can_access_board(board_id));

create policy card_checklist_items_insert on public.card_checklist_items
  for insert with check (
    app.can_write_board(board_id)
    and exists (
      select 1 from public.cards c
      where c.id = card_id
        and c.org_id = org_id
        and c.board_id = board_id
    )
  );

create policy card_checklist_items_update on public.card_checklist_items
  for update using (app.can_write_board(board_id))
  with check (
    app.can_write_board(board_id)
    and exists (
      select 1 from public.cards c
      where c.id = card_id
        and c.org_id = org_id
        and c.board_id = board_id
    )
  );

create policy card_checklist_items_delete on public.card_checklist_items
  for delete using (app.can_write_board(board_id));

grant select, insert, update, delete on public.card_checklist_items to authenticated;
