# ADR-0014: Arestas multi-pai no canvas árvore (`card_tree_edges`)

- Status: Aceito (produto 2026-07-16)
- Data: 2026-07-16
- Supersede parcial: leitura de hierarquia no canvas deixa de ser só `cards.parent_id`

## Contexto

Runtime evidenciou: 2ª conexão filho→novo pai **substitui** `parent_id` (árvore 1:1). Produto exige **N pais por filho** no `?view=tree` (DAG / organograma com múltiplas linhas).

Guia mestre mantém subtarefas 1ª classe via `parent_id` (Kanban/drawer). Multi-pai no canvas **não** substitui subtarefa; é camada de associação do organograma.

## Decisão

| Peça | Escolha |
|------|---------|
| Persistência multi-pai | Tabela `card_tree_edges (org_id, board_id, parent_card_id, child_card_id)` UNIQUE(parent, child) |
| `cards.parent_id` | Continua = **pai primário** (subtarefa Kanban); sync best-effort |
| Canvas `?view=tree` | Edges = `card_tree_edges` (+ seed legado de `parent_id`) |
| Connect | INSERT edge only (não seta `parent_id` — subtarefa Kanban fica explícita) |
| Disconnect | DELETE edge; se era o `parent_id`, promover outro edge restante ou null |
| Anti-ciclo | Trigger em edges (mesmo board, depth path ≤ 8 via BFS/DFS no grafo de edges+parent) |

## Consequências

- Migration + RLS + pgTAP
- Kernel: `linkTreeEdge` / `unlinkTreeEdge`
- `board-tree-flow` deixa de usar só `commitReparent` no connect
- Vitest + budgets: writes edge sem storm RSC

## Alternativas rejeitadas

- Só `parent_id`: impossível N pais
- Substituir subtarefas por junction em todo o app: blast radius alto no Kanban
- Reusar `card_dependencies` (semântica finish-to-start ≠ organograma)
