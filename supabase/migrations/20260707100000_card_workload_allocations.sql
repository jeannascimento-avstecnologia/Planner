-- E.2: daily workload allocations + Teams Graph integration tables + RPCs

-- ---------- helpers ----------
create or replace function app.can_view_user_workload(p_org uuid, p_target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select auth.uid()) = p_target
    or app.has_org_role(p_org, array['manager', 'admin', 'owner'])
    or exists (
      select 1
      from public.boards b
      join public.board_members bm on bm.board_id = b.id
      where b.org_id = p_org
        and bm.user_id = (select auth.uid())
        and bm.role = 'manager'
    );
$$;

grant execute on function app.can_view_user_workload(uuid, uuid) to authenticated;

-- ---------- card_workload_allocations ----------
create table public.card_workload_allocations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  card_id uuid not null references public.cards(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  work_date date not null,
  hours numeric(4,2) not null check (hours >= 0 and hours <= 24),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (card_id, user_id, work_date)
);

create index card_workload_allocations_org_user_date_idx
  on public.card_workload_allocations(org_id, user_id, work_date);
create index card_workload_allocations_org_date_idx
  on public.card_workload_allocations(org_id, work_date);
create index card_workload_allocations_card_idx
  on public.card_workload_allocations(card_id);

alter table public.card_workload_allocations enable row level security;

create policy card_workload_allocations_select on public.card_workload_allocations
  for select using (
    app.is_org_member(org_id)
    and app.can_view_user_workload(org_id, user_id)
  );

create policy card_workload_allocations_write on public.card_workload_allocations
  for all using (
    app.is_org_member(org_id)
    and user_id = (select auth.uid())
    and exists (
      select 1 from public.cards c
      where c.id = card_id
        and c.assignee_id = (select auth.uid())
        and c.org_id = org_id
    )
  )
  with check (
    app.is_org_member(org_id)
    and user_id = (select auth.uid())
    and exists (
      select 1 from public.cards c
      where c.id = card_id
        and c.assignee_id = (select auth.uid())
        and c.org_id = org_id
    )
  );

