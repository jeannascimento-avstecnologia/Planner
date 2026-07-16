# card_tree_edges — multi-pai no organograma

> ADR: [ADR-0014](../20-architecture/ADR-0014-tree-multi-parent-edges.md)  
> UI: [board-tree-view.md](../50-components/board-tree-view.md)

## Contexto

`cards.parent_id` = pai **primário** (subtarefa Kanban). Canvas precisa de **N pais** por filho.

## Schema

```sql
card_tree_edges (
  id uuid PK default gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations ON DELETE CASCADE,
  board_id uuid NOT NULL REFERENCES boards ON DELETE CASCADE,
  parent_card_id uuid NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  child_card_id uuid NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL default now(),
  UNIQUE (parent_card_id, child_card_id),
  CHECK (parent_card_id <> child_card_id)
)
```

Índices: `(board_id)`, `(child_card_id)`, `(parent_card_id)`.

## RLS

- SELECT: `app.can_access_board(board_id)`
- INSERT/UPDATE/DELETE: `app.can_write_board(board_id)`
- WITH CHECK: org/board alinhados aos dois cards; mesmo `board_id`

## Regras

1. Seed: INSERT a partir de `cards.parent_id` existentes (idempotente).
2. Anti-ciclo / depth ≤ 8 no grafo de edges (trigger).
3. Connect canvas → INSERT edge only (não altera `parent_id`; subtarefa Kanban é explícita).
4. Disconnect → DELETE edge; se `parent_id` era esse pai → outro edge ou null.
5. `+ Filho` na árvore → cria card raiz (`parent_id` null) + INSERT edge (visível no Kanban).

## Aceite

- [ ] Filho com 2+ pais: 2 edges visíveis; nenhum corte automático
- [ ] Ciclo / cross-board / depth → erro
- [ ] pgTAP RLS + ciclo
