import { describe, expect, it } from "vitest";
import { parseBundle } from "./parse-bundle";

describe("parseBundle", () => {
  it("normaliza payload parcial", () => {
    const data = parseBundle({
      throughput: [{ weekStart: "2026-07-07", count: 3 }],
      cfd: [{ columnId: "c1", columnName: "Todo", count: 5 }],
      bottlenecks: [{ columnId: "c1", avgDwellHours: 12, samples: 2 }],
      leadTime: { avgHours: 48, samples: 1 },
    });
    expect(data.throughput).toHaveLength(1);
    expect(data.cfd[0]?.count).toBe(5);
    expect(data.leadTime.avgHours).toBe(48);
  });
});
