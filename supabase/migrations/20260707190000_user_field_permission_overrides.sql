-- F.2 user field permission overrides (personalizadas por usuario)

create table if not exists public.user_field_permission_overrides (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  resource text not null default 'card',
  field_name text not null,
  access text not null check (access in ('read', 'write', 'hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, user_id, resource, field_name)
);

create index user_field_permission_overrides_org_user_idx
  on public.user_field_permission_overrides (org_id, user_id);

alter table public.user_field_permission_overrides enable row level security;

create policy user_field_overrides_select on public.user_field_permission_overrides
  for select using (app.is_org_member(org_id));

create policy user_field_overrides_write on public.user_field_permission_overrides
  for all using (app.has_org_role(org_id, array['admin', 'owner']))
  with check (
    app.has_org_role(org_id, array['admin', 'owner'])
    and exists (
      select 1 from public.memberships m
      where m.org_id = user_field_permission_overrides.org_id
        and m.user_id = user_field_permission_overrides.user_id
    )
  );

grant select, insert, update, delete on public.user_field_permission_overrides to authenticated;

create or replace function app.field_access(
  p_org uuid,
  p_user uuid,
  p_role public.membership_role,
  p_field text
)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select ufo.access
     from public.user_field_permission_overrides ufo
     where ufo.org_id = p_org
       and ufo.user_id = p_user
       and ufo.resource = 'card'
       and ufo.field_name = p_field),
    (select fpr.access
     from public.field_permission_rules fpr
     where fpr.org_id = p_org
       and fpr.role = p_role
       and fpr.resource = 'card'
       and fpr.field_name = p_field),
    'write'
  );
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
    updated_at = now()
  where id = p_card_id;
end;
$$;

grant execute on function public.update_card_fields(uuid, jsonb) to authenticated;
