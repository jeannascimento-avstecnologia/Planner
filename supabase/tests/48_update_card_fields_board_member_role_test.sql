-- pgTAP: board-only member (sem memberships) pode update_card_fields
begin;
create extension if not exists pgtap;
select plan(3);

insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at, raw_app_meta_data, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000000','a1111111-1111-1111-1111-111111111111','authenticated','authenticated','admin-bm@test.dev', now(), now(), '{}'::jsonb, '{}'::jsonb),
  ('00000000-0000-0000-0000-000000000000','b2222222-2222-2222-2222-222222222222','authenticated','authenticated','guest-bm@test.dev', now(), now(), '{}'::jsonb, '{}'::jsonb);

insert into public.organizations (id, name, slug) values
  ('c3333333-3333-3333-3333-333333333333','Org BM Role','org-bm-role');

insert into public.memberships (org_id, user_id, role) values
  ('c3333333-3333-3333-3333-333333333333','a1111111-1111-1111-1111-111111111111','admin');

insert into public.boards (id, org_id, name, created_by) values
  ('d4444444-4444-4444-4444-444444444444','c3333333-3333-3333-3333-333333333333','Board BM Role','a1111111-1111-1111-1111-111111111111');

insert into public.columns (id, board_id, org_id, name, position) values
  ('e5555555-5555-5555-5555-555555555555','d4444444-4444-4444-4444-444444444444','c3333333-3333-3333-3333-333333333333','Todo','a0');

insert into public.board_members (board_id, user_id, role) values
  ('d4444444-4444-4444-4444-444444444444','b2222222-2222-2222-2222-222222222222','admin');

select set_config('app.audit_skip', '1', true);

insert into public.cards (id, board_id, column_id, org_id, title, position) values
  ('f6666666-6666-6666-6666-666666666666','d4444444-4444-4444-4444-444444444444','e5555555-5555-5555-5555-555555555555','c3333333-3333-3333-3333-333333333333','Original','a0');

select set_config('app.audit_skip', '0', true);

select is(
  (select count(*)::int from public.memberships where user_id = 'b2222222-2222-2222-2222-222222222222'),
  0,
  'guest nao tem memberships org'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub','b2222222-2222-2222-2222-222222222222','role','authenticated')::text,
  true
);

select lives_ok(
  $$ select public.update_card_fields(
       'f6666666-6666-6666-6666-666666666666',
       jsonb_build_object('title', 'Atualizado via board member')
     ) $$,
  'board-only admin pode update_card_fields'
);

select is(
  (select title from public.cards where id = 'f6666666-6666-6666-6666-666666666666'),
  'Atualizado via board member',
  'titulo persistido via RPC'
);

select * from finish();
rollback;
