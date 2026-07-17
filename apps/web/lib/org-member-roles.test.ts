import { describe, expect, it } from "vitest";
import {
  canManageAccessPresets,
  canManageOrgIdentity,
  canManageOrgMembers,
} from "./org-member-roles";

describe("canManageOrgMembers", () => {
  it("owner e admin podem gerenciar membros", () => {
    expect(canManageOrgMembers("owner")).toBe(true);
    expect(canManageOrgMembers("admin")).toBe(true);
  });

  it("gerente e viewer nao gerenciam membros", () => {
    expect(canManageOrgMembers("manager")).toBe(false);
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

describe("canManageAccessPresets", () => {
  it("somente owner (admin org nao gerencia presets)", () => {
    expect(canManageAccessPresets("owner")).toBe(true);
    expect(canManageAccessPresets("admin")).toBe(false);
    expect(canManageAccessPresets("manager")).toBe(false);
    expect(canManageAccessPresets("viewer")).toBe(false);
    expect(canManageAccessPresets(null)).toBe(false);
  });
});
