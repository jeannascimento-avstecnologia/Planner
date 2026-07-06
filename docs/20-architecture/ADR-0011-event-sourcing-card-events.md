# ADR-0011: Event sourcing — `card_events` append-only

- Status: Aceito
- Data: 2026-07-06

## Contexto

Audit log (F.1), automações (A) e analytics futuro compartilham necessidade de eventos imutáveis. Duplicar tabelas (`audit_log`, `automation_queue`) aumenta drift.

## Decisão

1. Tabela única `public.card_events` append-only com `event_scope` ∈ `{card, board, org}`.
2. Colunas: `id` (bigint identity, legado 0002), `org_id`, `board_id?`, `card_id?`, `actor_id?`, `event_scope`, `event_type`, `payload` jsonb, `occurred_at`. Colunas legado `type`, `metadata`, `created_at` mantidas para inserts MVP até F.1.
3. Emissão via `app.emit_event()` (security definer) e triggers Postgres em entidades críticas.
4. RLS SELECT: admin/owner da org. Sem INSERT/UPDATE/DELETE direto para `authenticated`.
5. Trigger `deny_card_events_mutation` bloqueia UPDATE/DELETE; purge via `app.purge_card_events_before()` com flag de sessão.
6. Retenção: 400 dias (job `pg_cron` diário).

## Consumidores

| Consumidor | Fase |
|------------|------|
| UI `/settings/audit` | F.1 |
| Webhook → automation-runner | A |
| MV analytics (futuro) | fast-follow |

## Alternativas consideradas

- Tabela `audit_log` separada: rejeitado (duplicação).
- Eventos só em Edge Function: rejeitado (perde atomicidade com transação DB).

## Consequências

- Migration `20260706100000_card_events.sql` + pgTAP `32_card_events_test.sql`.
- Todos os épicos Fase 2 que mutam estado devem emitir evento tipado.
- `event_type` catalogado em Zod (`packages/contracts`).
