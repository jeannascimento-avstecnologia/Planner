-- Cards sem responsavel nao entram em /plan (filtro assignee_id = auth.uid()).
-- Default: criador vira responsavel quando assignee nao informado.

create or replace function app.default_card_assignee_from_creator()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.assignee_id is null and new.created_by is not null then
    new.assignee_id := new.created_by;
  end if;
  return new;
end;
$$;

drop trigger if exists cards_default_assignee on public.cards;
create trigger cards_default_assignee
  before insert on public.cards
  for each row
  execute function app.default_card_assignee_from_creator();

update public.cards
set assignee_id = created_by,
    updated_at = now()
where assignee_id is null
  and created_by is not null
  and completed_at is null;
