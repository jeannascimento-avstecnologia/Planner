import { describe, expect, it } from "vitest";
import { cardWeekIso, isUnscheduledWorkload, workloadWeekAnchor } from "./anchor";

describe("workloadWeekAnchor", () => {
  it("prioritizes target_date over due_date", () => {
    expect(
      workloadWeekAnchor({
        target_date: "2026-07-10T12:00:00.000Z",
        due_date: "2026-07-20T12:00:00.000Z",
      }),
    ).toBe("2026-07-10T12:00:00.000Z");
  });

  it("falls back to due_date then start_date", () => {
    expect(workloadWeekAnchor({ due_date: "2026-07-15T12:00:00.000Z" })).toBe(
      "2026-07-15T12:00:00.000Z",
    );
    expect(workloadWeekAnchor({ start_date: "2026-07-08T12:00:00.000Z" })).toBe(
      "2026-07-08T12:00:00.000Z",
    );
  });
});

describe("cardWeekIso", () => {
  it("returns Monday of ISO week", () => {
    expect(cardWeekIso("2026-07-08T12:00:00.000Z")).toBe("2026-07-06");
  });
});

describe("isUnscheduledWorkload", () => {
  it("true when hours but no planning dates", () => {
    expect(
      isUnscheduledWorkload({
        assignee_id: "u1",
        estimated_hours: 8,
        due_date: null,
        start_date: null,
        target_date: null,
      }),
    ).toBe(true);
  });

  it("false when target_date set", () => {
    expect(
      isUnscheduledWorkload({
        assignee_id: "u1",
        estimated_hours: 8,
        target_date: "2026-07-10T12:00:00.000Z",
      }),
    ).toBe(false);
  });
});
