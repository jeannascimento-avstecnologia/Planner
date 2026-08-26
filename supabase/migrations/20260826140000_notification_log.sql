-- Email notification dedupe log (cron + server actions via service role).
create table public.notification_log (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  entity_id text not null,
  sent_at timestamptz not null default now(),
  unique (recipient_id, event_type, entity_id)
);

create index notification_log_org_sent_idx on public.notification_log (org_id, sent_at desc);
create index notification_log_event_entity_idx on public.notification_log (event_type, entity_id);

alter table public.notification_log enable row level security;

-- No policies: only service role / SECURITY DEFINER paths insert; clients cannot read/write.

grant select, insert on public.notification_log to service_role;
