# Board Tree View (D.Tree → D.Tree.Visual → D.Tree.Canvas)

> **Status:** APROVADO (ciclo **D.Tree.Canvas**)  
> **ADR:** [ADR-0013](../20-architecture/ADR-0013-tree-canvas-xyflow.md) · [ADR-0014](../20-architecture/ADR-0014-tree-multi-parent-edges.md) (multi-pai no canvas)  
> **Plano:** Tree Canvas Interactive  
> **UI:** `board-tree-flow.tsx` (`@xyflow/react` + Dagre); chunk `dynamic(..., { ssr: false })`

## Objetivos (Canvas)

- Pan/zoom; drag livre com `tree_x`/`tree_y` persistidos (debounce 300ms).
- **Organizar arvore** (Dagre TB via `getTreeParents` / multi-pai) + fit view.
- Handle **output** → connect pai→filho; **N pais por filho** via `card_tree_edges` (ADR-0014); parents no load = edges ∪ `parent_id` (dedupe); edges selecionáveis (remover via toolbar / duplo clique); pan = botão meio/direito.
- **Duplo clique** no nó → abre `CardDrawer` (paridade Kanban).
- **Marquee select** (arrastar no vazio) → multi-seleção; drag move o grupo e persiste coords.
- Checklist + filtros/highlight (opacity no Node RF); zero matches → banner `tree-filter-empty`; soft warn >300 nós.
- **Motion (look-preserving):** enter nó 200ms; stroke `pathLength` 200ms; highlight opacity animada — tokens/chrome inalterados (`motion/react`).
- **Perf:** patches canvas sem `revalidatePath` board/calendar; fila de writes; sync edges sem wipe de posições.

## Contexto

D.Tree entregou modo `?view=tree` com floresta via `cards.parent_id`, mas a UI era **lista indentada** (`TreeNodeRow` + chevron). O produto pede **org-chart vertical** (raiz no topo, filhos abaixo, galhos SVG) e **to-dos (checklist)** dentro de cada nó-card — distintos de subtarefas (`parent_id`).

## Objetivos

- Modo `tree`: **org-chart vertical** (layout A) — root top, children below, connectors SVG elbow.
- Nó = card (título, stage/assignee, progresso filhos, checklist inline).
- **+ Filho** → `createCard(parentId)` + galho SVG pai→filho (Motion stroke curto).
- **+ To-do** → item em `card_checklist_items` (não é card) — ver [card-checklist.md](./card-checklist.md).
- Depth máx 8 / anti-ciclo / mesmo board (reuso D.Tree).
- Filtros compartilhados: match forte + ancestral atenuado + path expandido; highlight nos galhos do match.
- Kanban: toggle “mostrar subtarefas”; default só raízes + badge `done/total` (D.Tree L6).
- Writes só via Shared Kernel (`card-actions` + `card-kernel`).
- **DnD reparent:** arrastar card sobre outro → `parent_id` do alvo; zona raiz → `parent_id = null`.
- **Handle de output (N8N):** seta na base do card; arrastar até outro card → origem = pai, alvo = filho (`parent_id`).
- **Edges (galhos) editáveis (N8N-like):** selecionar, remover conexão, alterar pai.

## Não-objetivos

- Mind-map horizontal (layout B).
- Auto-layout ELK/Dagre.
- To-do como card / checklist como `parent_id`.
- Persistência de coordenadas livres x/y no canvas (layout continua algorítmico via `layoutOrgChart`).
- Editar descrição rica no nó (abre drawer).
- Rollup analitico cross-board / sync layer entre views.
- Drag endpoint de edge para reconectar (MVP = toolbar “Alterar pai…” + clique no nó).

## Requisitos

### R1 — Persistência (reuso + checklist)

1. Constraints `parent_id` existentes (anti-ciclo, depth 8, cross-board) — sem mudança.
2. Tabela `card_checklist_items` — spec [card-checklist.md](./card-checklist.md).

### R2 — Load + contratos

1. `BoardCard.parent_id` + batch `checklistItems` no snapshot / fetch (sem N+1).
2. Kernel: create child via `createCardMutation(parentId)`; CRUD checklist separado.
3. Lib `lib/card-tree/`: forest helpers (D.Tree) + `layoutOrgChart(forest) → { nodes, edges }` + `canReparent(cards, cardId, newParentId)`.

### R3 — UI Org-chart

1. `board-tree-view.tsx`: `TreeCanvas` (scroll) + SVG connectors + `TreeCardNode` + `BranchConnector`.
2. Remover UX de lista indentada (`TreeNodeRow` chevron/padding).
3. Expand/collapse filhos (Motion fade+slide); stroke-draw ~200ms no galho ao criar filho.
4. Tokens Aurora/board; a11y: nó `article`/`group`; checklist = checkboxes reais; foco teclado.
5. Mobile: zoom/pan via overflow scroll; to-dos colapsáveis; **sem drag de reparent no touch** (menu + edges OK).

