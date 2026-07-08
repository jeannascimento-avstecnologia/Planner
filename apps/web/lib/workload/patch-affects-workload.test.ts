import { describe, expect, it } from "vitest";
import { patchAffectsWorkloadViews } from "./patch-affects-workload";

describe("patchAffectsWorkloadViews", () => {
  it("ignores title-only patches", () => {
    expect(patchAffectsWorkloadViews({ title: "x" })).toBe(false);
  });

  it("detects workload fields", () => {
    expect(patchAffectsWorkloadViews({ estimated_hours: 4 })).toBe(true);
    expect(patchAffectsWorkloadViews({ target_date: "2026-07-07T12:00:00.000Z" })).toBe(true);
  });
});
