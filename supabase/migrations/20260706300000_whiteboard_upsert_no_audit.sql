-- Whiteboard: upsert leve (sem emit_event por debounce — evita statement timeout)

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
end;
$$;
