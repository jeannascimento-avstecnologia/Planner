-- =====================================================================
-- Seed LOCAL DEV (rodado por `supabase db reset`). NAO usar em producao.
-- Usuario demo: admin@nextgen.dev / senha: password123
-- =====================================================================

-- IMPORTANTE: colunas de token (confirmation_token, recovery_token, etc.) NAO
-- podem ser NULL. O scanner Go do GoTrue falha com "converting NULL to string
-- is unsupported" -> login retorna 500 "Database error querying schema".
-- Por isso inserimos string vazia ('') nessas colunas.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, is_sso_user, is_anonymous,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, phone_change, phone_change_token, reauthentication_token
) values (
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-1111-1111-111111111111',
  'authenticated', 'authenticated', 'admin@nextgen.dev',
  crypt('password123', gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Admin Demo"}'::jsonb,
  false, false,
  '', '', '', '', '', '', '', ''
) on conflict (id) do nothing;

insert into auth.identities (
  id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
) values (
  '11111111-1111-1111-1111-111111111112',
  '11111111-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111111',
  'email',
  jsonb_build_object(
    'sub', '11111111-1111-1111-1111-111111111111',
    'email', 'admin@nextgen.dev',
    'email_verified', true
  ),
  now(), now(), now()
) on conflict do nothing;

-- org + membership (seed roda como superuser, ignora RLS)
insert into public.organizations (id, name, slug)
values ('22222222-2222-2222-2222-222222222222', 'Acme Inc', 'acme')
on conflict (id) do nothing;

insert into public.memberships (org_id, user_id, role)
values ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'admin')
on conflict (org_id, user_id) do nothing;

insert into public.boards (id, org_id, name, description, icon, color, created_by, tiflux_enabled, integrations)
values ('33333333-3333-3333-3333-333333333333',
        '22222222-2222-2222-2222-222222222222',
        'Roadmap', 'Board de demonstracao', 'rocket', '#6366F1',
        '11111111-1111-1111-1111-111111111111', true,
        '{"tiflux":{"clientName":"Acme Inc","deskName":"Suporte","requestorName":"Admin"}}'::jsonb)
on conflict (id) do update set
  tiflux_enabled = excluded.tiflux_enabled,
  integrations = excluded.integrations;

-- Viewer demo: viewer@nextgen.dev / password123 (board-only no Roadmap)
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, is_sso_user, is_anonymous,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, phone_change, phone_change_token, reauthentication_token
) values (
  '00000000-0000-0000-0000-000000000000',
  '66666666-6666-6666-6666-666666666666',
  'authenticated', 'authenticated', 'viewer@nextgen.dev',
  crypt('password123', gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Viewer Demo"}'::jsonb,
  false, false,
  '', '', '', '', '', '', '', ''
) on conflict (id) do nothing;

insert into auth.identities (
  id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
) values (
  '66666666-6666-6666-6666-666666666667',
  '66666666-6666-6666-6666-666666666666',
  '66666666-6666-6666-6666-666666666666',
  'email',
  jsonb_build_object(
    'sub', '66666666-6666-6666-6666-666666666666',
    'email', 'viewer@nextgen.dev',
    'email_verified', true
  ),
  now(), now(), now()
) on conflict do nothing;

insert into public.board_members (board_id, user_id, role)
values ('33333333-3333-3333-3333-333333333333', '66666666-6666-6666-6666-666666666666', 'viewer')
on conflict (board_id, user_id) do update set role = excluded.role;

insert into public.columns (id, board_id, org_id, name, position) values
  ('44444444-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 'To Do', 'a0'),
  ('44444444-0000-0000-0000-000000000002', '33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 'Doing', 'a1'),
  ('44444444-0000-0000-0000-000000000003', '33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 'Done',  'a2')
on conflict (id) do nothing;

insert into public.cards (board_id, column_id, org_id, title, position, priority, start_date, due_date, created_by) values
  ('33333333-3333-3333-3333-333333333333', '44444444-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'Configurar Supabase local', 'm0', 'high', (now() - interval '1 day'), (now() + interval '3 days'), '11111111-1111-1111-1111-111111111111'),
  ('33333333-3333-3333-3333-333333333333', '44444444-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'Walking skeleton de auth', 'm1', 'medium', null, (now() + interval '7 days'), '11111111-1111-1111-1111-111111111111'),
  ('33333333-3333-3333-3333-333333333333', '44444444-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'RLS + pgTAP', 'm0', 'urgent', (now() - interval '2 days'), (now() + interval '1 day'), '11111111-1111-1111-1111-111111111111')
on conflict do nothing;

insert into public.tags (id, org_id, board_id, name, color) values
  ('55555555-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', 'backend', '#456993'),
  ('55555555-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', 'urgente', '#334155')
on conflict (id) do nothing;

insert into public.card_tags (card_id, tag_id, org_id)
select c.id, '55555555-0000-0000-0000-000000000001', c.org_id
from public.cards c where c.title = 'RLS + pgTAP' limit 1
on conflict do nothing;
