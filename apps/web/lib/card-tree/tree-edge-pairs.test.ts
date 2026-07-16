import { describe, expect, it } from "vitest";
import { treeEdgePairs } from "./tree-edge-pairs";
import type { BoardCard } from "@/components/board/types";

function stub(partial: Partial<BoardCard> & Pick<BoardCard, "id">): BoardCard {
  return {
    column_id: "c1",
    position: "a0",
    parent_id: null,
    tree_x: null,
    tree_y: null,
    title: partial.id,
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

describe("treeEdgePairs", () => {
  it("skips parents missing from the visible set", () => {
    const cards = [
      stub({ id: "child", treeParentIds: ["visible", "missing"] }),
      stub({ id: "visible" }),
    ];
    expect(treeEdgePairs(cards)).toEqual([{ parentId: "visible", childId: "child" }]);
  });
});
