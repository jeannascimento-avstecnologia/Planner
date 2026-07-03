-- pgTAP: credenciais Tiflux por board — RLS e RPCs
begin;
create extension if not exists pgtap;
select plan(7);

insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at, raw_app_meta_data, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000000','a1111111-1111-1111-1111-111111111111','authenticated','authenticated','ta@test.dev', now(), now(), '{}'::jsonb, '{}'::jsonb),
  ('00000000-0000-0000-0000-000000000000','a2222222-2222-2222-2222-222222222222','authenticated','authenticated','tv@test.dev', now(), now(), '{}'::jsonb, '{}'::jsonb);

insert into public.organizations (id, name, slug) values
  ('a3333333-3333-3333-3333-333333333333','Org T','org-t');

insert into public.memberships (org_id, user_id, role) values
  ('a3333333-3333-3333-3333-333333333333','a1111111-1111-1111-1111-111111111111','admin'),
  ('a3333333-3333-3333-3333-333333333333','a2222222-2222-2222-2222-222222222222','viewer');

insert into public.boards (id, org_id, name, created_by, tiflux_enabled) values
  ('a4444444-4444-4444-4444-444444444444','a3333333-3333-3333-3333-333333333333','Board T','a1111111-1111-1111-1111-111111111111', false);

insert into public.board_members (board_id, user_id, role) values
  ('a4444444-4444-4444-4444-444444444444','a2222222-2222-2222-2222-222222222222','viewer');

-- Admin configura token
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','a1111111-1111-1111-1111-111111111111','role','authenticated')::text, true);

select lives_ok(
  $$ select public.set_board_tiflux_token('a4444444-4444-4444-4444-444444444444', 'test-token-12345678', null) $$,
  'admin grava token Tiflux'
);

select is(
  public.board_tiflux_status('a4444444-4444-4444-4444-444444444444'),
  true,
  'status configured apos set'
);

-- Viewer nao grava token
select set_config('request.jwt.claims', json_build_object('sub','a2222222-2222-2222-2222-222222222222','role','authenticated')::text, true);

select throws_ok(
  $$ select public.set_board_tiflux_token('a4444444-4444-4444-4444-444444444444', 'other-token-12345678', null) $$,
  'P0001',
  'forbidden',
  'viewer nao grava token'
);

-- SELECT direto bloqueado (sem grant / RLS deny)
select throws_ok(
  $$ select count(*)::int from public.board_integration_secrets $$,
  '42501',
  'permission denied for table board_integration_secrets',
  'authenticated nao le secrets via select direto'
);

-- service_role le token descriptografado
reset role;
set local role service_role;

select is(
  (select token from public.get_board_tiflux_token('a4444444-4444-4444-4444-444444444444') limit 1),
  'test-token-12345678',
  'service_role le token descriptografado'
);

-- clear remove credencial
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','a1111111-1111-1111-1111-111111111111','role','authenticated')::text, true);

select lives_ok(
  $$ select public.clear_board_tiflux_token('a4444444-4444-4444-4444-444444444444') $$,
  'admin limpa token'
);

select is(
  public.board_tiflux_status('a4444444-4444-4444-4444-444444444444'),
  false,
  'status false apos clear'
);

select * from finish();
rollback;
