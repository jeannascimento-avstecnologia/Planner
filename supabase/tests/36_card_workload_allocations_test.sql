-- pgTAP: card workload allocations (E.2)
begin;
create extension if not exists pgtap;
select plan(5);

insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at, raw_app_meta_data, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000000','36111111-1111-1111-1111-111111111111','authenticated','authenticated','assignee@test.dev', now(), now(), '{}'::jsonb, '{}'::jsonb),
  ('00000000-0000-0000-0000-000000000000','36222222-2222-2222-2222-222222222222','authenticated','authenticated','other@test.dev', now(), now(), '{}'::jsonb, '{}'::jsonb);

insert into public.organizations (id, name, slug) values
  ('36333333-3333-3333-3333-333333333333','Org Plan','org-plan-36');

insert into public.memberships (org_id, user_id, role) values
  ('36333333-3333-3333-3333-333333333333','36111111-1111-1111-1111-111111111111','manager'),
  ('36333333-3333-3333-3333-333333333333','36222222-2222-2222-2222-222222222222','viewer');

insert into public.boards (id, org_id, name, created_by) values
  ('36444444-4444-4444-4444-444444444444','36333333-3333-3333-3333-333333333333','Board','36111111-1111-1111-1111-111111111111');

insert into public.board_members (board_id, user_id, role) values
  ('36444444-4444-4444-4444-444444444444','36111111-1111-1111-1111-111111111111','admin'),
  ('36444444-4444-4444-4444-444444444444','36222222-2222-2222-2222-222222222222','viewer');

insert into public.columns (id, board_id, org_id, name, position) values
  ('36555555-5555-5555-5555-555555555555','36444444-4444-4444-4444-444444444444','36333333-3333-3333-3333-333333333333','Todo','a');

insert into public.cards (id, org_id, board_id, column_id, title, assignee_id, position) values
  ('36666666-6666-6666-6666-666666666666','36333333-3333-3333-3333-333333333333','36444444-4444-4444-4444-444444444444','36555555-5555-5555-5555-555555555555','Task A','36111111-1111-1111-1111-111111111111','a');

set local role authenticated;

select set_config('request.jwt.claims', json_build_object('sub','36111111-1111-1111-1111-111111111111','role','authenticated')::text, true);

select lives_ok(
  $$select public.upsert_card_allocation('36666666-6666-6666-6666-666666666666', current_date + 1, 4)$$,
  'assignee can upsert allocation'
);

select is(
  (select estimated_hours from public.cards where id = '36666666-6666-6666-6666-666666666666'),
  4::numeric,
  'rollup updates estimated_hours'
);

select set_config('request.jwt.claims', json_build_object('sub','36222222-2222-2222-2222-222222222222','role','authenticated')::text, true);

select throws_ok(
  $$select public.upsert_card_allocation('36666666-6666-6666-6666-666666666666', current_date + 2, 2)$$,
  '42501',
  'forbidden',
  'non-assignee cannot write allocation'
);

select has_table('public', 'card_workload_allocations', 'allocations table exists');
select has_table('public', 'org_teams_integrations', 'teams integration table exists');

select * from finish();
rollback;
