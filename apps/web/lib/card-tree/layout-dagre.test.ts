import { describe, expect, it } from "vitest";
import type { BoardCard } from "@/components/board/types";
import {
  clampTreeCoord,
  layoutWithDagre,
  resolveTreePositions,
  softSnapPosition,
  TREE_COORD_MAX,
} from "./layout-dagre";

function card(partial: Partial<BoardCard> & { id: string; title: string }): BoardCard {
  return {
    column_id: "col",
    position: "a0",
    parent_id: null,
    tree_x: null,
    tree_y: null,
    description: null,
    priority: "medium",
    due_date: null,
    start_date: null,
    target_date: null,
    estimated_hours: null,
    story_points: null,
    assignee_id: null,
    completed_at: null,
    stage_id: null,
    tagIds: [],
    checklistItems: [],
    treeParentIds: [],
    tiflux_ticket_number: null,
    tiflux_ticket_id: null,
    tiflux_canceled_tickets: [],
    ...partial,
  };
}

describe("layout-dagre", () => {
  it("clamps coords", () => {
    expect(clampTreeCoord(TREE_COORD_MAX + 1)).toBe(TREE_COORD_MAX);
    expect(clampTreeCoord(-TREE_COORD_MAX - 1)).toBe(-TREE_COORD_MAX);
    expect(clampTreeCoord(Number.NaN)).toBe(0);
  });

  it("layouts parent above child via treeParentIds", () => {
    const cards = [
      card({ id: "p", title: "P" }),
      card({ id: "c", title: "C", treeParentIds: ["p"] }),
    ];
    const pos = layoutWithDagre(cards);
    const p = pos.find((x) => x.id === "p")!;
    const c = pos.find((x) => x.id === "c")!;
    expect(c.y).toBeGreaterThan(p.y);
  });

  it("layouts multi-parent child below both parents", () => {
    const cards = [
      card({ id: "a", title: "A" }),
      card({ id: "b", title: "B" }),
      card({ id: "c", title: "C", treeParentIds: ["a", "b"] }),
    ];
    const pos = layoutWithDagre(cards);
    const a = pos.find((x) => x.id === "a")!;
    const b = pos.find((x) => x.id === "b")!;
    const c = pos.find((x) => x.id === "c")!;
    expect(c.y).toBeGreaterThan(a.y);
    expect(c.y).toBeGreaterThan(b.y);
  });

  it("resolveTreePositions uses persisted when all set", () => {
    const cards = [
      card({ id: "a", title: "A", tree_x: 10, tree_y: 20 }),
      card({ id: "b", title: "B", tree_x: 100, tree_y: 200 }),
    ];
    const pos = resolveTreePositions(cards);
    expect(pos).toEqual([
      { id: "a", x: 10, y: 20 },
      { id: "b", x: 100, y: 200 },
    ]);
  });

  it("softSnap nudges overlapping x", () => {
    const snapped = softSnapPosition("a", 5, 0, [{ id: "b", x: 0, y: 0 }], 28, 48);
    expect(Math.abs(snapped.x - 0)).toBeGreaterThan(200);
  });
});
