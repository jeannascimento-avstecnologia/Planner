import { describe, expect, it } from "vitest";
import { canEditBoardUI, isBoardViewer } from "./board-member-roles";

describe("canEditBoardUI", () => {
  it("org admin edita", () => {
    expect(canEditBoardUI(true, null)).toBe(true);
  });

  it("viewer nao edita", () => {
    expect(canEditBoardUI(false, "viewer")).toBe(false);
  });

  it("board admin edita", () => {
    expect(canEditBoardUI(false, "admin")).toBe(true);
  });

  it("board manager edita write", () => {
    expect(canEditBoardUI(false, "manager")).toBe(true);
  });

  it("sem papel no board nao edita", () => {
    expect(canEditBoardUI(false, null)).toBe(false);
  });
});

describe("isBoardViewer", () => {
  it("inverso de canEditBoardUI", () => {
    expect(isBoardViewer(true, null)).toBe(false);
    expect(isBoardViewer(false, "viewer")).toBe(true);
  });
});
