# Edge × Auth — matriz de auditoria (P3.2)

> **Status:** DONE (2026-07-15)  
> **Ciclo:** HARDENING_PRODUCAO_ESCALA P3.2  
> **Regra:** edges privilegiadas exigem user JWT (`getUser()`) **ou** worker secret — zero anon.

---

## Matriz Edge Functions

| Função | Auth | Verificação | Sem credencial | Notas |
|--------|------|-------------|----------------|-------|
| `cloudinary-sign` | User JWT Bearer | `supabase.auth.getUser()` + membership `org_id` | **401** | Folder forçado `org/{orgId}/…` (P3.3) |
| `tiflux-create-ticket` | User JWT Bearer | `getUser()` + membership/board write | **401** | Sem fallback `TIFLUX_API_TOKEN` (P0.2) |
| `export-deadlines-to-google` | User JWT Bearer | `getUser()` + org integration RLS | **401** | |
| `export-plan-to-teams` | User JWT Bearer | `getUser()` + org integration | **401** | |
| `automation-runner` | Worker only | `CRON_SECRET` Bearer / `x-cron-secret` **ou** service role | **401** | Rejeita JWT user/anon (`worker-auth.ts`) |

### Proibições

- Não autorizar com `getSession()` em Edge (só `getUser()` ou worker secret).
- Não aceitar invocação anônima / só `apikey` anon sem Bearer user nas funções user-scoped.
- `automation-runner`: nunca aceitar JWT de usuário.

### Testes

| Cobertura | Onde |
|-----------|------|
| Worker auth 401 / accept cron+service | `supabase/functions/automation-runner/dispatcher.test.ts` |
| Cloudinary: Bearer ausente + folder scoping | `supabase/functions/cloudinary-sign/folder.test.ts` |

---

## Next.js — middleware / API / Actions (auditoria)

| Superfície | Comportamento | Auth |
|------------|---------------|------|
| Middleware `updateSession` | `getUser()`; rate-limit Upstash IP/user | Redirect `/login` em prefixes protegidos |
| Server Actions (`next-action`) | Middleware **não** refresh session (stream) | Cada action: `getUser()` |
| `/api/auth/sign-out` | Same-origin + rate-limit | Sign-out |
| `/api/auth/persistence` | Same-origin + rate-limit | **`getUser()`** (não `getSession`) |
| `/api/audit/export` | (própria action/route) | Verificar membership |

Prefixes protegidos: `/boards`, `/projects`, `/calendar`, `/plan`, `/profile`, `/settings`, `/workload`.

---

## Critérios de aceite P3.2

- [x] Matriz edge×auth documentada (este arquivo)
- [x] Funções listadas usam `getUser()` ou worker-auth
- [x] Testes 401 / rejeição sem token (worker + cloudinary gate)
- [x] `/api/auth/persistence` autoriza via `getUser()`
