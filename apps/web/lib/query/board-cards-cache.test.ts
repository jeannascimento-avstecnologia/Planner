import { describe, expect, it } from "vitest";
import {
  applyCardMoveToList,
  applyCardReparentToList,
  applyChecklistToggleToList,
  shouldIgnoreRemoteCardsSync,
} from "./board-cards-cache";
import type { BoardCard } from "@/components/board/types";

function stub(partial: Partial<BoardCard> & Pick<BoardCard, "id" | "column_id" | "position" | "title">): BoardCard {
  return {
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
    parent_id: null,
    tree_x: null,
    tree_y: null,
    checklistItems: [],
    treeParentIds: [],
    tiflux_ticket_number: null,
    tiflux_ticket_id: null,
    tiflux_canceled_tickets: [],
    ...partial,
  };
}

describe("applyCardMoveToList", () => {
  const cards = [
    stub({ id: "a", column_id: "c1", position: "a0", title: "A" }),
    stub({ id: "b", column_id: "c1", position: "a1", title: "B" }),
  ];

  it("patches column_id + position O(1)", () => {
    const next = applyCardMoveToList(cards, "a", "c2", "a5");
    expect(next[0]).toEqual({ ...cards[0], column_id: "c2", position: "a5" });
    expect(next[1]).toBe(cards[1]);
  });

  it("returns same list when card missing", () => {
    expect(applyCardMoveToList(cards, "missing", "c2", "a5")).toBe(cards);
  });

  it("returns same list when no-op", () => {
    expect(applyCardMoveToList(cards, "a", "c1", "a0")).toBe(cards);
  });
});

describe("applyCardReparentToList", () => {
  const cards = [
    stub({ id: "a", column_id: "c1", position: "a0", title: "A", parent_id: null }),
    stub({ id: "b", column_id: "c1", position: "a1", title: "B", parent_id: "a" }),
  ];

  it("patches parent_id + position", () => {
    const next = applyCardReparentToList(cards, "b", null, "z9");
    expect(next[1]).toEqual({ ...cards[1], parent_id: null, position: "z9" });
    expect(next[0]).toBe(cards[0]);
  });

  it("returns same list when no-op", () => {
    expect(applyCardReparentToList(cards, "b", "a")).toBe(cards);
  });
});

describe("applyChecklistToggleToList", () => {
  const cards = [
    stub({
      id: "a",
      column_id: "c1",
      position: "a0",
      title: "A",
      checklistItems: [
        { id: "i1", title: "t", done: false, position: "a0" },
        { id: "i2", title: "u", done: true, position: "a1" },
      ],
    }),
  ];

  it("toggles done on matching item", () => {
    const next = applyChecklistToggleToList(cards, "a", "i1", true);
    expect(next[0]!.checklistItems[0]!.done).toBe(true);
    expect(next[0]!.checklistItems[1]).toBe(cards[0]!.checklistItems[1]);
  });
});

describe("shouldIgnoreRemoteCardsSync", () => {
  it("ignores while dragging or mutating", () => {
    expect(shouldIgnoreRemoteCardsSync({ isDragging: true, isMutating: false })).toBe(true);
    expect(shouldIgnoreRemoteCardsSync({ isDragging: false, isMutating: true })).toBe(true);
    expect(shouldIgnoreRemoteCardsSync({ isDragging: false, isMutating: false })).toBe(false);
  });
});
