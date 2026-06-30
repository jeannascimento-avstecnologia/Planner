-- pgTAP: peek_board_invitation expoe email para quem tem o token
begin;
create extension if not exists pgtap;
select plan(1);

insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at, raw_app_meta_data, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000000','c1111111-1111-1111-1111-111111111111','authenticated','authenticated','peek-admin@test.dev', now(), now(), '{}'::jsonb, '{}'::jsonb);

insert into public.organizations (id, name, slug) values
  ('d5555555-5555-5555-5555-555555555555','Peek Org','peek-org');

insert into public.memberships (org_id, user_id, role) values
  ('d5555555-5555-5555-5555-555555555555','c1111111-1111-1111-1111-111111111111','admin');

insert into public.boards (id, org_id, name, created_by) values
  ('b7777777-7777-7777-7777-777777777777','d5555555-5555-5555-5555-555555555555','Peek Board','c1111111-1111-1111-1111-111111111111');

insert into public.invitations (org_id, board_id, email, role, token_hash, expires_at, created_by)
values (
  'd5555555-5555-5555-5555-555555555555',
  'b7777777-7777-7777-7777-777777777777',
  'guest-peek@test.dev',
  'viewer',
  encode(extensions.digest('peek-token-ok', 'sha256'), 'hex'),
  now() + interval '7 days',
  'c1111111-1111-1111-1111-111111111111'
);

select is(
  (select email from public.peek_board_invitation('peek-token-ok')),
  'guest-peek@test.dev',
  'peek_board_invitation retorna email do convite valido'
);

select * from finish();
rollback;
