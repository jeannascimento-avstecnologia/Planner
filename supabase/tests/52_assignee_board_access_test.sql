-- pgTAP: assignee so com acesso ao board (dept restrito)
begin;
create extension if not exists pgtap;
select plan(4);

insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at, raw_app_meta_data, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000000','aa111111-1111-1111-1111-111111111111','authenticated','authenticated','asg-owner@test.dev', now(), now(), '{}'::jsonb, '{}'::jsonb),
  ('00000000-0000-0000-0000-000000000000','aa222222-2222-2222-2222-222222222222','authenticated','authenticated','asg-dept@test.dev', now(), now(), '{}'::jsonb, '{}'::jsonb),
  ('00000000-0000-0000-0000-000000000000','aa333333-3333-3333-3333-333333333333','authenticated','authenticated','asg-out@test.dev', now(), now(), '{}'::jsonb, '{}'::jsonb);

insert into public.profiles (id, full_name) values
  ('aa111111-1111-1111-1111-111111111111','Owner'),
  ('aa222222-2222-2222-2222-222222222222','Dept'),
  ('aa333333-3333-3333-3333-333333333333','Out')
on conflict (id) do nothing;

insert into public.organizations (id, name, slug) values
  ('ab111111-1111-1111-1111-111111111111','Org Asg','org-asg');

insert into public.memberships (org_id, user_id, role) values
  ('ab111111-1111-1111-1111-111111111111','aa111111-1111-1111-1111-111111111111','owner'),
  ('ab111111-1111-1111-1111-111111111111','aa222222-2222-2222-2222-222222222222','viewer'),
  ('ab111111-1111-1111-1111-111111111111','aa333333-3333-3333-3333-333333333333','viewer');

insert into public.departments (id, org_id, name) values
  ('ad111111-1111-1111-1111-111111111111','ab111111-1111-1111-1111-111111111111','Dept Asg');

insert into public.department_members (department_id, org_id, user_id, role) values
  ('ad111111-1111-1111-1111-111111111111','ab111111-1111-1111-1111-111111111111','aa222222-2222-2222-2222-222222222222','viewer');

insert into public.boards (id, org_id, name, department_id, created_by) values
  (
    'ae111111-1111-1111-1111-111111111111',
    'ab111111-1111-1111-1111-111111111111',
    'Board Dept Asg',
    'ad111111-1111-1111-1111-111111111111',
    'aa111111-1111-1111-1111-111111111111'
  );

insert into public.board_members (board_id, user_id, role) values
  ('ae111111-1111-1111-1111-111111111111','aa111111-1111-1111-1111-111111111111','admin');

insert into public.cards (id, board_id, column_id, org_id, title, position, created_by) values
  (
    'af111111-1111-1111-1111-111111111111',
    'ae111111-1111-1111-1111-111111111111',
    (select id from public.columns where board_id = 'ae111111-1111-1111-1111-111111111111' limit 1),
    'ab111111-1111-1111-1111-111111111111',
    'Card Asg',
    'a0',
    'aa111111-1111-1111-1111-111111111111'
  );

select throws_ok(
  $$update public.cards set assignee_id = 'aa333333-3333-3333-3333-333333333333' where id = 'af111111-1111-1111-1111-111111111111'$$,
  'P0001',
  'assignee_forbidden',
  'org member fora do dept nao e assignee'
);

update public.cards
set assignee_id = 'aa222222-2222-2222-2222-222222222222'
where id = 'af111111-1111-1111-1111-111111111111';

select is(
  (select assignee_id from public.cards where id = 'af111111-1111-1111-1111-111111111111'),
  'aa222222-2222-2222-2222-222222222222'::uuid,
  'membro do dept pode ser assignee'
);

update public.cards set assignee_id = null where id = 'af111111-1111-1111-1111-111111111111';
select is(
  (select assignee_id from public.cards where id = 'af111111-1111-1111-1111-111111111111'),
  null,
  'sem responsavel permitido'
);

-- Geral: qualquer membro da org
insert into public.boards (id, org_id, name, department_id, created_by) values
  (
    'ae222222-2222-2222-2222-222222222222',
    'ab111111-1111-1111-1111-111111111111',
    'Board Geral Asg',
    null,
    'aa111111-1111-1111-1111-111111111111'
  );

insert into public.cards (id, board_id, column_id, org_id, title, position, assignee_id, created_by) values
  (
    'af222222-2222-2222-2222-222222222222',
    'ae222222-2222-2222-2222-222222222222',
    (select id from public.columns where board_id = 'ae222222-2222-2222-2222-222222222222' limit 1),
    'ab111111-1111-1111-1111-111111111111',
    'Card Geral Asg',
    'a0',
    'aa333333-3333-3333-3333-333333333333',
    'aa111111-1111-1111-1111-111111111111'
  );

select is(
  (select assignee_id from public.cards where id = 'af222222-2222-2222-2222-222222222222'),
  'aa333333-3333-3333-3333-333333333333'::uuid,
  'Geral aceita membro da org'
);

select * from finish();
rollback;
