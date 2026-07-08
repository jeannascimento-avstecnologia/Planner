import { describe, expect, it } from "vitest";
import { cardWeekIso, workloadWeekAnchor } from "./anchor";

/** Mirrors load-workload legacy fallback: card counts when not in this week's allocs. */
function legacyApplies(
  card: {
    id: string;
    assignee_id: string;
    target_date: string | null;
    estimated_hours: number | null;
  },
  weekIso: string,
  allocThisWeekCardIds: Set<string>,
): boolean {
  if (allocThisWeekCardIds.has(card.id)) return false;
  const anchor = workloadWeekAnchor(card);
  if (!anchor) return false;
  return cardWeekIso(anchor) === weekIso;
}

describe("workload legacy fallback", () => {
  const weekIso = "2026-07-06";

  it("includes card with target_date in week when no alloc this week", () => {
    const card = {
      id: "c1",
      assignee_id: "u1",
      target_date: "2026-07-08T12:00:00.000Z",
      estimated_hours: 8,
    };
    expect(legacyApplies(card, weekIso, new Set())).toBe(true);
  });

  it("includes card with historical alloc but not this week (H1 fix)", () => {
    const card = {
      id: "c1",
      assignee_id: "u1",
      target_date: "2026-07-09T12:00:00.000Z",
      estimated_hours: 8,
    };
    expect(legacyApplies(card, weekIso, new Set())).toBe(true);
  });

  it("skips when already counted via alloc this week", () => {
    const card = {
      id: "c1",
      assignee_id: "u1",
      target_date: "2026-07-09T12:00:00.000Z",
      estimated_hours: 8,
    };
    expect(legacyApplies(card, weekIso, new Set(["c1"]))).toBe(false);
  });
});
