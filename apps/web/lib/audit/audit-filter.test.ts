import { describe, expect, it } from "vitest";
import { auditLogFilterInput } from "@nextgen/contracts";

describe("auditLogFilterInput", () => {
  it("aceita payload completo do export", () => {
    const parsed = auditLogFilterInput.safeParse({
      orgId: "22222222-2222-2222-2222-222222222222",
      actorId: undefined,
      eventTypes: undefined,
      from: undefined,
      to: undefined,
      limit: 100,
      cursorOccurredAt: undefined,
      cursorId: undefined,
    });
    expect(parsed.success).toBe(true);
  });
});