-- ---------- sync rollup on card ----------
create or replace function app.sync_card_allocation_rollup(p_card_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sum numeric;
  v_max_date date;
begin
  select coalesce(sum(hours), 0), max(work_date)
  into v_sum, v_max_date
  from public.card_workload_allocations
  where card_id = p_card_id and user_id = p_user_id and hours > 0;

  update public.cards
  set
    estimated_hours = case when v_sum > 0 then v_sum else estimated_hours end,
    target_date = case
      when v_max_date is not null then (v_max_date::text || 'T12:00:00.000Z')::timestamptz
      else target_date
    end,
    updated_at = now()
  where id = p_card_id;
end;
$$;

-- ---------- upsert allocation ----------
create or replace function public.upsert_card_allocation(
  p_card_id uuid,
  p_work_date date,
  p_hours numeric
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_card public.cards%rowtype;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if p_work_date is null then raise exception 'invalid_date'; end if;
  if p_hours is null or p_hours < 0 or p_hours > 24 then raise exception 'invalid_hours'; end if;

  select * into v_card from public.cards where id = p_card_id for update;
  if not found then raise exception 'card_not_found'; end if;
  if v_card.assignee_id is distinct from auth.uid() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if not app.can_write_board(v_card.board_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if p_hours = 0 then
    delete from public.card_workload_allocations
    where card_id = p_card_id and user_id = auth.uid() and work_date = p_work_date;
  else
    insert into public.card_workload_allocations (org_id, card_id, user_id, work_date, hours)
    values (v_card.org_id, p_card_id, auth.uid(), p_work_date, p_hours)
    on conflict (card_id, user_id, work_date)
    do update set hours = excluded.hours, updated_at = now();
  end if;

  perform app.sync_card_allocation_rollup(p_card_id, auth.uid());
end;
$$;

grant execute on function public.upsert_card_allocation(uuid, date, numeric) to authenticated;

-- ---------- move allocation between days ----------
create or replace function public.move_card_allocation(
  p_card_id uuid,
  p_from_date date,
  p_to_date date,
  p_hours numeric default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_from_hours numeric;
  v_move numeric;
begin
  if p_from_date = p_to_date then return; end if;

  select hours into v_from_hours
  from public.card_workload_allocations
  where card_id = p_card_id and user_id = auth.uid() and work_date = p_from_date;

  if v_from_hours is null or v_from_hours <= 0 then
    raise exception 'no_hours_at_source';
  end if;

  v_move := coalesce(p_hours, v_from_hours);
  if v_move <= 0 or v_move > v_from_hours then
    raise exception 'invalid_move_hours';
  end if;

  if v_move = v_from_hours then
    delete from public.card_workload_allocations
    where card_id = p_card_id and user_id = auth.uid() and work_date = p_from_date;
    perform public.upsert_card_allocation(p_card_id, p_to_date, v_move);
  else
    perform public.upsert_card_allocation(p_card_id, p_from_date, v_from_hours - v_move);
    perform public.upsert_card_allocation(
      p_card_id,
      p_to_date,
      coalesce(
        (select hours from public.card_workload_allocations
         where card_id = p_card_id and user_id = auth.uid() and work_date = p_to_date),
        0
      ) + v_move
    );
  end if;
end;
$$;

grant execute on function public.move_card_allocation(uuid, date, date, numeric) to authenticated;

-- ---------- bulk spread hours across weekdays ----------
create or replace function public.bulk_spread_card_hours(
  p_card_id uuid,
  p_total_hours numeric,
  p_start date,
  p_end date
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_card public.cards%rowtype;
  d date;
  v_days int := 0;
  v_per numeric;
  v_remainder numeric;
  v_i int := 0;
begin
  if p_total_hours is null or p_total_hours <= 0 then raise exception 'invalid_total'; end if;
  if p_start is null or p_end is null or p_end < p_start then raise exception 'invalid_range'; end if;

  select * into v_card from public.cards where id = p_card_id;
  if not found then raise exception 'card_not_found'; end if;
  if v_card.assignee_id is distinct from auth.uid() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  d := p_start;
  while d <= p_end loop
    if extract(isodow from d) < 6 then v_days := v_days + 1; end if;
    d := d + 1;
  end loop;
  if v_days = 0 then raise exception 'no_weekdays_in_range'; end if;

  v_per := round(p_total_hours / v_days, 2);
  v_remainder := p_total_hours;

  delete from public.card_workload_allocations
  where card_id = p_card_id and user_id = auth.uid()
    and work_date between p_start and p_end;

  d := p_start;
  while d <= p_end loop
    if extract(isodow from d) < 6 then
      v_i := v_i + 1;
      if v_i = v_days then
        perform public.upsert_card_allocation(p_card_id, d, v_remainder);
      else
        perform public.upsert_card_allocation(p_card_id, d, v_per);
        v_remainder := v_remainder - v_per;
      end if;
    end if;
    d := d + 1;
  end loop;
end;
$$;

grant execute on function public.bulk_spread_card_hours(uuid, numeric, date, date) to authenticated;

-- ---------- schedule card to day (sidebar drag) ----------
create or replace function public.schedule_card_to_day(
  p_card_id uuid,
  p_work_date date,
  p_default_hours numeric default 4
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_card public.cards%rowtype;
  v_hours numeric;
begin
  select * into v_card from public.cards where id = p_card_id for update;
  if not found then raise exception 'card_not_found'; end if;
  if v_card.assignee_id is distinct from auth.uid() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if not app.can_write_board(v_card.board_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  update public.cards
  set target_date = (p_work_date::text || 'T12:00:00.000Z')::timestamptz,
      updated_at = now()
  where id = p_card_id;

  v_hours := coalesce(nullif(v_card.estimated_hours, 0), p_default_hours);
  perform public.upsert_card_allocation(p_card_id, p_work_date, v_hours);
end;
$$;

grant execute on function public.schedule_card_to_day(uuid, date, numeric) to authenticated;

-- ---------- org Teams integration config ----------
create table public.org_teams_integrations (
  org_id uuid primary key references public.organizations(id) on delete cascade,
  azure_tenant_id text,
  team_id text not null,
  channel_id text not null,
  planner_plan_id text not null,
  planner_bucket_id text not null,
  configured_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.org_teams_integrations enable row level security;

create policy org_teams_integrations_select on public.org_teams_integrations
  for select using (app.is_org_member(org_id));

create policy org_teams_integrations_write on public.org_teams_integrations
  for all using (app.can_manage_org_members(org_id))
  with check (app.can_manage_org_members(org_id));

-- ---------- export mappings ----------
create table public.teams_export_mappings (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  card_id uuid not null references public.cards(id) on delete cascade,
  planner_task_id text not null,
  last_exported_at timestamptz not null default now(),
  unique (org_id, card_id)
);

create index teams_export_mappings_org_idx on public.teams_export_mappings(org_id);

alter table public.teams_export_mappings enable row level security;

create policy teams_export_mappings_select on public.teams_export_mappings
  for select using (app.is_org_member(org_id));

create policy teams_export_mappings_write on public.teams_export_mappings
  for all using (app.is_org_member(org_id))
  with check (app.is_org_member(org_id));

-- ---------- Microsoft OAuth tokens (encrypted, no direct access) ----------
create table public.user_microsoft_tokens (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  access_token_encrypted bytea not null,
  refresh_token_encrypted bytea not null,
  expires_at timestamptz not null,
  scope text,
  updated_at timestamptz not null default now()
);

alter table public.user_microsoft_tokens enable row level security;

create policy user_microsoft_tokens_deny on public.user_microsoft_tokens
  for all using (false);

create or replace function public.set_user_microsoft_tokens(
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
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if p_access is null or p_refresh is null then raise exception 'invalid_tokens'; end if;

  v_key := private.integrations_encryption_key();
  if v_key is null or length(v_key) < 16 then
    raise exception 'integrations_key_not_configured';
  end if;

  insert into public.user_microsoft_tokens (
    user_id, access_token_encrypted, refresh_token_encrypted, expires_at, scope
  )
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

grant execute on function public.set_user_microsoft_tokens(text, text, timestamptz, text) to authenticated;

create or replace function public.get_user_microsoft_tokens()
returns table (
  access_token text,
  refresh_token text,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_key text;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  v_key := private.integrations_encryption_key();

  return query
  select
    extensions.pgp_sym_decrypt(t.access_token_encrypted, v_key)::text,
    extensions.pgp_sym_decrypt(t.refresh_token_encrypted, v_key)::text,
    t.expires_at
  from public.user_microsoft_tokens t
  where t.user_id = auth.uid();
end;
$$;

-- Only service_role / edge functions should call get with service role; restrict to authenticated self
grant execute on function public.get_user_microsoft_tokens() to authenticated;

create or replace function public.upsert_org_teams_integration(
  p_org uuid,
  p_team_id text,
  p_channel_id text,
  p_plan_id text,
  p_bucket_id text,
  p_tenant_id text default null
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
  insert into public.org_teams_integrations (
    org_id, azure_tenant_id, team_id, channel_id, planner_plan_id, planner_bucket_id, configured_by
  )
  values (p_org, p_tenant_id, p_team_id, p_channel_id, p_plan_id, p_bucket_id, auth.uid())
  on conflict (org_id) do update set
    azure_tenant_id = excluded.azure_tenant_id,
    team_id = excluded.team_id,
    channel_id = excluded.channel_id,
    planner_plan_id = excluded.planner_plan_id,
    planner_bucket_id = excluded.planner_bucket_id,
    configured_by = auth.uid(),
    updated_at = now();
end;
$$;

grant execute on function public.upsert_org_teams_integration(uuid, text, text, text, text, text) to authenticated;

create or replace function public.upsert_teams_export_mapping(
  p_org uuid,
  p_card_id uuid,
  p_planner_task_id text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not app.is_org_member(p_org) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  insert into public.teams_export_mappings (org_id, card_id, planner_task_id)
  values (p_org, p_card_id, p_planner_task_id)
  on conflict (org_id, card_id) do update set
    planner_task_id = excluded.planner_task_id,
    last_exported_at = now();
end;
$$;

grant execute on function public.upsert_teams_export_mapping(uuid, uuid, text) to authenticated;

create or replace function public.user_has_microsoft_connection()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_microsoft_tokens t
    where t.user_id = (select auth.uid())
  );
$$;

grant execute on function public.user_has_microsoft_connection() to authenticated;
