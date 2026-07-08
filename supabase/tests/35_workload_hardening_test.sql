-- pgTAP: workload hardening (target_date, org-scoped capacity)
begin;
create extension if not exists pgtap;
select plan(4);

insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at, raw_app_meta_data, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000000','f1111111-1111-1111-1111-111111111111','authenticated','authenticated','mgr-wl@test.dev', now(), now(), '{}'::jsonb, '{}'::jsonb),
  ('00000000-0000-0000-0000-000000000000','f2222222-2222-2222-2222-222222222222','authenticated','authenticated','mem-wl@test.dev', now(), now(), '{}'::jsonb, '{}'::jsonb);

insert into public.organizations (id, name, slug) values
  ('f3333333-3333-3333-3333-333333333333','Org WL','org-wl');

insert into public.memberships (org_id, user_id, role, weekly_capacity_hours) values
  ('f3333333-3333-3333-3333-333333333333','f1111111-1111-1111-1111-111111111111','manager', 40),
  ('f3333333-3333-3333-3333-333333333333','f2222222-2222-2222-2222-222222222222','viewer', 40);

set local role authenticated;

select set_config('request.jwt.claims', json_build_object('sub','f1111111-1111-1111-1111-111111111111','role','authenticated')::text, true);
select lives_ok(
  $$select public.update_member_capacity('f3333333-3333-3333-3333-333333333333', 'f2222222-2222-2222-2222-222222222222', 32)$$,
  'manager can update member capacity'
);

select is(
  (select weekly_capacity_hours from public.memberships
   where org_id = 'f3333333-3333-3333-3333-333333333333'
     and user_id = 'f2222222-2222-2222-2222-222222222222'),
  32::numeric,
  'capacity persisted on membership'
);

select set_config('request.jwt.claims', json_build_object('sub','f2222222-2222-2222-2222-222222222222','role','authenticated')::text, true);
select throws_ok(
  $$select public.update_member_capacity('f3333333-3333-3333-3333-333333333333', 'f1111111-1111-1111-1111-111111111111', 40)$$,
  '42501',
  'forbidden',
  'viewer cannot update member capacity'
);

select has_column('public', 'cards', 'target_date', 'cards.target_date exists');

select * from finish();
rollback;
