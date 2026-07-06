# Edge Function — automation-runner

> Spec: [automations-eca.md](../50-components/automations-eca.md).

## Trigger

- **Supabase Database Webhook** on `INSERT` → `public.card_events`.
- Payload: full row JSON.
- Filter (dashboard): optional `event_scope = 'card'` for v1 perf.

## Request

```http
POST /functions/v1/automation-runner
Headers:
  Authorization: Bearer <service_role or webhook secret>
  x-automation-depth: <int>  // from event.payload.meta.trigger_depth ?? 0
Body: { "record": { ...card_events row } }
```

## Algorithm

1. Parse `record`; read `trigger_depth` from `payload.meta` (default 0).
2. If `trigger_depth >= 3` → 200 `{ skipped: 'max_depth' }`.
3. Fetch enabled rules WHERE `trigger_event_type = record.event_type` AND (`board_id = record.board_id` OR org-level).
4. For each rule (sequential per event):
   - Load card with `FOR UPDATE` if `card_id` present.
   - Eval conditions → skip if false.
   - Run actions in transaction via internal RPC `app.execute_automation_action`.
   - Insert `automation_runs` row.
5. Return 200 `{ processed: n }`.

## Internal RPCs (security definer)

- `app.execute_automation_action(p_rule_id, p_card_id, p_action jsonb)`
- Each action calls existing mutations + `app.emit_event` with incremented depth.

## Secrets

- `AUTOMATION_WEBHOOK_SECRET` — verify Supabase webhook signature.
- No anon access.

## Observability

- Structured log: `{ rule_id, event_id, depth, status, ms }`.
- Sentry optional fast-follow.

## Matriz Spec → Código → Teste

| Requisito | Código | Teste |
|-----------|--------|-------|
| Edge fn | `supabase/functions/automation-runner/index.ts` | Deno |
| Action RPC | migration | pgTAP |
| Depth skip | fn logic | Deno unit |
| Webhook HMAC | fn middleware | Deno |
