-- pgTAP: card_checklist_items RLS + align + cascade
begin;
create extension if not exists pgtap;
select plan(8);

insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at, raw_app_meta_data, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000000','c1111111-1111-1111-1111-1111111111aa','authenticated','authenticated','chk-admin@test.dev', now(), now(), '{}'::jsonb, '{}'::jsonb),
  ('00000000-0000-0000-0000-000000000000','c1111111-1111-1111-1111-1111111111bb','authenticated','authenticated','chk-viewer@test.dev', now(), now(), '{}'::jsonb, '{}'::jsonb),
  ('00000000-0000-0000-0000-000000000000','c1111111-1111-1111-1111-1111111111cc','authenticated','authenticated','chk-other@test.dev', now(), now(), '{}'::jsonb, '{}'::jsonb);

insert into public.organizations (id, name, slug) values
  ('c2222222-2222-2222-2222-2222222222aa','Org Checklist','org-chk-aa'),
  ('c2222222-2222-2222-2222-2222222222bb','Org Other','org-chk-bb');

insert into public.memberships (org_id, user_id, role) values
  ('c2222222-2222-2222-2222-2222222222aa','c1111111-1111-1111-1111-1111111111aa','admin'),
  ('c2222222-2222-2222-2222-2222222222aa','c1111111-1111-1111-1111-1111111111bb','viewer'),
  ('c2222222-2222-2222-2222-2222222222bb','c1111111-1111-1111-1111-1111111111cc','admin');

insert into public.boards (id, org_id, name, created_by) values
  ('c3333333-3333-3333-3333-3333333333aa','c2222222-2222-2222-2222-2222222222aa','Board Checklist','c1111111-1111-1111-1111-1111111111aa'),
  ('c3333333-3333-3333-3333-3333333333bb','c2222222-2222-2222-2222-2222222222bb','Board Other','c1111111-1111-1111-1111-1111111111cc');

insert into public.columns (id, board_id, org_id, name, position) values
  ('c4444444-0000-0000-0000-0000000000aa','c3333333-3333-3333-3333-3333333333aa','c2222222-2222-2222-2222-2222222222aa','Todo','a0'),
  ('c4444444-0000-0000-0000-0000000000bb','c3333333-3333-3333-3333-3333333333bb','c2222222-2222-2222-2222-2222222222bb','Todo','a0');

select set_config('app.audit_skip', '1', true);

insert into public.cards (id, board_id, column_id, org_id, title, position) values
  ('c5555555-0000-0000-0000-000000000001','c3333333-3333-3333-3333-3333333333aa','c4444444-0000-0000-0000-0000000000aa','c2222222-2222-2222-2222-2222222222aa','Card A','a0'),
  ('c5555555-0000-0000-0000-000000000099','c3333333-3333-3333-3333-3333333333bb','c4444444-0000-0000-0000-0000000000bb','c2222222-2222-2222-2222-2222222222bb','Card Other','b0');

select set_config('app.audit_skip', '0', true);

-- Admin write
set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub','c1111111-1111-1111-1111-1111111111aa','role','authenticated')::text,
  true
);

select lives_ok(
  $$ insert into public.card_checklist_items (id, org_id, board_id, card_id, title, position)
     values (
       'c6666666-0000-0000-0000-000000000001',
       'c2222222-2222-2222-2222-2222222222aa',
       'c3333333-3333-3333-3333-3333333333aa',
       'c5555555-0000-0000-0000-000000000001',
       'Briefing',
       'a0'
     ) $$,
  'admin cria checklist item'
);

select lives_ok(
  $$ update public.card_checklist_items set done = true
     where id = 'c6666666-0000-0000-0000-000000000001' $$,
  'admin toggle done'
);

select is(
  (select done from public.card_checklist_items where id = 'c6666666-0000-0000-0000-000000000001'),
  true,
  'done persistido'
);

-- Mismatch org/board vs card
select throws_ok(
  $$ insert into public.card_checklist_items (org_id, board_id, card_id, title, position)
     values (
       'c2222222-2222-2222-2222-2222222222bb',
       'c3333333-3333-3333-3333-3333333333aa',
       'c5555555-0000-0000-0000-000000000001',
       'Bad',
       'a1'
     ) $$,
  'P0001',
  'checklist_card_mismatch',
  'org/board desalinhado rejeitado'
);

-- Viewer: select OK, write blocked
select set_config(
  'request.jwt.claims',
  json_build_object('sub','c1111111-1111-1111-1111-1111111111bb','role','authenticated')::text,
  true
);

select is(
  (select count(*)::int from public.card_checklist_items
    where card_id = 'c5555555-0000-0000-0000-000000000001'),
  1,
  'viewer le checklist'
);

select throws_ok(
  $$ insert into public.card_checklist_items (org_id, board_id, card_id, title, position)
     values (
       'c2222222-2222-2222-2222-2222222222aa',
       'c3333333-3333-3333-3333-3333333333aa',
       'c5555555-0000-0000-0000-000000000001',
       'Viewer try',
       'a2'
     ) $$,
  '42501',
  null,
  'viewer nao cria checklist'
);

-- Cross-org IDOR
select set_config(
  'request.jwt.claims',
  json_build_object('sub','c1111111-1111-1111-1111-1111111111cc','role','authenticated')::text,
  true
);

select is(
  (select count(*)::int from public.card_checklist_items
    where id = 'c6666666-0000-0000-0000-000000000001'),
  0,
  'cross-org nao ve item'
);

-- Cascade delete card (as admin)
select set_config(
  'request.jwt.claims',
  json_build_object('sub','c1111111-1111-1111-1111-1111111111aa','role','authenticated')::text,
  true
);

select set_config('app.audit_skip', '1', true);
delete from public.cards where id = 'c5555555-0000-0000-0000-000000000001';
select set_config('app.audit_skip', '0', true);

select is(
  (select count(*)::int from public.card_checklist_items
    where id = 'c6666666-0000-0000-0000-000000000001'),
  0,
  'cascade delete card remove items'
);

select * from finish();
rollback;
