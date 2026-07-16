# Edge Function — automation-runner

> Spec: [automations-eca.md](../50-components/automations-eca.md).  
> P0 security: auth worker + claim atomico + SSRF webhook.

## Trigger

- **pg_cron / scheduler** (ou invocacao manual ops) → drena `automation_outbox`.
- Nao e endpoint publico; nao aceita JWT de usuario autenticado comum.

## Auth (obrigatorio)

```http
POST /functions/v1/automation-runner
Headers (um dos):
  Authorization: Bearer <CRON_SECRET>
  x-cron-secret: <CRON_SECRET>
  Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>
```

| Caller | Resultado |
|--------|-----------|
| Sem header / anon | **401** |
| JWT de usuario (`authenticated`) | **401** |
| `CRON_SECRET` (Bearer ou `x-cron-secret`) | 200 |
| Service role JWT/key | 200 |

Secrets: `CRON_SECRET` (Dashboard Edge Function secrets). Sem `CRON_SECRET` configurado, so service role e aceito.

## Algorithm (outbox drain)

1. `assertWorkerAuth(req)` — rejeita anon/user JWT.
2. RPC `public.claim_automation_outbox(p_limit)` — claim atomico por linha:
   - `UPDATE … WHERE status IN ('pending','failed') AND next_attempt_at <= now() … FOR UPDATE SKIP LOCKED RETURNING *`
   - status → `processing` na mesma transacao.
3. Para cada row claimed:
   - `send_slack` / `send_email` / `webhook` (ver SSRF).
   - sucesso → `success` + `automation_runs`
   - falha → backoff (`min(60, 2^attempts)` min), `pending` ou `failed` apos 5 tentativas.
4. Return 200 `{ processed: n }`.

## SSRF — action `webhook` (e URL Slack)

Antes de `fetch`:

- Scheme **somente `https:`**.
- Rejeitar hostnames/IPs privados: loopback, RFC1918, link-local, ULA IPv6, cloud metadata (`169.254.169.254`, `metadata.google.internal`, etc.).
- Rejeitar credenciais no URL (`userinfo`).
- Falha → outbox `failed`/`pending` com `result.error` contendo `webhook_ssrf_blocked` (sem follow de redirect para IP privado).

## Internal RPCs

| RPC | Quem | Papel |
|-----|------|-------|
| `public.claim_automation_outbox(p_limit int)` | `service_role` | Claim atomico + `processing` |
| `public.get_org_slack_webhook(p_org)` | `service_role` | Decrypt webhook Slack |

Outbox RLS: deny-all; so service_role SELECT/UPDATE via grants + claim RPC.

## Observability

- Structured log: `{ outbox_id, action_type, status, ms }`.
- Auth fail: log sem corpo sensivel.

## Criterios de aceite (P0)

- [ ] Unauth / user JWT → 401
- [ ] Dois workers concorrentes no mesmo pending → **1** delivery (SKIP LOCKED)
- [ ] `https://127.0.0.1/`, `http://…`, `https://169.254.169.254/` → rejeitados
- [ ] Claim marca `processing` antes do HTTP

## Matriz Spec → Código → Teste

| Requisito | Código | Teste |
|-----------|--------|-------|
| Worker auth | `automation-runner/worker-auth.ts` | Deno `dispatcher.test.ts` |
| Claim atomico | migration `claim_automation_outbox` + runner | pgTAP `38_automation_outbox_claim_test.sql` |
| SSRF | `automation-runner/webhook-ssrf.ts` | Deno `dispatcher.test.ts` |
| Drain + backoff | `automation-runner/index.ts` + `outbox-backoff.ts` | Deno `dispatcher.test.ts` |
