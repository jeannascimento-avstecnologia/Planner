-- 20260706100000 - card_events Fase 2 (ADR-0011): evolui schema 0002 + append-only hardening

-- Colunas ADR-0011 (mantém id bigint identity de 0002)
alter table public.card_events
  add column if not exists event_scope text,
  add column if not exists event_type text,
  add column if not exists payload jsonb,
  add column if not exists occurred_at timestamptz;

update public.card_events
set
  event_scope = coalesce(event_scope, 'card'),
  event_type = coalesce(event_type, type::text),
  payload = coalesce(
    payload,
    metadata
      || case when from_column_id is not null then jsonb_build_object('from_column_id', from_column_id) else '{}'::jsonb end
      || case when to_column_id is not null then jsonb_build_object('to_column_id', to_column_id) else '{}'::jsonb end
  ),
  occurred_at = coalesce(occurred_at, created_at)
where event_scope is null or event_type is null or payload is null or occurred_at is null;

alter table public.card_events
  alter column event_scope set default 'card',
  alter column event_scope set not null,
  alter column payload set default '{}'::jsonb,
  alter column payload set not null,
  alter column occurred_at set default now(),
  alter column occurred_at set not null;

do $$ begin
  alter table public.card_events
    add constraint card_events_event_scope_check
    check (event_scope in ('card', 'board', 'org'));
exception when duplicate_object then null;
end $$;

-- Org/board events: board_id e card_id nullable; type legado opcional
alter table public.card_events alter column board_id drop not null;
alter table public.card_events alter column card_id drop not null;
alter table public.card_events alter column type drop not null;

alter table public.card_events drop constraint if exists card_events_board_id_fkey;
alter table public.card_events
  add constraint card_events_board_id_fkey
  foreign key (board_id) references public.boards(id) on delete set null;

alter table public.card_events drop constraint if exists card_events_card_id_fkey;
alter table public.card_events
  add constraint card_events_card_id_fkey
  foreign key (card_id) references public.cards(id) on delete set null;

-- Legacy MVP inserts (type/metadata) → preenche colunas ADR
create or replace function app.card_events_legacy_sync()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.event_scope := coalesce(new.event_scope, 'card');
  new.event_type := coalesce(new.event_type, new.type::text);
  new.payload := coalesce(
    new.payload,
    coalesce(new.metadata, '{}'::jsonb)
      || case when new.from_column_id is not null then jsonb_build_object('from_column_id', new.from_column_id) else '{}'::jsonb end
      || case when new.to_column_id is not null then jsonb_build_object('to_column_id', new.to_column_id) else '{}'::jsonb end
  );
  new.occurred_at := coalesce(new.occurred_at, new.created_at, now());
  return new;
end;
$$;

drop trigger if exists card_events_legacy_sync on public.card_events;
create trigger card_events_legacy_sync
  before insert on public.card_events
  for each row execute function app.card_events_legacy_sync();

-- Índices audit
create index if not exists card_events_org_occurred_idx on public.card_events (org_id, occurred_at desc);
create index if not exists card_events_org_type_idx on public.card_events (org_id, event_type);

-- RLS: audit admin/owner only (substitui can_access_board)
drop policy if exists card_events_select on public.card_events;
drop policy if exists card_events_insert on public.card_events;
drop policy if exists card_events_select_org_admin on public.card_events;

create policy card_events_select_org_admin on public.card_events
  for select using (
    org_id in (
      select m.org_id
      from public.memberships m
      where m.user_id = (select auth.uid())
        and m.role in ('admin', 'owner')
    )
  );

revoke update, delete on public.card_events from anon, authenticated;
grant select, insert on public.card_events to authenticated;

-- Transitional: MVP insere eventos card via client; F.1 migra para app.emit_event e remove policy
create policy card_events_insert_mvp on public.card_events
  for insert with check (
    board_id is not null
    and app.can_access_board(board_id)
  );

create or replace function app.deny_card_events_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_setting('app.card_events_purge', true) = '1' then
    return case TG_OP when 'DELETE' then OLD else NEW end;
  end if;
  raise exception 'card_events is append-only';
end;
$$;

drop trigger if exists card_events_deny_update on public.card_events;
create trigger card_events_deny_update
  before update or delete on public.card_events
  for each row execute function app.deny_card_events_mutation();

create or replace function app.emit_event(
  p_org_id uuid,
  p_event_scope text,
  p_event_type text,
  p_payload jsonb default '{}'::jsonb,
  p_board_id uuid default null,
  p_card_id uuid default null,
  p_actor_id uuid default null
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id bigint;
  v_actor uuid := coalesce(p_actor_id, auth.uid());
begin
  if p_event_scope not in ('card', 'board', 'org') then
    raise exception 'invalid event_scope';
  end if;

  insert into public.card_events (
    org_id, board_id, card_id, actor_id,
    event_scope, event_type, payload, occurred_at
  )
  values (
    p_org_id,
    p_board_id,
    p_card_id,
    v_actor,
    p_event_scope,
    p_event_type,
    coalesce(p_payload, '{}'::jsonb),
    now()
  )
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function app.purge_card_events_before(p_before timestamptz)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count bigint;
begin
  perform set_config('app.card_events_purge', '1', true);
  delete from public.card_events where occurred_at < p_before;
  get diagnostics v_count = row_count;
  perform set_config('app.card_events_purge', '0', true);
  return v_count;
end;
$$;

revoke all on function app.emit_event(uuid, text, text, jsonb, uuid, uuid, uuid) from public;
revoke all on function app.purge_card_events_before(timestamptz) from public;
grant execute on function app.emit_event(uuid, text, text, jsonb, uuid, uuid, uuid) to service_role;
grant execute on function app.purge_card_events_before(timestamptz) to service_role;
