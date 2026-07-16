import type { BoardCard } from "@/components/board/types";

/**
 * Kanban default (sem "mostrar subtarefas"): só raízes (`parent_id` null).
 * `+ Adicionar card Filho` na árvore cria raiz (`parent_id` null) + `card_tree_edges`
 * — aparece no Kanban/tabela/calendário sem toggle (ADR-0014 / card-tree-edges.md).
 * Arestas de organograma (`treeParentIds`) não escondem o card.
 * Subtarefa explícita do drawer (`parent_id` set) continua ocultável via toggle.
 */
export function isKanbanVisibleCard(card: BoardCard): boolean {
  return card.parent_id == null;
}
