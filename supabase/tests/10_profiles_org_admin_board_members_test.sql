-- pgTAP: org admin sem linha em board_members ve perfis dos convidados do projeto
begin;
create extension if not exists pgtap;
select plan(1);

insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at, raw_app_meta_data, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000000','b1111111-1111-1111-1111-111111111111','authenticated','authenticated','org-admin-only@test.dev', now(), now(), '{}'::jsonb, '{"full_name":"Org Admin Only"}'::jsonb),
  ('00000000-0000-0000-0000-000000000000','e4444444-4444-4444-4444-444444444444','authenticated','authenticated','guest-only@test.dev', now(), now(), '{}'::jsonb, '{"full_name":"Guest Only"}'::jsonb);

insert into public.organizations (id, name, slug) values
  ('f5555555-5555-5555-5555-555555555555','Org Admin Board','org-admin-board');

insert into public.memberships (org_id, user_id, role) values
  ('f5555555-5555-5555-5555-555555555555','b1111111-1111-1111-1111-111111111111','admin');

insert into public.profiles (id, full_name) values
  ('b1111111-1111-1111-1111-111111111111','Org Admin Only'),
  ('e4444444-4444-4444-4444-444444444444','Guest Only')
on conflict (id) do update set full_name = excluded.full_name;

insert into public.boards (id, org_id, name, created_by) values
  ('a6666666-6666-6666-6666-666666666666','f5555555-5555-5555-5555-555555555555','Roadmap Seed','b1111111-1111-1111-1111-111111111111');

-- guest no board; org admin NAO em board_members (cenario seed Roadmap)
insert into public.board_members (board_id, user_id, role) values
  ('a6666666-6666-6666-6666-666666666666','e4444444-4444-4444-4444-444444444444','viewer');

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','b1111111-1111-1111-1111-111111111111','role','authenticated')::text, true);

select is(
  (select full_name from public.profiles where id = 'e4444444-4444-4444-4444-444444444444'),
  'Guest Only',
  'org admin sem board_members ve full_name do convidado no projeto'
);

reset role;
select * from finish();
rollback;
