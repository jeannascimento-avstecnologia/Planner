import { describe, expect, it } from "vitest";
import {
  computeCanWriteBoard,
  canEditBoardUI,
  canManageBoardMembers,
  computeCanManageBoardMembers,
  computeBoardPermissions,
} from "./board-authz";

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

  it("board manager escreve (Administrador de projeto)", () => {
    expect(
      computeCanWriteBoard({
        orgRole: "viewer",
        boardRole: "manager",
        deptRole: null,
        hasDepartment: false,
      }),
    ).toBe(true);
  });

  it("board admin escreve (Editor)", () => {
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

describe("ACL: so owner org + board manager", () => {
  it("org admin NAO gerencia membros; owner e board manager sim", () => {
    expect(canManageBoardMembers(true, null)).toBe(true);
    expect(canManageBoardMembers(false, "manager")).toBe(true);
    expect(canManageBoardMembers(false, "admin")).toBe(false);
    expect(canManageBoardMembers(false, "viewer")).toBe(false);
    expect(canManageBoardMembers(false, null)).toBe(false);

    expect(
      computeCanManageBoardMembers({
        orgRole: "admin",
        boardRole: null,
        deptRole: null,
        hasDepartment: false,
      }),
    ).toBe(false);

    expect(
      computeCanManageBoardMembers({
        orgRole: "owner",
        boardRole: null,
        deptRole: null,
        hasDepartment: false,
      }),
    ).toBe(true);

    expect(
      computeCanManageBoardMembers({
        orgRole: null,
        boardRole: "admin",
        deptRole: null,
        hasDepartment: false,
      }),
    ).toBe(false);

    expect(
      computeCanManageBoardMembers({
        orgRole: null,
        boardRole: "manager",
        deptRole: null,
        hasDepartment: false,
      }),
    ).toBe(true);

    expect(
      computeCanManageBoardMembers({
        orgRole: "admin",
        boardRole: null,
        deptRole: null,
        hasDepartment: false,
        isOrgAdmin: true,
      }),
    ).toBe(false);

    expect(
      computeCanManageBoardMembers({
        orgRole: "viewer",
        boardRole: null,
        deptRole: null,
        hasDepartment: false,
      }),
    ).toBe(false);
  });

  it("org admin tem write sem members.*", () => {
    const perms = computeBoardPermissions({
      orgRole: "admin",
      boardRole: null,
      deptRole: null,
      hasDepartment: false,
    });
    expect(perms.has("board.cards.edit")).toBe(true);
    expect(perms.has("board.members.invite")).toBe(false);
    expect(perms.has("board.members.update")).toBe(false);
  });

  it("org admin + board manager herda members via role", () => {
    const perms = computeBoardPermissions({
      orgRole: "admin",
      boardRole: "manager",
      deptRole: null,
      hasDepartment: false,
    });
    expect(perms.has("board.members.invite")).toBe(true);
    expect(
      computeCanManageBoardMembers({
        orgRole: "admin",
        boardRole: "manager",
        deptRole: null,
        hasDepartment: false,
      }),
    ).toBe(true);
  });
});
