-- pgTAP: card_events append-only + RLS admin
begin;
create extension if not exists pgtap;
select plan(7);

insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at, raw_app_meta_data, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000000','d1111111-1111-1111-1111-111111111111','authenticated','authenticated','admin@test.dev', now(), now(), '{}'::jsonb, '{}'::jsonb),
  ('00000000-0000-0000-0000-000000000000','d2222222-2222-2222-2222-222222222222','authenticated','authenticated','viewer@test.dev', now(), now(), '{}'::jsonb, '{}'::jsonb);

insert into public.organizations (id, name, slug) values
  ('d3333333-3333-3333-3333-333333333333','Org Events','org-events');

insert into public.profiles (id, full_name) values
  ('d1111111-1111-1111-1111-111111111111','Admin'),
  ('d2222222-2222-2222-2222-222222222222','Viewer')
on conflict (id) do nothing;

insert into public.memberships (org_id, user_id, role) values
  ('d3333333-3333-3333-3333-333333333333','d1111111-1111-1111-1111-111111111111','admin'),
  ('d3333333-3333-3333-3333-333333333333','d2222222-2222-2222-2222-222222222222','viewer');

reset role;
set local role service_role;

select lives_ok(
  $$ select app.emit_event(
    'd3333333-3333-3333-3333-333333333333'::uuid,
    'org',
    'role_changed',
    '{"target_user_id":"d2222222-2222-2222-2222-222222222222"}'::jsonb,
    null,
    null,
    'd1111111-1111-1111-1111-111111111111'::uuid
  ) $$,
  'service_role emite evento via app.emit_event'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','d1111111-1111-1111-1111-111111111111','role','authenticated')::text, true);

select is(
  (select count(*)::int from public.card_events where org_id = 'd3333333-3333-3333-3333-333333333333' and event_type = 'role_changed'),
  1,
  'admin le eventos da org'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','d2222222-2222-2222-2222-222222222222','role','authenticated')::text, true);

select is(
  (select count(*)::int from public.card_events),
  0,
  'viewer nao le card_events'
);

select throws_ok(
  $$ insert into public.card_events (org_id, event_scope, event_type) values ('d3333333-3333-3333-3333-333333333333','org','hack') $$,
  '42501',
  null,
  'insert direto em card_events bloqueado para authenticated'
);

reset role;
set local role service_role;

select throws_ok(
  $$ update public.card_events set event_type = 'mutated' where org_id = 'd3333333-3333-3333-3333-333333333333' $$,
  'P0001',
  'card_events is append-only',
  'update bloqueado'
);

select throws_ok(
  $$ delete from public.card_events where org_id = 'd3333333-3333-3333-3333-333333333333' $$,
  'P0001',
  'card_events is append-only',
  'delete bloqueado sem purge flag'
);

select ok(
  app.purge_card_events_before(now() + interval '1 day')::int >= 1,
  'purge security definer remove eventos antigos'
);

select * from finish();
rollback;
