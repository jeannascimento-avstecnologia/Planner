-- pgTAP: audit triggers membership role_changed
begin;
create extension if not exists pgtap;
select plan(2);

insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at, raw_app_meta_data, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000000','e1111111-1111-1111-1111-111111111111','authenticated','authenticated','adm@test.dev', now(), now(), '{}'::jsonb, '{}'::jsonb),
  ('00000000-0000-0000-0000-000000000000','e2222222-2222-2222-2222-222222222222','authenticated','authenticated','mem@test.dev', now(), now(), '{}'::jsonb, '{}'::jsonb);

insert into public.organizations (id, name, slug) values ('e3333333-3333-3333-3333-333333333333','Org Audit','org-audit');
insert into public.profiles (id, full_name) values
  ('e1111111-1111-1111-1111-111111111111','Admin'),
  ('e2222222-2222-2222-2222-222222222222','Mem')
on conflict (id) do nothing;

insert into public.memberships (org_id, user_id, role) values
  ('e3333333-3333-3333-3333-333333333333','e1111111-1111-1111-1111-111111111111','owner'),
  ('e3333333-3333-3333-3333-333333333333','e2222222-2222-2222-2222-222222222222','viewer');

reset role;
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','e1111111-1111-1111-1111-111111111111','role','authenticated')::text, true);

select public.update_membership_role(
  'e3333333-3333-3333-3333-333333333333'::uuid,
  'e2222222-2222-2222-2222-222222222222'::uuid,
  'manager'::public.membership_role
);

select is(
  (select count(*)::int from public.card_events where event_type = 'role_changed' and org_id = 'e3333333-3333-3333-3333-333333333333'),
  1,
  'trigger emite role_changed'
);

select ok(
  (select (payload->>'new_role') from public.card_events where event_type = 'role_changed' limit 1) = 'manager',
  'payload new_role'
);

select * from finish();
rollback;
