# E — Workload / capacidade

> Depende de: [views-interactive.md](./views-interactive.md) (edição `estimated_hours` / `story_points`).  
> **Gate SDD:** implementação após aprovação desta spec.

## Contexto

Gestores precisam ver carga por membro vs capacidade semanal. Sem time tracking (fora de escopo) — usa estimativas em cards + capacidade configurável no profile.

## Objetivos

- Colunas `cards.estimated_hours` (numeric 5,2) e `cards.story_points` (int).
- Capacidade semanal por membro: `profiles.weekly_capacity_hours` (default 40).
- MV `workload_by_member_week` agregada por org/semana/membro.
- UI `/workload` — heatmap ou bar chart por membro (Tremor/visx).

## Não-objetivos

- Timesheets / clock in-out.
- Resource leveling automático.
- Alocação parcial multi-projeto cross-board rollup (fast-follow).
- Previsão ML de velocity.

## Requisitos

### Schema

```sql
ALTER TABLE cards ADD estimated_hours numeric(5,2), story_points int;
ALTER TABLE profiles ADD weekly_capacity_hours numeric(5,2) DEFAULT 40;
```

### Materialized view

```sql
workload_by_member_week (
  org_id, user_id, week_start date,
  total_hours numeric, total_points int, card_count int
)
```

- Fonte: cards com `assignee_id` + `due_date` ou `start_date` na semana (regra: semana ISO do `due_date`, fallback `start_date`).
- Refresh: `pg_cron` cada 5 min + `REFRESH MATERIALIZED VIEW CONCURRENTLY`.
- Índice único `(org_id, user_id, week_start)`.

### Cache

- Upstash Redis key `workload:org:{org_id}:week:{iso}` TTL 60s após read API.

### UI `/workload`

- Filtro: semana (navigator), departamento (opcional), board (multi-select).
- Tabela: membro | horas alocadas | capacidade | % utilização (cor semáforo).
- Drill-down: click membro → lista cards contribuindo.
- Permissão: manager+ org ou board manager.

### Field permissions

- `estimated_hours`, `story_points` editáveis conforme F.2.

## Critérios de aceite

- [ ] Card com 8h assignee + due na semana atual incrementa MV após refresh.
- [ ] Profile capacity 32h → utilização = alocado/32.
- [ ] Viewer não acessa `/workload`.
- [ ] Cache hit < 100ms p95 leitura repetida.
- [ ] pgTAP: MV refresh idempotente.

## Questões abertas

| # | Questão | Proposta |
|---|---------|----------|
| 1 | Card sem due_date | excluir do workload ou bucket "unscheduled" |

## Specs vinculadas

- [field-level-permissions.md](./field-level-permissions.md)
- [analytics-model.md](../30-data/analytics-model.md)

## Matriz Spec → Código → Teste

| Requisito | Código | Teste |
|-----------|--------|-------|
| Colunas cards/profile | `*_workload_columns.sql` | pgTAP |
| MV + cron | `*_workload_mv.sql` | pgTAP |
| API/cache | `app/api/workload/route.ts` | Vitest |
| UI page | `workload/page.tsx` | Playwright |
| Inline edit points | table/timeline + RPC | E2E |
