-- =====================================================================
-- 0014 - Estagios por board + apontamentos (time_entries)
-- =====================================================================

create table public.stages (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  board_id uuid not null references public.boards(id) on delete cascade,
  name text not null,
  color text not null,
  position int not null default 0,
  is_system boolean not null default false,
  system_key text,
  created_at timestamptz not null default now(),
  unique (board_id, name)
);
create unique index stages_board_system_key_idx on public.stages (board_id, system_key) where system_key is not null;
create index stages_board_idx on public.stages (board_id, position);

alter table public.cards add column if not exists stage_id uuid references public.stages(id) on delete set null;
alter table public.columns add column if not exists default_stage_id uuid references public.stages(id) on delete set null;

create table public.time_entries (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  card_id uuid not null references public.cards(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  started_at timestamptz not null,
  ended_at timestamptz,
  description text,
  tiflux_attendant_id text,
  tiflux_service_type_id text,
  tiflux_attendance_id text,
  tiflux_next_stage_id text,
  tiflux_entry_id text,
  synced_at timestamptz,
  created_at timestamptz not null default now()
);
create index time_entries_card_idx on public.time_entries (card_id, started_at desc);
create unique index time_entries_running_per_card on public.time_entries (card_id) where ended_at is null;

-- RLS stages
alter table public.stages enable row level security;

create policy stages_select on public.stages
  for select using (app.can_access_board(board_id));

create policy stages_write on public.stages
  for all using (app.can_write_board(board_id))
  with check (app.can_write_board(board_id));

-- RLS time_entries
alter table public.time_entries enable row level security;

create policy time_entries_select on public.time_entries
  for select using (exists (
    select 1 from public.cards c
    where c.id = card_id and app.can_access_board(c.board_id)
  ));

create policy time_entries_insert on public.time_entries
  for insert with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.cards c
      where c.id = card_id and app.can_access_board(c.board_id)
    )
  );

create policy time_entries_update on public.time_entries
  for update using (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.cards c
      where c.id = card_id and app.can_access_board(c.board_id)
    )
  )
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.cards c
      where c.id = card_id and app.can_access_board(c.board_id)
    )
  );

create policy time_entries_delete on public.time_entries
  for delete using (
    user_id = (select auth.uid())
    and ended_at is null
    and exists (
      select 1 from public.cards c
      where c.id = card_id and app.can_access_board(c.board_id)
    )
  );

grant select, insert, update, delete on public.stages to authenticated;
grant select, insert, update, delete on public.time_entries to authenticated;

-- Seed defaults em novos boards
create or replace function public.seed_default_stages()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.stages (org_id, board_id, name, color, position, is_system, system_key) values
    (new.org_id, new.id, 'Parado',       '#9CA3AF', 0, true, 'parado'),
    (new.org_id, new.id, 'Em Progresso', '#F59E0B', 1, true, 'em_progresso'),
    (new.org_id, new.id, 'Concluido',    '#10B981', 2, true, 'concluido'),
    (new.org_id, new.id, 'Cancelado',    '#EF4444', 3, true, 'cancelado');
  return new;
end;
$$;

drop trigger if exists boards_seed_stages on public.boards;
create trigger boards_seed_stages after insert on public.boards
  for each row execute function public.seed_default_stages();

-- Backfill boards existentes
insert into public.stages (org_id, board_id, name, color, position, is_system, system_key)
select b.org_id, b.id, s.name, s.color, s.position, true, s.key
from public.boards b
cross join (values
  ('Parado',       '#9CA3AF', 0, 'parado'),
  ('Em Progresso', '#F59E0B', 1, 'em_progresso'),
  ('Concluido',    '#10B981', 2, 'concluido'),
  ('Cancelado',    '#EF4444', 3, 'cancelado')
) as s(name, color, position, key)
where not exists (
  select 1 from public.stages st where st.board_id = b.id and st.system_key = s.key
);
