-- pgTAP: fine permission codes + alias resolution (ADR-0016 addendum)
begin;
create extension if not exists pgtap;
select plan(8);

insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at, raw_app_meta_data, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000000','d1111111-1111-1111-1111-111111111111','authenticated','authenticated','owner-fc@test.dev', now(), now(), '{}'::jsonb, '{}'::jsonb),
  ('00000000-0000-0000-0000-000000000000','d2222222-2222-2222-2222-222222222222','authenticated','authenticated','editor-fc@test.dev', now(), now(), '{}'::jsonb, '{}'::jsonb');

insert into public.organizations (id, name, slug) values
  ('d4444444-4444-4444-4444-444444444444','Org FC','org-fc');

insert into public.memberships (org_id, user_id, role) values
  ('d4444444-4444-4444-4444-444444444444','d1111111-1111-1111-1111-111111111111','owner'),
  ('d4444444-4444-4444-4444-444444444444','d2222222-2222-2222-2222-222222222222','viewer');

insert into public.boards (id, org_id, name, created_by) values
  ('d6666666-6666-6666-6666-666666666666','d4444444-4444-4444-4444-444444444444','Board FC','d1111111-1111-1111-1111-111111111111');

-- Owner cria custom so com cards.edit
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','d1111111-1111-1111-1111-111111111111','role','authenticated')::text, true);

insert into public.access_presets (id, org_id, name, is_system, base_role)
values (
  'd7777777-7777-7777-7777-777777777777',
  'd4444444-4444-4444-4444-444444444444',
  'So editar cards',
  false,
  'admin'
);

insert into public.access_preset_permissions (preset_id, permission_code) values
  ('d7777777-7777-7777-7777-777777777777', 'board.view'),
  ('d7777777-7777-7777-7777-777777777777', 'board.cards.edit');

select ok(
  exists (
    select 1 from public.access_preset_permissions
    where preset_id = 'd7777777-7777-7777-7777-777777777777'
      and permission_code = 'board.cards.edit'
  ),
  'custom aceita code fino'
);

-- Code invalido / fora do teto
select throws_ok(
  $$insert into public.access_preset_permissions (preset_id, permission_code)
    values ('d7777777-7777-7777-7777-777777777777', 'org.manage_members')$$,
  'P0001',
  'preset_ceiling_exceeded',
  'org.* fora do ceiling'
);

-- Assign + has_board_permission alias
insert into public.board_members (board_id, user_id, role, preset_id)
values (
  'd6666666-6666-6666-6666-666666666666',
  'd2222222-2222-2222-2222-222222222222',
  'viewer',
  'd7777777-7777-7777-7777-777777777777'
);

select set_config('request.jwt.claims', json_build_object('sub','d2222222-2222-2222-2222-222222222222','role','authenticated')::text, true);

select ok(
  app.has_board_permission('d6666666-6666-6666-6666-666666666666', 'board.cards.edit'),
  'filho cards.edit true'
);
select ok(
  app.has_board_permission('d6666666-6666-6666-6666-666666666666', 'board.edit_content'),
  'alias edit_content true quando tem filho'
);
select ok(
  not app.has_board_permission('d6666666-6666-6666-6666-666666666666', 'board.cards.delete'),
  'filho nao concedido = false'
);
select ok(
  not app.has_board_permission('d6666666-6666-6666-6666-666666666666', 'board.members.invite'),
  'sem members.*'
);

-- Seeds sistema tem codes finos (Administrador)
select ok(
  (
    select count(*)::int from public.access_preset_permissions
    where preset_id = 'a0000000-0000-4000-8000-000000000001'
      and permission_code = 'board.cards.create'
  ) >= 1,
  'seed Administrador tem board.cards.create'
);

select ok(
  (
    select count(*)::int from public.access_preset_permissions
    where preset_id = 'a0000000-0000-4000-8000-000000000001'
      and permission_code = 'board.edit_content'
  ) = 0,
  'seed Administrador sem alias legado'
);

select * from finish();
rollback;
