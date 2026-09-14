import type { CardDependencyRow } from "@/components/board/types";

export interface TimelineBarRect {
  cardId: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TimelineDependencyPath {
  dependencyId: string;
  d: string;
}

const STUB_PX = 10;

function orthogonalPath(from: TimelineBarRect, to: TimelineBarRect): string {
  const x1 = from.x + from.width;
  const y1 = from.y + from.height / 2;
  const x2 = to.x;
  const y2 = to.y + to.height / 2;
  if (y1 === y2) {
    return `M ${x1} ${y1} L ${x2} ${y2}`;
  }
  const mid = x1 + STUB_PX;
  return `M ${x1} ${y1} H ${mid} V ${y2} H ${x2}`;
}

export function buildTimelineDependencyPaths(
  dependencies: CardDependencyRow[],
  rectsByCardId: ReadonlyMap<string, TimelineBarRect>,
): TimelineDependencyPath[] {
  const paths: TimelineDependencyPath[] = [];
  const sorted = [...dependencies].sort((a, b) => a.id.localeCompare(b.id));
  for (const dep of sorted) {
    if (dep.type !== "finish_to_start") continue;
    const from = rectsByCardId.get(dep.blocker_card_id);
    const to = rectsByCardId.get(dep.blocked_card_id);
    if (!from || !to) continue;
    paths.push({ dependencyId: dep.id, d: orthogonalPath(from, to) });
  }
  return paths;
}

export function filterBoardDependencies(
  rows: readonly { id: string; blocker_card_id: string; blocked_card_id: string; type: string }[],
  cardIds: ReadonlySet<string>,
): CardDependencyRow[] {
  const seen = new Set<string>();
  const out: CardDependencyRow[] = [];
  for (const row of rows) {
    if (row.type !== "finish_to_start") continue;
    if (!cardIds.has(row.blocker_card_id) || !cardIds.has(row.blocked_card_id)) continue;
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    out.push({
      id: row.id,
      blocker_card_id: row.blocker_card_id,
      blocked_card_id: row.blocked_card_id,
      type: "finish_to_start",
    });
  }
  return out;
}
