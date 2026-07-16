-- D.Tree: anti-ciclo / depth / cross-board em cards.parent_id + patch parent_id

create index if not exists cards_board_parent_position_idx
  on public.cards (board_id, parent_id, position);

-- Depth: raiz = 1; filho = depth(pai) + 1; máximo 8.
create or replace function app.card_parent_depth(p_parent_id uuid)
returns int
language plpgsql
stable
set search_path = ''
as $$
declare
  v_cur uuid := p_parent_id;
  v_depth int := 0;
  v_next uuid;
begin
  if p_parent_id is null then
    return 0;
  end if;
  loop
    v_depth := v_depth + 1;
    if v_depth > 8 then
      return v_depth;
    end if;
    select c.parent_id into v_next
    from public.cards c
    where c.id = v_cur;
    if not found then
      return v_depth;
    end if;
    if v_next is null then
      return v_depth;
    end if;
    v_cur := v_next;
  end loop;
end;
$$;

create or replace function app.assert_no_card_parent_cycle(
  p_card_id uuid,
  p_parent_id uuid,
  p_board_id uuid
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_cur uuid;
  v_parent_board uuid;
  v_depth int;
begin
  if p_parent_id is null then
    return;
  end if;

  if p_card_id is not null and p_card_id = p_parent_id then
    raise exception 'card_parent_cycle' using errcode = 'P0001';
  end if;

  select c.board_id into v_parent_board
  from public.cards c
  where c.id = p_parent_id;
  if not found then
    raise exception 'card_parent_not_found' using errcode = 'P0001';
  end if;
  if v_parent_board is distinct from p_board_id then
    raise exception 'card_parent_cross_board' using errcode = 'P0001';
  end if;

  -- Ciclo: caminhar ancestrais do novo pai; se encontrar o card, ciclo.
  if p_card_id is not null then
    v_cur := p_parent_id;
    while v_cur is not null loop
      if v_cur = p_card_id then
        raise exception 'card_parent_cycle' using errcode = 'P0001';
      end if;
      select c.parent_id into v_cur from public.cards c where c.id = v_cur;
    end loop;
  end if;

  -- Depth do novo nó = depth(parent chain) + 1 <= 8
  v_depth := app.card_parent_depth(p_parent_id) + 1;
  if v_depth > 8 then
    raise exception 'card_parent_depth' using errcode = 'P0001';
  end if;
end;
$$;

create or replace function app.cards_parent_hierarchy_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if TG_OP = 'UPDATE' and NEW.parent_id is not distinct from OLD.parent_id then
    return NEW;
  end if;
  perform app.assert_no_card_parent_cycle(NEW.id, NEW.parent_id, NEW.board_id);
  return NEW;
end;
$$;

drop trigger if exists cards_parent_hierarchy on public.cards;
create trigger cards_parent_hierarchy
  before insert or update of parent_id on public.cards
  for each row execute function app.cards_parent_hierarchy_guard();

-- Extend update_card_fields to accept parent_id (null clears → root)
create or replace function public.update_card_fields(p_card_id uuid, p_patch jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_card public.cards%rowtype;
  v_role public.membership_role;
  k text;
  v_access text;
  v_new_parent uuid;
begin
  select * into v_card from public.cards where id = p_card_id for update;
  if not found then raise exception 'card_not_found'; end if;
  if not app.can_write_board(v_card.board_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select m.role into v_role from public.memberships m
  where m.org_id = v_card.org_id and m.user_id = auth.uid();
  if v_role is null then raise exception 'forbidden' using errcode = '42501'; end if;

  for k in select jsonb_object_keys(p_patch) loop
    v_access := app.field_access(v_card.org_id, auth.uid(), v_role, k);
    if v_access <> 'write' then
      perform app.emit_event(v_card.org_id, 'card', 'field_write_denied', jsonb_build_object('field', k), v_card.board_id, v_card.id, auth.uid());
      raise exception 'field_forbidden: %', k using errcode = '42501';
    end if;
  end loop;

  if p_patch ? 'parent_id' then
    v_new_parent := nullif(p_patch->>'parent_id', '')::uuid;
    perform app.assert_no_card_parent_cycle(p_card_id, v_new_parent, v_card.board_id);
  end if;

  update public.cards set
    title = coalesce(p_patch->>'title', title),
    description = coalesce(p_patch->>'description', description),
    due_date = case when p_patch ? 'due_date' then (p_patch->>'due_date')::timestamptz else due_date end,
    start_date = case when p_patch ? 'start_date' then (p_patch->>'start_date')::timestamptz else start_date end,
    target_date = case when p_patch ? 'target_date' then (p_patch->>'target_date')::timestamptz else target_date end,
    priority = coalesce((p_patch->>'priority')::public.card_priority, priority),
    assignee_id = case when p_patch ? 'assignee_id' then nullif(p_patch->>'assignee_id','')::uuid else assignee_id end,
    column_id = case when p_patch ? 'column_id' then (p_patch->>'column_id')::uuid else column_id end,
    estimated_hours = case when p_patch ? 'estimated_hours' then (p_patch->>'estimated_hours')::numeric else estimated_hours end,
    story_points = case when p_patch ? 'story_points' then (p_patch->>'story_points')::int else story_points end,
    parent_id = case
      when p_patch ? 'parent_id' then nullif(p_patch->>'parent_id', '')::uuid
      else parent_id
    end,
    updated_at = now()
  where id = p_card_id;
end;
$$;

grant execute on function public.update_card_fields(uuid, jsonb) to authenticated;
