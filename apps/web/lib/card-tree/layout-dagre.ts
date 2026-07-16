import dagre from "@dagrejs/dagre";
import type { BoardCard } from "@/components/board/types";
import { getTreeParents } from "./tree-parents";

export const TREE_NODE_WIDTH = 240;
export const TREE_NODE_HEIGHT = 200;
export const TREE_GAP_X = 48;
export const TREE_GAP_Y = 72;
export const TREE_COORD_MAX = 1_000_000;

export type TreeFlowPosition = { id: string; x: number; y: number };

/** Clamp canvas coords (mirrors app.clamp_tree_coord). */
export function clampTreeCoord(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(TREE_COORD_MAX, Math.max(-TREE_COORD_MAX, n));
}

/**
 * Dagre TB layout for cards in a board forest.
 * Uses canvas parents (`treeParentIds` / getTreeParents) — multi-pai ADR-0014.
 */
export function layoutWithDagre(
  cards: BoardCard[],
  opts?: { nodeWidth?: number; nodeHeight?: number; gapX?: number; gapY?: number },
): TreeFlowPosition[] {
  const nodeWidth = opts?.nodeWidth ?? TREE_NODE_WIDTH;
  const nodeHeight = opts?.nodeHeight ?? TREE_NODE_HEIGHT;
  const gapX = opts?.gapX ?? TREE_GAP_X;
  const gapY = opts?.gapY ?? TREE_GAP_Y;

  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "TB", nodesep: gapX, ranksep: gapY, marginx: 24, marginy: 24 });

  for (const c of cards) {
    g.setNode(c.id, { width: nodeWidth, height: nodeHeight });
  }
  for (const c of cards) {
    for (const parentId of getTreeParents(c)) {
      if (g.hasNode(parentId)) g.setEdge(parentId, c.id);
    }
  }

  dagre.layout(g);

  return cards.map((c) => {
    const n = g.node(c.id) as { x: number; y: number } | undefined;
    const x = n ? n.x - nodeWidth / 2 : 0;
    const y = n ? n.y - nodeHeight / 2 : 0;
    return { id: c.id, x: clampTreeCoord(x), y: clampTreeCoord(y) };
  });
}

/** Soft snap: if within threshold of another node, nudge to clear gap. */
export function softSnapPosition(
  id: string,
  x: number,
  y: number,
  others: TreeFlowPosition[],
  threshold = 28,
  gap = TREE_GAP_X,
): { x: number; y: number } {
  let nx = x;
  let ny = y;
  for (const o of others) {
    if (o.id === id) continue;
    const dx = nx - o.x;
    const dy = ny - o.y;
    if (Math.abs(dx) < threshold && Math.abs(dy) < TREE_NODE_HEIGHT * 0.6) {
      nx = o.x + (dx >= 0 ? TREE_NODE_WIDTH + gap : -(TREE_NODE_WIDTH + gap));
    }
  }
  return { x: clampTreeCoord(nx), y: clampTreeCoord(ny) };
}

/** Resolve display positions: persisted tree_x/y or Dagre for missing. */
export function resolveTreePositions(cards: BoardCard[]): TreeFlowPosition[] {
  const needsLayout = cards.some((c) => c.tree_x == null || c.tree_y == null);
  if (!needsLayout) {
    return cards.map((c) => ({
      id: c.id,
      x: clampTreeCoord(c.tree_x as number),
      y: clampTreeCoord(c.tree_y as number),
    }));
  }
  const laid = layoutWithDagre(cards);
  const byId = new Map(laid.map((p) => [p.id, p]));
  return cards.map((c) => {
    if (c.tree_x != null && c.tree_y != null) {
      return { id: c.id, x: clampTreeCoord(c.tree_x), y: clampTreeCoord(c.tree_y) };
    }
    return byId.get(c.id) ?? { id: c.id, x: 0, y: 0 };
  });
}
