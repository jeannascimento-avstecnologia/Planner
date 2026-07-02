-- pgTAP: update_org_logo
begin;
create extension if not exists pgtap;
select plan(2);

insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at, raw_app_meta_data, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000000','a1111111-1111-1111-1111-111111111111','authenticated','authenticated','owner@test.dev', now(), now(), '{}'::jsonb, '{}'::jsonb),
  ('00000000-0000-0000-0000-000000000000','b2222222-2222-2222-2222-222222222222','authenticated','authenticated','viewer@test.dev', now(), now(), '{}'::jsonb, '{}'::jsonb);

insert into public.organizations (id, name, slug) values
  ('c3333333-3333-3333-3333-333333333333','Logo Org','logo-org');

insert into public.memberships (org_id, user_id, role) values
  ('c3333333-3333-3333-3333-333333333333','a1111111-1111-1111-1111-111111111111','owner'),
  ('c3333333-3333-3333-3333-333333333333','b2222222-2222-2222-2222-222222222222','viewer');

select set_config('request.jwt.claims', json_build_object('sub','a1111111-1111-1111-1111-111111111111','role','authenticated')::text, true);
select is(
  (select logo_url from public.update_org_logo('c3333333-3333-3333-3333-333333333333', 'https://cdn.example/logo.png')),
  'https://cdn.example/logo.png',
  'owner atualiza logo'
);

select set_config('request.jwt.claims', json_build_object('sub','b2222222-2222-2222-2222-222222222222','role','authenticated')::text, true);
select throws_ok(
  $$select public.update_org_logo('c3333333-3333-3333-3333-333333333333', 'https://cdn.example/x.png')$$,
  'P0001',
  'forbidden',
  'viewer bloqueado'
);

select * from finish();
rollback;
