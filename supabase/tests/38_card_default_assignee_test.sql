-- pgTAP: card insert defaults assignee to created_by
begin;
create extension if not exists pgtap;
select plan(1);

insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at, raw_app_meta_data, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000000','d1111111-1111-1111-1111-111111111111','authenticated','authenticated','creator@test.dev', now(), now(), '{}'::jsonb, '{}'::jsonb);

insert into public.profiles (id, full_name) values
  ('d1111111-1111-1111-1111-111111111111','Creator')
on conflict (id) do nothing;

insert into public.organizations (id, name, slug) values
  ('d3333333-3333-3333-3333-333333333333','Org Assignee','org-assignee');

insert into public.memberships (org_id, user_id, role) values
  ('d3333333-3333-3333-3333-333333333333','d1111111-1111-1111-1111-111111111111','owner');

insert into public.boards (id, org_id, name, created_by) values
  ('d4444444-4444-4444-4444-444444444444','d3333333-3333-3333-3333-333333333333','Board','d1111111-1111-1111-1111-111111111111');

insert into public.board_members (board_id, user_id, role) values
  ('d4444444-4444-4444-4444-444444444444','d1111111-1111-1111-1111-111111111111','manager');

insert into public.columns (id, board_id, org_id, name, position) values
  ('d5555555-5555-5555-5555-555555555555','d4444444-4444-4444-4444-444444444444','d3333333-3333-3333-3333-333333333333','Todo','a');

insert into public.cards (id, org_id, board_id, column_id, title, position, created_by) values
  ('d6666666-6666-6666-6666-666666666666','d3333333-3333-3333-3333-333333333333','d4444444-4444-4444-4444-444444444444','d5555555-5555-5555-5555-555555555555','Auto Assign','a','d1111111-1111-1111-1111-111111111111');

select is(
  (select assignee_id::text from public.cards where id = 'd6666666-6666-6666-6666-666666666666'),
  'd1111111-1111-1111-1111-111111111111',
  'insert without assignee defaults to created_by'
);

select * from finish();
rollback;
