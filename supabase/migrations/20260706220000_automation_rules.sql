-- A: automation rules

create table if not exists public.automation_rules (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  board_id uuid references public.boards(id) on delete cascade,
  name text not null,
  enabled boolean not null default true,
  trigger_event_type text not null,
  conditions jsonb not null default '[]'::jsonb,
  actions jsonb not null default '[]'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.automation_runs (
  id uuid primary key default gen_random_uuid(),
  rule_id uuid not null references public.automation_rules(id) on delete cascade,
  card_event_id bigint references public.card_events(id) on delete set null,
  status text not null check (status in ('success', 'failed', 'skipped')),
  depth int not null default 0,
  result jsonb not null default '{}'::jsonb,
  ran_at timestamptz not null default now()
);

alter table public.automation_rules enable row level security;
alter table public.automation_runs enable row level security;

create policy automation_rules_select on public.automation_rules
  for select using (app.is_org_member(org_id));

create policy automation_rules_write on public.automation_rules
  for all using (app.has_org_role(org_id, array['admin', 'owner', 'manager']))
  with check (app.has_org_role(org_id, array['admin', 'owner', 'manager']));

create policy automation_runs_select on public.automation_runs
  for select using (
    exists (
      select 1 from public.automation_rules r
      join public.memberships m on m.org_id = r.org_id and m.user_id = auth.uid()
      where r.id = rule_id
    )
  );

grant select, insert, update, delete on public.automation_rules to authenticated;
grant select on public.automation_runs to authenticated;
