-- Concluido/Cancelado: marca completed_at e remove card do plano pessoal + alocacoes.

create or replace function app.sync_card_completion_from_stage()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_old_key text;
  v_new_key text;
begin
  if new.stage_id is not distinct from old.stage_id then
    return new;
  end if;

  if old.stage_id is not null then
    select system_key into v_old_key from public.stages where id = old.stage_id;
  end if;
  if new.stage_id is not null then
    select system_key into v_new_key from public.stages where id = new.stage_id;
  end if;

  if v_new_key in ('concluido', 'cancelado') then
    new.completed_at := coalesce(new.completed_at, now());
    new.personal_plan_at := null;
    delete from public.card_workload_allocations where card_id = new.id;
  elsif v_old_key in ('concluido', 'cancelado') and coalesce(v_new_key, '') not in ('concluido', 'cancelado') then
    new.completed_at := null;
  end if;

  return new;
end;
$$;

drop trigger if exists cards_sync_completion_from_stage on public.cards;
create trigger cards_sync_completion_from_stage
  before update of stage_id on public.cards
  for each row
  execute function app.sync_card_completion_from_stage();

update public.cards c
set completed_at = coalesce(c.completed_at, c.updated_at, now()),
    personal_plan_at = null
from public.stages s
where c.stage_id = s.id
  and s.system_key in ('concluido', 'cancelado')
  and c.completed_at is null;

delete from public.card_workload_allocations a
using public.cards c
join public.stages s on s.id = c.stage_id
where a.card_id = c.id
  and s.system_key in ('concluido', 'cancelado');
