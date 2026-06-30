-- pgTAP: perfis visiveis entre membros do mesmo board (board-only guest)
begin;
create extension if not exists pgtap;
select plan(2);

insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at, raw_app_meta_data, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000000','a1111111-1111-1111-1111-111111111111','authenticated','authenticated','admin-co@test.dev', now(), now(), '{}'::jsonb, '{"full_name":"Admin Co"}'::jsonb),
  ('00000000-0000-0000-0000-000000000000','d4444444-4444-4444-4444-444444444444','authenticated','authenticated','guest-co@test.dev', now(), now(), '{}'::jsonb, '{"full_name":"Guest Board Only"}'::jsonb);

insert into public.organizations (id, name, slug) values
  ('e5555555-5555-5555-5555-555555555555','Org Co Board','org-co-board');

insert into public.memberships (org_id, user_id, role) values
  ('e5555555-5555-5555-5555-555555555555','a1111111-1111-1111-1111-111111111111','admin');

insert into public.profiles (id, full_name) values
  ('a1111111-1111-1111-1111-111111111111','Admin Co'),
  ('d4444444-4444-4444-4444-444444444444','Guest Board Only')
on conflict (id) do update set full_name = excluded.full_name;

insert into public.boards (id, org_id, name, created_by) values
  ('f6666666-6666-6666-6666-666666666666','e5555555-5555-5555-5555-555555555555','Board Co','a1111111-1111-1111-1111-111111111111');

insert into public.board_members (board_id, user_id, role) values
  ('f6666666-6666-6666-6666-666666666666','a1111111-1111-1111-1111-111111111111','manager'),
  ('f6666666-6666-6666-6666-666666666666','d4444444-4444-4444-4444-444444444444','viewer');

-- org admin ve perfil do convidado board-only no mesmo projeto
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','a1111111-1111-1111-1111-111111111111','role','authenticated')::text, true);

select is(
  (select full_name from public.profiles where id = 'd4444444-4444-4444-4444-444444444444'),
  'Guest Board Only',
  'org admin ve full_name de membro board-only no mesmo board'
);

-- guest board-only ve perfil do admin no mesmo projeto
select set_config('request.jwt.claims', json_build_object('sub','d4444444-4444-4444-4444-444444444444','role','authenticated')::text, true);

select is(
  (select full_name from public.profiles where id = 'a1111111-1111-1111-1111-111111111111'),
  'Admin Co',
  'membro board-only ve full_name do colega no mesmo board'
);

reset role;
select * from finish();
rollback;
