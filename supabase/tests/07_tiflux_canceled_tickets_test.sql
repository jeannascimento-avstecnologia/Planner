-- pgTAP: coluna tiflux_canceled_tickets em cards
begin;
create extension if not exists pgtap;
select plan(2);

select has_column('public', 'cards', 'tiflux_canceled_tickets', 'cards.tiflux_canceled_tickets exists');

insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at, raw_app_meta_data, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000000','c1111111-1111-1111-1111-111111111111','authenticated','authenticated','tc@test.dev', now(), now(), '{}'::jsonb, '{}'::jsonb);

insert into public.organizations (id, name, slug) values
  ('c2222222-2222-2222-2222-222222222222','Org TC','org-tc');

insert into public.memberships (org_id, user_id, role) values
  ('c2222222-2222-2222-2222-222222222222','c1111111-1111-1111-1111-111111111111','admin');

insert into public.boards (id, org_id, name) values
  ('c3333333-3333-3333-3333-333333333333','c2222222-2222-2222-2222-222222222222','Board TC');

insert into public.columns (id, board_id, org_id, name, position) values
  ('c4444444-4444-4444-4444-444444444444','c3333333-3333-3333-3333-333333333333','c2222222-2222-2222-2222-222222222222','Todo','a');

insert into public.cards (
  id, board_id, column_id, org_id, title, position,
  tiflux_ticket_number, tiflux_ticket_id, tiflux_canceled_tickets
) values (
  'c5555555-5555-5555-5555-555555555555',
  'c3333333-3333-3333-3333-333333333333',
  'c4444444-4444-4444-4444-444444444444',
  'c2222222-2222-2222-2222-222222222222',
  'Card TC',
  'a',
  null,
  null,
  '[{"ticket_number":"99","ticket_id":"99","canceled_at":"2026-01-01T00:00:00Z"}]'::jsonb
);

select is(
  (select jsonb_array_length(tiflux_canceled_tickets) from public.cards where id = 'c5555555-5555-5555-5555-555555555555'),
  1,
  'canceled history stored as jsonb array'
);

select * from finish();
rollback;
