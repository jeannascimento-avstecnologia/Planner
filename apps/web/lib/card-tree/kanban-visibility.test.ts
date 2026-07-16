import { describe, expect, it } from "vitest";
import { isKanbanVisibleCard } from "./kanban-visibility";
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

describe("isKanbanVisibleCard", () => {
  it("shows root cards (parent_id null)", () => {
    expect(isKanbanVisibleCard(stub({ id: "r", parent_id: null, treeParentIds: ["x"] }))).toBe(
      true,
    );
  });

  it("shows tree +Filho organogram child (null parent_id + tree edge)", () => {
    expect(
      isKanbanVisibleCard(stub({ id: "child", parent_id: null, treeParentIds: ["parent"] })),
    ).toBe(true);
  });

  it("hides Kanban subtarefas regardless of treeParentIds seed/union", () => {
    expect(
      isKanbanVisibleCard(stub({ id: "s", parent_id: "p", treeParentIds: ["p"] })),
    ).toBe(false);
    expect(
      isKanbanVisibleCard(stub({ id: "s2", parent_id: "p", treeParentIds: [] })),
    ).toBe(false);
  });
});
