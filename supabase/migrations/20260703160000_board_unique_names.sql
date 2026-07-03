-- 20260703160000 - Nomes unicos de coluna/card por board (case-insensitive)

-- Renomeia colunas duplicadas no mesmo board antes do indice unico
with ranked as (
  select
    id,
    name,
    row_number() over (
      partition by board_id, lower(trim(name))
      order by created_at, id
    ) as rn
  from public.columns
)
update public.columns c
set name = c.name || ' (' || ranked.rn::text || ')'
from ranked
where c.id = ranked.id
  and ranked.rn > 1;

-- Renomeia cards duplicados no mesmo board antes do indice unico
with ranked as (
  select
    id,
    title,
    row_number() over (
      partition by board_id, lower(trim(title))
      order by created_at, id
    ) as rn
  from public.cards
)
update public.cards c
set title = c.title || ' (' || ranked.rn::text || ')'
from ranked
where c.id = ranked.id
  and ranked.rn > 1;

create unique index if not exists columns_board_name_lower_uidx
  on public.columns (board_id, lower(trim(name)));

create unique index if not exists cards_board_title_lower_uidx
  on public.cards (board_id, lower(trim(title)));
