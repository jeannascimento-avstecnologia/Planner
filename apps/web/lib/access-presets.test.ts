import { describe, expect, it } from "vitest";
import {
  ADMIN_SYSTEM_CODES,
  EDITOR_SYSTEM_CODES,
  VIEWER_SYSTEM_CODES,
  applyPermissionImplies,
  clearGroupCodes,
  deriveBaseRoleFromCodes,
  expandPermissionAliases,
  legacyRoleToPermissionCodes,
  presetHelperText,
  selectAllGroupCodes,
  systemShortcutCodes,
} from "./access-presets";
import { attachPresetNames } from "./load-access-presets";
import {
  computeBoardPermissions,
  computeCanManageBoardMembers,
  hasBoardPermission,
} from "./board-authz";

describe("legacyRoleToPermissionCodes", () => {
  it("mapeia Administrador/Editor/Visualizador com codes finos", () => {
    expect([...legacyRoleToPermissionCodes("manager")]).toContain("board.members.invite");
    expect([...legacyRoleToPermissionCodes("admin")]).not.toContain("board.members.invite");
    expect([...legacyRoleToPermissionCodes("admin")]).toContain("board.cards.edit");
    expect([...legacyRoleToPermissionCodes("viewer")]).toEqual(["board.view"]);
  });
});

describe("expandPermissionAliases", () => {
  it("expande edit_content e manage_members", () => {
    const content = expandPermissionAliases(["board.edit_content"]);
    expect(content.has("board.cards.edit")).toBe(true);
    expect(content.has("board.columns.create")).toBe(true);
    expect(content.has("board.members.invite")).toBe(false);

    const members = expandPermissionAliases(["board.manage_members"]);
    expect(members.has("board.members.invite")).toBe(true);
    expect(members.has("board.members.remove")).toBe(true);
  });
});

describe("applyPermissionImplies / select-all", () => {
  it("qualquer escrita implica view", () => {
    const next = applyPermissionImplies(new Set(["board.cards.edit"]));
    expect(next.has("board.view")).toBe(true);
  });

  it("select-all marca grupo; limpar remove so o grupo", () => {
    const selected = selectAllGroupCodes(["board.view"], [
      "board.cards.create",
      "board.cards.edit",
      "board.cards.move",
      "board.cards.delete",
      "board.cards.change_stage",
      "board.cards.plan_work",
    ]);
    expect(selected).toContain("board.cards.create");
    expect(selected).toContain("board.view");

    const cleared = clearGroupCodes(selected, [
      "board.cards.create",
      "board.cards.edit",
      "board.cards.move",
      "board.cards.delete",
      "board.cards.change_stage",
      "board.cards.plan_work",
    ]);
    expect(cleared).not.toContain("board.cards.create");
    expect(cleared).toContain("board.view");
  });

  it("atalhos sistema preenchem conjuntos esperados", () => {
    expect(systemShortcutCodes("viewer")).toEqual(VIEWER_SYSTEM_CODES);
    expect([...systemShortcutCodes("admin")]).toEqual([...EDITOR_SYSTEM_CODES]);
    expect(systemShortcutCodes("manager").length).toBe(ADMIN_SYSTEM_CODES.length);
  });
});

describe("deriveBaseRoleFromCodes", () => {
  it("deriva base_role do teto fino ou alias", () => {
    expect(
      deriveBaseRoleFromCodes(["board.view", "board.cards.edit", "board.members.invite"]),
    ).toBe("manager");
    expect(deriveBaseRoleFromCodes(["board.view", "board.edit_content"])).toBe("admin");
    expect(deriveBaseRoleFromCodes(["board.view", "board.cards.edit"])).toBe("admin");
    expect(deriveBaseRoleFromCodes(["board.view"])).toBe("viewer");
  });
});

describe("computeBoardPermissions", () => {
  it("org admin escreve sem members.* (ACL so owner / board manager)", () => {
    const perms = computeBoardPermissions({
      orgRole: "admin",
      boardRole: null,
      deptRole: null,
      hasDepartment: false,
    });
    expect(perms.has("board.members.invite")).toBe(false);
    expect(perms.has("board.cards.edit")).toBe(true);
    expect(hasBoardPermission(
      { orgRole: "admin", boardRole: null, deptRole: null, hasDepartment: false },
      "board.edit_content",
    )).toBe(true);
    expect(hasBoardPermission(
      { orgRole: "admin", boardRole: null, deptRole: null, hasDepartment: false },
      "board.manage_members",
    )).toBe(false);
  });

  it("preset codes expandem alias", () => {
    const perms = computeBoardPermissions({
      orgRole: "viewer",
      boardRole: "viewer",
      deptRole: null,
      hasDepartment: false,
      permissionCodes: ["board.view", "board.edit_content"],
    });
    expect(perms.has("board.cards.edit")).toBe(true);
    expect(perms.has("board.members.invite")).toBe(false);
  });
});

describe("computeCanManageBoardMembers via codes", () => {
  it("sem members.* no preset = false", () => {
    expect(
      computeCanManageBoardMembers({
        orgRole: "viewer",
        boardRole: "admin",
        deptRole: null,
        hasDepartment: false,
        permissionCodes: ["board.view", "board.edit_content"],
      }),
    ).toBe(false);
  });

  it("manager legado gerencia", () => {
    expect(
      computeCanManageBoardMembers({
        orgRole: "viewer",
        boardRole: "manager",
        deptRole: null,
        hasDepartment: false,
      }),
    ).toBe(true);
  });

  it("members.invite no preset gerencia", () => {
    expect(
      computeCanManageBoardMembers({
        orgRole: "viewer",
        boardRole: "viewer",
        deptRole: null,
        hasDepartment: false,
        permissionCodes: ["board.view", "board.members.invite"],
      }),
    ).toBe(true);
  });
});

describe("presetHelperText", () => {
  it("resume poderes", () => {
    expect(presetHelperText(["board.view"])).toMatch(/leitura/i);
    expect(presetHelperText(["board.view", "board.edit_content"])).toMatch(/sem ACL/i);
  });
});

describe("attachPresetNames", () => {
  it("resolve nome em 1 map (sem N+1)", () => {
    const members = [
      { user_id: "u1", role: "admin", preset_id: "p-custom" },
      { user_id: "u2", role: "viewer", preset_id: null },
      { user_id: "u3", role: "manager", preset_id: "p-missing" },
    ];
    const presets = [
      { id: "p-custom", name: "Operacao comercial" },
      { id: "p-sys", name: "Editor" },
    ];
    const out = attachPresetNames(members, presets);
    expect(out[0]?.presetName).toBe("Operacao comercial");
    expect(out[1]?.presetName).toBeUndefined();
    expect(out[2]?.presetName).toBeUndefined();
  });
});
