-- pgTAP: automation_rules RLS + motor trigger + limite de profundidade
begin;
create extension if not exists pgtap;
select plan(5);

insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at, raw_app_meta_data, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000000','e1111111-1111-1111-1111-111111111111','authenticated','authenticated','auto-admin@test.dev', now(), now(), '{}'::jsonb, '{}'::jsonb),
  ('00000000-0000-0000-0000-000000000000','e2222222-2222-2222-2222-222222222222','authenticated','authenticated','auto-view@test.dev', now(), now(), '{}'::jsonb, '{}'::jsonb);

insert into public.organizations (id, name, slug) values
  ('e3333333-3333-3333-3333-333333333333','Org Auto','org-auto');

insert into public.profiles (id, full_name) values
  ('e1111111-1111-1111-1111-111111111111','Auto Admin'),
  ('e2222222-2222-2222-2222-222222222222','Auto View')
on conflict (id) do nothing;

insert into public.memberships (org_id, user_id, role) values
  ('e3333333-3333-3333-3333-333333333333','e1111111-1111-1111-1111-111111111111','viewer'),
  ('e3333333-3333-3333-3333-333333333333','e2222222-2222-2222-2222-222222222222','viewer');

insert into public.boards (id, org_id, name, created_by) values
  ('e4444444-4444-4444-4444-444444444444','e3333333-3333-3333-3333-333333333333','Board Auto','e1111111-1111-1111-1111-111111111111');

insert into public.board_members (board_id, user_id, role) values
  ('e4444444-4444-4444-4444-444444444444','e1111111-1111-1111-1111-111111111111','admin'),
  ('e4444444-4444-4444-4444-444444444444','e2222222-2222-2222-2222-222222222222','viewer');

insert into public.cards (id, board_id, column_id, org_id, title, position, priority, created_by) values
  (
    'e6666666-6666-6666-6666-666666666666',
    'e4444444-4444-4444-4444-444444444444',
    (select id from public.columns where board_id = 'e4444444-4444-4444-4444-444444444444' and name = 'To Start' limit 1),
    'e3333333-3333-3333-3333-333333333333',
    'Card Auto',
    'm0',
    'medium',
    'e1111111-1111-1111-1111-111111111111'
  );

-- RLS: viewer nao cria regra
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','e2222222-2222-2222-2222-222222222222','role','authenticated')::text, true);

select throws_ok(
  $$ insert into public.automation_rules (org_id, board_id, name, trigger_event, conditions, actions)
     values (
       'e3333333-3333-3333-3333-333333333333',
       'e4444444-4444-4444-4444-444444444444',
       'Hack',
       'card_moved',
       '{}'::jsonb,
       '[{"type":"set_priority","value":"high"}]'::jsonb
     ) $$,
  '42501',
  null,
  'viewer nao insere automation_rules'
);

-- board admin cria regra (Done -> prioridade alta)
select set_config('request.jwt.claims', json_build_object('sub','e1111111-1111-1111-1111-111111111111','role','authenticated')::text, true);

insert into public.automation_rules (org_id, board_id, name, trigger_event, conditions, actions)
select
  'e3333333-3333-3333-3333-333333333333',
  'e4444444-4444-4444-4444-444444444444',
  'Done -> alta',
  'card_moved',
  jsonb_build_object('column_id', c.id),
  '[{"type":"set_priority","value":"high"}]'::jsonb
from public.columns c
where c.board_id = 'e4444444-4444-4444-4444-444444444444' and c.name = 'Done'
limit 1;

select is(
  (select count(*)::int from public.automation_rules where board_id = 'e4444444-4444-4444-4444-444444444444'),
  1,
  'board admin insere automation_rule'
);

-- mover card para Done dispara automacao
update public.cards
set column_id = (
  select id from public.columns
  where board_id = 'e4444444-4444-4444-4444-444444444444' and name = 'Done'
  limit 1
)
where id = 'e6666666-6666-6666-6666-666666666666';

select is(
  (select priority::text from public.cards where id = 'e6666666-6666-6666-6666-666666666666'),
  'high',
  'regra card_moved + coluna Done aplica set_priority high'
);

-- condicao nao bate: mover para To Start nao altera prioridade
update public.cards set priority = 'low' where id = 'e6666666-6666-6666-6666-666666666666';

update public.cards
set column_id = (
  select id from public.columns
  where board_id = 'e4444444-4444-4444-4444-444444444444' and name = 'To Start'
  limit 1
)
where id = 'e6666666-6666-6666-6666-666666666666';

select is(
  (select priority::text from public.cards where id = 'e6666666-6666-6666-6666-666666666666'),
  'low',
  'card_moved para coluna sem condicao nao reaplica acao'
);

-- profundidade >= 3 bloqueia motor
reset role;
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','e1111111-1111-1111-1111-111111111111','role','authenticated')::text, true);
select set_config('app.automation_depth', '3', true);

select throws_ok(
  $$ select public.emit_audit_event(
    'e3333333-3333-3333-3333-333333333333'::uuid,
    'card',
    'card_moved',
    jsonb_build_object(
      'from_column_id', (select id::text from public.columns where board_id = 'e4444444-4444-4444-4444-444444444444' and name = 'To Start' limit 1),
      'to_column_id', (select id::text from public.columns where board_id = 'e4444444-4444-4444-4444-444444444444' and name = 'Done' limit 1)
    ),
    'e4444444-4444-4444-4444-444444444444'::uuid,
    'e6666666-6666-6666-6666-666666666666'::uuid
  ) $$,
  'P0001',
  null,
  'automation_depth >= 3 dispara automation_depth_exceeded'
);

select * from finish();
rollback;
