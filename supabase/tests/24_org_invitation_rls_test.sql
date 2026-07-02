-- pgTAP: organization_invitations RLS
begin;
create extension if not exists pgtap;
select plan(2);

insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at, raw_app_meta_data, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000000','a1111111-1111-1111-1111-111111111111','authenticated','authenticated','admin-rls@test.dev', now(), now(), '{}'::jsonb, '{}'::jsonb),
  ('00000000-0000-0000-0000-000000000000','c3333333-3333-3333-3333-333333333333','authenticated','authenticated','view-rls@test.dev', now(), now(), '{}'::jsonb, '{}'::jsonb);

insert into public.organizations (id, name, slug) values
  ('e5555555-5555-5555-5555-555555555555','Org RLS','org-rls');

insert into public.memberships (org_id, user_id, role) values
  ('e5555555-5555-5555-5555-555555555555','a1111111-1111-1111-1111-111111111111','owner'),
  ('e5555555-5555-5555-5555-555555555555','c3333333-3333-3333-3333-333333333333','viewer');

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','a1111111-1111-1111-1111-111111111111','role','authenticated')::text, true);

insert into public.organization_invitations (org_id, email, role, token_hash, expires_at, created_by)
values (
  'e5555555-5555-5555-5555-555555555555',
  'pending-rls@test.dev',
  'viewer',
  encode(extensions.digest('rls-token', 'sha256'), 'hex'),
  now() + interval '7 days',
  'a1111111-1111-1111-1111-111111111111'
);

reset role;
select is(
  (select count(*)::int from public.organization_invitations where email = 'pending-rls@test.dev'),
  1,
  'admin insere convite org'
);

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','c3333333-3333-3333-3333-333333333333','role','authenticated')::text, true);

select throws_ok(
  $$insert into public.organization_invitations (org_id, email, role, token_hash, expires_at)
    values (
      'e5555555-5555-5555-5555-555555555555',
      'blocked@test.dev',
      'viewer',
      encode(extensions.digest('blocked', 'sha256'), 'hex'),
      now() + interval '7 days'
    )$$,
  '42501',
  null,
  'viewer bloqueado em convite org'
);

select * from finish();
rollback;
