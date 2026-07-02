-- pgTAP: roles org + update_membership_role
begin;
create extension if not exists pgtap;
select plan(5);

insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at, raw_app_meta_data, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000000','a1111111-1111-1111-1111-111111111111','authenticated','authenticated','owner-org@test.dev', now(), now(), '{}'::jsonb, '{}'::jsonb),
  ('00000000-0000-0000-0000-000000000000','b2222222-2222-2222-2222-222222222222','authenticated','authenticated','admin-org@test.dev', now(), now(), '{}'::jsonb, '{}'::jsonb),
  ('00000000-0000-0000-0000-000000000000','c3333333-3333-3333-3333-333333333333','authenticated','authenticated','view-org@test.dev', now(), now(), '{}'::jsonb, '{}'::jsonb);

insert into public.organizations (id, name, slug) values
  ('e5555555-5555-5555-5555-555555555555','Org Roles','org-roles');

insert into public.memberships (org_id, user_id, role) values
  ('e5555555-5555-5555-5555-555555555555','a1111111-1111-1111-1111-111111111111','owner'),
  ('e5555555-5555-5555-5555-555555555555','b2222222-2222-2222-2222-222222222222','admin'),
  ('e5555555-5555-5555-5555-555555555555','c3333333-3333-3333-3333-333333333333','viewer');

-- owner pode listar membros
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','a1111111-1111-1111-1111-111111111111','role','authenticated')::text, true);
select is(
  (select count(*)::int from public.list_org_members('e5555555-5555-5555-5555-555555555555')),
  3,
  'owner lista membros'
);

-- admin altera role de viewer
select lives_ok(
  $$select public.update_membership_role('e5555555-5555-5555-5555-555555555555', 'c3333333-3333-3333-3333-333333333333', 'admin')$$,
  'admin pode promover viewer'
);

-- viewer nao altera roles
select set_config('request.jwt.claims', json_build_object('sub','c3333333-3333-3333-3333-333333333333','role','authenticated')::text, true);
select throws_ok(
  $$select public.update_membership_role('e5555555-5555-5555-5555-555555555555', 'b2222222-2222-2222-2222-222222222222', 'viewer')$$,
  'P0001',
  'forbidden',
  'viewer bloqueado em update role'
);

-- nao altera owner diretamente
select set_config('request.jwt.claims', json_build_object('sub','a1111111-1111-1111-1111-111111111111','role','authenticated')::text, true);
select throws_ok(
  $$select public.update_membership_role('e5555555-5555-5555-5555-555555555555', 'b2222222-2222-2222-2222-222222222222', 'viewer')$$,
  'P0001',
  'cannot_change_owner_role',
  'nao muda role do owner'
);

-- assign owner via update bloqueado
select throws_ok(
  $$select public.update_membership_role('e5555555-5555-5555-5555-555555555555', 'c3333333-3333-3333-3333-333333333333', 'owner')$$,
  'P0001',
  'cannot_assign_owner_directly',
  'nao assign owner via update'
);

select * from finish();
rollback;
