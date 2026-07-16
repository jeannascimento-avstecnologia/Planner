import type { BoardCard } from "@/components/board/types";

export type OrgChartLayoutOpts = {
  nodeWidth?: number;
  nodeHeight?: number;
  gapX?: number;
  gapY?: number;
};

export type OrgChartNodePos = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  depth: number;
};

export type OrgChartEdge = {
  parentId: string;
  childId: string;
  /** SVG path d — elbow M x1 y1 V mid H x2 V y2 */
  path: string;
};

export type OrgChartLayout = {
  nodes: OrgChartNodePos[];
  edges: OrgChartEdge[];
  width: number;
  height: number;
};

/** Structural forest node (compatible with CardTreeNode). */
export type OrgChartForestNode = {
  card: BoardCard;
  children: OrgChartForestNode[];
  depth: number;
};

const DEFAULTS = {
  nodeWidth: 220,
  nodeHeight: 160,
  gapX: 32,
  gapY: 48,
} as const;

type Measured = {
  node: OrgChartForestNode;
  subtreeWidth: number;
};

/**
 * Layout BFS/recursivo: irmãos lado a lado; largura da subtárvore =
 * max(nodeWidth, soma dos filhos + gaps).
 */
export function layoutOrgChart(
  forest: OrgChartForestNode[],
  opts: OrgChartLayoutOpts = {},
): OrgChartLayout {
  const nodeWidth = opts.nodeWidth ?? DEFAULTS.nodeWidth;
  const nodeHeight = opts.nodeHeight ?? DEFAULTS.nodeHeight;
  const gapX = opts.gapX ?? DEFAULTS.gapX;
  const gapY = opts.gapY ?? DEFAULTS.gapY;

  function measure(node: OrgChartForestNode): Measured {
    if (node.children.length === 0) {
      return { node, subtreeWidth: nodeWidth };
    }
    const kids = node.children.map(measure);
    const kidsWidth =
      kids.reduce((sum, k) => sum + k.subtreeWidth, 0) + gapX * (kids.length - 1);
    return { node, subtreeWidth: Math.max(nodeWidth, kidsWidth) };
  }

  const measuredRoots = forest.map(measure);
  const nodes: OrgChartNodePos[] = [];
  const edges: OrgChartEdge[] = [];

  function place(measured: Measured, left: number, top: number) {
    const { node, subtreeWidth } = measured;
    const x = left + (subtreeWidth - nodeWidth) / 2;
    const y = top;
    nodes.push({ id: node.card.id, x, y, w: nodeWidth, h: nodeHeight, depth: node.depth });

    if (node.children.length === 0) return;

    const kids = node.children.map(measure);
    const kidsWidth =
      kids.reduce((sum, k) => sum + k.subtreeWidth, 0) + gapX * (kids.length - 1);
    let cursor = left + (subtreeWidth - kidsWidth) / 2;
    const childTop = top + nodeHeight + gapY;

    for (const kid of kids) {
      const childX = cursor + (kid.subtreeWidth - nodeWidth) / 2;
      const parentCx = x + nodeWidth / 2;
      const parentBottom = y + nodeHeight;
      const childCx = childX + nodeWidth / 2;
      const childTopY = childTop;
      const midY = parentBottom + gapY / 2;
      edges.push({
        parentId: node.card.id,
        childId: kid.node.card.id,
        path: `M ${parentCx} ${parentBottom} V ${midY} H ${childCx} V ${childTopY}`,
      });
      place(kid, cursor, childTop);
      cursor += kid.subtreeWidth + gapX;
    }
  }

  let rootLeft = 0;
  for (const root of measuredRoots) {
    place(root, rootLeft, 0);
    rootLeft += root.subtreeWidth + gapX;
  }

  const width =
    nodes.length === 0
      ? 0
      : Math.max(...nodes.map((n) => n.x + n.w)) + gapX;
  const height =
    nodes.length === 0
      ? 0
      : Math.max(...nodes.map((n) => n.y + n.h)) + gapY;

  return { nodes, edges, width, height };
}
