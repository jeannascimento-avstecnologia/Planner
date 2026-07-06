-- C: whiteboard

create table if not exists public.board_whiteboards (
  board_id uuid primary key references public.boards(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  snapshot jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

alter table public.board_whiteboards enable row level security;

create policy board_whiteboards_select on public.board_whiteboards
  for select using (app.can_access_board(board_id));

create policy board_whiteboards_write on public.board_whiteboards
  for all using (app.can_write_board(board_id))
  with check (app.can_write_board(board_id));

grant select, insert, update on public.board_whiteboards to authenticated;

create or replace function public.upsert_whiteboard_snapshot(p_board_id uuid, p_snapshot jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
begin
  if not app.can_write_board(p_board_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if octet_length(p_snapshot::text) > 2097152 then
    raise exception 'snapshot_too_large';
  end if;
  select org_id into v_org from public.boards where id = p_board_id;
  insert into public.board_whiteboards (board_id, org_id, snapshot, updated_at, updated_by)
  values (p_board_id, v_org, p_snapshot, now(), auth.uid())
  on conflict (board_id) do update set
    snapshot = excluded.snapshot,
    updated_at = now(),
    updated_by = auth.uid();
  perform app.emit_event(v_org, 'board', 'board_renamed', jsonb_build_object('whiteboard', true, 'byte_size', octet_length(p_snapshot::text)), p_board_id, null, auth.uid());
end;
$$;

grant execute on function public.upsert_whiteboard_snapshot(uuid, jsonb) to authenticated;
