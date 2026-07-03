-- pgTAP: departamentos — isolamento estrito, geral visivel a todos, RBAC membros
begin;
create extension if not exists pgtap;
select plan(10);

insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at, raw_app_meta_data, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000000','a1111111-1111-1111-1111-111111111111','authenticated','authenticated','owner-dept@test.dev', now(), now(), '{}'::jsonb, '{}'::jsonb),
  ('00000000-0000-0000-0000-000000000000','b2222222-2222-2222-2222-222222222222','authenticated','authenticated','rh-viewer@test.dev', now(), now(), '{}'::jsonb, '{}'::jsonb),
  ('00000000-0000-0000-0000-000000000000','c3333333-3333-3333-3333-333333333333','authenticated','authenticated','infra-viewer@test.dev', now(), now(), '{}'::jsonb, '{}'::jsonb);

insert into public.organizations (id, name, slug) values
  ('e6666666-6666-6666-6666-666666666666','Org Dept','org-dept');

insert into public.memberships (org_id, user_id, role) values
  ('e6666666-6666-6666-6666-666666666666','a1111111-1111-1111-1111-111111111111','owner'),
  ('e6666666-6666-6666-6666-666666666666','b2222222-2222-2222-2222-222222222222','viewer'),
  ('e6666666-6666-6666-6666-666666666666','c3333333-3333-3333-3333-333333333333','viewer');

insert into public.departments (id, org_id, name, created_by) values
  ('d1111111-1111-1111-1111-111111111111','e6666666-6666-6666-6666-666666666666','RH','a1111111-1111-1111-1111-111111111111'),
  ('d2222222-2222-2222-2222-222222222222','e6666666-6666-6666-6666-666666666666','Infra','a1111111-1111-1111-1111-111111111111');

insert into public.department_members (department_id, org_id, user_id, role) values
  ('d1111111-1111-1111-1111-111111111111','e6666666-6666-6666-6666-666666666666','b2222222-2222-2222-2222-222222222222','viewer'),
  ('d2222222-2222-2222-2222-222222222222','e6666666-6666-6666-6666-666666666666','c3333333-3333-3333-3333-333333333333','viewer');

insert into public.boards (id, org_id, name, department_id, created_by) values
  ('b1111111-1111-1111-1111-111111111111','e6666666-6666-6666-6666-666666666666','Board RH','d1111111-1111-1111-1111-111111111111','a1111111-1111-1111-1111-111111111111'),
  ('b2222222-2222-2222-2222-222222222222','e6666666-6666-6666-6666-666666666666','Board Infra','d2222222-2222-2222-2222-222222222222','a1111111-1111-1111-1111-111111111111'),
  ('b3333333-3333-3333-3333-333333333333','e6666666-6666-6666-6666-666666666666','Board Geral',null,'a1111111-1111-1111-1111-111111111111');

-- RH viewer ve board RH e Geral, nao Infra
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','b2222222-2222-2222-2222-222222222222','role','authenticated')::text, true);
select is(
  (select count(*)::int from public.boards where org_id = 'e6666666-6666-6666-6666-666666666666'),
  2,
  'RH viewer ve RH + Geral'
);

-- Infra viewer ve board Infra e Geral, nao RH
select set_config('request.jwt.claims', json_build_object('sub','c3333333-3333-3333-3333-333333333333','role','authenticated')::text, true);
select is(
  (select count(*)::int from public.boards where org_id = 'e6666666-6666-6666-6666-666666666666'),
  2,
  'Infra viewer ve Infra + Geral'
);

-- owner ve todos
select set_config('request.jwt.claims', json_build_object('sub','a1111111-1111-1111-1111-111111111111','role','authenticated')::text, true);
select is(
  (select count(*)::int from public.boards where org_id = 'e6666666-6666-6666-6666-666666666666'),
  3,
  'owner ve todos os boards'
);

-- viewer org nao cria departamento
select set_config('request.jwt.claims', json_build_object('sub','b2222222-2222-2222-2222-222222222222','role','authenticated')::text, true);
select throws_ok(
  $$select public.create_department('e6666666-6666-6666-6666-666666666666', 'Novo')$$,
  'P0001',
  'forbidden',
  'viewer nao cria departamento'
);

-- owner cria departamento
select set_config('request.jwt.claims', json_build_object('sub','a1111111-1111-1111-1111-111111111111','role','authenticated')::text, true);
select lives_ok(
  $$select public.create_department('e6666666-6666-6666-6666-666666666666', 'Financeiro')$$,
  'owner cria departamento'
);

-- gerente dept nao altera proprio papel
insert into public.department_members (department_id, org_id, user_id, role)
values ('d1111111-1111-1111-1111-111111111111','e6666666-6666-6666-6666-666666666666','a1111111-1111-1111-1111-111111111111','manager')
on conflict (department_id, user_id) do update set role = 'manager';

select set_config('request.jwt.claims', json_build_object('sub','a1111111-1111-1111-1111-111111111111','role','authenticated')::text, true);
select throws_ok(
  $$select public.set_department_member_role('d1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 'admin')$$,
  'P0001',
  'cannot_change_own_role',
  'bloqueia auto-escalonamento dept'
);

-- viewer dept nao gerencia membros
select set_config('request.jwt.claims', json_build_object('sub','b2222222-2222-2222-2222-222222222222','role','authenticated')::text, true);
select throws_ok(
  $$select public.add_department_member('d1111111-1111-1111-1111-111111111111', 'c3333333-3333-3333-3333-333333333333', 'viewer')$$,
  'P0001',
  'forbidden',
  'viewer dept nao adiciona membro'
);

-- can_access_board helpers
select set_config('request.jwt.claims', json_build_object('sub','b2222222-2222-2222-2222-222222222222','role','authenticated')::text, true);
select ok(app.can_access_board('b1111111-1111-1111-1111-111111111111'), 'RH viewer acessa board RH');
select ok(not app.can_access_board('b2222222-2222-2222-2222-222222222222'), 'RH viewer nao acessa Infra');
select ok(app.can_access_board('b3333333-3333-3333-3333-333333333333'), 'RH viewer acessa Geral');

select * from finish();
rollback;
