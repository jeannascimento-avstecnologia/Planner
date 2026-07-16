import type { BoardCard } from "@/components/board/types";
import { getTreeParents } from "./tree-parents";

/** Pares pai→filho só quando ambos existem no set (evita crash @xyflow). */
export function treeEdgePairs(cards: BoardCard[]): { parentId: string; childId: string }[] {
  const nodeIds = new Set(cards.map((c) => c.id));
  const out: { parentId: string; childId: string }[] = [];
  for (const c of cards) {
    for (const parentId of getTreeParents(c)) {
      if (!nodeIds.has(parentId)) continue;
      out.push({ parentId, childId: c.id });
    }
  }
  return out;
}
