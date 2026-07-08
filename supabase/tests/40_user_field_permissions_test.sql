-- pgTAP: user field permission overrides
begin;
create extension if not exists pgtap;
select plan(6);

insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at, raw_app_meta_data, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000000','u1111111-1111-1111-1111-111111111111','authenticated','authenticated','admin-fp@test.dev', now(), now(), '{}'::jsonb, '{}'::jsonb),
  ('00000000-0000-0000-0000-000000000000','u2222222-2222-2222-2222-222222222222','authenticated','authenticated','mgr-fp@test.dev', now(), now(), '{}'::jsonb, '{}'::jsonb);

insert into public.organizations (id, name, slug) values
  ('u3333333-3333-3333-3333-333333333333','Org FP','org-fp');

insert into public.memberships (org_id, user_id, role) values
  ('u3333333-3333-3333-3333-333333333333','u1111111-1111-1111-1111-111111111111','admin'),
  ('u3333333-3333-3333-3333-333333333333','u2222222-2222-2222-2222-222222222222','manager');

reset role;
set local role service_role;

select is(
  app.field_access(
    'u3333333-3333-3333-3333-333333333333'::uuid,
    'u2222222-2222-2222-2222-222222222222'::uuid,
    'manager'::public.membership_role,
    'due_date'
  ),
  'write',
  'manager default due_date is write'
);

insert into public.user_field_permission_overrides (org_id, user_id, resource, field_name, access)
values (
  'u3333333-3333-3333-3333-333333333333',
  'u2222222-2222-2222-2222-222222222222',
  'card',
  'due_date',
  'read'
);

select is(
  app.field_access(
    'u3333333-3333-3333-3333-333333333333'::uuid,
    'u2222222-2222-2222-2222-222222222222'::uuid,
    'manager'::public.membership_role,
    'due_date'
  ),
  'read',
  'user override wins over role default'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','u1111111-1111-1111-1111-111111111111','role','authenticated')::text, true);

select lives_ok(
  $$insert into public.user_field_permission_overrides (org_id, user_id, resource, field_name, access)
    values ('u3333333-3333-3333-3333-333333333333','u2222222-2222-2222-2222-222222222222','card','title','hidden')
    on conflict (org_id, user_id, resource, field_name) do update set access = excluded.access$$,
  'admin can upsert user override'
);

select set_config('request.jwt.claims', json_build_object('sub','u2222222-2222-2222-2222-222222222222','role','authenticated')::text, true);

select throws_ok(
  $$insert into public.user_field_permission_overrides (org_id, user_id, resource, field_name, access)
    values ('u3333333-3333-3333-3333-333333333333','u1111111-1111-1111-1111-111111111111','card','title','read')$$,
  '42501',
  null,
  'manager cannot write user overrides'
);

select set_config('request.jwt.claims', json_build_object('sub','u1111111-1111-1111-1111-111111111111','role','authenticated')::text, true);

select lives_ok(
  $$delete from public.user_field_permission_overrides
    where org_id = 'u3333333-3333-3333-3333-333333333333'
      and user_id = 'u2222222-2222-2222-2222-222222222222'
      and field_name = 'due_date'$$,
  'admin can delete override'
);

reset role;
set local role service_role;

select is(
  app.field_access(
    'u3333333-3333-3333-3333-333333333333'::uuid,
    'u2222222-2222-2222-2222-222222222222'::uuid,
    'manager'::public.membership_role,
    'due_date'
  ),
  'write',
  'after delete falls back to role default'
);

select * from finish();
rollback;
