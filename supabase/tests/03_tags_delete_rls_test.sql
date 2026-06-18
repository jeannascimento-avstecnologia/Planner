-- pgTAP: delete em tags respeita RLS (admin sim, member nao)
begin;
create extension if not exists pgtap;
select plan(2);

insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at, raw_app_meta_data, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000000','t1111111-1111-1111-1111-111111111111','authenticated','authenticated','ta@test.dev', now(), now(), '{}'::jsonb, '{}'::jsonb),
  ('00000000-0000-0000-0000-000000000000','t2222222-2222-2222-2222-222222222222','authenticated','authenticated','tm@test.dev', now(), now(), '{}'::jsonb, '{}'::jsonb);

insert into public.organizations (id, name, slug) values
  ('t3333333-3333-3333-3333-333333333333','Org T','org-t');

insert into public.boards (id, org_id, name) values
  ('t4444444-4444-4444-4444-444444444444','t3333333-3333-3333-3333-333333333333','Board T');

insert into public.memberships (org_id, user_id, role) values
  ('t3333333-3333-3333-3333-333333333333','t1111111-1111-1111-1111-111111111111','admin'),
  ('t3333333-3333-3333-3333-333333333333','t2222222-2222-2222-2222-222222222222','member');

insert into public.tags (id, org_id, board_id, name, color) values
  ('t5555555-0000-0000-0000-000000000001','t3333333-3333-3333-3333-333333333333','t4444444-4444-4444-4444-444444444444','deletavel','#456993');

-- admin delete
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','t1111111-1111-1111-1111-111111111111','role','authenticated')::text, true);

insert into public.tags (id, org_id, board_id, name, color) values
  ('t5555555-0000-0000-0000-000000000002','t3333333-3333-3333-3333-333333333333','t4444444-4444-4444-4444-444444444444','admin-del','#111111');

delete from public.tags where id = 't5555555-0000-0000-0000-000000000002';

select is(
  (select count(*) from public.tags where id = 't5555555-0000-0000-0000-000000000002')::int,
  0,
  'admin pode deletar tag'
);

-- member blocked
select set_config('request.jwt.claims', json_build_object('sub','t2222222-2222-2222-2222-222222222222','role','authenticated')::text, true);

select throws_ok(
  $$delete from public.tags where id = 't5555555-0000-0000-0000-000000000001'$$,
  '42501',
  null,
  'member nao pode deletar tag'
);

select * from finish();
rollback;
