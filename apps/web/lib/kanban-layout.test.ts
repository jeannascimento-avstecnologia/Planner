import { describe, expect, it } from "vitest";
import {
  assertKanbanLayoutSafe,
  KANBAN_BOARD_REGION_CLASS,
  KANBAN_COLUMN_SECTION_CLASS,
  KANBAN_COLUMNS_ROW_CLASS,
} from "./kanban-layout";

describe("kanban layout contract (add-card visible)", () => {
  it("exported classes pass anti-clip guards", () => {
    expect(() =>
      assertKanbanLayoutSafe({
        boardRegion: KANBAN_BOARD_REGION_CLASS,
        columnsRow: KANBAN_COLUMNS_ROW_CLASS,
        columnSection: KANBAN_COLUMN_SECTION_CLASS,
      }),
    ).not.toThrow();
  });

  it("rejects overflow-y-hidden on row", () => {
    expect(() =>
      assertKanbanLayoutSafe({
        boardRegion: KANBAN_BOARD_REGION_CLASS,
        columnsRow: "flex h-full overflow-x-auto overflow-y-hidden",
        columnSection: KANBAN_COLUMN_SECTION_CLASS,
      }),
    ).toThrow(/overflow-y-hidden/);
  });

  it("rejects overflow-hidden on column section", () => {
    expect(() =>
      assertKanbanLayoutSafe({
        boardRegion: KANBAN_BOARD_REGION_CLASS,
        columnsRow: KANBAN_COLUMNS_ROW_CLASS,
        columnSection: "flex flex-col overflow-hidden max-h-full",
      }),
    ).toThrow(/overflow-hidden/);
  });

  it("rejects missing min-h on board region", () => {
    expect(() =>
      assertKanbanLayoutSafe({
        boardRegion: "flex flex-1 flex-col overflow-hidden",
        columnsRow: KANBAN_COLUMNS_ROW_CLASS,
        columnSection: KANBAN_COLUMN_SECTION_CLASS,
      }),
    ).toThrow(/min-h/);
  });
});
