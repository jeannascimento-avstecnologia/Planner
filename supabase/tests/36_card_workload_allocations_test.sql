-- pgTAP: card workload allocations (E.2)
begin;
create extension if not exists pgtap;
select plan(5);

insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at, raw_app_meta_data, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000000','a1111111-1111-1111-1111-111111111111','authenticated','authenticated','assignee@test.dev', now(), now(), '{}'::jsonb, '{}'::jsonb),
  ('00000000-0000-0000-0000-000000000000','a2222222-2222-2222-2222-222222222222','authenticated','authenticated','other@test.dev', now(), now(), '{}'::jsonb, '{}'::jsonb);

insert into public.profiles (id, full_name) values
  ('a1111111-1111-1111-1111-111111111111','Assignee'),
  ('a2222222-2222-2222-2222-222222222222','Other');

insert into public.organizations (id, name, slug) values
  ('a3333333-3333-3333-3333-333333333333','Org Plan','org-plan');

insert into public.memberships (org_id, user_id, role) values
  ('a3333333-3333-3333-3333-333333333333','a1111111-1111-1111-1111-111111111111','manager'),
  ('a3333333-3333-3333-3333-333333333333','a2222222-2222-2222-2222-222222222222','viewer');

insert into public.boards (id, org_id, name, created_by) values
  ('a4444444-4444-4444-4444-444444444444','a3333333-3333-3333-3333-333333333333','Board','a1111111-1111-1111-1111-111111111111');

insert into public.board_members (board_id, user_id, role) values
  ('a4444444-4444-4444-4444-444444444444','a1111111-1111-1111-1111-111111111111','manager'),
  ('a4444444-4444-4444-4444-444444444444','a2222222-2222-2222-2222-222222222222','viewer');

insert into public.columns (id, board_id, org_id, name, position) values
  ('a5555555-5555-5555-5555-555555555555','a4444444-4444-4444-4444-444444444444','a3333333-3333-3333-3333-333333333333','Todo','a');

insert into public.cards (id, org_id, board_id, column_id, title, assignee_id, position) values
  ('a6666666-6666-6666-6666-666666666666','a3333333-3333-3333-3333-333333333333','a4444444-4444-4444-4444-444444444444','a5555555-5555-5555-5555-555555555555','Task A','a1111111-1111-1111-1111-111111111111','a');

set local role authenticated;

select set_config('request.jwt.claims', json_build_object('sub','a1111111-1111-1111-1111-111111111111','role','authenticated')::text, true);

select lives_ok(
  $$select public.upsert_card_allocation('a6666666-6666-6666-6666-666666666666', current_date + 1, 4)$$,
  'assignee can upsert allocation'
);

select is(
  (select estimated_hours from public.cards where id = 'a6666666-6666-6666-6666-666666666666'),
  4::numeric,
  'rollup updates estimated_hours'
);

select set_config('request.jwt.claims', json_build_object('sub','a2222222-2222-2222-2222-222222222222','role','authenticated')::text, true);

select throws_ok(
  $$select public.upsert_card_allocation('a6666666-6666-6666-6666-666666666666', current_date + 2, 2)$$,
  '42501',
  'forbidden',
  'non-assignee cannot write allocation'
);

select has_table('public', 'card_workload_allocations', 'allocations table exists');
select has_table('public', 'org_teams_integrations', 'teams integration table exists');

select * from finish();
rollback;
