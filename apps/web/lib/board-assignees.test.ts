import { describe, expect, it } from "vitest";
import { collectAssignableUserIds } from "./board-assignees";

describe("collectAssignableUserIds", () => {
  const base = {
    createdBy: "creator",
    orgMemberIds: ["creator", "owner", "org-only"],
    orgOwnerIds: ["owner"],
    departmentMemberIds: ["dept"],
    boardMemberIds: ["invitee"],
  };

  it("Geral: org + board_members + criador", () => {
    const ids = collectAssignableUserIds({ ...base, departmentId: null });
    expect(ids.sort()).toEqual(["creator", "invitee", "org-only", "owner"].sort());
  });

  it("departamento: owner + dept + board_members + criador; exclui org-only", () => {
    const ids = collectAssignableUserIds({ ...base, departmentId: "d1" });
    expect(ids.sort()).toEqual(["creator", "dept", "invitee", "owner"].sort());
    expect(ids).not.toContain("org-only");
  });
});
