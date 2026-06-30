import { describe, expect, it } from "vitest";
import { canEditBoardUI, isBoardViewer } from "./board-member-roles";

describe("isBoardViewer", () => {
  it("org admin nunca e visualizador", () => {
    expect(isBoardViewer(true, null)).toBe(false);
    expect(isBoardViewer(true, "viewer")).toBe(false);
  });

  it("board viewer e visualizador", () => {
    expect(isBoardViewer(false, "viewer")).toBe(true);
  });

  it("board admin e manager usam UI de edicao", () => {
    expect(isBoardViewer(false, "admin")).toBe(false);
    expect(isBoardViewer(false, "manager")).toBe(false);
  });

  it("org member sem board_members usa modo leitura", () => {
    expect(isBoardViewer(false, null)).toBe(true);
  });
});

describe("canEditBoardUI", () => {
  it("espelha negacao de isBoardViewer", () => {
    expect(canEditBoardUI(true, null)).toBe(true);
    expect(canEditBoardUI(false, "viewer")).toBe(false);
    expect(canEditBoardUI(false, "admin")).toBe(true);
    expect(canEditBoardUI(false, "manager")).toBe(true);
    expect(canEditBoardUI(false, null)).toBe(false);
  });
});
