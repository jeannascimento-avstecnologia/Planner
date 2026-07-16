import { describe, expect, it } from "vitest";
import {
  getTreeParents,
  groupTreeParentsByChild,
  resolveTreeParentIds,
} from "./tree-parents";
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

describe("resolveTreeParentIds / getTreeParents", () => {
  it("union: edges + distinct parent_id seed (multi-pai)", () => {
    const byChild = groupTreeParentsByChild([
      { child_card_id: "c", parent_card_id: "b" },
    ]);
    expect(resolveTreeParentIds("c", "a", byChild)).toEqual(["b", "a"]);
  });

  it("union: does not duplicate parent_id already in edges", () => {
    const byChild = groupTreeParentsByChild([
      { child_card_id: "c", parent_card_id: "a" },
      { child_card_id: "c", parent_card_id: "b" },
    ]);
    expect(resolveTreeParentIds("c", "a", byChild)).toEqual(["a", "b"]);
  });

  it("seed only when no edges", () => {
    const byChild = groupTreeParentsByChild([]);
    expect(resolveTreeParentIds("x", "legacy", byChild)).toEqual(["legacy"]);
    expect(resolveTreeParentIds("x", null, byChild)).toEqual([]);
  });

  it("post-unlink with parent cleared: empty edges + null parent_id", () => {
    const byChild = groupTreeParentsByChild([]);
    expect(resolveTreeParentIds("c", null, byChild)).toEqual([]);
  });

  it("getTreeParents uses treeParentIds even when empty (no parent_id zombie)", () => {
    expect(getTreeParents(stub({ id: "c", parent_id: "p", treeParentIds: [] }))).toEqual([]);
    expect(
      getTreeParents(stub({ id: "c", parent_id: "p", treeParentIds: ["a", "b"] })),
    ).toEqual(["a", "b"]);
  });
});
