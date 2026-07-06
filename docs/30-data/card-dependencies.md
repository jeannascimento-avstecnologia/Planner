# card_dependencies — schema e anti-ciclo

> Consumido por: [views-interactive.md](../50-components/views-interactive.md), [card-drawer.md](../50-components/card-drawer.md).

## Contexto

Tabela existente desde `0002_boards.sql`: dependências finish-to-start entre cards do mesmo board. Fase D exige validação de ciclo no DB antes de INSERT/UPDATE.

## Schema (existente)

```sql
card_dependencies (
  id uuid PK,
  org_id uuid NOT NULL,
  board_id uuid NOT NULL,
  blocker_id uuid NOT NULL REFERENCES cards,
  blocked_id uuid NOT NULL REFERENCES cards,
  UNIQUE (blocker_id, blocked_id)
)
```

Semântica: `blocker` deve terminar antes de `blocked` iniciar (FS).

## Requisitos Fase 2

### Trigger anti-ciclo

Função `app.assert_no_dependency_cycle(p_blocker uuid, p_blocked uuid)`:

1. Grafo direcionado: aresta `blocker → blocked`.
2. Nova aresta `(A,B)` cria ciclo se existe caminho `B → … → A`.
3. DFS iterativo com limite profundidade 500 (sanity).
4. `BEFORE INSERT OR UPDATE` — `RAISE EXCEPTION 'dependency_cycle'`.

### Emissão audit

- `dependency_created` / `dependency_removed` via trigger em `card_dependencies`.

### RLS

- Mantém policies existentes `card_deps_select` / `card_deps_write` + `can_write_board`.

## Critérios de aceite

- [ ] Insert A→B, B→C OK; insert C→A falha.
- [ ] Self-edge A→A falha (check constraint ou trigger).
- [ ] Cross-board dependency proibido (FK + check `blocker.board_id = blocked.board_id`).

## Matriz Spec → Código → Teste

| Requisito | Código | Teste |
|-----------|--------|-------|
| Cycle DFS | `*_card_dependencies_cycle.sql` | `33_card_dependencies_cycle_test.sql` |
| Audit emit | trigger on deps | pgTAP |
| Cross-board guard | constraint/trigger | pgTAP |
