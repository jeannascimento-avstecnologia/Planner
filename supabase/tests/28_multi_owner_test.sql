-- pgTAP: multi_owner_enabled
begin;
create extension if not exists pgtap;
select plan(7);

insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at, raw_app_meta_data, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000000','a1111111-1111-1111-1111-111111111111','authenticated','authenticated','owner-m@test.dev', now(), now(), '{}'::jsonb, '{}'::jsonb),
  ('00000000-0000-0000-0000-000000000000','b2222222-2222-2222-2222-222222222222','authenticated','authenticated','admin-m@test.dev', now(), now(), '{}'::jsonb, '{}'::jsonb);

insert into public.organizations (id, name, slug, multi_owner_enabled) values
  ('a8888888-8888-8888-8888-888888888888','Org Multi','org-multi', false);

insert into public.memberships (org_id, user_id, role) values
  ('a8888888-8888-8888-8888-888888888888','a1111111-1111-1111-1111-111111111111','owner'),
  ('a8888888-8888-8888-8888-888888888888','b2222222-2222-2222-2222-222222222222','admin');

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','a1111111-1111-1111-1111-111111111111','role','authenticated')::text, true);

select lives_ok(
  $$select public.set_org_multi_owner('a8888888-8888-8888-8888-888888888888', true)$$,
  'owner ativa multi owner'
);

select lives_ok(
  $$select public.update_membership_role('a8888888-8888-8888-8888-888888888888', 'b2222222-2222-2222-2222-222222222222', 'owner')$$,
  'promove admin a owner com chave ativa'
);

select is(
  (select count(*)::int from public.memberships where org_id = 'a8888888-8888-8888-8888-888888888888' and role = 'owner'),
  2,
  'dois owners'
);

select throws_ok(
  $$select public.set_org_multi_owner('a8888888-8888-8888-8888-888888888888', false)$$,
  'P0001',
  'demote_extra_owners_first',
  'nao desativa com 2 owners'
);

select lives_ok(
  $$select public.update_membership_role('a8888888-8888-8888-8888-888888888888', 'b2222222-2222-2222-2222-222222222222', 'admin')$$,
  'owner rebaixa co-owner mantendo ao menos um'
);

select lives_ok(
  $$select public.set_org_multi_owner('a8888888-8888-8888-8888-888888888888', false)$$,
  'desativa multi owner com um owner restante'
);

select throws_ok(
  $$select public.update_membership_role('a8888888-8888-8888-8888-888888888888', 'b2222222-2222-2222-2222-222222222222', 'owner')$$,
  'P0001',
  'cannot_assign_owner_directly',
  'nao promove owner com chave desligada'
);

select * from finish();
rollback;
