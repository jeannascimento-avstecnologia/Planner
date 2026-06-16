-- pgTAP: isolamento multi-tenant + RBAC. Rodar com: supabase test db
begin;
create extension if not exists pgtap;
select plan(3);

-- ---------- setup (superuser) ----------
insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at, raw_app_meta_data, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000000','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','authenticated','authenticated','a@test.dev', now(), now(), '{}'::jsonb, '{"full_name":"A"}'::jsonb),
  ('00000000-0000-0000-0000-000000000000','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','authenticated','authenticated','b@test.dev', now(), now(), '{}'::jsonb, '{"full_name":"B"}'::jsonb),
  ('00000000-0000-0000-0000-000000000000','cccccccc-cccc-cccc-cccc-cccccccccccc','authenticated','authenticated','c@test.dev', now(), now(), '{}'::jsonb, '{"full_name":"C"}'::jsonb);

insert into public.organizations (id, name, slug) values
  ('a1111111-1111-1111-1111-111111111111','Org A','org-a'),
  ('b1111111-1111-1111-1111-111111111111','Org B','org-b');

insert into public.memberships (org_id, user_id, role) values
  ('a1111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','admin'),
  ('b1111111-1111-1111-1111-111111111111','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','admin'),
  ('a1111111-1111-1111-1111-111111111111','cccccccc-cccc-cccc-cccc-cccccccccccc','viewer');

insert into public.boards (id, org_id, name, created_by) values
  ('a2222222-2222-2222-2222-222222222222','a1111111-1111-1111-1111-111111111111','Board A','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  ('b2222222-2222-2222-2222-222222222222','b1111111-1111-1111-1111-111111111111','Board B','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');

-- ---------- act as user A (admin da Org A) ----------
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','role','authenticated')::text, true);

select is((select count(*) from public.boards)::int, 1, 'A enxerga apenas boards da sua org (isolamento)');
select is((select count(*) from public.boards where org_id = 'b1111111-1111-1111-1111-111111111111')::int, 0, 'A nao enxerga board da Org B');

-- ---------- act as user C (viewer da Org A) ----------
reset role;
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','cccccccc-cccc-cccc-cccc-cccccccccccc','role','authenticated')::text, true);

select throws_ok(
  $$ insert into public.boards (org_id, name) values ('a1111111-1111-1111-1111-111111111111','Hack') $$,
  '42501',
  null,
  'viewer nao pode inserir board (RBAC via RLS)'
);

select * from finish();
rollback;
