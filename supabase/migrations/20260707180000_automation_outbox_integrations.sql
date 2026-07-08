-- Automation outbox (external actions) + org Slack webhook + Google tokens/mappings

create table if not exists public.automation_outbox (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  board_id uuid not null references public.boards(id) on delete cascade,
  rule_id uuid references public.automation_rules(id) on delete set null,
  card_id uuid references public.cards(id) on delete set null,
  card_event_id bigint references public.card_events(id) on delete set null,
  action_type text not null,
  action_payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'processing', 'success', 'failed')),
  attempts int not null default 0,
  next_attempt_at timestamptz not null default now(),
  dedup_key text not null,
  result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (dedup_key)
);

create index if not exists automation_outbox_pending_idx
  on public.automation_outbox (status, next_attempt_at)
  where status in ('pending', 'failed');

alter table public.automation_outbox enable row level security;
create policy automation_outbox_deny on public.automation_outbox for all using (false);

create table if not exists public.org_slack_integrations (
  org_id uuid primary key references public.organizations(id) on delete cascade,
  webhook_url_encrypted bytea not null,
  channel_label text,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

alter table public.org_slack_integrations enable row level security;
create policy org_slack_integrations_deny on public.org_slack_integrations for all using (false);

create or replace function public.set_org_slack_webhook(p_org uuid, p_webhook_url text, p_channel_label text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_key text;
begin
  if not app.can_manage_org_members(p_org) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  v_key := private.integrations_encryption_key();
  insert into public.org_slack_integrations (org_id, webhook_url_encrypted, channel_label, updated_by)
  values (p_org, extensions.pgp_sym_encrypt(trim(p_webhook_url), v_key), nullif(trim(p_channel_label), ''), auth.uid())
  on conflict (org_id) do update set
    webhook_url_encrypted = excluded.webhook_url_encrypted,
    channel_label = excluded.channel_label,
    updated_by = excluded.updated_by,
    updated_at = now();
end;
$$;

create or replace function public.clear_org_slack_webhook(p_org uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not app.can_manage_org_members(p_org) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  delete from public.org_slack_integrations where org_id = p_org;
end;
$$;

create or replace function public.get_org_slack_webhook(p_org uuid)
returns table (webhook_url text, channel_label text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_key text;
begin
  v_key := private.integrations_encryption_key();
  return query
  select
    extensions.pgp_sym_decrypt(osi.webhook_url_encrypted, v_key)::text,
    osi.channel_label
  from public.org_slack_integrations osi
  where osi.org_id = p_org;
end;
$$;

revoke all on function public.get_org_slack_webhook(uuid) from public;
grant execute on function public.get_org_slack_webhook(uuid) to service_role;
grant execute on function public.set_org_slack_webhook(uuid, text, text) to authenticated;
grant execute on function public.clear_org_slack_webhook(uuid) to authenticated;

create table if not exists public.user_google_tokens (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  access_token_encrypted bytea not null,
  refresh_token_encrypted bytea not null,
  expires_at timestamptz not null,
  scope text,
  updated_at timestamptz not null default now()
);

alter table public.user_google_tokens enable row level security;
create policy user_google_tokens_deny on public.user_google_tokens for all using (false);

create or replace function public.set_user_google_tokens(
  p_access text,
  p_refresh text,
  p_expires_at timestamptz,
  p_scope text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_key text;
begin
  v_key := private.integrations_encryption_key();
  insert into public.user_google_tokens (user_id, access_token_encrypted, refresh_token_encrypted, expires_at, scope)
  values (
    auth.uid(),
    extensions.pgp_sym_encrypt(p_access, v_key),
    extensions.pgp_sym_encrypt(p_refresh, v_key),
    p_expires_at,
    p_scope
  )
  on conflict (user_id) do update set
    access_token_encrypted = excluded.access_token_encrypted,
    refresh_token_encrypted = excluded.refresh_token_encrypted,
    expires_at = excluded.expires_at,
    scope = excluded.scope,
    updated_at = now();
end;
$$;

create or replace function public.get_user_google_tokens()
returns table (access_token text, refresh_token text, expires_at timestamptz, scope text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_key text;
begin
  v_key := private.integrations_encryption_key();
  return query
  select
    extensions.pgp_sym_decrypt(ugt.access_token_encrypted, v_key)::text,
    extensions.pgp_sym_decrypt(ugt.refresh_token_encrypted, v_key)::text,
    ugt.expires_at,
    ugt.scope
  from public.user_google_tokens ugt
  where ugt.user_id = auth.uid();
end;
$$;

create or replace function public.user_has_google_connection()
returns boolean
language sql
security definer
set search_path = ''
as $$
  select exists(select 1 from public.user_google_tokens where user_id = auth.uid());
$$;

grant execute on function public.set_user_google_tokens(text, text, timestamptz, text) to authenticated;
grant execute on function public.get_user_google_tokens() to authenticated;
grant execute on function public.user_has_google_connection() to authenticated;

create table if not exists public.org_google_integrations (
  org_id uuid primary key references public.organizations(id) on delete cascade,
  calendar_id text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

alter table public.org_google_integrations enable row level security;
create policy org_google_integrations_select on public.org_google_integrations
  for select using (app.can_manage_org_members(org_id));
create policy org_google_integrations_write on public.org_google_integrations
  for all using (app.can_manage_org_members(org_id)) with check (app.can_manage_org_members(org_id));

create table if not exists public.google_export_mappings (
  card_id uuid primary key references public.cards(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  google_event_id text not null,
  updated_at timestamptz not null default now()
);

create index if not exists google_export_mappings_org_idx on public.google_export_mappings (org_id);

alter table public.google_export_mappings enable row level security;
create policy google_export_mappings_select on public.google_export_mappings
  for select using (
    org_id in (select m.org_id from public.memberships m where m.user_id = (select auth.uid()))
  );

create or replace function private.enqueue_automation_outbox(
  p_org uuid,
  p_board uuid,
  p_rule uuid,
  p_card uuid,
  p_event bigint,
  p_action jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_type text := p_action->>'type';
  v_dedup text;
begin
  v_dedup := coalesce(p_event::text, '0') || ':' || coalesce(p_rule::text, '0') || ':' || v_type || ':' || md5(p_action::text);
  insert into public.automation_outbox (
    org_id, board_id, rule_id, card_id, card_event_id, action_type, action_payload, dedup_key
  )
  values (p_org, p_board, p_rule, p_card, p_event, v_type, p_action, v_dedup)
  on conflict (dedup_key) do nothing;
end;
$$;

create or replace function private.apply_automation_action(
  p_action jsonb,
  p_card_id uuid,
  p_org uuid default null,
  p_board uuid default null,
  p_rule uuid default null,
  p_event bigint default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_type text := p_action->>'type';
  v_org uuid;
  v_board uuid;
begin
  select org_id, board_id into v_org, v_board from public.cards where id = p_card_id;
  v_org := coalesce(p_org, v_org);
  v_board := coalesce(p_board, v_board);

  case v_type
    when 'move_card' then
      update public.cards
      set column_id = (p_action->>'target_column_id')::uuid,
          updated_at = now()
      where id = p_card_id;
    when 'set_priority' then
      update public.cards
      set priority = (p_action->>'value')::public.card_priority,
          updated_at = now()
      where id = p_card_id;
    when 'set_assignee' then
      update public.cards
      set assignee_id = nullif(p_action->>'user_id', '')::uuid,
          updated_at = now()
      where id = p_card_id;
    when 'send_slack', 'send_email', 'webhook' then
      perform private.enqueue_automation_outbox(v_org, v_board, p_rule, p_card_id, p_event, p_action);
    else
      raise exception 'unknown_automation_action: %', v_type;
  end case;
end;
$$;

-- Patch motor to pass rule/event into apply_automation_action (simplified: re-run execute function body patch)
create or replace function private.execute_automations_for_event(p_event_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event public.card_events;
  v_card public.cards;
  v_rule public.automation_rules;
  v_action jsonb;
  v_next_depth int;
  v_root bigint;
begin
  select * into v_event from public.card_events where id = p_event_id;
  if not found then return; end if;
  if v_event.automation_depth >= 3 then
    raise exception 'automation_depth_exceeded' using errcode = 'P0001';
  end if;
  if v_event.card_id is null then return; end if;

  select * into v_card from public.cards where id = v_event.card_id;
  if not found then return; end if;

  v_next_depth := v_event.automation_depth + 1;
  v_root := coalesce(v_event.root_event_id, v_event.id);

  perform set_config('app.automation_depth', v_next_depth::text, true);
  perform set_config('app.automation_root_event_id', v_root::text, true);
  perform set_config('app.automation_running', '1', true);

  for v_rule in
    select * from public.automation_rules r
    where r.board_id = v_event.board_id
      and r.active = true
      and r.trigger_event = v_event.event_type
  loop
    if not private.automation_conditions_match(v_rule.conditions, v_event, v_card) then
      continue;
    end if;
    for v_action in select * from jsonb_array_elements(v_rule.actions)
    loop
      perform private.apply_automation_action(v_action, v_card.id, v_rule.org_id, v_rule.board_id, v_rule.id, p_event_id);
      select * into v_card from public.cards where id = v_card.id;
    end loop;
  end loop;

  perform set_config('app.automation_running', '', true);
end;
$$;

grant select, update on public.automation_outbox to service_role;
grant insert on public.automation_runs to service_role;
