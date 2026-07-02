-- pgTAP: org invitation accept
begin;
create extension if not exists pgtap;
select plan(4);

insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at, raw_app_meta_data, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000000','a1111111-1111-1111-1111-111111111111','authenticated','authenticated','admin-oi@test.dev', now(), now(), '{}'::jsonb, '{}'::jsonb),
  ('00000000-0000-0000-0000-000000000000','d4444444-4444-4444-4444-444444444444','authenticated','authenticated','guest-oi@test.dev', now(), now(), '{}'::jsonb, '{}'::jsonb);

insert into public.organizations (id, name, slug) values
  ('e5555555-5555-5555-5555-555555555555','Org Invite','org-inv');

insert into public.memberships (org_id, user_id, role) values
  ('e5555555-5555-5555-5555-555555555555','a1111111-1111-1111-1111-111111111111','owner');

insert into public.organization_invitations (org_id, email, role, token_hash, expires_at, created_by)
values (
  'e5555555-5555-5555-5555-555555555555',
  'guest-oi@test.dev',
  'viewer',
  encode(extensions.digest('org-token-abc', 'sha256'), 'hex'),
  now() + interval '7 days',
  'a1111111-1111-1111-1111-111111111111'
);

select is(
  (select status from public.resolve_org_invitation('org-token-abc')),
  'pending',
  'resolve pending'
);

set local role authenticated;
select set_config('request.jwt.claims', json_build_object(
  'sub','d4444444-4444-4444-4444-444444444444',
  'role','authenticated',
  'email','guest-oi@test.dev'
)::text, true);

select is(
  public.accept_org_invitation('org-token-abc'),
  'e5555555-5555-5555-5555-555555555555'::uuid,
  'accept retorna org_id'
);

select is(
  (select role::text from public.memberships where org_id = 'e5555555-5555-5555-5555-555555555555' and user_id = 'd4444444-4444-4444-4444-444444444444'),
  'viewer',
  'membership criada'
);

select is(
  (select status from public.resolve_org_invitation('org-token-abc')),
  'accepted',
  'resolve accepted'
);

select * from finish();
rollback;
