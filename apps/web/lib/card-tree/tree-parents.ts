import type { BoardCard } from "@/components/board/types";

export const MAX_TREE_LINK_DEPTH = 8;

export type CanLinkTreeReason = "self" | "cycle" | "depth" | "missing" | "noop";

export type CanLinkTreeResult =
  | { ok: true }
  | { ok: false; reason: CanLinkTreeReason };

/** Group card_tree_edges by child → parent ids. */
export function groupTreeParentsByChild(
  rows: { child_card_id: string; parent_card_id: string }[],
): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const row of rows) {
    const list = map.get(row.child_card_id) ?? [];
    list.push(row.parent_card_id);
    map.set(row.child_card_id, list);
  }
  return map;
}

/**
 * Resolve parents for a card: `card_tree_edges ∪ {parent_id}` (dedupe).
 * Union evita (1) 2º edge “substituir” seed legado e (2) perder multi-pai no refetch.
 * Unlink limpa `parent_id` quando a conexão removida era esse pai.
 */
export function resolveTreeParentIds(
  cardId: string,
  parentId: string | null,
  byChild: Map<string, string[]>,
): string[] {
  const edges = byChild.get(cardId) ?? [];
  if (parentId && !edges.includes(parentId)) {
    return [...edges, parentId];
  }
  return edges;
}

/** Parents for canvas/guards: `treeParentIds` (já seedado no load); senão parent_id. */
export function getTreeParents(card: BoardCard): string[] {
  if (card.treeParentIds != null) return card.treeParentIds;
  return card.parent_id ? [card.parent_id] : [];
}

/**
 * Client guard for multi-parent tree edges (ADR-0014).
 * Allows a child to gain an additional parent unless cycle/depth/noop.
 */
export function canLinkTree(
  cards: BoardCard[],
  childId: string,
  parentId: string,
): CanLinkTreeResult {
  const byId = new Map(cards.map((c) => [c.id, c]));
  const child = byId.get(childId);
  const parent = byId.get(parentId);
  if (!child || !parent) return { ok: false, reason: "missing" };
  if (childId === parentId) return { ok: false, reason: "self" };

  const existing = getTreeParents(child);
  if (existing.includes(parentId)) return { ok: false, reason: "noop" };

  const seen = new Set<string>();
  const queue = [parentId];
  while (queue.length) {
    const id = queue.pop()!;
    if (id === childId) return { ok: false, reason: "cycle" };
    if (seen.has(id)) continue;
    seen.add(id);
    const node = byId.get(id);
    if (!node) continue;
    for (const p of getTreeParents(node)) {
      if (!seen.has(p)) queue.push(p);
    }
  }

  function depthOf(id: string, stack: Set<string>): number {
    if (stack.has(id)) return 1;
    stack.add(id);
    const node = byId.get(id);
    if (!node) {
      stack.delete(id);
      return 1;
    }
    const parents = getTreeParents(node);
    if (parents.length === 0) {
      stack.delete(id);
      return 1;
    }
    let max = 0;
    for (const p of parents) {
      max = Math.max(max, depthOf(p, stack));
    }
    stack.delete(id);
    return max + 1;
  }

  if (depthOf(parentId, new Set()) + 1 > MAX_TREE_LINK_DEPTH) {
    return { ok: false, reason: "depth" };
  }

  return { ok: true };
}

export function canLinkTreeErrorMessage(reason: CanLinkTreeReason): string {
  switch (reason) {
    case "self":
      return "Nao e possivel conectar um card a si mesmo.";
    case "cycle":
      return "Hierarquia invalida (ciclo).";
    case "depth":
      return "Profundidade maxima (8) excedida.";
    case "missing":
      return "Card nao encontrado.";
    case "noop":
      return "Ja conectado.";
    default:
      return "Conexao invalida.";
  }
}
