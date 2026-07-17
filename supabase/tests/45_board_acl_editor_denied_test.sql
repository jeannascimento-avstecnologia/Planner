-- pgTAP: Editor (board admin) NAO gerencia ACL; manager sim (ADR-0015)
begin;
create extension if not exists pgtap;
select plan(3);

insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at, raw_app_meta_data, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000000','b1111111-1111-1111-1111-111111111111','authenticated','authenticated','editor-acl@test.dev', now(), now(), '{}'::jsonb, '{}'::jsonb),
  ('00000000-0000-0000-0000-000000000000','b2222222-2222-2222-2222-222222222222','authenticated','authenticated','viewer-acl@test.dev', now(), now(), '{}'::jsonb, '{}'::jsonb),
  ('00000000-0000-0000-0000-000000000000','b3333333-3333-3333-3333-333333333333','authenticated','authenticated','mgr-acl@test.dev', now(), now(), '{}'::jsonb, '{}'::jsonb);

insert into public.organizations (id, name, slug) values
  ('b4444444-4444-4444-4444-444444444444','Org ACL Editor','org-acl-ed');

insert into public.memberships (org_id, user_id, role) values
  ('b4444444-4444-4444-4444-444444444444','b1111111-1111-1111-1111-111111111111','viewer'),
  ('b4444444-4444-4444-4444-444444444444','b2222222-2222-2222-2222-222222222222','viewer'),
  ('b4444444-4444-4444-4444-444444444444','b3333333-3333-3333-3333-333333333333','viewer');

insert into public.boards (id, org_id, name, created_by) values
  ('b5555555-5555-5555-5555-555555555555','b4444444-4444-4444-4444-444444444444','Board ACL','b3333333-3333-3333-3333-333333333333');

insert into public.board_members (board_id, user_id, role) values
  ('b5555555-5555-5555-5555-555555555555','b1111111-1111-1111-1111-111111111111','admin'),
  ('b5555555-5555-5555-5555-555555555555','b2222222-2222-2222-2222-222222222222','viewer'),
  ('b5555555-5555-5555-5555-555555555555','b3333333-3333-3333-3333-333333333333','manager');

-- Editor nao altera papel de viewer
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','b1111111-1111-1111-1111-111111111111','role','authenticated')::text, true);

select throws_ok(
  $$update public.board_members set role = 'admin' where board_id = 'b5555555-5555-5555-5555-555555555555' and user_id = 'b2222222-2222-2222-2222-222222222222'$$,
  '42501',
  null,
  'Editor (board admin) nao gerencia membros'
);

-- Manager altera papel
select set_config('request.jwt.claims', json_build_object('sub','b3333333-3333-3333-3333-333333333333','role','authenticated')::text, true);

update public.board_members
set role = 'admin'
where board_id = 'b5555555-5555-5555-5555-555555555555'
  and user_id = 'b2222222-2222-2222-2222-222222222222';

select is(
  (select role::text from public.board_members where board_id = 'b5555555-5555-5555-5555-555555555555' and user_id = 'b2222222-2222-2222-2222-222222222222'),
  'admin',
  'Administrador (manager) pode alterar papel'
);

-- Editor ainda nao remove
select set_config('request.jwt.claims', json_build_object('sub','b1111111-1111-1111-1111-111111111111','role','authenticated')::text, true);

select throws_ok(
  $$delete from public.board_members where board_id = 'b5555555-5555-5555-5555-555555555555' and user_id = 'b2222222-2222-2222-2222-222222222222'$$,
  '42501',
  null,
  'Editor nao remove membros'
);

select * from finish();
rollback;
