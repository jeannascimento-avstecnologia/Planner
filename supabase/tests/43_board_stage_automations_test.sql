-- pgTAP: stage/column automations + loop guard + overdue tag
begin;
create extension if not exists pgtap;
select plan(8);

insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at, raw_app_meta_data, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000000','f1111111-1111-1111-1111-111111111111','authenticated','authenticated','stage-auto@test.dev', now(), now(), '{}'::jsonb, '{}'::jsonb);

insert into public.organizations (id, name, slug) values
  ('f3333333-3333-3333-3333-333333333333','Org Stage Auto','org-stage-auto');

insert into public.memberships (org_id, user_id, role) values
  ('f3333333-3333-3333-3333-333333333333','f1111111-1111-1111-1111-111111111111','viewer');

insert into public.boards (id, org_id, name, created_by) values
  ('f4444444-4444-4444-4444-444444444444','f3333333-3333-3333-3333-333333333333','Board Stage Auto','f1111111-1111-1111-1111-111111111111');

insert into public.board_members (board_id, user_id, role) values
  ('f4444444-4444-4444-4444-444444444444','f1111111-1111-1111-1111-111111111111','admin');

update public.columns
set default_stage_id = (
  select id from public.stages
  where board_id = 'f4444444-4444-4444-4444-444444444444' and system_key = 'em_andamento'
  limit 1
)
where board_id = 'f4444444-4444-4444-4444-444444444444' and name = 'To Start';

insert into public.cards (id, board_id, column_id, org_id, title, position, priority, created_by) values
  (
    'f6666666-6666-6666-6666-666666666666',
    'f4444444-4444-4444-4444-444444444444',
    (select id from public.columns where board_id = 'f4444444-4444-4444-4444-444444444444' and name = 'To Start' limit 1),
    'f3333333-3333-3333-3333-333333333333',
    'Card Stage Auto',
    'm0',
    'medium',
    'f1111111-1111-1111-1111-111111111111'
  );

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','f1111111-1111-1111-1111-111111111111','role','authenticated')::text, true);

-- card_created + apply_column_default_stage
insert into public.automation_rules (org_id, board_id, name, trigger_event, conditions, actions)
select
  'f3333333-3333-3333-3333-333333333333',
  'f4444444-4444-4444-4444-444444444444',
  'Create -> default stage',
  'card_created',
  '{}'::jsonb,
  '[{"type":"apply_column_default_stage"}]'::jsonb;

insert into public.cards (id, board_id, column_id, org_id, title, position, priority, created_by) values
  (
    'f7777777-7777-7777-7777-777777777777',
    'f4444444-4444-4444-4444-444444444444',
    (select id from public.columns where board_id = 'f4444444-4444-4444-4444-444444444444' and name = 'To Start' limit 1),
    'f3333333-3333-3333-3333-333333333333',
    'Card New',
    'm1',
    'medium',
    'f1111111-1111-1111-1111-111111111111'
  );

select isnt(
  (select stage_id from public.cards where id = 'f7777777-7777-7777-7777-777777777777'),
  null,
  'card_created aplica estagio padrao da coluna'
);

-- card_moved -> set_stage (sem loop com stage_changed -> move_card)
insert into public.automation_rules (org_id, board_id, name, trigger_event, conditions, actions)
select
  'f3333333-3333-3333-3333-333333333333',
  'f4444444-4444-4444-4444-444444444444',
  'Done -> concluido',
  'card_moved',
  jsonb_build_object('column_id', c.id),
  jsonb_build_array(jsonb_build_object('type', 'set_stage', 'stage_id', s.id))
from public.columns c
cross join public.stages s
where c.board_id = 'f4444444-4444-4444-4444-444444444444' and c.name = 'Done'
  and s.board_id = 'f4444444-4444-4444-4444-444444444444' and s.system_key = 'concluido'
limit 1;

update public.cards
set column_id = (
  select id from public.columns
  where board_id = 'f4444444-4444-4444-4444-444444444444' and name = 'Done'
  limit 1
)
where id = 'f6666666-6666-6666-6666-666666666666';

select is(
  (select system_key from public.stages s join public.cards c on c.stage_id = s.id where c.id = 'f6666666-6666-6666-6666-666666666666'),
  'concluido',
  'card_moved para Done aplica set_stage concluido'
);

-- stage_changed -> move_card (regra inversa existente)
insert into public.automation_rules (org_id, board_id, name, trigger_event, conditions, actions)
select
  'f3333333-3333-3333-3333-333333333333',
  'f4444444-4444-4444-4444-444444444444',
  'Concluido -> Done col',
  'stage_changed',
  jsonb_build_object('stage_id', s.id),
  jsonb_build_array(jsonb_build_object('type', 'move_card', 'target_column_id', c.id))
from public.stages s
cross join public.columns c
where s.board_id = 'f4444444-4444-4444-4444-444444444444' and s.system_key = 'concluido'
  and c.board_id = 'f4444444-4444-4444-4444-444444444444' and c.name = 'Done'
limit 1;

-- Mudanca manual de stage nao deve loopar com card_moved (triggered_by_automation)
update public.cards
set stage_id = (select id from public.stages where board_id = 'f4444444-4444-4444-4444-444444444444' and system_key = 'em_andamento' limit 1),
    column_id = (select id from public.columns where board_id = 'f4444444-4444-4444-4444-444444444444' and name = 'To Start' limit 1)
where id = 'f6666666-6666-6666-6666-666666666666';

update public.cards
set stage_id = (select id from public.stages where board_id = 'f4444444-4444-4444-4444-444444444444' and system_key = 'concluido' limit 1)
where id = 'f6666666-6666-6666-6666-666666666666';

select is(
  (select c.name from public.columns c join public.cards ca on ca.column_id = c.id where ca.id = 'f6666666-6666-6666-6666-666666666666'),
  'Done',
  'stage_changed manual move_card uma vez'
);

-- overdue tag
insert into public.automation_rules (org_id, board_id, name, trigger_event, conditions, actions) values
  (
    'f3333333-3333-3333-3333-333333333333',
    'f4444444-4444-4444-4444-444444444444',
    'Overdue tag',
    'due_overdue',
    '{}'::jsonb,
    '[{"type":"add_tag","tag_name":"Atrasado"}]'::jsonb
  );

update public.cards
set due_date = (current_date - 1)::timestamptz,
    completed_at = null,
    stage_id = (select id from public.stages where board_id = 'f4444444-4444-4444-4444-444444444444' and system_key = 'em_andamento' limit 1)
where id = 'f6666666-6666-6666-6666-666666666666';

select is(
  public.sync_board_overdue_automations('f4444444-4444-4444-4444-444444444444') >= 1,
  true,
  'sync_board_overdue_automations processa cards vencidos'
);

select ok(
  exists(
    select 1
    from public.card_tags ct
    join public.tags t on t.id = ct.tag_id
    where ct.card_id = 'f6666666-6666-6666-6666-666666666666'
      and t.name = 'Atrasado'
  ),
  'due_overdue adiciona marcador Atrasado'
);

-- eventos de automacao carregam triggered_by_automation
select ok(
  exists(
    select 1 from public.card_events
    where card_id = 'f6666666-6666-6666-6666-666666666666'
      and coalesce(payload->>'triggered_by_automation', 'false') = 'true'
  ),
  'eventos de automacao marcam triggered_by_automation'
);

select * from finish();
rollback;
