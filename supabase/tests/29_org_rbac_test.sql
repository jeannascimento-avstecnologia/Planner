-- pgTAP: RBAC org — owner identidade; admin membros; gerente/viewer bloqueados (ADR-0015)
begin;
create extension if not exists pgtap;
select plan(8);

insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at, raw_app_meta_data, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000000','a1111111-1111-1111-1111-111111111111','authenticated','authenticated','owner-rbac@test.dev', now(), now(), '{}'::jsonb, '{}'::jsonb),
  ('00000000-0000-0000-0000-000000000000','b2222222-2222-2222-2222-222222222222','authenticated','authenticated','manager-rbac@test.dev', now(), now(), '{}'::jsonb, '{}'::jsonb),
  ('00000000-0000-0000-0000-000000000000','c3333333-3333-3333-3333-333333333333','authenticated','authenticated','admin-rbac@test.dev', now(), now(), '{}'::jsonb, '{}'::jsonb),
  ('00000000-0000-0000-0000-000000000000','d4444444-4444-4444-4444-444444444444','authenticated','authenticated','viewer-rbac@test.dev', now(), now(), '{}'::jsonb, '{}'::jsonb);

insert into public.organizations (id, name, slug) values
  ('e6666666-6666-6666-6666-666666666666','Org RBAC','org-rbac');

insert into public.memberships (org_id, user_id, role) values
  ('e6666666-6666-6666-6666-666666666666','a1111111-1111-1111-1111-111111111111','owner'),
  ('e6666666-6666-6666-6666-666666666666','b2222222-2222-2222-2222-222222222222','manager'),
  ('e6666666-6666-6666-6666-666666666666','c3333333-3333-3333-3333-333333333333','admin'),
  ('e6666666-6666-6666-6666-666666666666','d4444444-4444-4444-4444-444444444444','viewer');

-- admin altera viewer -> manager
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','c3333333-3333-3333-3333-333333333333','role','authenticated')::text, true);
select lives_ok(
  $$select public.update_membership_role('e6666666-6666-6666-6666-666666666666', 'd4444444-4444-4444-4444-444444444444', 'manager')$$,
  'admin pode alterar papel'
);

-- gerente org nao altera roles
select set_config('request.jwt.claims', json_build_object('sub','b2222222-2222-2222-2222-222222222222','role','authenticated')::text, true);
select throws_ok(
  $$select public.update_membership_role('e6666666-6666-6666-6666-666666666666', 'd4444444-4444-4444-4444-444444444444', 'viewer')$$,
  'P0001',
  'forbidden',
  'gerente org bloqueado em update role'
);

-- viewer nao altera roles
select set_config('request.jwt.claims', json_build_object('sub','d4444444-4444-4444-4444-444444444444','role','authenticated')::text, true);
select throws_ok(
  $$select public.update_membership_role('e6666666-6666-6666-6666-666666666666', 'c3333333-3333-3333-3333-333333333333', 'viewer')$$,
  'P0001',
  'forbidden',
  'viewer bloqueado em update role'
);

-- owner atualiza logo
select set_config('request.jwt.claims', json_build_object('sub','a1111111-1111-1111-1111-111111111111','role','authenticated')::text, true);
select lives_ok(
  $$select public.update_org_logo('e6666666-6666-6666-6666-666666666666', 'https://example.com/logo.png')$$,
  'owner atualiza logo'
);

-- gerente nao atualiza logo
select set_config('request.jwt.claims', json_build_object('sub','b2222222-2222-2222-2222-222222222222','role','authenticated')::text, true);
select throws_ok(
  $$select public.update_org_logo('e6666666-6666-6666-6666-666666666666', 'https://example.com/x.png')$$,
  'P0001',
  'forbidden',
  'gerente bloqueado em logo'
);

-- admin nao atualiza logo
select set_config('request.jwt.claims', json_build_object('sub','c3333333-3333-3333-3333-333333333333','role','authenticated')::text, true);
select throws_ok(
  $$select public.update_org_logo('e6666666-6666-6666-6666-666666666666', 'https://example.com/y.png')$$,
  'P0001',
  'forbidden',
  'admin bloqueado em logo'
);

-- viewer lista membros (leitura)
select set_config('request.jwt.claims', json_build_object('sub','d4444444-4444-4444-4444-444444444444','role','authenticated')::text, true);
select is(
  (select count(*)::int from public.list_org_members('e6666666-6666-6666-6666-666666666666')),
  4,
  'viewer lista membros'
);

-- admin nao deleta org (so owner)
select set_config('request.jwt.claims', json_build_object('sub','c3333333-3333-3333-3333-333333333333','role','authenticated')::text, true);
select throws_ok(
  $$select public.delete_organization('e6666666-6666-6666-6666-666666666666')$$,
  'P0001',
  'forbidden',
  'admin nao deleta org'
);

select * from finish();
rollback;
