-- pgTAP: authenticated role can SELECT card_workload_allocations (PostgREST path)
begin;
create extension if not exists pgtap;
select plan(2);

insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at, raw_app_meta_data, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000000','c1111111-1111-1111-1111-111111111111','authenticated','authenticated','mgr-grants@test.dev', now(), now(), '{}'::jsonb, '{}'::jsonb);

insert into public.profiles (id, full_name) values
  ('c1111111-1111-1111-1111-111111111111','Manager Grants')
on conflict (id) do nothing;

insert into public.organizations (id, name, slug) values
  ('c3333333-3333-3333-3333-333333333333','Org Grants','org-grants-test');

insert into public.memberships (org_id, user_id, role) values
  ('c3333333-3333-3333-3333-333333333333','c1111111-1111-1111-1111-111111111111','owner');

insert into public.boards (id, org_id, name, created_by) values
  ('c4444444-4444-4444-4444-444444444444','c3333333-3333-3333-3333-333333333333','Board','c1111111-1111-1111-1111-111111111111');

insert into public.board_members (board_id, user_id, role) values
  ('c4444444-4444-4444-4444-444444444444','c1111111-1111-1111-1111-111111111111','manager');

insert into public.columns (id, board_id, org_id, name, position) values
  ('c5555555-5555-5555-5555-555555555555','c4444444-4444-4444-4444-444444444444','c3333333-3333-3333-3333-333333333333','Todo','a');

insert into public.cards (id, org_id, board_id, column_id, title, assignee_id, position) values
  ('c6666666-6666-6666-6666-666666666666','c3333333-3333-3333-3333-333333333333','c4444444-4444-4444-4444-444444444444','c5555555-5555-5555-5555-555555555555','Task Grants','c1111111-1111-1111-1111-111111111111','a');

insert into public.card_workload_allocations (org_id, card_id, user_id, work_date, hours) values
  ('c3333333-3333-3333-3333-333333333333','c6666666-6666-6666-6666-666666666666','c1111111-1111-1111-1111-111111111111', current_date + 1, 3);

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','c1111111-1111-1111-1111-111111111111','role','authenticated')::text, true);

select results_eq(
  $$select count(*)::int from public.card_workload_allocations where org_id = 'c3333333-3333-3333-3333-333333333333'$$,
  ARRAY[1],
  'owner can select allocations via table grant + RLS'
);

select results_eq(
  $$select hours::numeric from public.card_workload_allocations where card_id = 'c6666666-6666-6666-6666-666666666666'$$,
  ARRAY[3::numeric],
  'selected hours match seed row'
);

select * from finish();
rollback;
