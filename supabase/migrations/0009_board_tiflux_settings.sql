-- boards: integracao Tiflux + settings JSON
alter table public.boards
  add column if not exists tiflux_enabled boolean not null default false,
  add column if not exists integrations jsonb not null default '{}'::jsonb;

-- cards: vinculo com ticket Tiflux
alter table public.cards
  add column if not exists tiflux_ticket_number text,
  add column if not exists tiflux_ticket_id text,
  add column if not exists tiflux_payload jsonb,
  add column if not exists tiflux_created_at timestamptz;

create index if not exists cards_tiflux_ticket_idx on public.cards (board_id, tiflux_ticket_number)
  where tiflux_ticket_number is not null;
