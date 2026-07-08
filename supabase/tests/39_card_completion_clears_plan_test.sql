-- pgTAP: estagio concluido remove card do plano pessoal + alocacoes
begin;
create extension if not exists pgtap;
select plan(3);

insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at, raw_app_meta_data, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000000','39111111-1111-1111-1111-111111111111','authenticated','authenticated','plan-done@test.dev', now(), now(), '{}'::jsonb, '{}'::jsonb);

insert into public.profiles (id, full_name) values
  ('39111111-1111-1111-1111-111111111111','Planner')
on conflict (id) do nothing;

insert into public.organizations (id, name, slug) values
  ('39333333-3333-3333-3333-333333333333','Org Plan Done','org-plan-done');

insert into public.memberships (org_id, user_id, role) values
  ('39333333-3333-3333-3333-333333333333','39111111-1111-1111-1111-111111111111','owner');

insert into public.boards (id, org_id, name, created_by) values
  ('39444444-4444-4444-4444-444444444444','39333333-3333-3333-3333-333333333333','Board','39111111-1111-1111-1111-111111111111');

insert into public.board_members (board_id, user_id, role) values
  ('39444444-4444-4444-4444-444444444444','39111111-1111-1111-1111-111111111111','manager');

insert into public.columns (id, board_id, org_id, name, position) values
  ('39555555-5555-5555-5555-555555555555','39444444-4444-4444-4444-444444444444','39333333-3333-3333-3333-333333333333','Todo','a');

insert into public.cards (id, org_id, board_id, column_id, title, position, assignee_id, personal_plan_at) values
  ('39666666-6666-6666-6666-666666666666','39333333-3333-3333-3333-333333333333','39444444-4444-4444-4444-444444444444','39555555-5555-5555-5555-555555555555','Card Plan','a','39111111-1111-1111-1111-111111111111', now());

insert into public.card_workload_allocations (org_id, card_id, user_id, work_date, hours) values
  ('39333333-3333-3333-3333-333333333333','39666666-6666-6666-6666-666666666666','39111111-1111-1111-1111-111111111111','2026-07-07',4);

update public.cards
set stage_id = (select id from public.stages where board_id = '39444444-4444-4444-4444-444444444444' and system_key = 'concluido')
where id = '39666666-6666-6666-6666-666666666666';

select isnt(
  (select completed_at from public.cards where id = '39666666-6666-6666-6666-666666666666'),
  null,
  'concluido seta completed_at'
);

select is(
  (select personal_plan_at from public.cards where id = '39666666-6666-6666-6666-666666666666'),
  null,
  'concluido limpa personal_plan_at'
);

select is(
  (select count(*)::int from public.card_workload_allocations where card_id = '39666666-6666-6666-6666-666666666666'),
  0,
  'concluido remove alocacoes'
);

select * from finish();
rollback;
