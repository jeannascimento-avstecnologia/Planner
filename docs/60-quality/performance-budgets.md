# Performance Budgets

## Contexto

Orcamentos de latencia e carga pos-stress test ([`scripts/perf-stress.mjs`](../../scripts/perf-stress.mjs)). Medicao oficial em **build de producao** (`next build && next start`).

## Metas (p95 TTFB server-side, prod)

| Rota | Budget p95 | Baseline stress (dev) |
|------|------------|------------------------|
| `/boards` | < 600ms | 869ms |
| `/boards/[boardId]` | < 800ms | 1567ms |
| `/calendar` | < 800ms | 1376ms |
| Carga 10 concurrent (qualquer rota auth) | < 3000ms p95, 0 erros 5xx | ~12–19s |

## Nao-objetivos

- CDN edge cache global (fast-follow)
- Upstash Redis rate-limit multi-node (fast-follow)
- RPC `get_board_snapshot` (fast-follow se 2 waves insuficientes)

## Requisitos

1. Uma unica execucao de `loadOrgProjects()` por request em `/boards` (React `cache` ou props).
2. `unstable_cache` com chave `userId` + tags de [`revalidation.ts`](../../apps/web/lib/revalidation.ts).
3. Middleware propaga `x-planner-user-id` no request (strip spoof); auth real via cookie Supabase.
4. Shell: notifications em Suspense (nao bloqueia TTFB do main).
5. Rate-limit HTTP: 120 req/min/IP, 60 req/min/user autenticado.

## Criterios de aceite

- [ ] Stress baseline prod: `/boards` p95 < 600ms
- [ ] Stress baseline prod: `/boards/[id]` p95 < 800ms
- [ ] pgTAP verde apos otimizacoes
- [ ] E2E `boards.spec.ts` + `board-kanban-dnd.spec.ts` verdes
- [ ] Zero cache cross-tenant (chave inclui userId)

## Matriz Spec → Codigo → Teste

| Requisito | Codigo | Teste |
|-----------|--------|-------|
| Dedupe home load | `load-org-projects.ts` `cache()`, `boards/page.tsx` | `perf-stress.mjs` `/boards` |
| Cache tags | `lib/loaders/cached-queries.ts` | revalidate apos mutation |
| Auth dedupe | `middleware.ts`, `session.ts` | stress 0 auth errors |
| Shell stream | `app-shell-loader.tsx`, `notifications-loader.tsx` | Lighthouse TTFB |
| Board queries | `boards/[boardId]/page.tsx` | `perf-stress.mjs` board |
| Rate-limit | `rate-limit.ts`, `middleware.ts` | stress 429 sob abuso |
| Sem refresh ubiquo | `column-header`, `card-drawer`, `create-project-form` | E2E kanban |
