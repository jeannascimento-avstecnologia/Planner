import { describe, expect, it } from "vitest";
import {
  addWeeks,
  formatDateIso,
  formatWeekRangeLabel,
  getIsoWeekStart,
  isCurrentWeek,
  parseWeekParam,
} from "./week";

describe("getIsoWeekStart", () => {
  it("returns Monday for a Wednesday", () => {
    const wed = new Date("2026-07-08T12:00:00");
    const mon = getIsoWeekStart(wed);
    expect(formatDateIso(mon)).toBe("2026-07-06");
  });

  it("returns previous Monday for Sunday", () => {
    const sun = new Date("2026-07-12T12:00:00");
    const mon = getIsoWeekStart(sun);
    expect(formatDateIso(mon)).toBe("2026-07-06");
  });
});

describe("parseWeekParam", () => {
  it("parses valid ISO date to week start", () => {
    const start = parseWeekParam("2026-07-09");
    expect(formatDateIso(start)).toBe("2026-07-06");
  });

  it("falls back to current week for invalid input", () => {
    const start = parseWeekParam("invalid");
    expect(isCurrentWeek(start)).toBe(true);
  });
});

describe("addWeeks", () => {
  it("adds seven days per week", () => {
    const start = getIsoWeekStart(new Date("2026-07-08T12:00:00"));
    expect(formatDateIso(addWeeks(start, 1))).toBe("2026-07-13");
  });
});

describe("formatWeekRangeLabel", () => {
  it("returns non-empty label", () => {
    const start = getIsoWeekStart(new Date("2026-07-08T12:00:00"));
    expect(formatWeekRangeLabel(start).length).toBeGreaterThan(5);
  });
});
