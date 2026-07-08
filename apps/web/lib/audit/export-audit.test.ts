import { describe, expect, it } from "vitest";
import { auditRowsToCsv } from "./export-audit";
import type { AuditLogRow } from "@nextgen/contracts";

const sampleRow: AuditLogRow = {
  id: 1,
  org_id: "22222222-2222-2222-2222-222222222222",
  board_id: "33333333-3333-3333-3333-333333333333",
  card_id: null,
  actor_id: "11111111-1111-1111-1111-111111111111",
  event_scope: "org",
  event_type: "role_changed",
  payload: { old_role: "viewer", new_role: "admin", tiflux_api_token: "secret" },
  occurred_at: "2026-07-07T12:00:00.000Z",
  actor_name: "Admin Demo",
  actor_avatar: null,
};

describe("auditRowsToCsv", () => {
  it("escapes commas and quotes", () => {
    const csv = auditRowsToCsv([
      {
        ...sampleRow,
        actor_name: 'User, "QA"',
        payload: { note: 'hello, "world"' },
        event_type: "org_renamed",
      },
    ]);
    expect(csv).toContain('"User, ""QA"""');
  });

  it("redacts sensitive payload keys in detail column via summary path", () => {
    const csv = auditRowsToCsv([sampleRow]);
    expect(csv).not.toContain("secret");
    expect(csv).toContain("Papel alterado");
    expect(csv).toContain("viewer");
  });
});
