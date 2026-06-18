-- pgTAP: start_date em cards respeita RLS de tenant
begin;
create extension if not exists pgtap;
select plan(2);

insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at, raw_app_meta_data, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000000','f1111111-1111-1111-1111-111111111111','authenticated','authenticated','fa@test.dev', now(), now(), '{}'::jsonb, '{}'::jsonb);

insert into public.organizations (id, name, slug) values
  ('f2222222-2222-2222-2222-222222222222','Org F','org-f');

insert into public.memberships (org_id, user_id, role) values
  ('f2222222-2222-2222-2222-222222222222','f1111111-1111-1111-1111-111111111111','admin');

insert into public.boards (id, org_id, name, created_by) values
  ('f3333333-3333-3333-3333-333333333333','f2222222-2222-2222-2222-222222222222','Board F','f1111111-1111-1111-1111-111111111111');

insert into public.columns (id, board_id, org_id, name, position) values
  ('f4444444-0000-0000-0000-000000000001','f3333333-3333-3333-3333-333333333333','f2222222-2222-2222-2222-222222222222','Todo','a0');

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','f1111111-1111-1111-1111-111111111111','role','authenticated')::text, true);

with ins as (
  insert into public.cards (board_id, column_id, org_id, title, position, start_date, due_date)
  values (
    'f3333333-3333-3333-3333-333333333333',
    'f4444444-0000-0000-0000-000000000001',
    'f2222222-2222-2222-2222-222222222222',
    'Card com datas',
    'm0',
    now(),
    now() + interval '3 days'
  )
  returning id
)
select is((select count(*) from ins)::int, 1, 'admin insere card com start_date');

select is(
  (select count(*) from public.cards where title = 'Card com datas' and start_date is not null)::int,
  1,
  'start_date legivel no tenant'
);

select * from finish();
rollback;
