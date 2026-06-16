-- pgTAP: isolamento de notificacoes + RBAC de aparencia de board.
begin;
create extension if not exists pgtap;
select plan(3);

-- ---------- setup (superuser) ----------
insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at, raw_app_meta_data, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000000','d1111111-1111-1111-1111-111111111111','authenticated','authenticated','na@test.dev', now(), now(), '{}'::jsonb, '{"full_name":"NA"}'::jsonb),
  ('00000000-0000-0000-0000-000000000000','d2222222-2222-2222-2222-222222222222','authenticated','authenticated','nb@test.dev', now(), now(), '{}'::jsonb, '{"full_name":"NB"}'::jsonb);

insert into public.organizations (id, name, slug) values
  ('e1111111-1111-1111-1111-111111111111','Org N','org-n');

insert into public.memberships (org_id, user_id, role) values
  ('e1111111-1111-1111-1111-111111111111','d1111111-1111-1111-1111-111111111111','admin'),
  ('e1111111-1111-1111-1111-111111111111','d2222222-2222-2222-2222-222222222222','viewer');

insert into public.boards (id, org_id, name, created_by) values
  ('e2222222-2222-2222-2222-222222222222','e1111111-1111-1111-1111-111111111111','Board N','d1111111-1111-1111-1111-111111111111');

insert into public.notifications (org_id, user_id, type, title) values
  ('e1111111-1111-1111-1111-111111111111','d1111111-1111-1111-1111-111111111111','card_created','para A'),
  ('e1111111-1111-1111-1111-111111111111','d2222222-2222-2222-2222-222222222222','card_created','para B');

-- ---------- act as user A ----------
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','d1111111-1111-1111-1111-111111111111','role','authenticated')::text, true);

select is((select count(*) from public.notifications)::int, 1, 'A ve apenas as proprias notificacoes');
select is((select count(*) from public.notifications where user_id = 'd2222222-2222-2222-2222-222222222222')::int, 0, 'A nao ve notificacoes de B');

-- ---------- act as user B (viewer): nao altera aparencia do board ----------
reset role;
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','d2222222-2222-2222-2222-222222222222','role','authenticated')::text, true);

with upd as (
  update public.boards set color = '#000000' where id = 'e2222222-2222-2222-2222-222222222222' returning 1
)
select is((select count(*) from upd)::int, 0, 'viewer nao altera aparencia do board (RLS)');

select * from finish();
rollback;
