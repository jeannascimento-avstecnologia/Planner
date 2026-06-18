# Modos de visualização do board

Quatro modos no projeto (`/boards/[boardId]?view=...`). Filtros compartilhados via `matchesFilters`.

## Query `view`

| Valor | UI |
|-------|-----|
| `kanban` (default) | Colunas + cards |
| `timeline` | Gantt: barra `start_date` → `due_date` |
| `calendar` | Grade mensal (cards com prazo) |
| `table` | Tabela ordenável |

## Filtros

`CardFilterBar` permanece acima do switcher. Estado React no pai (`board-view.tsx`) — **não reseta** ao trocar modo.

## Timeline / Gantt

- `start_date` + `due_date`: barra contínua
- Só `due_date`: barra de 1 dia
- Sem datas: faixa "Sem prazo"
- Janela: -14 a +56 dias a partir de hoje

## Calendário (board)

Reutiliza `calendar-grid.ts`. Apenas cards filtrados com `due_date` no mês visível.

## Tabela

Colunas: Título, Coluna, Prioridade, Início, Prazo, Responsável, Marcadores. Ordenação client-side.

## Matriz Spec → Código → Teste

| Spec | Código | E2E |
|------|--------|-----|
| Switcher 4 modos | `board-view-switcher.tsx` | `boards.spec.ts` |
| Filtros persistem | `board-view.tsx` state | `ux-refinements.spec.ts` |
| Gantt start→due | `board-timeline-view.tsx` + migration `0008` | timeline bar visible |
