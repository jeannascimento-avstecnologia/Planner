update public.boards
set
  tiflux_enabled = true,
  integrations = '{"tiflux":{"clientName":"Acme Inc","deskName":"Suporte","requestorName":"Admin"}}'::jsonb
where id = '33333333-3333-3333-3333-333333333333';
