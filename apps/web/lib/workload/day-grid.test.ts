import { describe, expect, it } from "vitest";
import { buildMemberDayHours } from "./day-grid";

describe("buildMemberDayHours", () => {
  const dayKeys = ["2026-07-07", "2026-07-08", "2026-07-09"];

  it("usa alocacao diaria quando existir", () => {
    const map = buildMemberDayHours(
      dayKeys,
      [{ user_id: "u1", card_id: "c1", work_date: "2026-07-07", hours: 3 }],
      [{ id: "c1", assignee_id: "u1", estimated_hours: 8, target_date: "2026-07-07T12:00:00Z" }],
    );
    expect(map.get("u1")?.["2026-07-07"]).toBe(3);
  });

  it("fallback estimated_hours na data ancora sem alocacao", () => {
    const map = buildMemberDayHours(
      dayKeys,
      [],
      [{ id: "c2", assignee_id: "u2", estimated_hours: 5, due_date: "2026-07-08T12:00:00Z" }],
    );
    expect(map.get("u2")?.["2026-07-08"]).toBe(5);
  });

  it("nao duplica card com alocacao parcial", () => {
    const map = buildMemberDayHours(
      dayKeys,
      [{ user_id: "u1", card_id: "c1", work_date: "2026-07-07", hours: 2 }],
      [{ id: "c1", assignee_id: "u1", estimated_hours: 8, target_date: "2026-07-09T12:00:00Z" }],
    );
    expect(map.get("u1")?.["2026-07-07"]).toBe(2);
    expect(map.get("u1")?.["2026-07-09"]).toBeUndefined();
  });
});
