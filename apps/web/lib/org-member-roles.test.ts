import { describe, expect, it } from "vitest";
import { canManageOrgIdentity, canManageOrgMembers } from "./org-member-roles";

describe("canManageOrgMembers", () => {
  it("owner e gerente podem gerenciar membros", () => {
    expect(canManageOrgMembers("owner")).toBe(true);
    expect(canManageOrgMembers("manager")).toBe(true);
  });

  it("admin e viewer nao gerenciam membros", () => {
    expect(canManageOrgMembers("admin")).toBe(false);
    expect(canManageOrgMembers("viewer")).toBe(false);
    expect(canManageOrgMembers(null)).toBe(false);
  });
});

describe("canManageOrgIdentity", () => {
  it("apenas owner altera identidade da org", () => {
    expect(canManageOrgIdentity("owner")).toBe(true);
    expect(canManageOrgIdentity("manager")).toBe(false);
    expect(canManageOrgIdentity("admin")).toBe(false);
    expect(canManageOrgIdentity("viewer")).toBe(false);
  });
});
