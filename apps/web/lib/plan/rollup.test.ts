import { describe, expect, it } from "vitest";
import { buildDayTotals, buildUtilizationDays, sumCellHours } from "./rollup";

describe("plan rollup", () => {
  it("sums cell hours", () => {
    expect(sumCellHours({ "2026-07-08": 2, "2026-07-09": 4 })).toBe(6);
  });

  it("builds day totals across rows", () => {
    const rows: { cells: Record<string, number> }[] = [
      { cells: { "2026-07-08": 2, "2026-07-09": 1 } },
      { cells: { "2026-07-08": 3 } },
    ];
    expect(buildDayTotals(rows, ["2026-07-08", "2026-07-09"])).toEqual({
      "2026-07-08": 5,
      "2026-07-09": 1,
    });
  });

  it("builds utilization days", () => {
    const days = buildUtilizationDays(["2026-07-08"], { "2026-07-08": 4 }, 8);
    expect(days[0].utilizationPct).toBe(50);
  });
});
