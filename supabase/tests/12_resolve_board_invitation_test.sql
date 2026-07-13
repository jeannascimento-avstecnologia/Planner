-- pgTAP: resolve_board_invitation (pending, accepted, not_found)
begin;
create extension if not exists pgtap;
select plan(3);

insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at, raw_app_meta_data, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000000','c1111111-1111-1111-1111-111111111111','authenticated','authenticated','resolve-inviter@test.dev', now(), now(), '{}'::jsonb, '{}'::jsonb),
  ('00000000-0000-0000-0000-000000000000','c2222222-2222-2222-2222-222222222222','authenticated','authenticated','resolve-guest@test.dev', now(), now(), '{}'::jsonb, '{}'::jsonb);

insert into public.profiles (id, full_name) values
  ('c1111111-1111-1111-1111-111111111111','Resolve Inviter'),
  ('c2222222-2222-2222-2222-222222222222','Resolve Guest')
on conflict (id) do nothing;

insert into public.organizations (id, name, slug)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Resolve Org', 'resolve-org')
on conflict do nothing;

insert into public.memberships (org_id, user_id, role)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c1111111-1111-1111-1111-111111111111', 'admin')
on conflict do nothing;

insert into public.boards (id, org_id, name, created_by)
values (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'Resolve Board',
  'c1111111-1111-1111-1111-111111111111'
)
on conflict do nothing;

insert into public.invitations (org_id, board_id, email, role, token_hash, expires_at, created_by)
values (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'resolve-guest@test.dev',
  'viewer',
  encode(extensions.digest('resolve-pending-token', 'sha256'), 'hex'),
  now() + interval '7 days',
  'c1111111-1111-1111-1111-111111111111'
);

insert into public.invitations (org_id, board_id, email, role, token_hash, expires_at, accepted_at, created_by)
values (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'resolve-guest@test.dev',
  'viewer',
  encode(extensions.digest('resolve-accepted-token', 'sha256'), 'hex'),
  now() + interval '7 days',
  now(),
  'c1111111-1111-1111-1111-111111111111'
);

select is(
  (select status from public.resolve_board_invitation('resolve-pending-token')),
  'pending',
  'resolve_board_invitation retorna pending'
);

select is(
  (select status from public.resolve_board_invitation('resolve-accepted-token')),
  'accepted',
  'resolve_board_invitation retorna accepted'
);

select is(
  (select status from public.resolve_board_invitation('missing-token')),
  'not_found',
  'resolve_board_invitation retorna not_found'
);

select * from finish();
rollback;
