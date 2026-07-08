import { describe, expect, it } from "vitest";
import { utilizationLevel, utilizationPct } from "./utilization";

describe("utilizationPct", () => {
  it("computes percentage rounded", () => {
    expect(utilizationPct(20, 40)).toBe(50);
    expect(utilizationPct(0, 40)).toBe(0);
    expect(utilizationPct(10, 0)).toBe(0);
  });
});

describe("utilizationLevel", () => {
  it("maps thresholds to semaforo", () => {
    expect(utilizationLevel(50)).toBe("ok");
    expect(utilizationLevel(80)).toBe("warn");
    expect(utilizationLevel(100)).toBe("warn");
    expect(utilizationLevel(101)).toBe("over");
  });
});
