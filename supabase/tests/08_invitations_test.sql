-- pgTAP: convites de board (RLS + accept_board_invitation)
begin;
create extension if not exists pgtap;
select plan(7);

insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at, raw_app_meta_data, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000000','a1111111-1111-1111-1111-111111111111','authenticated','authenticated','admin-inv@test.dev', now(), now(), '{}'::jsonb, '{}'::jsonb),
  ('00000000-0000-0000-0000-000000000000','b2222222-2222-2222-2222-222222222222','authenticated','authenticated','mgr-inv@test.dev', now(), now(), '{}'::jsonb, '{}'::jsonb),
  ('00000000-0000-0000-0000-000000000000','c3333333-3333-3333-3333-333333333333','authenticated','authenticated','view-inv@test.dev', now(), now(), '{}'::jsonb, '{}'::jsonb),
  ('00000000-0000-0000-0000-000000000000','d4444444-4444-4444-4444-444444444444','authenticated','authenticated','guest-inv@test.dev', now(), now(), '{}'::jsonb, '{}'::jsonb);

insert into public.organizations (id, name, slug) values
  ('e5555555-5555-5555-5555-555555555555','Org Invite','org-invite');

insert into public.memberships (org_id, user_id, role) values
  ('e5555555-5555-5555-5555-555555555555','a1111111-1111-1111-1111-111111111111','admin'),
  ('e5555555-5555-5555-5555-555555555555','b2222222-2222-2222-2222-222222222222','viewer'),
  ('e5555555-5555-5555-5555-555555555555','c3333333-3333-3333-3333-333333333333','viewer');

insert into public.boards (id, org_id, name, created_by) values
  ('f6666666-6666-6666-6666-666666666666','e5555555-5555-5555-5555-555555555555','Board Invite','a1111111-1111-1111-1111-111111111111');

insert into public.board_members (board_id, user_id, role) values
  ('f6666666-6666-6666-6666-666666666666','b2222222-2222-2222-2222-222222222222','manager'),
  ('f6666666-6666-6666-6666-666666666666','c3333333-3333-3333-3333-333333333333','viewer');

-- org admin pode inserir convite
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','a1111111-1111-1111-1111-111111111111','role','authenticated')::text, true);

insert into public.invitations (org_id, board_id, email, role, token_hash, expires_at, created_by)
values (
  'e5555555-5555-5555-5555-555555555555',
  'f6666666-6666-6666-6666-666666666666',
  'pending@test.dev',
  'viewer',
  encode(extensions.digest('admin-token-abc', 'sha256'), 'hex'),
  now() + interval '7 days',
  'a1111111-1111-1111-1111-111111111111'
);

reset role;
select is(
  (select count(*)::int from public.invitations where email = 'pending@test.dev'),
  1,
  'org admin pode inserir convite'
);

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','b2222222-2222-2222-2222-222222222222','role','authenticated')::text, true);

insert into public.invitations (org_id, board_id, email, role, token_hash, expires_at, created_by)
values (
  'e5555555-5555-5555-5555-555555555555',
  'f6666666-6666-6666-6666-666666666666',
  'mgr-pending@test.dev',
  'viewer',
  encode(extensions.digest('mgr-token-abc', 'sha256'), 'hex'),
  now() + interval '7 days',
  'b2222222-2222-2222-2222-222222222222'
);

reset role;
select is(
  (select count(*)::int from public.invitations where email = 'mgr-pending@test.dev'),
  1,
  'board manager pode inserir convite'
);

-- viewer bloqueado
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','c3333333-3333-3333-3333-333333333333','role','authenticated')::text, true);

select throws_ok(
  $$insert into public.invitations (org_id, board_id, email, role, token_hash, expires_at)
    values (
      'e5555555-5555-5555-5555-555555555555',
      'f6666666-6666-6666-6666-666666666666',
      'blocked@test.dev',
      'viewer',
      encode(extensions.digest('blocked-token', 'sha256'), 'hex'),
      now() + interval '7 days'
    )$$,
  '42501',
  null,
  'viewer nao pode inserir convite'
);

-- accept valido (insert como admin)
select set_config('request.jwt.claims', json_build_object('sub','a1111111-1111-1111-1111-111111111111','role','authenticated')::text, true);

insert into public.invitations (org_id, board_id, email, role, token_hash, expires_at, created_by)
values (
  'e5555555-5555-5555-5555-555555555555',
  'f6666666-6666-6666-6666-666666666666',
  'guest-inv@test.dev',
  'admin',
  encode(extensions.digest('accept-token-ok', 'sha256'), 'hex'),
  now() + interval '7 days',
  'a1111111-1111-1111-1111-111111111111'
);

select set_config('request.jwt.claims', json_build_object('sub','d4444444-4444-4444-4444-444444444444','role','authenticated')::text, true);

select is(
  public.accept_board_invitation('accept-token-ok')::text,
  'f6666666-6666-6666-6666-666666666666',
  'accept_board_invitation com token e email validos'
);

reset role;
select is(
  (select role::text from public.board_members where board_id = 'f6666666-6666-6666-6666-666666666666' and user_id = 'd4444444-4444-4444-4444-444444444444'),
  'admin',
  'convite aceito cria board_member com role correto'
);

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','d4444444-4444-4444-4444-444444444444','role','authenticated')::text, true);

-- token expirado
select set_config('request.jwt.claims', json_build_object('sub','a1111111-1111-1111-1111-111111111111','role','authenticated')::text, true);

insert into public.invitations (org_id, board_id, email, role, token_hash, expires_at, created_by)
values (
  'e5555555-5555-5555-5555-555555555555',
  'f6666666-6666-6666-6666-666666666666',
  'expired@test.dev',
  'viewer',
  encode(extensions.digest('expired-token', 'sha256'), 'hex'),
  now() - interval '1 day',
  'a1111111-1111-1111-1111-111111111111'
);

select set_config('request.jwt.claims', json_build_object('sub','d4444444-4444-4444-4444-444444444444','role','authenticated')::text, true);

select throws_ok(
  $$select public.accept_board_invitation('expired-token')$$,
  'P0001',
  'invalid or expired invitation',
  'token expirado rejeitado'
);

-- email mismatch
select set_config('request.jwt.claims', json_build_object('sub','a1111111-1111-1111-1111-111111111111','role','authenticated')::text, true);

insert into public.invitations (org_id, board_id, email, role, token_hash, expires_at, created_by)
values (
  'e5555555-5555-5555-5555-555555555555',
  'f6666666-6666-6666-6666-666666666666',
  'other@test.dev',
  'viewer',
  encode(extensions.digest('mismatch-token', 'sha256'), 'hex'),
  now() + interval '7 days',
  'a1111111-1111-1111-1111-111111111111'
);

select set_config('request.jwt.claims', json_build_object('sub','d4444444-4444-4444-4444-444444444444','role','authenticated')::text, true);

select throws_ok(
  $$select public.accept_board_invitation('mismatch-token')$$,
  'P0001',
  'email mismatch',
  'email diferente do convite rejeitado'
);

select * from finish();
rollback;
