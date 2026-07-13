-- pgTAP: user field permission overrides
begin;
create extension if not exists pgtap;
select plan(6);

insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at, raw_app_meta_data, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000000','40111111-1111-1111-1111-111111111111','authenticated','authenticated','admin-fp@test.dev', now(), now(), '{}'::jsonb, '{}'::jsonb),
  ('00000000-0000-0000-0000-000000000000','40222222-2222-2222-2222-222222222222','authenticated','authenticated','mgr-fp@test.dev', now(), now(), '{}'::jsonb, '{}'::jsonb);

insert into public.organizations (id, name, slug) values
  ('40333333-3333-3333-3333-333333333333','Org FP','org-fp-40');

insert into public.memberships (org_id, user_id, role) values
  ('40333333-3333-3333-3333-333333333333','40111111-1111-1111-1111-111111111111','admin'),
  ('40333333-3333-3333-3333-333333333333','40222222-2222-2222-2222-222222222222','manager');

select is(
  app.field_access(
    '40333333-3333-3333-3333-333333333333'::uuid,
    '40222222-2222-2222-2222-222222222222'::uuid,
    'manager'::public.membership_role,
    'due_date'
  ),
  'write',
  'manager default due_date is write'
);

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','40111111-1111-1111-1111-111111111111','role','authenticated')::text, true);

insert into public.user_field_permission_overrides (org_id, user_id, resource, field_name, access)
values (
  '40333333-3333-3333-3333-333333333333',
  '40222222-2222-2222-2222-222222222222',
  'card',
  'due_date',
  'read'
);

select is(
  app.field_access(
    '40333333-3333-3333-3333-333333333333'::uuid,
    '40222222-2222-2222-2222-222222222222'::uuid,
    'manager'::public.membership_role,
    'due_date'
  ),
  'read',
  'user override wins over role default'
);

select lives_ok(
  $$insert into public.user_field_permission_overrides (org_id, user_id, resource, field_name, access)
    values ('40333333-3333-3333-3333-333333333333','40222222-2222-2222-2222-222222222222','card','title','hidden')
    on conflict (org_id, user_id, resource, field_name) do update set access = excluded.access$$,
  'admin can upsert user override'
);

select set_config('request.jwt.claims', json_build_object('sub','40222222-2222-2222-2222-222222222222','role','authenticated')::text, true);

select throws_ok(
  $$insert into public.user_field_permission_overrides (org_id, user_id, resource, field_name, access)
    values ('40333333-3333-3333-3333-333333333333','40111111-1111-1111-1111-111111111111','card','title','read')$$,
  '42501',
  null,
  'manager cannot write user overrides'
);

select set_config('request.jwt.claims', json_build_object('sub','40111111-1111-1111-1111-111111111111','role','authenticated')::text, true);

select lives_ok(
  $$delete from public.user_field_permission_overrides
    where org_id = '40333333-3333-3333-3333-333333333333'
      and user_id = '40222222-2222-2222-2222-222222222222'
      and field_name = 'due_date'$$,
  'admin can delete override'
);

select is(
  app.field_access(
    '40333333-3333-3333-3333-333333333333'::uuid,
    '40222222-2222-2222-2222-222222222222'::uuid,
    'manager'::public.membership_role,
    'due_date'
  ),
  'write',
  'after delete falls back to role default'
);

select * from finish();
rollback;
