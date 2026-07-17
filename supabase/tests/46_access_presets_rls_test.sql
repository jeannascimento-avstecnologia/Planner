-- pgTAP: access presets RLS + ceiling + cross-tenant (ADR-0016)
begin;
create extension if not exists pgtap;
select plan(11);

insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at, raw_app_meta_data, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000000','c1111111-1111-1111-1111-111111111111','authenticated','authenticated','owner-ap@test.dev', now(), now(), '{}'::jsonb, '{}'::jsonb),
  ('00000000-0000-0000-0000-000000000000','c2222222-2222-2222-2222-222222222222','authenticated','authenticated','viewer-ap@test.dev', now(), now(), '{}'::jsonb, '{}'::jsonb),
  ('00000000-0000-0000-0000-000000000000','c3333333-3333-3333-3333-333333333333','authenticated','authenticated','owner-b-ap@test.dev', now(), now(), '{}'::jsonb, '{}'::jsonb'),
  ('00000000-0000-0000-0000-000000000000','c8888888-8888-8888-8888-888888888888','authenticated','authenticated','admin-ap@test.dev', now(), now(), '{}'::jsonb, '{}'::jsonb');

insert into public.organizations (id, name, slug) values
  ('c4444444-4444-4444-4444-444444444444','Org AP A','org-ap-a'),
  ('c5555555-5555-5555-5555-555555555555','Org AP B','org-ap-b');

insert into public.memberships (org_id, user_id, role) values
  ('c4444444-4444-4444-4444-444444444444','c1111111-1111-1111-1111-111111111111','owner'),
  ('c4444444-4444-4444-4444-444444444444','c2222222-2222-2222-2222-222222222222','viewer'),
  ('c4444444-4444-4444-4444-444444444444','c8888888-8888-8888-8888-888888888888','admin'),
  ('c5555555-5555-5555-5555-555555555555','c3333333-3333-3333-3333-333333333333','owner');

insert into public.boards (id, org_id, name, created_by) values
  ('c6666666-6666-6666-6666-666666666666','c4444444-4444-4444-4444-444444444444','Board AP','c1111111-1111-1111-1111-111111111111');

insert into public.board_members (board_id, user_id, role) values
  ('c6666666-6666-6666-6666-666666666666','c1111111-1111-1111-1111-111111111111','manager'),
  ('c6666666-6666-6666-6666-666666666666','c2222222-2222-2222-2222-222222222222','viewer');

-- Seeds sistema visiveis
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','c2222222-2222-2222-2222-222222222222','role','authenticated')::text, true);

select is(
  (select count(*)::int from public.access_presets where is_system = true),
  3,
  'viewer ve 3 presets sistema'
);

-- Owner cria custom
select set_config('request.jwt.claims', json_build_object('sub','c1111111-1111-1111-1111-111111111111','role','authenticated')::text, true);

insert into public.access_presets (id, org_id, name, description, is_system, base_role)
values (
  'c7777777-7777-7777-7777-777777777777',
  'c4444444-4444-4444-4444-444444444444',
  'Operacao comercial',
  'Edita sem ACL',
  false,
  'admin'
);

insert into public.access_preset_permissions (preset_id, permission_code) values
  ('c7777777-7777-7777-7777-777777777777', 'board.view'),
  ('c7777777-7777-7777-7777-777777777777', 'board.edit_content');

select ok(
  exists (select 1 from public.access_presets where id = 'c7777777-7777-7777-7777-777777777777'),
  'owner cria preset custom'
);

-- Ceiling: org.manage_members bloqueado em custom
select throws_ok(
  $$insert into public.access_preset_permissions (preset_id, permission_code)
    values ('c7777777-7777-7777-7777-777777777777', 'org.manage_members')$$,
  'P0001',
  'preset_ceiling_exceeded',
  'custom nao ultrapassa teto board'
);

-- Viewer org nao cria preset
select set_config('request.jwt.claims', json_build_object('sub','c2222222-2222-2222-2222-222222222222','role','authenticated')::text, true);
select throws_ok(
  $$insert into public.access_presets (org_id, name, is_system, base_role)
    values ('c4444444-4444-4444-4444-444444444444', 'Hack', false, 'viewer')$$,
  '42501',
  null,
  'viewer nao cria preset'
);

-- Org admin nao cria preset (so owner)
select set_config('request.jwt.claims', json_build_object('sub','c8888888-8888-8888-8888-888888888888','role','authenticated')::text, true);
select throws_ok(
  $$insert into public.access_presets (org_id, name, is_system, base_role)
    values ('c4444444-4444-4444-4444-444444444444', 'AdminHack', false, 'admin')$$,
  '42501',
  null,
  'org admin nao cria preset'
);

-- Cross-tenant: owner B nao ve custom A
select set_config('request.jwt.claims', json_build_object('sub','c3333333-3333-3333-3333-333333333333','role','authenticated')::text, true);
select is(
  (select count(*)::int from public.access_presets where id = 'c7777777-7777-7777-7777-777777777777'),
  0,
  'org B nao ve preset custom de org A'
);

-- has_board_permission: viewer so view
select set_config('request.jwt.claims', json_build_object('sub','c2222222-2222-2222-2222-222222222222','role','authenticated')::text, true);
select ok(
  app.has_board_permission('c6666666-6666-6666-6666-666666666666', 'board.view'),
  'viewer tem board.view'
);
select ok(
  not app.has_board_permission('c6666666-6666-6666-6666-666666666666', 'board.edit_content'),
  'viewer nao tem edit_content'
);

-- Assign custom preset + sync role
select set_config('request.jwt.claims', json_build_object('sub','c1111111-1111-1111-1111-111111111111','role','authenticated')::text, true);
update public.board_members
set preset_id = 'c7777777-7777-7777-7777-777777777777'
where board_id = 'c6666666-6666-6666-6666-666666666666'
  and user_id = 'c2222222-2222-2222-2222-222222222222';

select is(
  (select role::text from public.board_members
   where board_id = 'c6666666-6666-6666-6666-666666666666'
     and user_id = 'c2222222-2222-2222-2222-222222222222'),
  'admin',
  'assign preset sincroniza base_role'
);

select set_config('request.jwt.claims', json_build_object('sub','c2222222-2222-2222-2222-222222222222','role','authenticated')::text, true);
select ok(
  app.has_board_permission('c6666666-6666-6666-6666-666666666666', 'board.edit_content'),
  'apos preset custom tem edit_content'
);
select ok(
  not app.has_board_permission('c6666666-6666-6666-6666-666666666666', 'board.manage_members'),
  'preset custom sem manage_members'
);

select * from finish();
rollback;
