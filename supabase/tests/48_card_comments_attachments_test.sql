-- pgTAP: card_comments + card_attachments RLS + cascade
begin;
create extension if not exists pgtap;
select plan(12);

insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at, raw_app_meta_data, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000000','d1111111-1111-1111-1111-1111111111aa','authenticated','authenticated','cmt-admin@test.dev', now(), now(), '{}'::jsonb, '{}'::jsonb),
  ('00000000-0000-0000-0000-000000000000','d1111111-1111-1111-1111-1111111111bb','authenticated','authenticated','cmt-viewer@test.dev', now(), now(), '{}'::jsonb, '{}'::jsonb),
  ('00000000-0000-0000-0000-000000000000','d1111111-1111-1111-1111-1111111111cc','authenticated','authenticated','cmt-other@test.dev', now(), now(), '{}'::jsonb, '{}'::jsonb);

insert into public.organizations (id, name, slug) values
  ('d2222222-2222-2222-2222-2222222222aa','Org Comments','org-cmt-aa'),
  ('d2222222-2222-2222-2222-2222222222bb','Org Other','org-cmt-bb');

insert into public.memberships (org_id, user_id, role) values
  ('d2222222-2222-2222-2222-2222222222aa','d1111111-1111-1111-1111-1111111111aa','admin'),
  ('d2222222-2222-2222-2222-2222222222aa','d1111111-1111-1111-1111-1111111111bb','viewer'),
  ('d2222222-2222-2222-2222-2222222222bb','d1111111-1111-1111-1111-1111111111cc','admin');

insert into public.boards (id, org_id, name, created_by) values
  ('d3333333-3333-3333-3333-3333333333aa','d2222222-2222-2222-2222-2222222222aa','Board Comments','d1111111-1111-1111-1111-1111111111aa'),
  ('d3333333-3333-3333-3333-3333333333bb','d2222222-2222-2222-2222-2222222222bb','Board Other','d1111111-1111-1111-1111-1111111111cc');

insert into public.columns (id, board_id, org_id, name, position) values
  ('d4444444-0000-0000-0000-0000000000aa','d3333333-3333-3333-3333-3333333333aa','d2222222-2222-2222-2222-2222222222aa','Todo','a0'),
  ('d4444444-0000-0000-0000-0000000000bb','d3333333-3333-3333-3333-3333333333bb','d2222222-2222-2222-2222-2222222222bb','Todo','a0');

select set_config('app.audit_skip', '1', true);

insert into public.cards (id, board_id, column_id, org_id, title, position) values
  ('d5555555-0000-0000-0000-000000000001','d3333333-3333-3333-3333-3333333333aa','d4444444-0000-0000-0000-0000000000aa','d2222222-2222-2222-2222-2222222222aa','Card A','a0');

select set_config('app.audit_skip', '0', true);

-- Admin: comment + attachment
set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub','d1111111-1111-1111-1111-1111111111aa','role','authenticated')::text,
  true
);

select lives_ok(
  $$ insert into public.card_comments (id, org_id, board_id, card_id, author_id, content)
     values (
       'd6666666-0000-0000-0000-000000000001',
       'd2222222-2222-2222-2222-2222222222aa',
       'd3333333-3333-3333-3333-3333333333aa',
       'd5555555-0000-0000-0000-000000000001',
       'd1111111-1111-1111-1111-1111111111aa',
       'Primeiro comentario'
     ) $$,
  'admin cria comentario'
);

select lives_ok(
  $$ insert into public.card_attachments (id, org_id, board_id, card_id, kind, url, label, created_by)
     values (
       'd7777777-0000-0000-0000-000000000001',
       'd2222222-2222-2222-2222-2222222222aa',
       'd3333333-3333-3333-3333-3333333333aa',
       'd5555555-0000-0000-0000-000000000001',
       'url',
       'https://example.com/doc',
       'Doc',
       'd1111111-1111-1111-1111-1111111111aa'
     ) $$,
  'admin cria anexo url'
);

-- Viewer: comment OK, attachment blocked
select set_config(
  'request.jwt.claims',
  json_build_object('sub','d1111111-1111-1111-1111-1111111111bb','role','authenticated')::text,
  true
);

select lives_ok(
  $$ insert into public.card_comments (org_id, board_id, card_id, author_id, content)
     values (
       'd2222222-2222-2222-2222-2222222222aa',
       'd3333333-3333-3333-3333-3333333333aa',
       'd5555555-0000-0000-0000-000000000001',
       'd1111111-1111-1111-1111-1111111111bb',
       'Viewer comenta'
     ) $$,
  'viewer cria comentario'
);

select throws_ok(
  $$ insert into public.card_attachments (org_id, board_id, card_id, kind, url, created_by)
     values (
       'd2222222-2222-2222-2222-2222222222aa',
       'd3333333-3333-3333-3333-3333333333aa',
       'd5555555-0000-0000-0000-000000000001',
       'url',
       'https://example.com/bad',
       'd1111111-1111-1111-1111-1111111111bb'
     ) $$,
  '42501',
  null,
  'viewer nao cria anexo'
);

select is(
  (select count(*)::int from public.card_comments where card_id = 'd5555555-0000-0000-0000-000000000001'),
  2,
  'viewer le comentarios'
);

-- Viewer nao edita comentario alheio
select throws_ok(
  $$ update public.card_comments set content = 'hack'
     where id = 'd6666666-0000-0000-0000-000000000001' $$,
  '42501',
  null,
  'viewer nao edita comentario alheio'
);

-- Cross-org IDOR
select set_config(
  'request.jwt.claims',
  json_build_object('sub','d1111111-1111-1111-1111-1111111111cc','role','authenticated')::text,
  true
);

select is(
  (select count(*)::int from public.card_comments where card_id = 'd5555555-0000-0000-0000-000000000001'),
  0,
  'cross-org nao ve comentarios'
);

select is(
  (select count(*)::int from public.card_attachments where card_id = 'd5555555-0000-0000-0000-000000000001'),
  0,
  'cross-org nao ve anexos'
);

-- Mismatch org/board
select set_config(
  'request.jwt.claims',
  json_build_object('sub','d1111111-1111-1111-1111-1111111111aa','role','authenticated')::text,
  true
);

select throws_ok(
  $$ insert into public.card_comments (org_id, board_id, card_id, author_id, content)
     values (
       'd2222222-2222-2222-2222-2222222222bb',
       'd3333333-3333-3333-3333-3333333333aa',
       'd5555555-0000-0000-0000-000000000001',
       'd1111111-1111-1111-1111-1111111111aa',
       'Bad'
     ) $$,
  'P0001',
  'comment_card_mismatch',
  'org/board desalinhado rejeitado em comentario'
);

-- Cascade delete card
select set_config('app.audit_skip', '1', true);
delete from public.cards where id = 'd5555555-0000-0000-0000-000000000001';
select set_config('app.audit_skip', '0', true);

select is(
  (select count(*)::int from public.card_comments),
  0,
  'cascade delete card remove comentarios'
);

select is(
  (select count(*)::int from public.card_attachments),
  0,
  'cascade delete card remove anexos'
);

select * from finish();
rollback;
