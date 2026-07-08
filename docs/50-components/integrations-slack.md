# Integracao Slack (Incoming Webhook)

## Objetivo
Webhook cifrado por org para notificacoes e acao `send_slack` de automacoes.

## Schema
- `org_slack_integrations(org_id, webhook_url_encrypted, channel_label)` — RLS deny; leitura via `service_role`.
- RPCs: `set_org_slack_webhook`, `clear_org_slack_webhook`, `get_org_slack_webhook` (service_role).

## UI
- `/settings/integrations/slack` — admin salva URL + label; botao "Testar conexao".
- Hub em `/settings/integrations`.

## Seguranca
- URL nunca no cliente; cifrada com `pgp_sym_encrypt`.
- Teste de conexao via server action + service role.

## Fast-follow
Slack Web API (bot token, multi-canal).
