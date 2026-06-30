-- pgTAP: resolve_board_invitation (pending, accepted, not_found)
begin;
select plan(3);

select tests.create_supabase_user('resolve_inviter', 'resolve-inviter@test.dev');
select tests.create_supabase_user('resolve_guest', 'resolve-guest@test.dev');

insert into public.organizations (id, name, slug)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Resolve Org', 'resolve-org')
on conflict do nothing;

insert into public.memberships (org_id, user_id, role)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', tests.get_supabase_uid('resolve_inviter'), 'admin')
on conflict do nothing;

insert into public.boards (id, org_id, name, created_by)
values (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'Resolve Board',
  tests.get_supabase_uid('resolve_inviter')
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
  tests.get_supabase_uid('resolve_inviter')
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
  tests.get_supabase_uid('resolve_inviter')
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
