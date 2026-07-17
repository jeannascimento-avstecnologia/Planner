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

  it("org admin escreve board sem departamento", () => {
    expect(
      computeCanWriteBoard({
        orgRole: "admin",
        boardRole: null,
        deptRole: null,
        hasDepartment: false,
      }),
    ).toBe(true);
  });

  it("org admin NAO escreve board com departamento sem papel no dept", () => {
    expect(
      computeCanWriteBoard({
        orgRole: "admin",
        boardRole: null,
        deptRole: null,
        hasDepartment: true,
      }),
    ).toBe(false);
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

  it("board manager NAO escreve (RLS so admin)", () => {
    expect(
      computeCanWriteBoard({
        orgRole: "viewer",
        boardRole: "manager",
        deptRole: null,
        hasDepartment: false,
      }),
    ).toBe(false);
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

  it("legado: board manager nao edita (alinhado ao RLS)", () => {
    expect(canEditBoardUI(false, "manager")).toBe(false);
    expect(canEditBoardUI(false, "admin")).toBe(true);
    expect(canEditBoardUI(true, null)).toBe(true);
  });
});
