# E.2 — Plano diário 15 dias (alocações)

> Depende de: [workload-capacity.md](./workload-capacity.md), [field-level-permissions.md](./field-level-permissions.md).  
> **Gate SDD:** implementação após aprovação desta spec.

## Contexto

Gestores e membros precisam planejar carga **por dia** (15 dias rolling), separado do calendário mensal de **prazos finais** (`/calendar`). Fonte única: `card_workload_allocations`.

## Objetivos

- Tabela `card_workload_allocations` com RLS + pgTAP.
- Rota `/plan` — grade pessoal 15 dias, sidebar Teams-style, DnD (dnd-kit).
- RPCs: `upsert_card_allocation`, `move_card_allocations`, `bulk_spread_card_hours`.
- Rollup automático: `estimated_hours`, `target_date` derivados do assignee.
- `/workload` toggle Semana | 15 dias (gerente; heatmap read-only em 15d).
- Drawer: seção "Plano de trabalho" + link `/plan`.

## Não-objetivos

- Drag cross-assignee (gerente edita horas alheias) — fast-follow.
- Calendário de trabalho / feriados por org — fast-follow.
- Sync bidirecional Teams — ver [teams-graph-export.md](./teams-graph-export.md).

## Semântica

| Campo | Uso |
|-------|-----|
| `work_date` | Dia civil da alocação |
| `hours` | 0–24 por dia; 0 remove linha |
| `due_date` | Inalterado — só `/calendar` + iCal |
| `target_date` | Derivado: último dia com horas > 0 |

## Permissões

- **Write allocation:** assignee do card (`user_id = auth.uid()`).
- **Read allocation:** próprio, manager+ org, ou board manager na org.
- **Viewer:** vê `/plan`; células disabled; RPC 403.

## UI `/plan`

- Janela 11 dias (5 passados + hoje + 5 futuros). Por padrao so dias uteis (`?weekends=1` inclui sab/dom no calendario).
- **Multi-org:** carrega todas as orgs do usuario; um calendario por org; filtros no topo (`?org=`, `?board=`).
- Sidebar: não agendados, sem estimativa, atrasados (por org).
- Highlight entrega estimada (`target_date`, ambar) e prazo final (`due_date`, vermelho + dias posteriores em vermelho claro).
- Estagio `concluido`/`cancelado` remove card do plano (trigger DB).
- DnD: sidebar→dia, entre dias, resize barra, pills de horas.
- Visual distinto de `/calendar` (accent planning, ícone `CalendarClock`).

## Critérios de aceite

- [x] Assignee aloca 4h em D+2; `/plan` e `/workload` 15d refletem.
- [x] Modo semana em `/workload` agrega `card_workload_allocations` por ISO week (nao so `target_date`).
- [ ] Drag sidebar→dia cria alocação + `target_date`.
- [ ] `estimated_hours` = soma alocações; bloqueio edição direta com alloc ativa.
- [ ] `/calendar` e iCal inalterados.
- [ ] pgTAP RLS + RPC assignee-only write.

## Matriz Spec → Código → Teste

| Requisito | Código | Teste |
|-----------|--------|-------|
| Tabela + RLS | `*_card_workload_allocations.sql` | pgTAP 36 |
| RPCs | mesma migration | pgTAP |
| Loader | `lib/load-plan-grid.ts` | Vitest |
| `/plan` | `app/(app)/plan/` | Playwright |
| DnD | `components/plan/plan-client.tsx` | Playwright |
| Workload 15d | `workload/page.tsx` | E2E |
