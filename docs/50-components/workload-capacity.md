# E — Workload / capacidade

> Depende de: [views-interactive.md](./views-interactive.md) (edição `estimated_hours` / `story_points` / `target_date`).  
> **Gate SDD:** implementação após aprovação desta spec.

## Contexto

Gestores precisam ver carga por membro vs capacidade semanal. Sem time tracking (fora de escopo) — usa estimativas em cards + capacidade configurável **por org/membro** (`memberships.weekly_capacity_hours`).

## Objetivos

- Colunas `cards.estimated_hours` (numeric 5,2), `cards.story_points` (int), `cards.target_date` (timestamptz).
- Capacidade semanal por membro na org: `memberships.weekly_capacity_hours` (default 40).
- MV `workload_by_member_week` agregada por org/semana/membro.
- UI `/workload` — tabela por membro com semáforo de utilização.
- Edição de capacidade por manager/owner na org (workload inline + tabela de membros).

## Não-objetivos

- Timesheets / clock in-out.
- Resource leveling automático.
- Alocação parcial multi-projeto cross-board rollup (fast-follow).
- Previsão ML de velocity.
- `target_date` no feed iCal (permanece `due_date`).

## Requisitos

### Schema

```sql
ALTER TABLE cards ADD estimated_hours numeric(5,2), story_points int, target_date timestamptz;
ALTER TABLE memberships ADD weekly_capacity_hours numeric(5,2) NOT NULL DEFAULT 40;
-- profiles.weekly_capacity_hours: legado, backfill apenas
```

### Semântica de datas

| Campo | Uso |
|-------|-----|
| `target_date` | Data planejada/estimada de entrega — eixo de carga e calendário de planejamento |
| `due_date` | Prazo final — overdue, notificações, iCal |
| `start_date` | Início do trabalho (timeline/Gantt) |

**Âncora de semana na carga:** `coalesce(target_date, due_date, start_date)`.

### Materialized view

```sql
workload_by_member_week (
  org_id, user_id, week_start date,
  total_hours numeric, total_points int, card_count int
)
```

- Fonte: cards com `assignee_id` + âncora de semana na semana ISO.
- Refresh: `pg_cron` cada 5 min + `REFRESH MATERIALIZED VIEW CONCURRENTLY`.

### Buckets

- **Sem prazo planejado:** assignee + `estimated_hours > 0` + sem `target_date`, `due_date` e `start_date`.
- **Sem estimativa:** cards na semana com horas null/0 (visível no drill-down).

### UI `/workload`

- Filtro: semana (navigator).
- Tabela: membro | utilização | horas | capacidade (editável manager) | cards.
- Drill-down: click membro → lista cards contribuindo (mostra `target_date` e `due_date` quando distintos).
- Permissão view: manager+ org ou board manager.
- Permissão edit capacity: manager+ org.

### Field permissions

- `estimated_hours`, `story_points`, `target_date` editáveis conforme F.2 via RPC `update_card_fields`.

## Critérios de aceite

- [x] Card com 8h assignee + target na semana atual incrementa carga.
- [x] Membership capacity 32h → utilização = alocado/32.
- [x] Viewer não acessa `/workload` (link oculto na sidebar).
- [x] Manager edita capacidade de membro na org ativa.
- [x] Capacidade em org A não altera org B do mesmo usuário.
- [x] `due_date` diferente de `target_date` exibidos sem confusão.
- [x] Overdue baseado apenas em `due_date`.
- [ ] Cache hit < 100ms p95 leitura repetida (fast-follow Redis).
- [ ] pgTAP: MV refresh idempotente.

## Specs vinculadas

- [field-level-permissions.md](./field-level-permissions.md)
- [views-interactive.md](./views-interactive.md)
- [analytics-model.md](../30-data/analytics-model.md)

## Matriz Spec → Código → Teste

| Requisito | Código | Teste |
|-----------|--------|-------|
| Colunas cards/memberships | `*_workload_hardening.sql` | pgTAP |
| MV + cron | `*_workload_mv.sql` | pgTAP |
| RPC capacidade | `update_member_capacity` | pgTAP |
| Loader | `lib/load-workload.ts` | Vitest |
| UI page | `workload/page.tsx` | Playwright |
| Inline edit hours | drawer/table + RPC | E2E |
| Inline edit capacity | workload-member-row, OrgMembersTable | E2E |
