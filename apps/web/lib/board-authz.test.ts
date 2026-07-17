import { describe, expect, it } from "vitest";
import { computeCanWriteBoard, canEditBoardUI } from "./board-authz";

describe("computeCanWriteBoard (espelha RLS)", () => {
  it("owner sempre escreve", () => {
    expect(
      computeCanWriteBoard({
        orgRole: "owner",
        boardRole: null,
        deptRole: null,
        hasDepartment: true,
      }),
    ).toBe(true);
  });

  it("org admin escreve board SEM departamento", () => {
    expect(
      computeCanWriteBoard({
        orgRole: "admin",
        boardRole: null,
        deptRole: null,
        hasDepartment: false,
      }),
    ).toBe(true);
  });

  it("org admin escreve board COM departamento", () => {
    expect(
      computeCanWriteBoard({
        orgRole: "admin",
        boardRole: null,
        deptRole: null,
        hasDepartment: true,
      }),
    ).toBe(true);
  });

  it("dept manager escreve board do departamento", () => {
    expect(
      computeCanWriteBoard({
        orgRole: "viewer",
        boardRole: null,
        deptRole: "manager",
        hasDepartment: true,
      }),
    ).toBe(true);
  });

  it("board manager escreve (editor de projeto)", () => {
    expect(
      computeCanWriteBoard({
        orgRole: "viewer",
        boardRole: "manager",
        deptRole: null,
        hasDepartment: false,
      }),
    ).toBe(true);
  });

  it("board admin escreve", () => {
    expect(
      computeCanWriteBoard({
        orgRole: "viewer",
        boardRole: "admin",
        deptRole: null,
        hasDepartment: false,
      }),
    ).toBe(true);
  });

  it("org manager sem board/dept NAO escreve", () => {
    expect(
      computeCanWriteBoard({
        orgRole: "manager",
        boardRole: null,
        deptRole: null,
        hasDepartment: false,
      }),
    ).toBe(false);
  });

  it("viewer puro NAO escreve", () => {
    expect(
      computeCanWriteBoard({
        orgRole: "viewer",
        boardRole: "viewer",
        deptRole: null,
        hasDepartment: false,
      }),
    ).toBe(false);
  });
});

describe("canEditBoardUI", () => {
  it("com opts usa computeCanWriteBoard", () => {
    expect(
      canEditBoardUI(false, null, {
        orgRole: "admin",
        deptRole: null,
        hasDepartment: false,
      }),
    ).toBe(true);
  });

  it("legado: board manager e admin editam", () => {
    expect(canEditBoardUI(false, "manager")).toBe(true);
    expect(canEditBoardUI(false, "admin")).toBe(true);
    expect(canEditBoardUI(true, null)).toBe(true);
    expect(canEditBoardUI(false, "viewer")).toBe(false);
  });
});
