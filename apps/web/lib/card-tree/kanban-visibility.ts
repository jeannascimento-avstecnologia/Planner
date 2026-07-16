import type { BoardCard } from "@/components/board/types";

/**
 * Kanban default (sem "mostrar subtarefas"): só raízes (`parent_id` null).
 * Arestas de organograma (`card_tree_edges` / `treeParentIds`) não alteram
 * visibilidade Kanban — subtarefa = só `parent_id` (ADR-0014).
 */
export function isKanbanVisibleCard(card: BoardCard): boolean {
  return card.parent_id == null;
}
