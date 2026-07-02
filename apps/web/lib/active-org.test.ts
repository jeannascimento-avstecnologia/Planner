import { describe, expect, it } from "vitest";

/** Espelha dedupe esperado: uma org por orgId no resultado de listUserOrgs. */
function uniqueOrgIds(rows: { orgId: string }[]): string[] {
  return [...new Set(rows.map((r) => r.orgId))];
}

describe("listUserOrgs dedupe contract", () => {
  it("N memberships same org collapse to 1 org card", () => {
    const rows = [
      { orgId: "aaa", role: "owner" },
      { orgId: "aaa", role: "viewer" },
      { orgId: "aaa", role: "owner" },
    ];
    expect(uniqueOrgIds(rows)).toHaveLength(1);
  });

  it("distinct orgs stay distinct", () => {
    const rows = [{ orgId: "a" }, { orgId: "b" }];
    expect(uniqueOrgIds(rows)).toHaveLength(2);
  });
});
