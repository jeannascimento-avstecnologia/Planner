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

## Topbar (rótulo do modo)

`topbar-title.tsx` — `VIEW_LABELS` cobre os 5 modos; em `/boards/[boardId]` o pill mostra o modo ativo:

| `view` | Label |
|--------|-------|
| `kanban` | Kanban |
| `tree` | Arvore |
| `timeline` | Linha do tempo |
| `calendar` | Calendario |
| `table` | Tabela |

`data-testid="board-view-topbar-title"`.

## Banner sob breadcrumbs

Em `board-view.tsx` (`data-testid="tree-page-description"`):

- Se `boards.description` preenchida → exibe em **todas** as visões.
- Se vazia e `view=tree` → fallback didático curto (org-chart / conexões / pan).
- Demais modos sem descrição → banner omitido.

Detalhe tree: [board-tree-view.md](./board-tree-view.md) § Copy.

## Kanban — fill viewport

Só em `view=kanban`: board usa cadeia `flex-1 min-h-0` para preencher o `main` do shell (`h-dvh`). Colunas content-sized (`items-start`, `max-h-full`); scroll na lista de cards. Spec: [board-kanban-dnd.md](./board-kanban-dnd.md) § Layout.

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
| Topbar labels (incl. Arvore) | `topbar-title.tsx` `VIEW_LABELS` | `board-view-topbar-title` |
| Banner description / fallback tree | `board-view.tsx` | `tree-page-description` |
| Filtros persistem | `board-view.tsx` state | `ux-refinements.spec.ts` |
| Gantt start→due | `board-timeline-view.tsx` + migration `0008` | timeline bar visible |
| Tree forest + highlight | `board-tree-view.tsx` / `board-tree-flow.tsx` + `lib/card-tree/` | tree e2e + Vitest |
| Kanban viewport fill | shell + `board-view` + `kanban-column` | visual / E2E scroll |
