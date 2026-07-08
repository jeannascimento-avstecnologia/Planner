-- Workload hardening: target_date, org-scoped capacity, RPC updates

-- ---------- schema ----------
alter table public.cards
  add column if not exists target_date timestamptz;

alter table public.memberships
  add column if not exists weekly_capacity_hours numeric(5,2) not null default 40;

-- backfill membership capacity from legacy profile column
update public.memberships m
set weekly_capacity_hours = p.weekly_capacity_hours
from public.profiles p
where p.id = m.user_id
  and p.weekly_capacity_hours is not null
  and p.weekly_capacity_hours <> 40;

-- ---------- field permissions: target_date ----------
insert into public.field_permission_rules (org_id, role, resource, field_name, access)
select o.id, v.role::public.membership_role, 'card', 'target_date', v.access
from public.organizations o
cross join (values
  ('viewer', 'read'),
  ('manager', 'write'),
  ('admin', 'write'),
  ('owner', 'write')
) as v(role, access)
on conflict do nothing;

-- ---------- update_card_fields: target_date ----------
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
    v_access := app.field_access(v_card.org_id, v_role, k);
    if v_access <> 'write' then
      perform app.emit_event(v_card.org_id, 'card', 'field_write_denied', jsonb_build_object('field', k), v_card.board_id, v_card.id, auth.uid());
      raise exception 'field_forbidden: %', k using errcode = '42501';
    end if;
  end loop;

  update public.cards set
    title = coalesce(p_patch->>'title', title),
    description = coalesce(p_patch->>'description', description),
    due_date = case when p_patch ? 'due_date' then nullif(p_patch->>'due_date', '')::timestamptz else due_date end,
    start_date = case when p_patch ? 'start_date' then nullif(p_patch->>'start_date', '')::timestamptz else start_date end,
    target_date = case when p_patch ? 'target_date' then nullif(p_patch->>'target_date', '')::timestamptz else target_date end,
    priority = coalesce((p_patch->>'priority')::public.card_priority, priority),
    assignee_id = case when p_patch ? 'assignee_id' then nullif(p_patch->>'assignee_id','')::uuid else assignee_id end,
    column_id = case when p_patch ? 'column_id' then (p_patch->>'column_id')::uuid else column_id end,
    estimated_hours = case when p_patch ? 'estimated_hours' then nullif(p_patch->>'estimated_hours', '')::numeric else estimated_hours end,
    story_points = case when p_patch ? 'story_points' then nullif(p_patch->>'story_points', '')::int else story_points end,
    updated_at = now()
  where id = p_card_id;
end;
$$;

-- ---------- update member capacity (org-scoped) ----------
create or replace function public.update_member_capacity(
  p_org uuid,
  p_user uuid,
  p_hours numeric
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not app.can_manage_org_members(p_org) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_hours is null or p_hours < 1 or p_hours > 168 then
    raise exception 'invalid_capacity';
  end if;
  if not exists (
    select 1 from public.memberships
    where org_id = p_org and user_id = p_user
  ) then
    raise exception 'member_not_found';
  end if;
  update public.memberships
  set weekly_capacity_hours = p_hours
  where org_id = p_org and user_id = p_user;
end;
$$;

grant execute on function public.update_member_capacity(uuid, uuid, numeric) to authenticated;

-- ---------- list_org_members: include capacity ----------
drop function if exists public.list_org_members(uuid);

create function public.list_org_members(p_org uuid)
returns table (
  user_id uuid,
  full_name text,
  avatar_url text,
  role public.membership_role,
  created_at timestamptz,
  weekly_capacity_hours numeric
)
language plpgsql security definer set search_path = '' as $$
begin
  if not app.is_org_member(p_org) then
    raise exception 'forbidden';
  end if;
  return query
  select p.id, p.full_name, p.avatar_url, m.role, m.created_at, m.weekly_capacity_hours
  from public.memberships m
  join public.profiles p on p.id = m.user_id
  where m.org_id = p_org
  order by m.created_at asc;
end;
$$;

grant execute on function public.list_org_members(uuid) to authenticated;

-- ---------- refresh workload MV with target_date priority ----------
drop materialized view if exists public.workload_by_member_week;

create materialized view public.workload_by_member_week as
select
  c.org_id,
  c.assignee_id as user_id,
  date_trunc('week', coalesce(c.target_date, c.due_date, c.start_date, c.created_at))::date as week_start,
  coalesce(sum(c.estimated_hours), 0)::numeric as total_hours,
  coalesce(sum(c.story_points), 0)::int as total_points,
  count(*)::int as card_count
from public.cards c
where c.assignee_id is not null
  and coalesce(c.target_date, c.due_date, c.start_date) is not null
  and c.completed_at is null
group by 1, 2, 3;

create unique index workload_by_member_week_uidx
  on public.workload_by_member_week (org_id, user_id, week_start);

grant select on public.workload_by_member_week to authenticated;
