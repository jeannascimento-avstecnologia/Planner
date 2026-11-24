-- pgTAP: duplicate_board (criador only, grafo remapeado, sem secrets)
begin;
create extension if not exists pgtap;
select plan(16);

insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at, raw_app_meta_data, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000000','f1111111-1111-1111-1111-111111111111','authenticated','authenticated','dup-a@test.dev', now(), now(), '{}'::jsonb, '{"full_name":"Dup A"}'::jsonb),
  ('00000000-0000-0000-0000-000000000000','f2222222-2222-2222-2222-222222222222','authenticated','authenticated','dup-b@test.dev', now(), now(), '{}'::jsonb, '{"full_name":"Dup B"}'::jsonb),
  ('00000000-0000-0000-0000-000000000000','f3333333-3333-3333-3333-333333333333','authenticated','authenticated','dup-c@test.dev', now(), now(), '{}'::jsonb, '{"full_name":"Dup C"}'::jsonb);

insert into public.profiles (id, full_name) values
  ('f1111111-1111-1111-1111-111111111111','Dup A'),
  ('f2222222-2222-2222-2222-222222222222','Dup B'),
  ('f3333333-3333-3333-3333-333333333333','Dup C')
on conflict (id) do nothing;

insert into public.organizations (id, name, slug) values
  ('fa111111-1111-1111-1111-111111111111','Org Dup','org-dup');

insert into public.memberships (org_id, user_id, role) values
  ('fa111111-1111-1111-1111-111111111111','f1111111-1111-1111-1111-111111111111','admin'),
  ('fa111111-1111-1111-1111-111111111111','f2222222-2222-2222-2222-222222222222','admin'),
  ('fa111111-1111-1111-1111-111111111111','f3333333-3333-3333-3333-333333333333','viewer');

insert into public.boards (id, org_id, name, created_by, tiflux_enabled, integrations) values
  (
    'fb111111-1111-1111-1111-111111111111',
    'fa111111-1111-1111-1111-111111111111',
    'Board Dup Src',
    'f1111111-1111-1111-1111-111111111111',
    true,
    '{"tiflux":{"configured":true}}'::jsonb
  );

insert into public.board_members (board_id, user_id, role) values
  ('fb111111-1111-1111-1111-111111111111','f1111111-1111-1111-1111-111111111111','admin'),
  ('fb111111-1111-1111-1111-111111111111','f2222222-2222-2222-2222-222222222222','admin'),
  ('fb111111-1111-1111-1111-111111111111','f3333333-3333-3333-3333-333333333333','viewer');

insert into public.cards (id, board_id, column_id, org_id, title, position, priority, created_by, tiflux_ticket_id) values
  (
    'fc111111-1111-1111-1111-111111111111',
    'fb111111-1111-1111-1111-111111111111',
    (select id from public.columns where board_id = 'fb111111-1111-1111-1111-111111111111' and name = 'To Start' limit 1),
    'fa111111-1111-1111-1111-111111111111',
    'Parent Dup',
    'a0',
    'high',
    'f1111111-1111-1111-1111-111111111111',
    'TIF-99'
  );

insert into public.cards (id, board_id, column_id, org_id, parent_id, title, position, priority, created_by) values
  (
    'fc222222-2222-2222-2222-222222222222',
    'fb111111-1111-1111-1111-111111111111',
    (select id from public.columns where board_id = 'fb111111-1111-1111-1111-111111111111' and name = 'To Start' limit 1),
    'fa111111-1111-1111-1111-111111111111',
    'fc111111-1111-1111-1111-111111111111',
    'Child Dup',
    'a1',
    'medium',
    'f1111111-1111-1111-1111-111111111111'
  );

insert into public.card_comments (org_id, board_id, card_id, author_id, content) values
  (
    'fa111111-1111-1111-1111-111111111111',
    'fb111111-1111-1111-1111-111111111111',
    'fc111111-1111-1111-1111-111111111111',
    'f1111111-1111-1111-1111-111111111111',
    'Comentario origem'
  );

insert into public.card_attachments (org_id, board_id, card_id, kind, url, label, created_by) values
  (
    'fa111111-1111-1111-1111-111111111111',
    'fb111111-1111-1111-1111-111111111111',
    'fc111111-1111-1111-1111-111111111111',
    'url',
    'https://example.com/file.pdf',
    'spec',
    'f1111111-1111-1111-1111-111111111111'
  );

