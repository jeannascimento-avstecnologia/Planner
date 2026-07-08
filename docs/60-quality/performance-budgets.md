# Performance Budgets

## Contexto

Orcamentos de latencia e carga pos-stress test ([`scripts/perf-stress.mjs`](../../scripts/perf-stress.mjs)). Medicao oficial em **build de producao** (`next build && next start`).

## Metas (p95 TTFB server-side, prod)

| Rota | Budget p95 | Baseline stress (dev) |
|------|------------|------------------------|
| `/boards` | < 600ms | 4663ms (dev, 30 concurrent) |
| `/boards/[boardId]` | < 800ms | 5433ms (dev, 30 concurrent) |
| `/calendar` | < 800ms | 1376ms |
| `/plan` | < 900ms | 41ms (cache quente) |
| `/workload` | < 900ms | 37ms (cache quente) |
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
6. **Plan/workload:** alocacao diaria usa update otimista + `in-flight-submit`; **nao** `window.location.reload`.
7. **Revalidacao estreita:** mutations de alocacao chamam `revalidatePlanViews()` (`/plan` + `/workload`), **sem** invalidar `/boards` a cada celula.
8. **Patch condicional:** `updateCardFields` so invalida plan/workload se patch toca campos de carga (`estimated_hours`, `target_date`, `assignee_id`, datas).
9. **`/workload`:** carregar dados da visao ativa (semana **ou** 15d), nunca ambos no mesmo request.
10. **`/plan`:** export Teams em Suspense separado; `boardNames` reutilizado (sem query duplicada de boards).
11. **Nav dedupe:** re-clique na mesma rota (pathname) na sidebar = **0 GET RSC adicional** (`NavLink` + guard in-flight).
12. **Shell cache:** `loadShellDataCached(userId, orgId)` com `unstable_cache` + tags `shell:user:{id}`; invalidar via `revalidateShell()`.

## Criterios de aceite

- [ ] Stress baseline prod: `/boards` p95 < 600ms
- [ ] Stress baseline prod: `/boards/[id]` p95 < 800ms
- [ ] Stress baseline prod: `/plan` e `/workload` p95 < 900ms
- [ ] E2E `navigation-dedupe.spec.ts`: 10 re-cliques mesma rota sidebar ≤ 1 GET RSC
- [ ] pgTAP verde apos otimizacoes
- [ ] E2E `boards.spec.ts` + `board-kanban-dnd.spec.ts` verdes
- [ ] Zero cache cross-tenant (chave inclui userId)
- [ ] Edicao rapida de celulas `/plan` gera no maximo 1 RPC por celula (Enter nao dispara blur duplicado)

## Matriz Spec → Codigo → Teste

| Requisito | Codigo | Teste |
|-----------|--------|-------|
| Dedupe home load | `load-org-projects.ts` `fetchOrgProjectsData`, `cached-queries.ts` `loadOrgProjectsCached` | `perf-stress.mjs` `/boards` |
| Cache tags | `lib/loaders/cached-queries.ts` | revalidate apos mutation |
| Auth dedupe | `middleware.ts`, `session.ts` | stress 0 auth errors |
| Shell stream | `app-shell-loader.tsx`, `notifications-loader.tsx` | Lighthouse TTFB |
| Board queries | `boards/[boardId]/page.tsx` | `perf-stress.mjs` board |
| Rate-limit | `rate-limit.ts`, `middleware.ts` | stress 429 sob abuso |
| Sem refresh ubiquo | `column-header`, `card-drawer`, `create-project-form`, `plan-client` | E2E kanban + plan |
| Plan cache + batch load | `loaders/plan-cache.ts`, `load-plan-grid.ts` `fetchPlanGridsForUser` | `perf-stress.mjs` `/plan` |
| Revalidacao plan | `revalidation.ts` `revalidatePlanViews()` | stress `/plan` |
| Workload split load | `workload/page.tsx`, `loaders/workload-cache.ts` | E2E workload |
| Nav dedupe | `nav-link.tsx`, `client-url-state.ts` | `navigation-dedupe.spec.ts` |
| Shell cross-request cache | `lib/loaders/shell-cache.ts` | stress navegacao |
| Board/calendar cache | `board-cache.ts`, `cached-queries.ts` | `perf-stress.mjs` |
