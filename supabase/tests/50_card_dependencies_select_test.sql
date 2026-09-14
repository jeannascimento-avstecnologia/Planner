-- pgTAP: SELECT card_dependencies para org member, board-only e outsider
begin;
create extension if not exists pgtap;
select plan(3);

insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at, raw_app_meta_data, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000000','d50a0001-1111-1111-1111-111111111111','authenticated','authenticated','d50-admin@test.dev', now(), now(), '{}'::jsonb, '{"full_name":"D50 Admin"}'::jsonb),
  ('00000000-0000-0000-0000-000000000000','d50a0002-2222-2222-2222-222222222222','authenticated','authenticated','d50-guest@test.dev', now(), now(), '{}'::jsonb, '{"full_name":"D50 Guest"}'::jsonb),
  ('00000000-0000-0000-0000-000000000000','d50a0003-3333-3333-3333-333333333333','authenticated','authenticated','d50-out@test.dev', now(), now(), '{}'::jsonb, '{"full_name":"D50 Out"}'::jsonb);

insert into public.organizations (id, name, slug) values
  ('d50b0001-1111-1111-1111-111111111111','Org D50 A','org-d50-a'),
  ('d50b0002-2222-2222-2222-222222222222','Org D50 B','org-d50-b');

insert into public.memberships (org_id, user_id, role) values
  ('d50b0001-1111-1111-1111-111111111111','d50a0001-1111-1111-1111-111111111111','admin'),
  ('d50b0002-2222-2222-2222-222222222222','d50a0003-3333-3333-3333-333333333333','admin');

insert into public.boards (id, org_id, name, created_by) values
  ('d50c0001-1111-1111-1111-111111111111','d50b0001-1111-1111-1111-111111111111','Board D50','d50a0001-1111-1111-1111-111111111111');

insert into public.board_members (board_id, user_id, role) values
  ('d50c0001-1111-1111-1111-111111111111','d50a0001-1111-1111-1111-111111111111','manager'),
  ('d50c0001-1111-1111-1111-111111111111','d50a0002-2222-2222-2222-222222222222','viewer');

insert into public.columns (id, board_id, org_id, name, position) values
  ('d50d0001-1111-1111-1111-111111111111','d50c0001-1111-1111-1111-111111111111','d50b0001-1111-1111-1111-111111111111','Todo','a0');

insert into public.cards (id, board_id, column_id, org_id, title, position) values
  ('d50e0001-1111-1111-1111-111111111111','d50c0001-1111-1111-1111-111111111111','d50d0001-1111-1111-1111-111111111111','d50b0001-1111-1111-1111-111111111111','Blocker','m0'),
  ('d50e0002-2222-2222-2222-222222222222','d50c0001-1111-1111-1111-111111111111','d50d0001-1111-1111-1111-111111111111','d50b0001-1111-1111-1111-111111111111','Blocked','m1');

insert into public.card_dependencies (id, org_id, blocker_card_id, blocked_card_id, type) values
  ('d50f0001-1111-1111-1111-111111111111','d50b0001-1111-1111-1111-111111111111','d50e0001-1111-1111-1111-111111111111','d50e0002-2222-2222-2222-222222222222','finish_to_start');

-- org member
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','d50a0001-1111-1111-1111-111111111111','role','authenticated')::text, true);

select is(
  (select count(*) from public.card_dependencies where id = 'd50f0001-1111-1111-1111-111111111111')::int,
  1,
  'org member le dependencia do board'
);

-- board-only guest
select set_config('request.jwt.claims', json_build_object('sub','d50a0002-2222-2222-2222-222222222222','role','authenticated')::text, true);

select is(
  (select count(*) from public.card_dependencies where id = 'd50f0001-1111-1111-1111-111111111111')::int,
  1,
  'membro board-only le dependencia do board convidado'
);

-- outro tenant
select set_config('request.jwt.claims', json_build_object('sub','d50a0003-3333-3333-3333-333333333333','role','authenticated')::text, true);

select is(
  (select count(*) from public.card_dependencies where id = 'd50f0001-1111-1111-1111-111111111111')::int,
  0,
  'usuario de outro tenant nao le dependencia'
);

reset role;
select * from finish();
rollback;
