# cards.parent_id — hierarquia e anti-ciclo

> Consumido por: [board-tree-view.md](../50-components/board-tree-view.md), [card-drawer.md](../50-components/card-drawer.md).

## Contexto

Coluna existente desde `0002_boards.sql`: subtarefas 1ª classe via `cards.parent_id` (mesmo board, cascade delete). Ciclo D.Tree exige validação de ciclo, depth e cross-board no DB antes de INSERT/UPDATE de `parent_id`.

## Schema (existente)

```sql
cards (
  id uuid PK,
  org_id uuid NOT NULL,
  board_id uuid NOT NULL,
  column_id uuid NOT NULL,
  parent_id uuid NULL REFERENCES cards(id) ON DELETE CASCADE,
  position text NOT NULL,  -- fractional indexing
  ...
)
```

Semântica: `parent_id` aponta para o card pai no **mesmo board**. Raiz = `parent_id IS NULL`. Status do filho = `column_id` / stage (sem enum paralelo).

## Requisitos D.Tree

### Trigger anti-ciclo + depth + board

Função `app.assert_no_card_parent_cycle(p_card_id uuid, p_parent_id uuid)`:

1. Self-parent (`p_card_id = p_parent_id`) → `RAISE EXCEPTION 'card_parent_cycle'`.
2. Caminho ancestral: nova aresta `child → parent` cria ciclo se existe caminho `parent → … → child`.
3. Recursive CTE com limite sanity; depth do filho (contando do novo parent até raiz) **≤ 8**.
4. `parent.board_id` deve igualar `child.board_id` (ou card sendo inserido no mesmo board do parent).
5. `BEFORE INSERT OR UPDATE OF parent_id` — erros:
   - `card_parent_cycle`
   - `card_parent_depth`
   - `card_parent_cross_board`

### Índice

```sql
create index cards_board_parent_position_idx
  on public.cards (board_id, parent_id, position);
```

### RPC

`update_card_fields` aceita `parent_id` no patch (`null` = promover a raiz). Triggers acima aplicam-se automaticamente no UPDATE.

### RLS

Policies existentes em `cards` (org + board ACL) permanecem; sem bypass de isolamento.

## Critérios de aceite

- [ ] Insert filho A→B, B→C OK; reparent C→A (ciclo) falha.
- [ ] Self-parent A→A falha.
- [ ] Depth 9 falha; depth 8 OK.
- [ ] Parent de outro board falha.
- [ ] Cascade delete do pai remove filhos (já existente).

## Matriz Spec → Código → Teste

| Requisito | Código | Teste |
|-----------|--------|-------|
| Cycle / depth / cross-board | `20260715180000_card_parent_hierarchy.sql` | `41_card_parent_hierarchy_test.sql` |
| Índice | mesma migration | schema pgTAP / apply |
| Patch `parent_id` | `update_card_fields` | pgTAP |
| UI forest | `lib/card-tree/` + tree view | Vitest + Playwright |
