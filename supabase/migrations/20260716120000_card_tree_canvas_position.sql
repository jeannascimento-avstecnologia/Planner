-- D.Tree.Canvas: posições livres no organograma (tree_x / tree_y)

alter table public.cards
  add column if not exists tree_x numeric,
  add column if not exists tree_y numeric;

comment on column public.cards.tree_x is 'Canvas tree view X (nullable = auto-layout Dagre)';
comment on column public.cards.tree_y is 'Canvas tree view Y (nullable = auto-layout Dagre)';

create or replace function app.clamp_tree_coord(p numeric)
returns numeric
language sql
immutable
set search_path = ''
as $$
  select case
    when p is null then null
    when p <> p then null  -- NaN
    when p < -1000000 then -1000000::numeric
    when p > 1000000 then 1000000::numeric
    else p
  end;
$$;

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
    tree_x = case
      when p_patch ? 'tree_x' then app.clamp_tree_coord((p_patch->>'tree_x')::numeric)
      else tree_x
    end,
    tree_y = case
      when p_patch ? 'tree_y' then app.clamp_tree_coord((p_patch->>'tree_y')::numeric)
      else tree_y
    end,
    updated_at = now()
  where id = p_card_id;
end;
$$;

grant execute on function public.update_card_fields(uuid, jsonb) to authenticated;
