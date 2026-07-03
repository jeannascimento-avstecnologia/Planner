-- 20260703170000 - Colunas padrao em novos boards (To Start / On Going / Done)

create or replace function public.seed_default_columns()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.columns (board_id, org_id, name, position) values
    (new.id, new.org_id, 'To Start', 'a0'),
    (new.id, new.org_id, 'On Going', 'a1'),
    (new.id, new.org_id, 'Done', 'a2');
  return new;
end;
$$;

drop trigger if exists boards_seed_columns on public.boards;
create trigger boards_seed_columns
  after insert on public.boards
  for each row execute function public.seed_default_columns();

-- Backfill: boards sem nenhuma coluna
insert into public.columns (board_id, org_id, name, position)
select b.id, b.org_id, c.name, c.position
from public.boards b
cross join (
  values
    ('To Start', 'a0'),
    ('On Going', 'a1'),
    ('Done', 'a2')
) as c(name, position)
where not exists (
  select 1 from public.columns col where col.board_id = b.id
);
