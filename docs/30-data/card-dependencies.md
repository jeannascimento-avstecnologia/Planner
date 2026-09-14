# card_dependencies — schema e anti-ciclo

> Consumido por: [views-interactive.md](../50-components/views-interactive.md), [timeline-redesign.md](../40-features/timeline-redesign.md), [card-drawer.md](../50-components/card-drawer.md).

## Contexto

Tabela existente desde `0002_boards.sql`: dependências finish-to-start. Fase D (Timeline v1) **só lê** arestas para desenhar setas. Create/delete na Timeline = fast-follow.

## Schema (real — `0002_boards.sql`)

```sql
card_dependencies (
  id uuid PK,
  org_id uuid NOT NULL REFERENCES organizations,
  blocker_card_id uuid NOT NULL REFERENCES cards ON DELETE CASCADE,
  blocked_card_id uuid NOT NULL REFERENCES cards ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'finish_to_start',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (blocker_card_id, blocked_card_id),
  CHECK (blocker_card_id <> blocked_card_id)
)
```

Não há coluna `board_id`. Semântica: `blocker` deve terminar antes de `blocked` iniciar (FS). O loader da Timeline aceita só arestas cujos **dois** endpoints pertencem ao conjunto de cards do board.

## Anti-ciclo (implementado)

Migration `20260706170000_card_dependencies_cycle.sql`:

- `app.assert_no_dependency_cycle(p_blocker uuid, p_blocked uuid)` — CTE recursivo `blocked → … → blocker`.
- Trigger `card_dependencies_cycle` BEFORE INSERT OR UPDATE.
- Self-edge: check constraint + exception `dependency_cycle` (P0001).
- Sem limite explícito de profundidade 500 (a spec antiga descrevia DFS com cap; o código usa recursive CTE).

**Dívida:** `33_card_dependencies_cycle_test.sql` citado em versões anteriores **não existe**. Não ampliar nesta fatia SELECT.

## RLS

| Policy | Regra |
|--------|-------|
| `card_deps_select` | `app.can_access_board(board do blocker)` + `blocker.org_id = card_dependencies.org_id` (migration `20260909170000_card_dependencies_select_board_access.sql`) |
| `card_deps_write` | `app.can_write_board` no board do blocker (`0003_tags_and_write_board.sql`) — **intocada** nesta fatia |

SELECT cobre org member e convidado somente ao board. Sem acesso ao board do blocker → zero rows.

## Dívidas (não nesta fatia)

- Guard cross-board no DB (FK não impede boards distintos da mesma org). Loader filtra no app.
- Audit `dependency_created` / `dependency_removed` — sem trigger.
- `org_id` no INSERT continua manual (server action futura deve derivar do card blocker).

## Critérios de aceite (esta fatia)

- [ ] Org member lê dependências do board.
- [ ] Board-only member lê dependências do board convidado.
- [ ] Usuário sem acesso / outro tenant não lê.
- [ ] Write policy e trigger anti-ciclo permanecem inalterados.

## Matriz Spec → Código → Teste

| Requisito | Código | Teste |
|-----------|--------|-------|
| SELECT board access | `20260909170000_card_dependencies_select_board_access.sql` | `50_card_dependencies_select_test.sql` |
| Cycle CTE | `20260706170000_card_dependencies_cycle.sql` | dívida (sem `33_*`) |
| Setas Timeline | `timeline-dependency-layer.tsx` | `e2e/timeline.spec.ts` |
