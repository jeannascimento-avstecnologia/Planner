-- Arrastar card para o plano: apenas target_date quando p_default_hours <= 0 (sem alocacao automatica).
create or replace function public.schedule_card_to_day(
  p_card_id uuid,
  p_work_date date,
  p_default_hours numeric default 0
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_card public.cards%rowtype;
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

  if coalesce(p_default_hours, 0) > 0 then
    perform public.upsert_card_allocation(p_card_id, p_work_date, p_default_hours);
  end if;
end;
$$;

grant execute on function public.schedule_card_to_day(uuid, date, numeric) to authenticated;
