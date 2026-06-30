-- pgTAP: stages seed + RLS
begin;
create extension if not exists pgtap;
select plan(2);

insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at, raw_app_meta_data, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000000','s1111111-1111-1111-1111-111111111111','authenticated','authenticated','sa@test.dev', now(), now(), '{}'::jsonb, '{}'::jsonb),
  ('00000000-0000-0000-0000-000000000000','s2222222-2222-2222-2222-222222222222','authenticated','authenticated','sm@test.dev', now(), now(), '{}'::jsonb, '{}'::jsonb);

insert into public.organizations (id, name, slug) values
  ('s3333333-3333-3333-3333-333333333333','Org S','org-s');

insert into public.memberships (org_id, user_id, role) values
  ('s3333333-3333-3333-3333-333333333333','s1111111-1111-1111-1111-111111111111','admin'),
  ('s3333333-3333-3333-3333-333333333333','s2222222-2222-2222-2222-222222222222','member');

insert into public.boards (id, org_id, name) values
  ('s4444444-4444-4444-4444-444444444444','s3333333-3333-3333-3333-333333333333','Board S');

insert into public.board_members (board_id, user_id, role) values
  ('s4444444-4444-4444-4444-444444444444','s1111111-1111-1111-1111-111111111111','admin'),
  ('s4444444-4444-4444-4444-444444444444','s2222222-2222-2222-2222-222222222222','viewer');

insert into public.columns (id, board_id, org_id, name, position) values
  ('s5555555-5555-5555-5555-555555555555','s4444444-4444-4444-4444-444444444444','s3333333-3333-3333-3333-333333333333','Todo','a');

insert into public.cards (id, board_id, column_id, org_id, title, position) values
  ('s6666666-6666-6666-6666-666666666666','s4444444-4444-4444-4444-444444444444','s5555555-5555-5555-5555-555555555555','s3333333-3333-3333-3333-333333333333','Card S','a');

-- 4 default stages exist
select is(
  (select count(*)::int from public.stages where board_id = 's4444444-4444-4444-4444-444444444444'),
  4,
  'board tem 4 estagios default'
);

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','s2222222-2222-2222-2222-222222222222','role','authenticated')::text, true);

select is(
  (select count(*)::int from public.stages where board_id = 's4444444-4444-4444-4444-444444444444'),
  4,
  'member pode ler estagios do board'
);

select * from finish();
rollback;
