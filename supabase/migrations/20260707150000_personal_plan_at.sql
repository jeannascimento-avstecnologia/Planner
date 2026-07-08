-- Calendario pessoal: card pode estar na grade sem dia/horas (personal_plan_at).
alter table public.cards
  add column if not exists personal_plan_at timestamptz;

comment on column public.cards.personal_plan_at is
  'Quando preenchido, o card aparece na grade do plano pessoal do assignee, independente de target_date/alocacao.';

create or replace function public.add_card_to_personal_plan(p_card_id uuid)
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
  set personal_plan_at = now(),
      updated_at = now()
  where id = p_card_id;
end;
$$;

create or replace function public.remove_card_from_personal_plan(p_card_id uuid)
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

  delete from public.card_workload_allocations
  where card_id = p_card_id
    and user_id = auth.uid();

  update public.cards
  set personal_plan_at = null,
      updated_at = now()
  where id = p_card_id;
end;
$$;

grant execute on function public.add_card_to_personal_plan(uuid) to authenticated;
grant execute on function public.remove_card_from_personal_plan(uuid) to authenticated;

-- Cards ja visiveis no plano (alocacao ou target_date) migram para personal_plan_at.
update public.cards c
set personal_plan_at = coalesce(c.personal_plan_at, c.updated_at, now())
where c.personal_plan_at is null
  and c.assignee_id is not null
  and c.completed_at is null
  and (
    c.target_date is not null
    or exists (
      select 1
      from public.card_workload_allocations a
      where a.card_id = c.id
        and a.hours > 0
    )
  );