### R3b — DnD reparent + edges (D.Tree.Visual DnD)

1. Desktop + `canEdit`: grip no card **draggable** (`@dnd-kit`); nós **droppable**; zona `tree-root-drop` promove a raiz.
2. Drop A→B (grip): `commitReparent(A, B)` — A vira filho de B; `position` fractional; `canReparent` + optimistic + rollback.
3. **Handle output** (`tree-output-handle-{id}`): arrastar seta na base do card até outro nó → `commitReparent(alvo, origem)` (origem = pai, alvo = filho). Preview linha tracejada; Esc cancela; highlight de alvos válidos.
4. Viewer: sem drag / sem handle.
5. Click no galho → toolbar: **Remover conexão**, **Alterar pai…**; Delete/Backspace; Esc cancela.
6. Sem persistir x/y livres — após reparent, `layoutOrgChart` recoloca.

### R4 — Kanban / Drawer (mantidos + checklist)

1. Kanban toggle + badge (D.Tree) inalterados.
2. Drawer: seção Subtarefas (galhos) **e** seção Checklist (mesmos items do nó).

## Copy / banner superior

Implementado em `board-view.tsx` (`data-testid="tree-page-description"`), compartilhado com [board-view-modes.md](./board-view-modes.md):

- Sob o caminho Projetos / org / nome: exibe `boards.description` quando preenchida (**todas** as visoes).
- Em `?view=tree` **sem** descricao: fallback didatico — *"Organograma do projeto: conecte cards pelos pontos, adicione filhos e mova a tela com o mouse."*
- Outros modos sem descricao: banner omitido.
- Toolbar canvas `Organizar arvore` / `Ajustar vista` + ajuda operacional em `tree-banner-help` (dentro de `board-tree-flow.tsx`).

## Critérios de aceite

- [ ] `?view=tree` renderiza org-chart (não lista); criar filho desenha galho.
- [ ] Descricao do projeto (`boards.description`) visivel no top do board quando existir; fallback didatico so na Arvore.
- [ ] + To-do no nó e no drawer; toggle/delete; viewer read-only.
- [ ] Filtros: highlight forte/muted + path expandido no canvas.
- [ ] Kanban default sem subtarefas; toggle + badge.
- [ ] Depth 9 / ciclo / cross-board parent falham no DB.
- [ ] Drag card sobre outro reparenta; drop na zona raiz promove; ciclo/depth → toast.
- [ ] Handle output: arrastar seta até outro card cria pai→filho; preview + Esc.
- [ ] Click galho → toolbar; Remover conexão / Alterar pai… / Delete keyboard.
- [ ] Vitest (`layoutOrgChart` + `canReparent` + checklist kernel) + pgTAP checklist RLS + Playwright org-chart (ou blocker env documentado).

## Decisões travadas (Visual)

| ID | Decisão |
|----|---------|
| L1 | Layout **A — org-chart vertical** |
| L2 | Nó = card + checklist |
| L3 | + Filho = card/`parent_id` + SVG |
| L4 | + To-do = checklist item |
| L5 | Reuso depth-8 / anti-ciclo |
| L6 | Filtros + Kanban toggle D.Tree |
| L7 | **DnD cross-level permitido** (reparent por drop) — supersede v1 “só irmãos” |
| L8 | Edges selecionáveis; remoção = promote root; reconectar via pick-parent |
| L9 | Sem persistência de coords livres no canvas |

## Specs vinculadas

- [card-checklist.md](./card-checklist.md)
- [card-parent-hierarchy.md](../30-data/card-parent-hierarchy.md)
- [shared-kernel-card.md](./shared-kernel-card.md)
- [board-view-modes.md](./board-view-modes.md)
- [card-drawer.md](./card-drawer.md)
- [board-kanban-dnd.md](./board-kanban-dnd.md)

## Matriz Spec → Código → Teste

| Requisito | Código | Teste |
|-----------|--------|-------|
| Checklist table + RLS | `20260716*_card_checklist_items.sql` | `42_card_checklist_items_test.sql` |
| Kernel checklist CRUD | `card-kernel/*`, `card-actions` | Vitest |
| Batch load | `board-cache.ts`, `fetch-board-cards.ts` | typecheck / unit |
| `layoutOrgChart` | `lib/card-tree/layout-org-chart.ts` | Vitest |
| `canReparent` | `lib/card-tree/index.ts` | Vitest |
| Org-chart UI + DnD/edges | `board-tree-flow.tsx` | Playwright |
| Banner description / fallback didatico | `board-view.tsx` (`tree-page-description`) | Playwright / visual |
| Drawer checklist | `card-drawer.tsx` | Playwright |
| Kanban roots + badge | `board-kanban-view.tsx` | Playwright (D.Tree) |
