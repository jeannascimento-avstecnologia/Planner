-- pgTAP: ninguem altera proprio papel org (ADR-0015: admin gerencia membros)
begin;
create extension if not exists pgtap;
select plan(3);

insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at, raw_app_meta_data, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000000','a1111111-1111-1111-1111-111111111111','authenticated','authenticated','owner-self@test.dev', now(), now(), '{}'::jsonb, '{}'::jsonb),
  ('00000000-0000-0000-0000-000000000000','b2222222-2222-2222-2222-222222222222','authenticated','authenticated','admin-self@test.dev', now(), now(), '{}'::jsonb, '{}'::jsonb),
  ('00000000-0000-0000-0000-000000000000','c3333333-3333-3333-3333-333333333333','authenticated','authenticated','view-self@test.dev', now(), now(), '{}'::jsonb, '{}'::jsonb);

insert into public.organizations (id, name, slug) values
  ('e7777777-7777-7777-7777-777777777777','Org Self','org-self');

insert into public.memberships (org_id, user_id, role) values
  ('e7777777-7777-7777-7777-777777777777','a1111111-1111-1111-1111-111111111111','owner'),
  ('e7777777-7777-7777-7777-777777777777','b2222222-2222-2222-2222-222222222222','admin'),
  ('e7777777-7777-7777-7777-777777777777','c3333333-3333-3333-3333-333333333333','viewer');

set local role authenticated;

-- viewer nao altera outros
select set_config('request.jwt.claims', json_build_object('sub','c3333333-3333-3333-3333-333333333333','role','authenticated')::text, true);
select throws_ok(
  $$select public.update_membership_role('e7777777-7777-7777-7777-777777777777', 'b2222222-2222-2222-2222-222222222222', 'manager')$$,
  'P0001',
  'forbidden',
  'viewer bloqueado em alterar outros'
);

-- admin nao altera a si mesmo
select set_config('request.jwt.claims', json_build_object('sub','b2222222-2222-2222-2222-222222222222','role','authenticated')::text, true);
select throws_ok(
  $$select public.update_membership_role('e7777777-7777-7777-7777-777777777777', 'b2222222-2222-2222-2222-222222222222', 'manager')$$,
  'P0001',
  'cannot_change_own_role',
  'admin nao altera proprio papel'
);

-- owner nao altera a si mesmo
select set_config('request.jwt.claims', json_build_object('sub','a1111111-1111-1111-1111-111111111111','role','authenticated')::text, true);
select throws_ok(
  $$select public.update_membership_role('e7777777-7777-7777-7777-777777777777', 'a1111111-1111-1111-1111-111111111111', 'manager')$$,
  'P0001',
  'cannot_change_own_role',
  'owner nao altera proprio papel'
);

select * from finish();
rollback;
