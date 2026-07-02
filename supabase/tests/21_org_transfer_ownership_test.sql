-- pgTAP: transfer_org_ownership
begin;
create extension if not exists pgtap;
select plan(4);

insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at, raw_app_meta_data, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000000','a1111111-1111-1111-1111-111111111111','authenticated','authenticated','owner-t@test.dev', now(), now(), '{}'::jsonb, '{}'::jsonb),
  ('00000000-0000-0000-0000-000000000000','b2222222-2222-2222-2222-222222222222','authenticated','authenticated','admin-t@test.dev', now(), now(), '{}'::jsonb, '{}'::jsonb);

insert into public.organizations (id, name, slug) values
  ('e5555555-5555-5555-5555-555555555555','Org Transfer','org-transfer');

insert into public.memberships (org_id, user_id, role) values
  ('e5555555-5555-5555-5555-555555555555','a1111111-1111-1111-1111-111111111111','owner'),
  ('e5555555-5555-5555-5555-555555555555','b2222222-2222-2222-2222-222222222222','admin');

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','a1111111-1111-1111-1111-111111111111','role','authenticated')::text, true);

select lives_ok(
  $$select public.transfer_org_ownership('e5555555-5555-5555-5555-555555555555', 'b2222222-2222-2222-2222-222222222222')$$,
  'transfer ok'
);

select is(
  (select role::text from public.memberships where org_id = 'e5555555-5555-5555-5555-555555555555' and user_id = 'b2222222-2222-2222-2222-222222222222'),
  'owner',
  'novo owner'
);

select is(
  (select role::text from public.memberships where org_id = 'e5555555-5555-5555-5555-555555555555' and user_id = 'a1111111-1111-1111-1111-111111111111'),
  'admin',
  'antigo owner vira admin'
);

-- apenas um owner
select is(
  (select count(*)::int from public.memberships where org_id = 'e5555555-5555-5555-5555-555555555555' and role = 'owner'),
  1,
  'exatamente um owner'
);

select * from finish();
rollback;
