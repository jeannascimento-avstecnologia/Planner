-- ADR-0014: multi-pai no canvas árvore
create table if not exists public.card_tree_edges (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  board_id uuid not null references public.boards(id) on delete cascade,
  parent_card_id uuid not null references public.cards(id) on delete cascade,
  child_card_id uuid not null references public.cards(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint card_tree_edges_no_self check (parent_card_id <> child_card_id),
  constraint card_tree_edges_unique unique (parent_card_id, child_card_id)
);

create index if not exists card_tree_edges_board_idx on public.card_tree_edges (board_id);
create index if not exists card_tree_edges_child_idx on public.card_tree_edges (child_card_id);
create index if not exists card_tree_edges_parent_idx on public.card_tree_edges (parent_card_id);

alter table public.card_tree_edges enable row level security;

create policy card_tree_edges_select on public.card_tree_edges
  for select using (app.can_access_board(board_id));

create policy card_tree_edges_insert on public.card_tree_edges
  for insert with check (
    app.can_write_board(board_id)
    and exists (
      select 1 from public.cards p
      join public.cards c on c.id = card_tree_edges.child_card_id
      where p.id = card_tree_edges.parent_card_id
        and p.board_id = card_tree_edges.board_id
        and c.board_id = card_tree_edges.board_id
        and p.org_id = card_tree_edges.org_id
        and c.org_id = card_tree_edges.org_id
    )
  );

create policy card_tree_edges_delete on public.card_tree_edges
  for delete using (app.can_write_board(board_id));

grant select, insert, delete on public.card_tree_edges to authenticated;

-- Seed from parent_id
insert into public.card_tree_edges (org_id, board_id, parent_card_id, child_card_id)
select c.org_id, c.board_id, c.parent_id, c.id
from public.cards c
where c.parent_id is not null
on conflict (parent_card_id, child_card_id) do nothing;

-- Anti-ciclo: path child → … → parent via edges?
create or replace function app.assert_no_tree_edge_cycle(
  p_parent uuid,
  p_child uuid,
  p_board uuid
)
returns void
language plpgsql
stable
set search_path = ''
as $$
declare
  v_cur uuid;
  v_depth int := 0;
  v_seen uuid[] := array[p_child];
  v_parents uuid[];
begin
  if p_parent = p_child then
    raise exception 'card_tree_edge_cycle' using errcode = '23514';
  end if;

  -- walk ancestors of parent; if we hit child, linking parent→child cycles
  v_cur := p_parent;
  loop
    v_depth := v_depth + 1;
    if v_depth > 32 then
      raise exception 'card_tree_edge_depth' using errcode = '23514';
    end if;
    if v_cur = p_child then
      raise exception 'card_tree_edge_cycle' using errcode = '23514';
    end if;

    select array_agg(e.parent_card_id) into v_parents
    from public.card_tree_edges e
    where e.child_card_id = v_cur and e.board_id = p_board;

    if v_parents is null or array_length(v_parents, 1) is null then
      -- also consider primary parent_id
      select c.parent_id into v_cur from public.cards c where c.id = v_cur;
      if v_cur is null then
        exit;
      end if;
      if v_cur = any (v_seen) then
        exit;
      end if;
      v_seen := v_seen || v_cur;
      continue;
    end if;

    -- BFS one level: pick first unvisited; for cycle detect, check all
    if p_child = any (v_parents) then
      raise exception 'card_tree_edge_cycle' using errcode = '23514';
    end if;

    -- continue from first parent for depth bound (approx)
    v_cur := v_parents[1];
    if v_cur = any (v_seen) then
      exit;
    end if;
    v_seen := v_seen || v_cur;
  end loop;

  -- depth of child under new parent: ancestors of parent + 1 <= 8
  v_depth := 1;
  v_cur := p_parent;
  v_seen := array[p_parent];
  loop
    v_depth := v_depth + 1;
    if v_depth > 8 then
      raise exception 'card_tree_edge_depth' using errcode = '23514';
    end if;
    select array_agg(e.parent_card_id) into v_parents
    from public.card_tree_edges e
    where e.child_card_id = v_cur and e.board_id = p_board;
    if v_parents is null or array_length(v_parents, 1) is null then
      select c.parent_id into v_cur from public.cards c where c.id = v_cur;
      if v_cur is null then
        exit;
      end if;
    else
      v_cur := v_parents[1];
    end if;
    if v_cur is null or v_cur = any (v_seen) then
      exit;
    end if;
    v_seen := v_seen || v_cur;
  end loop;
end;
$$;

create or replace function app.card_tree_edges_bi()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_p public.cards%rowtype;
  v_c public.cards%rowtype;
begin
  select * into v_p from public.cards where id = new.parent_card_id;
  select * into v_c from public.cards where id = new.child_card_id;
  if not found or v_p.id is null or v_c.id is null then
    raise exception 'card_tree_edge_missing' using errcode = '23503';
  end if;
  if v_p.board_id is distinct from v_c.board_id or v_p.board_id is distinct from new.board_id then
    raise exception 'card_tree_edge_cross_board' using errcode = '23514';
  end if;
  if v_p.org_id is distinct from new.org_id or v_c.org_id is distinct from new.org_id then
    raise exception 'card_tree_edge_org' using errcode = '23514';
  end if;
  perform app.assert_no_tree_edge_cycle(new.parent_card_id, new.child_card_id, new.board_id);
  return new;
end;
$$;

drop trigger if exists card_tree_edges_bi on public.card_tree_edges;
create trigger card_tree_edges_bi
  before insert on public.card_tree_edges
  for each row execute function app.card_tree_edges_bi();
