import type { BoardCard } from "@/components/board/types";
import { getTreeParents } from "./tree-parents";

export const MAX_CARD_TREE_DEPTH = 8;

export type CardTreeNode = {
  card: BoardCard;
  children: CardTreeNode[];
  depth: number;
};

export type TreeHighlight = {
  /** Strong match (node itself matches filter). */
  strongIds: Set<string>;
  /** Ancestor of a match (muted path). */
  mutedIds: Set<string>;
  /** Nodes to auto-expand. */
  expandIds: Set<string>;
};

/** Build forest from flat cards. Orphans (missing parent) treated as roots. */
export function buildCardForest(cards: BoardCard[]): CardTreeNode[] {
  const byId = new Map<string, BoardCard>();
  for (const c of cards) byId.set(c.id, c);

  const childrenOf = new Map<string | null, BoardCard[]>();
  for (const c of cards) {
    const parentKey =
      c.parent_id && byId.has(c.parent_id) ? c.parent_id : null;
    const list = childrenOf.get(parentKey) ?? [];
    list.push(c);
    childrenOf.set(parentKey, list);
  }

  function sortSiblings(list: BoardCard[]): BoardCard[] {
    return [...list].sort((a, b) => {
      if (a.position < b.position) return -1;
      if (a.position > b.position) return 1;
      return a.id.localeCompare(b.id);
    });
  }

  function build(card: BoardCard, depth: number): CardTreeNode {
    const kids = sortSiblings(childrenOf.get(card.id) ?? []);
    return {
      card,
      depth,
      children: kids.map((k) => build(k, depth + 1)),
    };
  }

  return sortSiblings(childrenOf.get(null) ?? []).map((c) => build(c, 1));
}

/** Depth of card in forest (root = 1). Missing → 1. */
export function getDepth(cards: BoardCard[], cardId: string): number {
  const byId = new Map(cards.map((c) => [c.id, c]));
  let depth = 1;
  let cur = byId.get(cardId);
  if (!cur) return 1;
  const seen = new Set<string>();
  while (cur.parent_id && byId.has(cur.parent_id)) {
    if (seen.has(cur.id)) break;
    seen.add(cur.id);
    depth += 1;
    if (depth > MAX_CARD_TREE_DEPTH + 1) break;
    cur = byId.get(cur.parent_id)!;
  }
  return depth;
}

/** Would creating/reparenting under parentId exceed max depth? */
export function wouldExceedMaxDepth(
  cards: BoardCard[],
  parentId: string | null,
): boolean {
  if (!parentId) return false;
  return getDepth(cards, parentId) + 1 > MAX_CARD_TREE_DEPTH;
}

/** Height of subtree rooted at cardId (leaf = 1). */
export function subtreeHeight(cards: BoardCard[], cardId: string): number {
  let maxChild = 0;
  for (const c of cards) {
    if (c.parent_id !== cardId) continue;
    maxChild = Math.max(maxChild, subtreeHeight(cards, c.id));
  }
  return 1 + maxChild;
}

export type CanReparentReason = "self" | "cycle" | "depth" | "missing" | "noop";

export type CanReparentResult =
  | { ok: true }
  | { ok: false; reason: CanReparentReason };

/**
 * Client guard mirroring DB anti-ciclo + depth 8 (also rejects if moving the
 * subtree would push any descendant past max depth).
 */
export function canReparent(
  cards: BoardCard[],
  cardId: string,
  newParentId: string | null,
): CanReparentResult {
  const byId = new Map(cards.map((c) => [c.id, c]));
  const card = byId.get(cardId);
  if (!card) return { ok: false, reason: "missing" };

  if (newParentId === null) {
    if (card.parent_id == null) return { ok: false, reason: "noop" };
    return { ok: true };
  }

  if (cardId === newParentId) return { ok: false, reason: "self" };
  if (!byId.has(newParentId)) return { ok: false, reason: "missing" };
  if (card.parent_id === newParentId) return { ok: false, reason: "noop" };

  // Cycle: walking ancestors of newParent must not hit cardId
  let cur: BoardCard | undefined = byId.get(newParentId);
  const seen = new Set<string>();
  while (cur) {
    if (cur.id === cardId) return { ok: false, reason: "cycle" };
    if (!cur.parent_id || seen.has(cur.id)) break;
    seen.add(cur.id);
    cur = byId.get(cur.parent_id);
  }

  const parentDepth = getDepth(cards, newParentId);
  const height = subtreeHeight(cards, cardId);
  if (parentDepth + height > MAX_CARD_TREE_DEPTH) {
    return { ok: false, reason: "depth" };
  }

  return { ok: true };
}

