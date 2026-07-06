-- F.2 field-level permissions

create table if not exists public.field_permission_rules (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  role public.membership_role not null,
  resource text not null default 'card',
  field_name text not null,
  access text not null check (access in ('read', 'write', 'hidden')),
  unique (org_id, role, resource, field_name)
);

create index field_permission_rules_org_idx on public.field_permission_rules (org_id);

alter table public.field_permission_rules enable row level security;

create policy field_rules_select on public.field_permission_rules
  for select using (app.is_org_member(org_id));

create policy field_rules_write on public.field_permission_rules
  for all using (app.has_org_role(org_id, array['admin', 'owner']))
  with check (app.has_org_role(org_id, array['admin', 'owner']));

insert into public.field_permission_rules (org_id, role, resource, field_name, access)
select o.id, v.role::public.membership_role, 'card', v.field_name, v.access
from public.organizations o
cross join (values
  ('viewer', 'title', 'read'),
  ('viewer', 'description', 'read'),
  ('viewer', 'due_date', 'read'),
  ('viewer', 'start_date', 'read'),
  ('viewer', 'priority', 'read'),
  ('viewer', 'assignee_id', 'read'),
  ('viewer', 'column_id', 'read'),
  ('viewer', 'estimated_hours', 'read'),
  ('viewer', 'story_points', 'read'),
  ('manager', 'title', 'write'),
  ('manager', 'description', 'write'),
  ('manager', 'due_date', 'write'),
  ('manager', 'start_date', 'write'),
  ('manager', 'priority', 'write'),
  ('manager', 'assignee_id', 'write'),
  ('manager', 'column_id', 'write'),
  ('manager', 'estimated_hours', 'write'),
  ('manager', 'story_points', 'write'),
  ('admin', 'title', 'write'),
  ('admin', 'description', 'write'),
  ('admin', 'due_date', 'write'),
  ('admin', 'start_date', 'write'),
  ('admin', 'priority', 'write'),
  ('admin', 'assignee_id', 'write'),
  ('admin', 'column_id', 'write'),
  ('admin', 'estimated_hours', 'write'),
  ('admin', 'story_points', 'write'),
  ('owner', 'title', 'write'),
  ('owner', 'description', 'write'),
  ('owner', 'due_date', 'write'),
  ('owner', 'start_date', 'write'),
  ('owner', 'priority', 'write'),
  ('owner', 'assignee_id', 'write'),
  ('owner', 'column_id', 'write'),
  ('owner', 'estimated_hours', 'write'),
  ('owner', 'story_points', 'write')
) as v(role, field_name, access)
on conflict do nothing;

grant select, insert, update, delete on public.field_permission_rules to authenticated;
