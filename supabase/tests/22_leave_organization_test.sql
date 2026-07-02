-- pgTAP: leave_organization
begin;
create extension if not exists pgtap;
select plan(2);

insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at, raw_app_meta_data, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000000','a1111111-1111-1111-1111-111111111111','authenticated','authenticated','owner-l@test.dev', now(), now(), '{}'::jsonb, '{}'::jsonb),
  ('00000000-0000-0000-0000-000000000000','b2222222-2222-2222-2222-222222222222','authenticated','authenticated','view-l@test.dev', now(), now(), '{}'::jsonb, '{}'::jsonb);

insert into public.organizations (id, name, slug) values
  ('e5555555-5555-5555-5555-555555555555','Org Leave','org-leave');

insert into public.memberships (org_id, user_id, role) values
  ('e5555555-5555-5555-5555-555555555555','a1111111-1111-1111-1111-111111111111','owner'),
  ('e5555555-5555-5555-5555-555555555555','b2222222-2222-2222-2222-222222222222','viewer');

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','a1111111-1111-1111-1111-111111111111','role','authenticated')::text, true);

select throws_ok(
  $$select public.leave_organization('e5555555-5555-5555-5555-555555555555')$$,
  'P0001',
  'owner_cannot_leave',
  'owner nao pode sair'
);

select set_config('request.jwt.claims', json_build_object('sub','b2222222-2222-2222-2222-222222222222','role','authenticated')::text, true);
select lives_ok(
  $$select public.leave_organization('e5555555-5555-5555-5555-555555555555')$$,
  'viewer pode sair'
);

select * from finish();
rollback;
