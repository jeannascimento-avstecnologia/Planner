# Integracao Google Calendar

## Objetivo
Export one-way de prazos de cards para calendario Google do usuario.

## Schema
- `user_google_tokens` — OAuth tokens cifrados por usuario (RLS deny).
- `org_google_integrations` — `calendar_id` por org (admin).
- `google_export_mappings` — mapeamento idempotente card -> event id.

## RPCs
- `set_user_google_tokens`, `get_user_google_tokens`, `user_has_google_connection`.

## Fluxo
1. Admin configura `calendar_id` em settings.
2. Usuario conecta conta Google (OAuth `calendar.events`).
3. Edge Function `export-deadlines-to-google` cria/atualiza eventos.

## UI
- `/settings/integrations/google` — OAuth + calendar id + export manual.

## Alternativa documentada
Assinar feed iCal existente no Google Calendar (baixo esforco, sem OAuth).

## Fast-follow
Sync bidirecional; multi-calendario.
