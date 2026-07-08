import { describe, expect, it } from "vitest";
import type { PlanGridRow } from "@/lib/plan/types";
import {
  buildInitialRowOrderByBoard,
  reorderPlanRowsInBoard,
  sortPlanRowsBySchedule,
} from "./sort-rows";

function row(partial: Partial<PlanGridRow> & Pick<PlanGridRow, "cardId" | "title" | "boardId">): PlanGridRow {
  return {
    boardName: "Board",
    description: null,
    startDate: null,
    targetDate: null,
    dueDate: null,
    personalPlanAt: null,
    cells: {},
    totalHours: 0,
    estimatedHours: null,
    ...partial,
  };
}

describe("sortPlanRowsBySchedule", () => {
  it("ordena por target_date", () => {
    const sorted = sortPlanRowsBySchedule([
      row({ cardId: "b", title: "B", boardId: "b1", targetDate: "2026-07-10T12:00:00Z" }),
      row({ cardId: "a", title: "A", boardId: "b1", targetDate: "2026-07-03T12:00:00Z" }),
    ]);
    expect(sorted.map((r) => r.cardId)).toEqual(["a", "b"]);
  });
});

describe("reorderPlanRowsInBoard", () => {
  it("move card dentro do mesmo board", () => {
    const initial = buildInitialRowOrderByBoard([
      row({ cardId: "a", title: "A", boardId: "b1" }),
      row({ cardId: "b", title: "B", boardId: "b1" }),
      row({ cardId: "c", title: "C", boardId: "b1" }),
    ]);
    const next = reorderPlanRowsInBoard(initial, "a", "c");
    expect(next?.b1).toEqual(["b", "c", "a"]);
  });
});
