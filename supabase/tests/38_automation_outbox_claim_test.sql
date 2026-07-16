begin;
select plan(5);

select has_function(
  'public',
  'claim_automation_outbox',
  array['integer'],
  'claim_automation_outbox(int) exists'
);

insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at, raw_app_meta_data, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000000','b1111111-1111-1111-1111-111111111111','authenticated','authenticated','outbox-claim@test.dev', now(), now(), '{}'::jsonb, '{}'::jsonb);

insert into public.organizations (id, name, slug) values
  ('b2222222-2222-2222-2222-222222222222','Org Outbox','org-outbox-claim');

insert into public.memberships (org_id, user_id, role) values
  ('b2222222-2222-2222-2222-222222222222','b1111111-1111-1111-1111-111111111111','admin');

insert into public.boards (id, org_id, name, created_by) values
  ('b3333333-3333-3333-3333-333333333333','b2222222-2222-2222-2222-222222222222','Board Outbox','b1111111-1111-1111-1111-111111111111');

insert into public.automation_outbox (
  id, org_id, board_id, action_type, action_payload, status, attempts, next_attempt_at, dedup_key
) values
  (
    'b4444444-4444-4444-4444-444444444401',
    'b2222222-2222-2222-2222-222222222222',
    'b3333333-3333-3333-3333-333333333333',
    'webhook',
    '{"url":"https://example.com/hook"}'::jsonb,
    'pending',
    0,
    now() - interval '1 minute',
    'claim-test-dedup-1'
  ),
  (
    'b4444444-4444-4444-4444-444444444402',
    'b2222222-2222-2222-2222-222222222222',
    'b3333333-3333-3333-3333-333333333333',
    'webhook',
    '{"url":"https://example.com/hook2"}'::jsonb,
    'pending',
    0,
    now() - interval '1 minute',
    'claim-test-dedup-2'
  );

reset role;
set local role service_role;

select is(
  (select count(*)::int from public.claim_automation_outbox(1)),
  1,
  'first claim returns 1 row'
);

select is(
  (select count(*)::int from public.automation_outbox where status = 'processing'),
  1,
  'first claim marks exactly one row as processing'
);

select is(
  (select count(*)::int from public.claim_automation_outbox(10)),
  1,
  'second claim returns only the remaining pending row'
);

select is(
  (
    select count(*)::int
    from public.automation_outbox
    where id in (
      'b4444444-4444-4444-4444-444444444401',
      'b4444444-4444-4444-4444-444444444402'
    )
    and status = 'processing'
  ),
  2,
  'both rows claimed once as processing (no double claim)'
);

select * from finish();
rollback;
