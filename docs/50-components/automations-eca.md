# A — Automações ECA (Event-Condition-Action)

> Fundação: [ADR-0011](../20-architecture/ADR-0011-event-sourcing-card-events.md), [audit-log.md](./audit-log.md).  
> API: [edge-fn-automation-runner.md](../40-api/edge-fn-automation-runner.md).  
> **Gate SDD:** implementação após aprovação desta spec (último épico — `card_events` maduro).

## Contexto

Usuários precisam automatizar fluxos tipo Butler/Trello sem loops infinitos. Motor assíncrono reage a INSERT em `card_events` via Database Webhook.

## Objetivos

- CRUD regras por board/org: trigger event + conditions + actions.
- Runner Edge Function async com profundidade máx 3.
- UI lista regras + toggle enable + log execução.

## Não-objetivos

- Editor visual drag-and-drop de fluxo.
- Regras cross-board.
- Scheduling cron-style (fast-follow).
- Slack Web API multi-canal (fast-follow).

## Requisitos

### Schema

```sql
automation_rules (
  id, org_id, board_id,
  name, active boolean,
  trigger_event text,
  conditions jsonb,
  actions jsonb,
  created_at, updated_at
)

automation_runs (
  id, rule_id, card_event_id,
  status success|failed|skipped,
  depth int,
  result jsonb,
  ran_at
)

automation_outbox (
  id, org_id, board_id, rule_id, card_id, card_event_id,
  action_type, action_payload, status, attempts, next_attempt_at,
  dedup_key, result
)
```

### Conditions (v1)

- `column_is`, `priority_gte`.

### Actions (v1 internas)

- `move_card`, `set_priority`, `set_assignee`.

### Actions (v1 externas — async via outbox)

- `send_slack`, `send_email`, `webhook` — enfileiradas em `automation_outbox`; motor Postgres nao faz HTTP na transacao.

### Runner flow

1. Trigger em `card_events` executa acoes internas sincronamente (depth max 3).
2. Acoes externas: INSERT em `automation_outbox` com `dedup_key` idempotente.
3. Edge `automation-runner` drena outbox (~pg_cron 1min) com **auth worker** (`CRON_SECRET` ou service role) + **claim atomico** (`claim_automation_outbox` / `FOR UPDATE SKIP LOCKED`).
4. Webhook: HTTPS only + bloqueio SSRF (IPs privados / metadata). Slack URL tambem validada.
5. Retry com backoff; registra `automation_runs` em sucesso/falha.

Detalhe P0: [edge-fn-automation-runner.md](../40-api/edge-fn-automation-runner.md).

### UI

- Modal automacoes no board: CRUD regras + acoes externas + aba Historico (`automation_runs`).
- Slack webhook por org em `/settings/integrations/slack`.

## Critérios de aceite

- [ ] Regra "when card_moved to Done → assign manager" executa uma vez.
- [ ] Loop A→B→A profundidade 4 → runner aborta depth 3.
- [ ] Rule disabled não executa.
- [ ] Falha action registra `automation_runs.status=failed` sem rollback evento original.
- [ ] pgTAP: depth header respeitado.
- [ ] P0: runner sem auth → 401; claim concorrente → 1 delivery; URL privada → `webhook_ssrf_blocked`.

## Questões abertas

| # | Questão | Proposta |
|---|---------|----------|
| 1 | Webhook signing | Supabase secret + HMAC verify |

## Specs vinculadas

- [edge-fn-automation-runner.md](../40-api/edge-fn-automation-runner.md)
- [audit-log.md](./audit-log.md)

## Matriz Spec → Código → Teste

| Requisito | Código | Teste |
|-----------|--------|-------|
| Tables + RLS | `*_automation_rules.sql` | pgTAP |
| Edge runner | `supabase/functions/automation-runner` | Deno test |
| Claim atomico | `claim_automation_outbox` migration | pgTAP `38_*` |
| Worker auth + SSRF | `worker-auth.ts`, `webhook-ssrf.ts` | Deno |
| Webhook config | Supabase dashboard + docs | manual |
| UI rules | `board-automations.tsx` | Playwright |
| Depth guard | runner + emit meta | Deno + pgTAP |
