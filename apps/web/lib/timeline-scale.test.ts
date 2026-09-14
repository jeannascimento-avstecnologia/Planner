import { describe, expect, it } from "vitest";
import { parseTimelineYmd, timelineRangeFromDays } from "./timeline-schedule";
import {
  computeTimelineWindow,
  listTimelineMonthBands,
  listTimelineTicks,
  parseTimelineZoom,
  projectTimelineDay,
  TIMELINE_MIN_AFTER,
  TIMELINE_MIN_BEFORE,
  TIMELINE_SCALE,
  timelineCanvasWidth,
  timelineDeltaXToDays,
  timelineTodayYmd,
  timelineXToYmd,
  timelineZoomParam,
} from "./timeline-scale";

describe("timeline-scale", () => {
  it("parse/omit default zoom", () => {
    expect(parseTimelineZoom(null)).toBe("week");
    expect(parseTimelineZoom("nope")).toBe("week");
    expect(parseTimelineZoom("day")).toBe("day");
    expect(timelineZoomParam("week")).toBeNull();
    expect(timelineZoomParam("month")).toBe("month");
  });

  it("pxPerDay por zoom", () => {
    expect(TIMELINE_SCALE.day.pxPerDay).toBe(48);
    expect(TIMELINE_SCALE.week.pxPerDay).toBe(20);
    expect(TIMELINE_SCALE.month.pxPerDay).toBe(8);
    expect(TIMELINE_SCALE.quarter.pxPerDay).toBe(4);
  });

  it("dominio minimo -14/+56 mesmo sem cards", () => {
    const today = "2026-09-09";
    const win = computeTimelineWindow([], today);
    const todayDay = parseTimelineYmd(today)!;
    expect(win.startDay).toBe(todayDay - TIMELINE_MIN_BEFORE);
    expect(win.endDay).toBe(todayDay + TIMELINE_MIN_AFTER);
  });

  it("dominio expande para cards com padding 14", () => {
    const today = "2026-09-09";
    const far = timelineRangeFromDays(parseTimelineYmd("2026-12-01")!, parseTimelineYmd("2026-12-10")!);
    const win = computeTimelineWindow([far], today);
    expect(win.endYmd >= "2026-12-24").toBe(true);
    expect(win.startYmd <= "2026-08-26").toBe(true);
  });

  it("projecao inicio/fim e roundtrip X→data", () => {
    const today = "2026-09-09";
    const win = computeTimelineWindow([], today);
    expect(projectTimelineDay(win.startDay, win, "week")).toBe(0);
    const width = timelineCanvasWidth(win, "week");
    expect(width).toBe((win.endDay - win.startDay + 1) * 20);
    expect(timelineXToYmd(0, win, "week")).toBe(win.startYmd);
    expect(timelineXToYmd(width - 1, win, "week")).toBe(win.endYmd);
  });

  it("zoom nao muta o range", () => {
    const range = timelineRangeFromDays(parseTimelineYmd("2026-09-01")!, parseTimelineYmd("2026-09-03")!);
    const copy = { ...range };
    computeTimelineWindow([range], "2026-09-09");
    projectTimelineDay(range.startDay, computeTimelineWindow([range], "2026-09-09"), "day");
    expect(range).toEqual(copy);
  });

  it("delta X → dias", () => {
    expect(timelineDeltaXToDays(40, "week")).toBe(2);
    expect(timelineDeltaXToDays(-20, "week")).toBe(-1);
  });

  it("ticks day/week/month/quarter", () => {
    const win = computeTimelineWindow([], "2026-09-09");
    const days = listTimelineTicks(win, "day");
    expect(days.length).toBe(win.endDay - win.startDay + 1);
    const weeks = listTimelineTicks(win, "week");
    expect(weeks.length).toBeGreaterThan(0);
    expect(weeks.every((t) => t.day >= win.startDay)).toBe(true);
    const months = listTimelineTicks(win, "month");
    expect(months.length).toBeGreaterThan(0);
    const quarters = listTimelineTicks(win, "quarter");
    expect(quarters.length).toBeGreaterThan(0);
    expect(quarters.length).toBeLessThan(days.length / 20);
    expect(days[0]?.label).toMatch(/^\d{2}\/\d{2}$/);
    expect(quarters.every((t) => /^T[1-4] \d{4}$/.test(t.label))).toBe(true);
    expect(listTimelineMonthBands(win).length).toBe(months.length);
  });

  it("todayYmd local", () => {
    expect(timelineTodayYmd(new Date("2026-09-09T23:30:00"))).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