export function canReparentErrorMessage(reason: CanReparentReason): string {
  switch (reason) {
    case "self":
      return "Card nao pode ser pai de si mesmo.";
    case "cycle":
      return "Hierarquia invalida (ciclo).";
    case "depth":
      return "Profundidade maxima de subtarefas (8) excedida.";
    case "missing":
      return "Card ou pai nao encontrado.";
    case "noop":
      return "Sem alteracao.";
    default: {
      const _exhaustive: never = reason;
      return _exhaustive;
    }
  }
}

export function collectAncestorIds(
  cards: BoardCard[],
  cardId: string,
): string[] {
  const byId = new Map(cards.map((c) => [c.id, c]));
  const out: string[] = [];
  const seen = new Set<string>();
  const start = byId.get(cardId);
  if (!start) return out;
  const queue = [...getTreeParents(start)];
  while (queue.length) {
    const pid = queue.pop()!;
    if (seen.has(pid) || !byId.has(pid)) continue;
    seen.add(pid);
    out.push(pid);
    const node = byId.get(pid)!;
    for (const gp of getTreeParents(node)) {
      if (!seen.has(gp)) queue.push(gp);
    }
  }
  return out;
}

/**
 * Filter highlight: node matches OR any descendant matches → keep in view.
 * Strong = node itself matches; muted = ancestor of a match; expand = path.
 */
export function filterTreeHighlight(
  cards: BoardCard[],
  matchFn: (card: BoardCard) => boolean,
): TreeHighlight {
  const strongIds = new Set<string>();
  const mutedIds = new Set<string>();
  const expandIds = new Set<string>();

  for (const c of cards) {
    if (!matchFn(c)) continue;
    strongIds.add(c.id);
    for (const anc of collectAncestorIds(cards, c.id)) {
      mutedIds.add(anc);
      expandIds.add(anc);
    }
  }

  // Ancestors that also match are strong, not muted
  for (const id of strongIds) {
    mutedIds.delete(id);
  }

  return { strongIds, mutedIds, expandIds };
}

export type ChildrenProgress = { done: number; total: number };

/** Direct children progress: tree edges + legacy parent_id. */
export function countChildrenProgress(
  cards: BoardCard[],
  parentId: string,
): ChildrenProgress {
  let done = 0;
  let total = 0;
  for (const c of cards) {
    if (!getTreeParents(c).includes(parentId)) continue;
    total += 1;
    if (c.completed_at) done += 1;
  }
  return { done, total };
}

/** Descendants under rootId (excludes root). O(n). */
export function countDescendants(cards: BoardCard[], rootId: string): number {
  const kids = new Map<string, string[]>();
  for (const c of cards) {
    if (!c.parent_id) continue;
    const list = kids.get(c.parent_id) ?? [];
    list.push(c.id);
    kids.set(c.parent_id, list);
  }
  let n = 0;
  const stack = [...(kids.get(rootId) ?? [])];
  const seen = new Set<string>();
  while (stack.length) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    n += 1;
    const next = kids.get(id);
    if (next) stack.push(...next);
  }
  return n;
}

/** Flatten visible nodes respecting expand set (missing = collapsed). */
export function flattenVisibleForest(
  forest: CardTreeNode[],
  expandedIds: Set<string>,
): CardTreeNode[] {
  const out: CardTreeNode[] = [];
  function walk(nodes: CardTreeNode[]) {
    for (const n of nodes) {
      out.push(n);
      if (n.children.length > 0 && expandedIds.has(n.card.id)) {
        walk(n.children);
      }
    }
  }
  walk(forest);
  return out;
}

export { layoutOrgChart } from "./layout-org-chart";
export {
  layoutWithDagre,
  resolveTreePositions,
  softSnapPosition,
  clampTreeCoord,
  TREE_NODE_WIDTH,
  TREE_NODE_HEIGHT,
} from "./layout-dagre";
export {
  canLinkTree,
  canLinkTreeErrorMessage,
  getTreeParents,
  groupTreeParentsByChild,
  resolveTreeParentIds,
} from "./tree-parents";
export type { CanLinkTreeReason, CanLinkTreeResult } from "./tree-parents";
export type {
  OrgChartEdge,
  OrgChartLayout,
  OrgChartLayoutOpts,
  OrgChartNodePos,
} from "./layout-org-chart";
export type { TreeFlowPosition } from "./layout-dagre";
