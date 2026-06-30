-- Historico de tickets Tiflux cancelados por card (pode ter mais de um).
alter table public.cards
  add column if not exists tiflux_canceled_tickets jsonb not null default '[]'::jsonb;

comment on column public.cards.tiflux_canceled_tickets is
  'Array JSON: [{ ticket_number, ticket_id, canceled_at }]';
