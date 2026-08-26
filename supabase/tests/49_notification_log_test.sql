-- pgTAP: notification_log RLS — authenticated cannot read/write
begin;
create extension if not exists pgtap;
select plan(3);

insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at, raw_app_meta_data, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000000','f1111111-1111-1111-1111-111111111111','authenticated','authenticated','nl-a@test.dev', now(), now(), '{}'::jsonb, '{}'::jsonb),
  ('00000000-0000-0000-0000-000000000000','f2222222-2222-2222-2222-222222222222','authenticated','authenticated','nl-b@test.dev', now(), now(), '{}'::jsonb, '{}'::jsonb);

insert into public.organizations (id, name, slug) values
  ('f3333333-3333-3333-3333-333333333333','Org NL','org-nl');

insert into public.memberships (org_id, user_id, role) values
  ('f3333333-3333-3333-3333-333333333333','f1111111-1111-1111-1111-111111111111','admin'),
  ('f3333333-3333-3333-3333-333333333333','f2222222-2222-2222-2222-222222222222','viewer');

-- service role can insert (cron path)
reset role;
insert into public.notification_log (org_id, recipient_id, event_type, entity_id) values
  ('f3333333-3333-3333-3333-333333333333','f1111111-1111-1111-1111-111111111111','task_due_soon','f4444444-4444-4444-4444-444444444444');

select is(
  (select count(*)::int from public.notification_log where recipient_id = 'f1111111-1111-1111-1111-111111111111'),
  1,
  'service role inserts notification_log'
);

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','f1111111-1111-1111-1111-111111111111','role','authenticated')::text, true);

select is(
  (select count(*)::int from public.notification_log),
  0,
  'authenticated cannot read notification_log'
);

with ins as (
  insert into public.notification_log (org_id, recipient_id, event_type, entity_id)
  values ('f3333333-3333-3333-3333-333333333333','f1111111-1111-1111-1111-111111111111','task_overdue','f5555555-5555-5555-5555-555555555555')
  returning 1
)
select is((select count(*) from ins)::int, 0, 'authenticated cannot insert notification_log');

select * from finish();
rollback;
