-- F.1: public wrapper for app.emit_event + revoke client INSERT

create or replace function public.emit_audit_event(
  p_org_id uuid,
  p_event_scope text,
  p_event_type text,
  p_payload jsonb default '{}'::jsonb,
  p_board_id uuid default null,
  p_card_id uuid default null
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not app.is_org_member(p_org_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_board_id is not null and not app.can_access_board(p_board_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return app.emit_event(p_org_id, p_event_scope, p_event_type, coalesce(p_payload, '{}'::jsonb), p_board_id, p_card_id, auth.uid());
end;
$$;

revoke all on function public.emit_audit_event(uuid, text, text, jsonb, uuid, uuid) from public;
grant execute on function public.emit_audit_event(uuid, text, text, jsonb, uuid, uuid) to authenticated;

drop policy if exists card_events_insert_mvp on public.card_events;
revoke insert on public.card_events from authenticated;
