-- pgTAP: delete em tags respeita RLS (admin sim, member nao)
begin;
create extension if not exists pgtap;
select plan(2);

insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at, raw_app_meta_data, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000000','03111111-1111-1111-1111-111111111111','authenticated','authenticated','ta@test.dev', now(), now(), '{}'::jsonb, '{}'::jsonb),
  ('00000000-0000-0000-0000-000000000000','03222222-2222-2222-2222-222222222222','authenticated','authenticated','tm@test.dev', now(), now(), '{}'::jsonb, '{}'::jsonb);

insert into public.organizations (id, name, slug) values
  ('03333333-3333-3333-3333-333333333333','Org T','org-t');

insert into public.boards (id, org_id, name) values
  ('03444444-4444-4444-4444-444444444444','03333333-3333-3333-3333-333333333333','Board T');

insert into public.memberships (org_id, user_id, role) values
  ('03333333-3333-3333-3333-333333333333','03111111-1111-1111-1111-111111111111','admin'),
  ('03333333-3333-3333-3333-333333333333','03222222-2222-2222-2222-222222222222','viewer');

insert into public.tags (id, org_id, board_id, name, color) values
  ('03555555-0000-0000-0000-000000000001','03333333-3333-3333-3333-333333333333','03444444-4444-4444-4444-444444444444','deletavel','#456993');

-- admin delete
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','03111111-1111-1111-1111-111111111111','role','authenticated')::text, true);

insert into public.tags (id, org_id, board_id, name, color) values
  ('03555555-0000-0000-0000-000000000002','03333333-3333-3333-3333-333333333333','03444444-4444-4444-4444-444444444444','admin-del','#111111');

delete from public.tags where id = '03555555-0000-0000-0000-000000000002';

select is(
  (select count(*) from public.tags where id = '03555555-0000-0000-0000-000000000002')::int,
  0,
  'admin pode deletar tag'
);

-- member blocked
select set_config('request.jwt.claims', json_build_object('sub','03222222-2222-2222-2222-222222222222','role','authenticated')::text, true);

delete from public.tags where id = '03555555-0000-0000-0000-000000000001';

select is(
  (select count(*) from public.tags where id = '03555555-0000-0000-0000-000000000001')::int,
  1,
  'viewer nao pode deletar tag'
);

select * from finish();
rollback;
