import { describe, expect, it } from "vitest";
import { auditEventLabel, auditPayloadSummary, redactAuditPayload } from "@/lib/audit/audit-labels";

describe("audit-labels", () => {
  it("traduz role_changed", () => {
    expect(auditEventLabel("role_changed")).toBe("Papel alterado");
  });

  it("resume payload role", () => {
    expect(auditPayloadSummary("role_changed", { old_role: "viewer", new_role: "admin" })).toContain("admin");
  });

  it("redact token", () => {
    const out = redactAuditPayload({ tiflux_api_token: "secret", ok: true });
    expect(out).not.toHaveProperty("tiflux_api_token");
    expect(out.ok).toBe(true);
  });
});
