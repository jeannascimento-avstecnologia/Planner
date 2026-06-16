-- =====================================================================
-- 0002 - Boards domain: boards, columns, cards (+subtasks/deps), events
-- =====================================================================

-- ---------- enums ----------
do $$ begin
  create type public.card_priority as enum ('low', 'medium', 'high', 'urgent');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.card_event_type as enum
    ('created','moved','updated','completed','reopened','assigned','due_changed','priority_changed','archived');
exception when duplicate_object then null; end $$;

-- ---------- tables ----------
create table public.boards (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  created_by uuid references public.profiles(id) on delete set null,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index boards_org_idx on public.boards(org_id);

create table public.board_members (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.membership_role not null default 'viewer',
  created_at timestamptz not null default now(),
  unique (board_id, user_id)
);
create index board_members_user_idx on public.board_members(user_id);

create table public.columns (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  position text not null,
  wip_limit int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index columns_board_idx on public.columns(board_id);

create table public.cards (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  column_id uuid not null references public.columns(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  parent_id uuid references public.cards(id) on delete cascade,
  title text not null,
  description text,
  priority public.card_priority not null default 'medium',
  due_date timestamptz,
  position text not null,
  assignee_id uuid references public.profiles(id) on delete set null,
  completed_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index cards_board_idx on public.cards(board_id);
create index cards_column_idx on public.cards(column_id);
create index cards_parent_idx on public.cards(parent_id);
create index cards_org_idx on public.cards(org_id);

create table public.card_dependencies (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  blocker_card_id uuid not null references public.cards(id) on delete cascade,
  blocked_card_id uuid not null references public.cards(id) on delete cascade,
  type text not null default 'finish_to_start',
  created_at timestamptz not null default now(),
  unique (blocker_card_id, blocked_card_id),
  check (blocker_card_id <> blocked_card_id)
);

create table public.card_events (
  id bigint generated always as identity primary key,
  org_id uuid not null references public.organizations(id) on delete cascade,
  board_id uuid not null references public.boards(id) on delete cascade,
  card_id uuid not null references public.cards(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  type public.card_event_type not null,
  from_column_id uuid references public.columns(id) on delete set null,
  to_column_id uuid references public.columns(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index card_events_board_idx on public.card_events(board_id, created_at);
create index card_events_card_idx on public.card_events(card_id, created_at);

create trigger trg_boards_updated before update on public.boards
  for each row execute function app.set_updated_at();
create trigger trg_columns_updated before update on public.columns
  for each row execute function app.set_updated_at();
create trigger trg_cards_updated before update on public.cards
  for each row execute function app.set_updated_at();

-- ---------- helper: acesso a board (org member OU board_member) ----------
create or replace function app.can_access_board(p_board uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.boards b
    where b.id = p_board and app.is_org_member(b.org_id)
  ) or exists (
    select 1 from public.board_members bm
    where bm.board_id = p_board and bm.user_id = (select auth.uid())
  );
$$;

-- ---------- RLS ----------
alter table public.boards enable row level security;
alter table public.board_members enable row level security;
alter table public.columns enable row level security;
alter table public.cards enable row level security;
alter table public.card_dependencies enable row level security;
alter table public.card_events enable row level security;

create policy boards_select on public.boards
  for select using (app.can_access_board(id));
create policy boards_write on public.boards
  for all using (app.has_org_role(org_id, array['admin']))
  with check (app.has_org_role(org_id, array['admin']));

create policy board_members_select on public.board_members
  for select using (app.can_access_board(board_id));
create policy board_members_write on public.board_members
  for all using (exists (
    select 1 from public.boards b
    where b.id = board_id and app.has_org_role(b.org_id, array['admin'])
  ))
  with check (exists (
    select 1 from public.boards b
    where b.id = board_id and app.has_org_role(b.org_id, array['admin'])
  ));

create policy columns_select on public.columns
  for select using (app.can_access_board(board_id));
create policy columns_write on public.columns
  for all using (app.has_org_role(org_id, array['admin']))
  with check (app.has_org_role(org_id, array['admin']));

create policy cards_select on public.cards
  for select using (app.can_access_board(board_id));
create policy cards_write on public.cards
  for all using (app.has_org_role(org_id, array['admin']))
  with check (app.has_org_role(org_id, array['admin']));

create policy card_deps_select on public.card_dependencies
  for select using (app.is_org_member(org_id));
create policy card_deps_write on public.card_dependencies
  for all using (app.has_org_role(org_id, array['admin']))
  with check (app.has_org_role(org_id, array['admin']));

-- card_events: append-only (insert p/ membros; sem update/delete)
create policy card_events_select on public.card_events
  for select using (app.can_access_board(board_id));
create policy card_events_insert on public.card_events
  for insert with check (app.can_access_board(board_id));

-- ---------- grants ----------
grant execute on function app.can_access_board(uuid) to anon, authenticated;
grant select, insert, update, delete on public.boards to authenticated;
grant select, insert, update, delete on public.board_members to authenticated;
grant select, insert, update, delete on public.columns to authenticated;
grant select, insert, update, delete on public.cards to authenticated;
grant select, insert, update, delete on public.card_dependencies to authenticated;
grant select, insert on public.card_events to authenticated;
