import { describe, expect, it } from "vitest";
import { aggregateAllocationsByUser, weekDateBounds } from "./allocation-week";
import { getIsoWeekStart } from "./week";

describe("weekDateBounds", () => {
  it("spans Mon–Sun", () => {
    const mon = getIsoWeekStart(new Date("2026-07-08T12:00:00"));
    expect(weekDateBounds(mon)).toEqual({ from: "2026-07-06", to: "2026-07-12" });
  });
});

describe("aggregateAllocationsByUser", () => {
  it("sums hours per user and card in week", () => {
    const map = aggregateAllocationsByUser([
      { user_id: "u1", card_id: "c1", hours: 4 },
      { user_id: "u1", card_id: "c1", hours: 2 },
      { user_id: "u1", card_id: "c2", hours: 3 },
      { user_id: "u2", card_id: "c3", hours: 5 },
    ]);
    expect(map.get("u1")?.totalHours).toBe(9);
    expect(map.get("u1")?.hoursByCard.get("c1")).toBe(6);
    expect(map.get("u1")?.cardIds.size).toBe(2);
    expect(map.get("u2")?.totalHours).toBe(5);
  });
});
