import { describe, expect, it } from "vitest";
import { buildGoogleDeadlineEvent, buildSlackAutomationPayload } from "./payload-builders";

describe("integration payload builders", () => {
  it("google event usa due_date como dia inteiro", () => {
    const body = buildGoogleDeadlineEvent("Card X", "2026-07-15T18:00:00.000Z");
    expect(body.start.date).toBe("2026-07-15");
    expect(body.end.date).toBe("2026-07-15");
    expect(body.summary).toBe("Card X");
  });

  it("slack payload tem text", () => {
    expect(buildSlackAutomationPayload("hello").text).toBe("hello");
  });
});
