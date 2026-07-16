-- pgTAP: cards.parent_id anti-ciclo / depth / cross-board
begin;
create extension if not exists pgtap;
select plan(8);

insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at, raw_app_meta_data, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000000','a1111111-1111-1111-1111-1111111111aa','authenticated','authenticated','tree@test.dev', now(), now(), '{}'::jsonb, '{}'::jsonb);

insert into public.organizations (id, name, slug) values
  ('a2222222-2222-2222-2222-2222222222aa','Org Tree','org-tree-aa');

insert into public.memberships (org_id, user_id, role) values
  ('a2222222-2222-2222-2222-2222222222aa','a1111111-1111-1111-1111-1111111111aa','admin');

insert into public.boards (id, org_id, name, created_by) values
  ('a3333333-3333-3333-3333-3333333333aa','a2222222-2222-2222-2222-2222222222aa','Board Tree','a1111111-1111-1111-1111-1111111111aa'),
  ('a3333333-3333-3333-3333-3333333333bb','a2222222-2222-2222-2222-2222222222aa','Board Other','a1111111-1111-1111-1111-1111111111aa');

insert into public.columns (id, board_id, org_id, name, position) values
  ('a4444444-0000-0000-0000-0000000000aa','a3333333-3333-3333-3333-3333333333aa','a2222222-2222-2222-2222-2222222222aa','Todo','a0'),
  ('a4444444-0000-0000-0000-0000000000bb','a3333333-3333-3333-3333-3333333333bb','a2222222-2222-2222-2222-2222222222aa','Todo','a0');

-- Evita cascade de automacoes no setup em lote
select set_config('app.audit_skip', '1', true);

-- Cadeia de 8 cards (depth 1..8)
insert into public.cards (id, board_id, column_id, org_id, title, position, parent_id) values
  ('a5555555-0000-0000-0000-000000000001','a3333333-3333-3333-3333-3333333333aa','a4444444-0000-0000-0000-0000000000aa','a2222222-2222-2222-2222-2222222222aa','L1','a0', null),
  ('a5555555-0000-0000-0000-000000000002','a3333333-3333-3333-3333-3333333333aa','a4444444-0000-0000-0000-0000000000aa','a2222222-2222-2222-2222-2222222222aa','L2','a1','a5555555-0000-0000-0000-000000000001'),
  ('a5555555-0000-0000-0000-000000000003','a3333333-3333-3333-3333-3333333333aa','a4444444-0000-0000-0000-0000000000aa','a2222222-2222-2222-2222-2222222222aa','L3','a2','a5555555-0000-0000-0000-000000000002'),
  ('a5555555-0000-0000-0000-000000000004','a3333333-3333-3333-3333-3333333333aa','a4444444-0000-0000-0000-0000000000aa','a2222222-2222-2222-2222-2222222222aa','L4','a3','a5555555-0000-0000-0000-000000000003'),
  ('a5555555-0000-0000-0000-000000000005','a3333333-3333-3333-3333-3333333333aa','a4444444-0000-0000-0000-0000000000aa','a2222222-2222-2222-2222-2222222222aa','L5','a4','a5555555-0000-0000-0000-000000000004'),
  ('a5555555-0000-0000-0000-000000000006','a3333333-3333-3333-3333-3333333333aa','a4444444-0000-0000-0000-0000000000aa','a2222222-2222-2222-2222-2222222222aa','L6','a5','a5555555-0000-0000-0000-000000000005'),
  ('a5555555-0000-0000-0000-000000000007','a3333333-3333-3333-3333-3333333333aa','a4444444-0000-0000-0000-0000000000aa','a2222222-2222-2222-2222-2222222222aa','L7','a6','a5555555-0000-0000-0000-000000000006'),
  ('a5555555-0000-0000-0000-000000000008','a3333333-3333-3333-3333-3333333333aa','a4444444-0000-0000-0000-0000000000aa','a2222222-2222-2222-2222-2222222222aa','L8','a7','a5555555-0000-0000-0000-000000000007');

insert into public.cards (id, board_id, column_id, org_id, title, position, parent_id) values
  ('a5555555-0000-0000-0000-000000000099','a3333333-3333-3333-3333-3333333333bb','a4444444-0000-0000-0000-0000000000bb','a2222222-2222-2222-2222-2222222222aa','Other board','b0', null);

select set_config('app.audit_skip', '0', true);

select is(
  (select count(*) from public.cards where board_id = 'a3333333-3333-3333-3333-3333333333aa')::int,
  8,
  'cadeia depth 1..8 inserida'
);

select throws_ok(
  $$ insert into public.cards (board_id, column_id, org_id, title, position, parent_id)
     values (
       'a3333333-3333-3333-3333-3333333333aa',
       'a4444444-0000-0000-0000-0000000000aa',
       'a2222222-2222-2222-2222-2222222222aa',
       'L9',
       'a8',
       'a5555555-0000-0000-0000-000000000008'
     ) $$,
  'P0001',
  'card_parent_depth',
  'depth 9 rejeitado'
);

select throws_ok(
  $$ update public.cards set parent_id = 'a5555555-0000-0000-0000-000000000001'
     where id = 'a5555555-0000-0000-0000-000000000001' $$,
  'P0001',
  'card_parent_cycle',
  'self-parent rejeitado'
);

select throws_ok(
  $$ update public.cards set parent_id = 'a5555555-0000-0000-0000-000000000008'
     where id = 'a5555555-0000-0000-0000-000000000001' $$,
  'P0001',
  'card_parent_cycle',
  'ciclo L1→L8 rejeitado'
);

select throws_ok(
  $$ update public.cards set parent_id = 'a5555555-0000-0000-0000-000000000099'
     where id = 'a5555555-0000-0000-0000-000000000002' $$,
  'P0001',
  'card_parent_cross_board',
  'parent cross-board rejeitado'
);

-- Authenticated: update_card_fields parent_id
set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub','a1111111-1111-1111-1111-1111111111aa','role','authenticated')::text,
  true
);

select lives_ok(
  $$ select public.update_card_fields(
       'a5555555-0000-0000-0000-000000000003',
       jsonb_build_object('parent_id', 'a5555555-0000-0000-0000-000000000001')
     ) $$,
  'RPC update_card_fields aceita parent_id'
);

select is(
  (select parent_id::text from public.cards where id = 'a5555555-0000-0000-0000-000000000003'),
  'a5555555-0000-0000-0000-000000000001',
  'parent_id persistido via RPC'
);

select throws_ok(
  $$ select public.update_card_fields(
       'a5555555-0000-0000-0000-000000000001',
       jsonb_build_object('parent_id', 'a5555555-0000-0000-0000-000000000003')
     ) $$,
  'P0001',
  'card_parent_cycle',
  'RPC rejeita ciclo'
);

select * from finish();
rollback;
