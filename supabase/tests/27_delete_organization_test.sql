-- pgTAP: delete_organization
begin;
create extension if not exists pgtap;
select plan(4);

insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at, raw_app_meta_data, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000000','a1111111-1111-1111-1111-111111111111','authenticated','authenticated','owner-del@test.dev', now(), now(), '{}'::jsonb, '{}'::jsonb),
  ('00000000-0000-0000-0000-000000000000','b2222222-2222-2222-2222-222222222222','authenticated','authenticated','admin-del@test.dev', now(), now(), '{}'::jsonb, '{}'::jsonb);

insert into public.organizations (id, name, slug) values
  ('f7777777-7777-7777-7777-777777777777','Org Delete','org-delete');

insert into public.memberships (org_id, user_id, role) values
  ('f7777777-7777-7777-7777-777777777777','a1111111-1111-1111-1111-111111111111','owner'),
  ('f7777777-7777-7777-7777-777777777777','b2222222-2222-2222-2222-222222222222','admin');

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','b2222222-2222-2222-2222-222222222222','role','authenticated')::text, true);

select throws_ok(
  $$select public.delete_organization('f7777777-7777-7777-7777-777777777777')$$,
  'P0001',
  'forbidden',
  'admin nao pode excluir org'
);

select set_config('request.jwt.claims', json_build_object('sub','a1111111-1111-1111-1111-111111111111','role','authenticated')::text, true);

select lives_ok(
  $$select public.delete_organization('f7777777-7777-7777-7777-777777777777')$$,
  'owner exclui org'
);

select is(
  (select count(*)::int from public.organizations where id = 'f7777777-7777-7777-7777-777777777777'),
  0,
  'org removida'
);

select is(
  (select count(*)::int from public.memberships where org_id = 'f7777777-7777-7777-7777-777777777777'),
  0,
  'memberships em cascata'
);

select * from finish();
rollback;
