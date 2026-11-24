-- Responsavel do card so pode ser quem acessa o board (dept/projeto restrito).

create or replace function app.assert_card_assignee_access()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.assignee_id is null then
    return new;
  end if;
  if current_setting('app.assignee_access_skip', true) = '1' then
    return new;
  end if;
  if not app.can_access_board_as(new.board_id, new.assignee_id) then
    raise exception 'assignee_forbidden' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists cards_guard_assignee_access on public.cards;
create trigger cards_guard_assignee_access
  before insert or update of assignee_id on public.cards
  for each row
  execute function app.assert_card_assignee_access();

-- Clone: nao copiar assignee que nao acessa o board novo.
create or replace function public.duplicate_board(p_board_id uuid)
returns public.boards
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_src public.boards;
  v_board public.boards;
  v_allowed boolean;
  v_base text;
  v_suffix text;
  v_name text;
  v_n int := 2;
  v_preset uuid := 'a0000000-0000-4000-8000-000000000002'::uuid;
  v_col_map jsonb := '{}'::jsonb;
  v_stage_map jsonb := '{}'::jsonb;
  v_tag_map jsonb := '{}'::jsonb;
  v_card_map jsonb := '{}'::jsonb;
  v_id_map jsonb;
  v_new_id uuid;
  v_assignee uuid;
  r record;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select * into v_src from public.boards where id = p_board_id;
  if not found then
    raise exception 'forbidden';
  end if;

  if v_src.created_by is distinct from v_uid then
    raise exception 'forbidden';
  end if;

  if not app.can_access_board(v_src.id) then
    raise exception 'forbidden';
  end if;

  v_allowed := app.has_org_role(v_src.org_id, array['admin'])
    or (
      v_src.department_id is not null
      and app.has_department_role(v_src.department_id, array['admin', 'manager'])
    );

  if not v_allowed then
    raise exception 'forbidden';
  end if;

  v_base := trim(v_src.name);
  v_suffix := ' (cópia)';
  v_name := left(v_base, greatest(1, 120 - char_length(v_suffix))) || v_suffix;
  while exists (
    select 1 from public.boards b
    where b.org_id = v_src.org_id and b.name = v_name
  ) loop
    v_suffix := ' (cópia ' || v_n::text || ')';
    v_name := left(v_base, greatest(1, 120 - char_length(v_suffix))) || v_suffix;
    v_n := v_n + 1;
    if v_n > 1000 then
      raise exception 'duplicate_name_exhausted';
    end if;
  end loop;

  insert into public.boards (
    org_id, name, description, icon, color, department_id, created_by,
    archived, tiflux_enabled, integrations
  ) values (
    v_src.org_id,
    v_name,
    v_src.description,
    v_src.icon,
    v_src.color,
    v_src.department_id,
    v_uid,
    false,
    false,
    '{}'::jsonb
  )
  returning * into v_board;

  insert into public.board_members (board_id, user_id, role, preset_id)
  values (v_board.id, v_uid, 'admin'::public.membership_role, v_preset)
  on conflict (board_id, user_id) do update
    set role = excluded.role,
        preset_id = coalesce(public.board_members.preset_id, excluded.preset_id);

  perform set_config('app.audit_skip', '1', true);

  delete from public.columns where board_id = v_board.id;
  delete from public.stages where board_id = v_board.id;

  for r in
    select * from public.stages s where s.board_id = v_src.id order by s.position, s.id
  loop
    v_new_id := gen_random_uuid();
    v_stage_map := v_stage_map || jsonb_build_object(r.id::text, v_new_id::text);
    insert into public.stages (
      id, org_id, board_id, name, color, position, is_system, system_key, created_at
    ) values (
      v_new_id, v_src.org_id, v_board.id, r.name, r.color, r.position, r.is_system, r.system_key, r.created_at
    );
  end loop;

  for r in
    select * from public.columns c where c.board_id = v_src.id order by c.position, c.id
  loop
    v_new_id := gen_random_uuid();
    v_col_map := v_col_map || jsonb_build_object(r.id::text, v_new_id::text);
    insert into public.columns (
      id, board_id, org_id, name, position, wip_limit, default_stage_id, created_at, updated_at
    ) values (
      v_new_id,
      v_board.id,
      v_src.org_id,
      r.name,
      r.position,
      r.wip_limit,
      null,
      r.created_at,
      r.updated_at
    );
  end loop;

  update public.columns c
  set default_stage_id = (v_stage_map ->> src.default_stage_id::text)::uuid
  from public.columns src
  where src.board_id = v_src.id
    and src.default_stage_id is not null
    and c.id = (v_col_map ->> src.id::text)::uuid;

  for r in
    select * from public.tags t where t.board_id = v_src.id order by t.name, t.id
  loop
    v_new_id := gen_random_uuid();
    v_tag_map := v_tag_map || jsonb_build_object(r.id::text, v_new_id::text);
    insert into public.tags (id, org_id, board_id, name, color, created_at)
    values (v_new_id, v_src.org_id, v_board.id, r.name, r.color, r.created_at);
  end loop;

  for r in
    select * from public.cards c where c.board_id = v_src.id order by c.created_at, c.id
  loop
    if not (v_col_map ? r.column_id::text) then
      raise exception 'duplicate_column_missing';
    end if;
    v_new_id := gen_random_uuid();
    v_card_map := v_card_map || jsonb_build_object(r.id::text, v_new_id::text);
    v_assignee := r.assignee_id;
    if v_assignee is not null and not app.can_access_board_as(v_board.id, v_assignee) then
      v_assignee := null;
    end if;
    insert into public.cards (
      id, board_id, column_id, org_id, parent_id,
      tree_x, tree_y, title, description, priority,
      due_date, start_date, target_date, position, assignee_id, completed_at,
      stage_id,
      tiflux_ticket_number, tiflux_ticket_id, tiflux_payload, tiflux_created_at, tiflux_canceled_tickets,
      estimated_hours, story_points, personal_plan_at,
      created_by, created_at, updated_at
    ) values (
      v_new_id,
      v_board.id,
      (v_col_map ->> r.column_id::text)::uuid,
      v_src.org_id,
      null,
      r.tree_x,
      r.tree_y,
      r.title,
      r.description,
      r.priority,
      r.due_date,
      r.start_date,
      r.target_date,
      r.position,
      v_assignee,
      r.completed_at,
      case
        when r.stage_id is not null and v_stage_map ? r.stage_id::text
          then (v_stage_map ->> r.stage_id::text)::uuid
        else null
      end,
      null, null, null, null, '[]'::jsonb,
      r.estimated_hours,
      r.story_points,
      null,
      r.created_by,
      r.created_at,
      r.updated_at
    );
  end loop;

  update public.cards dst
  set parent_id = (v_card_map ->> src.parent_id::text)::uuid
  from public.cards src
  where src.board_id = v_src.id
    and src.parent_id is not null
    and v_card_map ? src.parent_id::text
    and dst.id = (v_card_map ->> src.id::text)::uuid;

  insert into public.card_tags (card_id, tag_id, org_id)
  select
    (v_card_map ->> ct.card_id::text)::uuid,
    (v_tag_map ->> ct.tag_id::text)::uuid,
    v_src.org_id
  from public.card_tags ct
  join public.cards c on c.id = ct.card_id
  where c.board_id = v_src.id
    and v_card_map ? ct.card_id::text
    and v_tag_map ? ct.tag_id::text;

  insert into public.card_dependencies (org_id, blocker_card_id, blocked_card_id, type, created_at)
  select
    v_src.org_id,
    (v_card_map ->> d.blocker_card_id::text)::uuid,
    (v_card_map ->> d.blocked_card_id::text)::uuid,
    d.type,
    d.created_at
  from public.card_dependencies d
  where v_card_map ? d.blocker_card_id::text
    and v_card_map ? d.blocked_card_id::text;

  insert into public.card_checklist_items (
    org_id, board_id, card_id, title, done, position, created_at, updated_at
  )
  select
    v_src.org_id,
    v_board.id,
    (v_card_map ->> i.card_id::text)::uuid,
    i.title,
    i.done,
    i.position,
    i.created_at,
    i.updated_at
  from public.card_checklist_items i
  where i.board_id = v_src.id
    and v_card_map ? i.card_id::text;

  insert into public.card_tree_edges (
    org_id, board_id, parent_card_id, child_card_id, created_at
  )
  select
    v_src.org_id,
    v_board.id,
    (v_card_map ->> e.parent_card_id::text)::uuid,
    (v_card_map ->> e.child_card_id::text)::uuid,
    e.created_at
  from public.card_tree_edges e
  where e.board_id = v_src.id
    and v_card_map ? e.parent_card_id::text
    and v_card_map ? e.child_card_id::text;

  insert into public.card_comments (
    org_id, board_id, card_id, author_id, content, created_at, updated_at
  )
  select
    v_src.org_id,
    v_board.id,
    (v_card_map ->> cm.card_id::text)::uuid,
    cm.author_id,
    cm.content,
    cm.created_at,
    cm.updated_at
  from public.card_comments cm
  where cm.board_id = v_src.id
    and v_card_map ? cm.card_id::text;

  insert into public.card_attachments (
    org_id, board_id, card_id, kind, url, label, created_by, created_at, updated_at
  )
  select
    v_src.org_id,
    v_board.id,
    (v_card_map ->> a.card_id::text)::uuid,
    a.kind,
    a.url,
    a.label,
    a.created_by,
    a.created_at,
    a.updated_at
  from public.card_attachments a
  where a.board_id = v_src.id
    and v_card_map ? a.card_id::text;

  v_id_map := coalesce(v_col_map, '{}'::jsonb)
    || coalesce(v_stage_map, '{}'::jsonb)
    || coalesce(v_tag_map, '{}'::jsonb)
    || coalesce(v_card_map, '{}'::jsonb);

  insert into public.automation_rules (
    org_id, board_id, name, trigger_event, conditions, actions, active, created_at, updated_at
  )
  select
    v_src.org_id,
    v_board.id,
    ar.name,
    ar.trigger_event,
    app.jsonb_replace_uuids(ar.conditions, v_id_map),
    app.jsonb_replace_uuids(ar.actions, v_id_map),
    ar.active,
    ar.created_at,
    ar.updated_at
  from public.automation_rules ar
  where ar.board_id = v_src.id;

  insert into public.board_whiteboards (board_id, org_id, snapshot, updated_at, updated_by)
  select
    v_board.id,
    v_src.org_id,
    app.jsonb_replace_uuids(w.snapshot, v_id_map),
    now(),
    v_uid
  from public.board_whiteboards w
  where w.board_id = v_src.id;

  return v_board;
end;
$$;
