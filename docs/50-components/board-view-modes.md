# Modos de visualização do board

Cinco modos no projeto (`/boards/[boardId]?view=...`). Filtros compartilhados via `matchesFilters`.

## Query `view`

Ordem do switcher (UI): **Kanban → Árvore → Linha do tempo → Tabela → Calendário**.

| Valor | UI | Cor-tema (ativo) |
|-------|-----|------------------|
| `kanban` (default) | Colunas + cards (default: só raízes; toggle subtarefas) | `board-accent` |
| `tree` | Floresta hierárquica / org-chart (D.Tree) | `aurora-success` |
| `timeline` | Gantt: barra `start_date` → `due_date` | `aurora-warning` |
| `table` | Tabela ordenável | `aurora-info` |
| `calendar` | Grade mensal (cards com prazo) | `aurora-brand` |

## Filtros

`CardFilterBar` permanece acima do switcher. Estado React no pai (`board-view.tsx`) — **não reseta** ao trocar modo.

No modo `tree`: match no nó **ou** ancestral no path → highlight forte no match, ancestral atenuado, auto-expand (ver [board-tree-view.md](./board-tree-view.md)).

## Timeline / Gantt

- `start_date` + `due_date`: barra contínua
- Só `due_date`: barra de 1 dia
- Sem datas: faixa "Sem prazo"
- Janela: -14 a +56 dias a partir de hoje

## Calendário (board)

Reutiliza `calendar-grid.ts`. Apenas cards filtrados com `due_date` no mês visível.

## Tabela

Colunas: Título, Coluna, Prioridade, Início, Prazo, Responsável, Marcadores. Ordenação client-side.

## Árvore (tree)

Hierarquia N níveis (`cards.parent_id`), depth máx 8. Spec completa: [board-tree-view.md](./board-tree-view.md). Dados: [card-parent-hierarchy.md](../30-data/card-parent-hierarchy.md).

## Matriz Spec → Código → Teste

| Spec | Código | E2E |
|------|--------|-----|
| Switcher 5 modos | `board-view-switcher.tsx` | `boards.spec.ts` / tree e2e |
| Filtros persistem | `board-view.tsx` state | `ux-refinements.spec.ts` |
| Gantt start→due | `board-timeline-view.tsx` + migration `0008` | timeline bar visible |
| Tree forest + highlight | `board-tree-view.tsx` + `lib/card-tree/` | tree e2e + Vitest |