insert into public.card_checklist_items (org_id, board_id, card_id, title, done, position) values
  (
    'fa111111-1111-1111-1111-111111111111',
    'fb111111-1111-1111-1111-111111111111',
    'fc111111-1111-1111-1111-111111111111',
    'Item checklist',
    false,
    'a0'
  );

insert into public.automation_rules (org_id, board_id, name, trigger_event, conditions, actions, active)
select
  'fa111111-1111-1111-1111-111111111111',
  'fb111111-1111-1111-1111-111111111111',
  'Regra Dup',
  'card_moved',
  jsonb_build_object('column_id', c.id),
  '[{"type":"set_priority","value":"urgent"}]'::jsonb,
  true
from public.columns c
where c.board_id = 'fb111111-1111-1111-1111-111111111111' and c.name = 'Done'
limit 1;

insert into public.board_whiteboards (board_id, org_id, snapshot) values
  (
    'fb111111-1111-1111-1111-111111111111',
    'fa111111-1111-1111-1111-111111111111',
    jsonb_build_object('cardId', 'fc111111-1111-1111-1111-111111111111')
  );

insert into public.board_integration_secrets (board_id, org_id, tiflux_api_token_encrypted)
values (
  'fb111111-1111-1111-1111-111111111111',
  'fa111111-1111-1111-1111-111111111111',
  '\x00'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub','f2222222-2222-2222-2222-222222222222','role','authenticated')::text,
  true
);

select throws_ok(
  $$select public.duplicate_board('fb111111-1111-1111-1111-111111111111')$$,
  'P0001',
  'forbidden',
  'org admin nao-criador nao duplica'
);

select set_config(
  'request.jwt.claims',
  json_build_object('sub','f1111111-1111-1111-1111-111111111111','role','authenticated')::text,
  true
);

create temp table dup_out as
  select * from public.duplicate_board('fb111111-1111-1111-1111-111111111111');

reset role;

select is((select count(*)::int from dup_out), 1, 'criador recebe board novo');
select isnt((select id from dup_out), 'fb111111-1111-1111-1111-111111111111'::uuid, 'id do clone e novo');
select is((select org_id from dup_out), 'fa111111-1111-1111-1111-111111111111'::uuid, 'mesma org');
select is((select name from dup_out), 'Board Dup Src (cópia)', 'nome com sufixo copia');
select is((select tiflux_enabled from dup_out), false, 'tiflux desligado no clone');
select is((select integrations from dup_out), '{}'::jsonb, 'integrations vazio');

select is(
  (select count(*)::int from public.board_members where board_id = (select id from dup_out)),
  1,
  'somente criador no clone'
);

select is(
  (select user_id from public.board_members where board_id = (select id from dup_out)),
  'f1111111-1111-1111-1111-111111111111'::uuid,
  'membro do clone e o criador'
);

select is(
  (select count(*)::int from public.cards where board_id = (select id from dup_out)),
  2,
  'cards copiados'
);

select is(
  (
    select ch.parent_id = p.id
    from public.cards ch
    join public.cards p on p.board_id = ch.board_id and p.title = 'Parent Dup'
    where ch.board_id = (select id from dup_out) and ch.title = 'Child Dup'
  ),
  true,
  'parent_id remapeado'
);

select is(
  (select tiflux_ticket_id from public.cards where board_id = (select id from dup_out) and title = 'Parent Dup'),
  null,
  'tiflux zerado no card'
);

select is(
  (select count(*)::int from public.card_comments where board_id = (select id from dup_out)),
  1,
  'comentario copiado'
);

select is(
  (select count(*)::int from public.automation_rules where board_id = (select id from dup_out)),
  1,
  'automacao copiada'
);

select is(
  (
    select ar.conditions->>'column_id'
    from public.automation_rules ar
    where ar.board_id = (select id from dup_out)
  ),
  (
    select c.id::text
    from public.columns c
    where c.board_id = (select id from dup_out) and c.name = 'Done'
    limit 1
  ),
  'UUID de coluna remapeado na automacao'
);

select is(
  (select count(*)::int from public.board_integration_secrets where board_id = (select id from dup_out)),
  0,
  'secret Tiflux nao copiado'
);

select * from finish();
rollback;
