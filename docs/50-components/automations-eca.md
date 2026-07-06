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
- Integrações externas Zapier/Slack/email (v1).
- Regras cross-board.
- Scheduling cron-style (fast-follow).

## Requisitos

### Schema

```sql
automation_rules (
  id, org_id, board_id nullable,
  name, enabled boolean,
  trigger_event_type text,
  conditions jsonb,  -- array AND
  actions jsonb,     -- array sequential
  created_by, created_at
)

automation_runs (
  id, rule_id, card_event_id,
  status success|failed|skipped,
  depth int,
  result jsonb,
  ran_at
)
```

### Conditions (v1)

- `field_equals`, `field_changed`, `assignee_is`, `column_is`, `priority_gte`.

### Actions (v1)

- `set_field`, `move_to_column`, `add_comment`, `assign_user`, `add_label`.

### Runner flow

1. Webhook on `INSERT card_events` → Edge `automation-runner`.
2. Load rules matching `event_type` + board/org.
3. Evaluate conditions against event payload + card snapshot (`SELECT ... FOR UPDATE`).
4. Execute actions; each mutation emits new `card_events` with `payload.meta.trigger_depth = parent + 1`.
5. Reject if `trigger_depth > 3`.

### Race mitigation

- Optimistic: compare `cards.updated_at` before write; skip action if stale.
- Advisory lock `pg_advisory_xact_lock(hashtext(card_id))` per card during run.

### UI

- `/boards/[id]/automations` — table rules; modal create/edit JSON form (structured fields, not raw JSON).
- Run history tab: last 50 runs per rule.

## Critérios de aceite

- [ ] Regra "when card_moved to Done → assign manager" executa uma vez.
- [ ] Loop A→B→A profundidade 4 → runner aborta depth 3.
- [ ] Rule disabled não executa.
- [ ] Falha action registra `automation_runs.status=failed` sem rollback evento original.
- [ ] pgTAP: depth header respeitado.

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
| Webhook config | Supabase dashboard + docs | manual |
| UI rules | `board-automations.tsx` | Playwright |
| Depth guard | runner + emit meta | Deno + pgTAP |
