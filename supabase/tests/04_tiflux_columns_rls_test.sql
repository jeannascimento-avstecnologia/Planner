-- pgTAP: colunas Tiflux em boards/cards respeitam RLS de tenant
begin;
create extension if not exists pgtap;
select plan(3);

insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at, raw_app_meta_data, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000000','04111111-1111-1111-1111-111111111111','authenticated','authenticated','ga@test.dev', now(), now(), '{}'::jsonb, '{}'::jsonb);

insert into public.organizations (id, name, slug) values
  ('04222222-2222-2222-2222-222222222222','Org G','org-g');

insert into public.memberships (org_id, user_id, role) values
  ('04222222-2222-2222-2222-222222222222','04111111-1111-1111-1111-111111111111','admin');

insert into public.boards (id, org_id, name, created_by, tiflux_enabled, integrations) values
  ('04333333-3333-3333-3333-333333333333','04222222-2222-2222-2222-222222222222','Board G','04111111-1111-1111-1111-111111111111', true, '{"tiflux":{"clientName":"Acme"}}'::jsonb);

insert into public.columns (id, board_id, org_id, name, position) values
  ('04444444-0000-0000-0000-000000000001','04333333-3333-3333-3333-333333333333','04222222-2222-2222-2222-222222222222','Todo','a0');

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','04111111-1111-1111-1111-111111111111','role','authenticated')::text, true);

select is(
  (select tiflux_enabled from public.boards where id = '04333333-3333-3333-3333-333333333333'),
  true,
  'admin le tiflux_enabled do board'
);

with ins as (
  insert into public.cards (board_id, column_id, org_id, title, position, tiflux_ticket_number, tiflux_ticket_id)
  values (
    '04333333-3333-3333-3333-333333333333',
    '04444444-0000-0000-0000-000000000001',
    '04222222-2222-2222-2222-222222222222',
    'Card Tiflux',
    'm0',
    '12345',
    'tid-1'
  )
  returning id
)
select is((select count(*) from ins)::int, 1, 'admin insere card com ticket Tiflux');

select is(
  (select tiflux_ticket_number from public.cards where title = 'Card Tiflux'),
  '12345',
  'ticket number persistido'
);

select * from finish();
rollback;
