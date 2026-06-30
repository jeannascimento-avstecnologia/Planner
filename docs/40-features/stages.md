# Estagios por projeto

## Contexto

Cards podem ter um **estagio** independente da coluna Kanban. Cada coluna pode ter `default_stage_id` para heranca. Estagios definem cor pastel do card e badge com nome.

## Defaults (todo board)

| Nome | Cor | system_key |
|------|-----|------------|
| Parado | `#9CA3AF` | `parado` |
| Em Progresso | `#F59E0B` | `em_progresso` |
| Concluido | `#10B981` | `concluido` |
| Cancelado | `#EF4444` | `cancelado` |

Seed via trigger `boards_seed_stages` + backfill migration `0014`.

## Regras

1. `is_system=true` nao pode ser excluido; pode renomear/recolorir.
2. Card com `stage_id` explicito sobrescreve default da coluna.
3. Cor de fundo: `pastelize(stage.color)` + `contrastText` para fonte (WCAG).
4. Alterar estagio (`concluido`, `cancelado` ou custom): atualiza apenas `cards.stage_id` localmente; **sem side-effects Tiflux**.
5. Integracao Tiflux no card: criar ticket, associar ticket existente e link "Mostrar apontamentos" (`card-drawer.tsx`). Toggle por projeto em configuracoes.
6. Filtros do board: `CardFilters.stageIds` (multi-select) inclui `"none"` para cards sem estagio efetivo.
7. Criacao inline de estagio custom na filter bar (reusa `createStage`).

## Matriz Spec -> Codigo -> Teste

| Requisito | Codigo | Teste |
|-----------|--------|-------|
| 4 defaults por board | `0014_stages_and_time_entries.sql` | `06_stages_time_entries_test.sql` |
| CRUD estagios | `stages/actions.ts`, `stage-manager-modal.tsx` | `e2e/stages.spec.ts` |
| Alterar estagio card | `stage-selector.tsx`, `setCardStage` | `e2e/stages.spec.ts` |
| Cor pastel + badge | `color-utils.ts`, `board-card-tile.tsx` | `e2e/stages.spec.ts` |
| Link apontamentos TiFlux | `card-drawer.tsx` | `e2e/stages.spec.ts` |
| Filtro por estagio | `card-filter-bar.tsx`, `matchesFilters` | `e2e/stages.spec.ts` |
| Criar estagio inline | `card-filter-bar.tsx` | `e2e/stages.spec.ts` |
