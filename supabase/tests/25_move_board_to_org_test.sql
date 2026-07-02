-- pgTAP: move_board_to_org
begin;
create extension if not exists pgtap;
select plan(4);

insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at, raw_app_meta_data, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000000','a1111111-1111-1111-1111-111111111111','authenticated','authenticated','owner-a@test.dev', now(), now(), '{}'::jsonb, '{}'::jsonb),
  ('00000000-0000-0000-0000-000000000000','b2222222-2222-2222-2222-222222222222','authenticated','authenticated','owner-b@test.dev', now(), now(), '{}'::jsonb, '{}'::jsonb),
  ('00000000-0000-0000-0000-000000000000','c3333333-3333-3333-3333-333333333333','authenticated','authenticated','viewer@test.dev', now(), now(), '{}'::jsonb, '{}'::jsonb);

insert into public.organizations (id, name, slug) values
  ('e5555555-5555-5555-5555-555555555555','Org A','org-a'),
  ('f6666666-6666-6666-6666-666666666666','Org B','org-b');

insert into public.memberships (org_id, user_id, role) values
  ('e5555555-5555-5555-5555-555555555555','a1111111-1111-1111-1111-111111111111','owner'),
  ('f6666666-6666-6666-6666-666666666666','b2222222-2222-2222-2222-222222222222','owner'),
  ('e5555555-5555-5555-5555-555555555555','c3333333-3333-3333-3333-333333333333','viewer');

insert into public.boards (id, org_id, name, created_by) values
  ('d7777777-7777-7777-7777-777777777777','e5555555-5555-5555-5555-555555555555','Board Move','a1111111-1111-1111-1111-111111111111');

insert into public.columns (id, board_id, org_id, name, position) values
  ('c8888888-8888-8888-8888-888888888888','d7777777-7777-7777-7777-777777777777','e5555555-5555-5555-5555-555555555555','To Do','a0');

-- owner A move para org B (owner B existe)
select set_config('request.jwt.claims', json_build_object('sub','a1111111-1111-1111-1111-111111111111','role','authenticated')::text, true);
select set_config('request.jwt.claims', json_build_object('sub','b2222222-2222-2222-2222-222222222222','role','authenticated')::text, true);

-- precisa ser admin em ambas: owner A tem org A, mas nao org B — deve falhar forbidden_target
select set_config('request.jwt.claims', json_build_object('sub','a1111111-1111-1111-1111-111111111111','role','authenticated')::text, true);
select throws_ok(
  $$select public.move_board_to_org('d7777777-7777-7777-7777-777777777777', 'f6666666-6666-6666-6666-666666666666')$$,
  'P0001',
  'forbidden_target',
  'owner A sem admin em org B bloqueado'
);

-- viewer nao move
select set_config('request.jwt.claims', json_build_object('sub','c3333333-3333-3333-3333-333333333333','role','authenticated')::text, true);
select throws_ok(
  $$select public.move_board_to_org('d7777777-7777-7777-7777-777777777777', 'f6666666-6666-6666-6666-666666666666')$$,
  'P0001',
  'forbidden_source',
  'viewer bloqueado na origem'
);

-- owner A tambem admin em org B
insert into public.memberships (org_id, user_id, role) values
  ('f6666666-6666-6666-6666-666666666666','a1111111-1111-1111-1111-111111111111','admin');

select set_config('request.jwt.claims', json_build_object('sub','a1111111-1111-1111-1111-111111111111','role','authenticated')::text, true);
select lives_ok(
  $$select public.move_board_to_org('d7777777-7777-7777-7777-777777777777', 'f6666666-6666-6666-6666-666666666666')$$,
  'move OK com admin em ambas orgs'
);

select is(
  (select org_id from public.boards where id = 'd7777777-7777-7777-7777-777777777777'),
  'f6666666-6666-6666-6666-666666666666'::uuid,
  'board org_id atualizado'
);

select * from finish();
rollback;
