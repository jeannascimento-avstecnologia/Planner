# Card Checklist Items (D.Tree.Visual)

> **Status:** APROVADO (ciclo D.Tree.Visual)  
> **Plano:** `/Users/jean.nascimento/.cursor/plans/visual_org-chart_tree_9142d185.plan.md`  
> **Consumido por:** [board-tree-view.md](./board-tree-view.md), [card-drawer.md](./card-drawer.md)  
> **Gate SDD:** esta spec antes da migration.

## Contexto

Guia mestre: subtarefas 1ª classe = `cards.parent_id` (status/assignee próprios) **≠** checklist. Não existia tabela de checklist. Org-chart precisa de to-dos com check **dentro do nó-card**, sem criar card filho.

## Objetivos

- Entidade `card_checklist_items` 1ª classe (tenant + RLS).
- CRUD: create / toggle `done` / reorder `position` / delete.
- Load batch por board (sem N+1).
- Viewer: select OK; mutações bloqueadas (`can_write_board`).
- UI: inline no nó org-chart + seção no drawer.

## Não-objetivos

- Checklist item como subtarefa/`parent_id`.
- Nested checklist / seções.
- Realtime dedicado checklist (invalidate board snapshot basta v1).
- Mentions / assignee por item.

## Requisitos

### R1 — Schema

```sql
card_checklist_items (
  id uuid PK default gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations ON DELETE CASCADE,
  board_id uuid NOT NULL REFERENCES boards ON DELETE CASCADE,
  card_id uuid NOT NULL REFERENCES cards ON DELETE CASCADE,
  title text NOT NULL,
  done boolean NOT NULL DEFAULT false,
  position text NOT NULL,  -- fractional indexing
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
)
```

Índices: `(card_id, position)`, `(board_id)`, `(org_id)`.  
Trigger `app.set_updated_at()` em UPDATE.  
Constraint: `title` trimmed length 1..200 (check ou app-layer Zod).

### R2 — RLS

- SELECT: `app.can_access_board(board_id)` (ou via card → board).
- INSERT/UPDATE/DELETE: `app.can_write_board(board_id)`.
- WITH CHECK: `org_id`/`board_id` alinhados ao card (`card.org_id` / `card.board_id`).
- Grants: `authenticated` select/insert/update/delete.

### R3 — Kernel + contratos

Zod (packages/contracts):

- `createChecklistItemInput`: `{ cardId, title }`
- `toggleChecklistItemInput`: `{ itemId, done }`
- `reorderChecklistItemInput`: `{ itemId, position }`
- `deleteChecklistItemInput`: `{ itemId }`

Mutations em `card-kernel`: resolve `org_id`/`board_id` do card; `lexoPosition` no create; sanitize title; revalidate board. Viewer / sem write → erro claro (RLS ou guard).

### R4 — Load

- `board-cache` / `fetch-board-cards`: uma query `.in("card_id", cardIds).order("position")`; agrupar em `BoardCard.checklistItems`.
- Tipo: `{ id, title, done, position }[]`.

### R5 — UI

- `ChecklistEditor`: add / toggle / delete; **check circular** (verde + ícone quando `done`); viewer read-only.
- Em nós React Flow: classes `nodrag nopan` nos controles interativos.
- Após mutação: **optimistic + invalidate** `boardCardsQueryKey` (Realtime v1 só escuta `cards`, não checklist).
- Título renderizado como texto (React) — sem `dangerouslySetInnerHTML` (anti-XSS).

## Critérios de aceite

- [ ] Member com write cria/toggle/reorder/delete item no card.
- [ ] Viewer vê items; mutação falha (RLS / action).
- [ ] Cross-org / board alheio: SELECT vazio / write negado (IDOR).
- [ ] Cascade: delete card remove items.
- [ ] Batch load: 1 query checklist por board snapshot.
- [ ] pgTAP + Vitest verdes.

## Questões abertas → decisões

| # | Questão | Decisão |
|---|---------|---------|
| C1 | Checklist vs subtarefa | Checklist = tabela; filho = `parent_id` |
| C2 | Ordem | Fractional indexing (`position` text) |
| C3 | Escopo write | `can_write_board` (igual cards) |
| C4 | Realtime item | Não v1; invalidate snapshot |

## Specs vinculadas

- [board-tree-view.md](./board-tree-view.md)
- [shared-kernel-card.md](./shared-kernel-card.md)
- [card-parent-hierarchy.md](../30-data/card-parent-hierarchy.md)

## Matriz Spec → Código → Teste

| Requisito | Código | Teste |
|-----------|--------|-------|
| Tabela + índices + updated_at | migration `20260716*_card_checklist_items.sql` | apply + pgTAP |
| RLS select/write + org align | mesma migration | `42_card_checklist_items_test.sql` |
| Zod + kernel mutations | `schemas.ts`, `card-kernel/*`, `card-actions` | Vitest |
| Batch load | `board-cache.ts`, `fetch-board-cards.ts` | unit / typecheck |
| UI editor + drawer | `ChecklistEditor`, tree node, drawer | Playwright |
