-- pgTAP: manager pode inserir board_members; viewer nao
begin;
create extension if not exists pgtap;
select plan(2);

insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at, raw_app_meta_data, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000000','m1111111-1111-1111-1111-111111111111','authenticated','authenticated','mgr@test.dev', now(), now(), '{}'::jsonb, '{}'::jsonb),
  ('00000000-0000-0000-0000-000000000000','m2222222-2222-2222-2222-222222222222','authenticated','authenticated','view@test.dev', now(), now(), '{}'::jsonb, '{}'::jsonb);

insert into public.organizations (id, name, slug) values
  ('m3333333-3333-3333-3333-333333333333','Org M','org-m');

insert into public.memberships (org_id, user_id, role) values
  ('m3333333-3333-3333-3333-333333333333','m1111111-1111-1111-1111-111111111111','viewer'),
  ('m3333333-3333-3333-3333-333333333333','m2222222-2222-2222-2222-222222222222','viewer');

insert into public.boards (id, org_id, name, created_by) values
  ('m4444444-4444-4444-4444-444444444444','m3333333-3333-3333-3333-333333333333','Board M','m1111111-1111-1111-1111-111111111111');

insert into public.board_members (board_id, user_id, role) values
  ('m4444444-4444-4444-4444-444444444444','m1111111-1111-1111-1111-111111111111','manager'),
  ('m4444444-4444-4444-4444-444444444444','m2222222-2222-2222-2222-222222222222','viewer');

-- manager insert
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','m1111111-1111-1111-1111-111111111111','role','authenticated')::text, true);

insert into public.board_members (board_id, user_id, role) values
  ('m4444444-4444-4444-4444-444444444444','m2222222-2222-2222-2222-222222222222','admin')
on conflict (board_id, user_id) do update set role = excluded.role;

select is(
  (select role::text from public.board_members where board_id = 'm4444444-4444-4444-4444-444444444444' and user_id = 'm2222222-2222-2222-2222-222222222222'),
  'admin',
  'manager pode alterar papel de membro'
);

-- viewer blocked
select set_config('request.jwt.claims', json_build_object('sub','m2222222-2222-2222-2222-222222222222','role','authenticated')::text, true);

select throws_ok(
  $$insert into public.board_members (board_id, user_id, role) values ('m4444444-4444-4444-4444-444444444444','m1111111-1111-1111-1111-111111111111','viewer')$$,
  '42501',
  null,
  'viewer nao pode gerenciar membros'
);

select * from finish();
rollback;
