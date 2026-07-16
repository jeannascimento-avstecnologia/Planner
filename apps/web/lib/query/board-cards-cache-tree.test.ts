import { describe, expect, it } from "vitest";
import { applyTreeLinkToList, applyTreeUnlinkToList } from "./board-cards-cache";
import type { BoardCard } from "@/components/board/types";
import { resolveTreeParentIds, groupTreeParentsByChild } from "@/lib/card-tree/tree-parents";

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

describe("applyTreeUnlinkToList vs resolve union (no zombie edge)", () => {
  it("after unlink last parent, resolve stays empty", () => {
    const before = [stub({ id: "c", parent_id: "p", treeParentIds: ["p"] }), stub({ id: "p" })];
    const after = applyTreeUnlinkToList(before, "c", "p");
    const child = after.find((c) => c.id === "c")!;
    expect(child.treeParentIds).toEqual([]);
    expect(child.parent_id).toBeNull();
    const byChild = groupTreeParentsByChild([]);
    expect(resolveTreeParentIds("c", child.parent_id, byChild)).toEqual([]);
  });

  it("unlink one of two parents keeps the other", () => {
    const before = [
      stub({ id: "c", parent_id: "a", treeParentIds: ["a", "b"] }),
      stub({ id: "a" }),
      stub({ id: "b" }),
    ];
    const after = applyTreeUnlinkToList(before, "c", "b");
    const child = after.find((c) => c.id === "c")!;
    expect(child.treeParentIds).toEqual(["a"]);
    expect(child.parent_id).toBe("a");
  });
});

describe("applyTreeLinkToList multi-pai", () => {
  it("2nd parent keeps parent_id seed even if treeParentIds empty", () => {
    const before = [
      stub({ id: "c", parent_id: "a", treeParentIds: [] }),
      stub({ id: "a" }),
      stub({ id: "b" }),
    ];
    const after = applyTreeLinkToList(before, "c", "b");
    const child = after.find((c) => c.id === "c")!;
    expect(child.treeParentIds.sort()).toEqual(["a", "b"]);
    expect(child.parent_id).toBe("a");
  });

  it("adds second parent alongside existing treeParentIds", () => {
    const before = [
      stub({ id: "c", parent_id: "a", treeParentIds: ["a"] }),
      stub({ id: "a" }),
      stub({ id: "b" }),
    ];
    const after = applyTreeLinkToList(before, "c", "b");
    expect(after.find((c) => c.id === "c")!.treeParentIds.sort()).toEqual(["a", "b"]);
  });
});
