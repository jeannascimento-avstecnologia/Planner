import type { TimelineRange } from "@/lib/timeline-schedule";
import { parseTimelineYmd, timelineDayToYmd } from "@/lib/timeline-schedule";

export const TIMELINE_ZOOMS = ["day", "week", "month", "quarter"] as const;
export type TimelineZoom = (typeof TIMELINE_ZOOMS)[number];
export type TimelineTickUnit = "day" | "week" | "month" | "quarter";

export interface TimelineScaleConfig {
  zoom: TimelineZoom;
  pxPerDay: number;
  tickUnit: TimelineTickUnit;
}

export interface TimelineWindow {
  startYmd: string;
  endYmd: string;
  startDay: number;
  endDay: number;
}

export interface TimelineTick {
  day: number;
  ymd: string;
  label: string;
}

export const TIMELINE_SCALE: Record<TimelineZoom, TimelineScaleConfig> = {
  day: { zoom: "day", pxPerDay: 48, tickUnit: "day" },
  week: { zoom: "week", pxPerDay: 20, tickUnit: "week" },
  month: { zoom: "month", pxPerDay: 8, tickUnit: "month" },
  quarter: { zoom: "quarter", pxPerDay: 4, tickUnit: "quarter" },
};

export const DEFAULT_TIMELINE_ZOOM: TimelineZoom = "week";
export const TIMELINE_WINDOW_PAD_DAYS = 14;
export const TIMELINE_MIN_BEFORE = 14;
export const TIMELINE_MIN_AFTER = 56;

export const TIMELINE_ROW_HEIGHT_PX = 64;
export const TIMELINE_BAR_HEIGHT_PX = 20;
export const TIMELINE_LANE_HEADER_PX = 34;
export const TIMELINE_TICK_HEADER_PX = 36;
export const TIMELINE_MONTH_BAND_PX = 18;
export const TIMELINE_LABEL_COL_PX = 280;

export function parseTimelineZoom(raw: string | null): TimelineZoom {
  if (raw && (TIMELINE_ZOOMS as readonly string[]).includes(raw)) {
    return raw as TimelineZoom;
  }
  return DEFAULT_TIMELINE_ZOOM;
}

export function timelineZoomParam(value: TimelineZoom): string | null {
  return value === DEFAULT_TIMELINE_ZOOM ? null : value;
}

export function timelineTodayYmd(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function computeTimelineWindow(ranges: TimelineRange[], todayYmd: string): TimelineWindow {
  const today = parseTimelineYmd(todayYmd);
  const todayDay = today ?? 0;
  let min = todayDay - TIMELINE_MIN_BEFORE;
  let max = todayDay + TIMELINE_MIN_AFTER;
  for (const range of ranges) {
    min = Math.min(min, range.startDay - TIMELINE_WINDOW_PAD_DAYS);
    max = Math.max(max, range.endDay + TIMELINE_WINDOW_PAD_DAYS);
  }
  return {
    startDay: min,
    endDay: max,
    startYmd: timelineDayToYmd(min),
    endYmd: timelineDayToYmd(max),
  };
}

export function projectTimelineDay(
  day: number,
  window: TimelineWindow,
  zoom: TimelineZoom,
): number {
  return (day - window.startDay) * TIMELINE_SCALE[zoom].pxPerDay;
}

export function timelineCanvasWidth(window: TimelineWindow, zoom: TimelineZoom): number {
  return (window.endDay - window.startDay + 1) * TIMELINE_SCALE[zoom].pxPerDay;
}

export function timelineXToYmd(x: number, window: TimelineWindow, zoom: TimelineZoom): string {
  const width = timelineCanvasWidth(window, zoom);
  const px = TIMELINE_SCALE[zoom].pxPerDay;
  const clamped = Math.max(0, Math.min(x, Math.max(width - 1, 0)));
  const day = window.startDay + Math.floor(clamped / px);
  return timelineDayToYmd(Math.min(day, window.endDay));
}

export function timelineDeltaXToDays(deltaX: number, zoom: TimelineZoom): number {
  return Math.round(deltaX / TIMELINE_SCALE[zoom].pxPerDay);
}

function utcWeekStartDay(day: number): number {
  const date = new Date(day * 86_400_000);
  const dow = date.getUTCDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  return day + diff;
}

function formatTickLabel(day: number, unit: TimelineTickUnit): string {
  const date = new Date(day * 86_400_000);
  if (unit === "day") {
    const dd = String(date.getUTCDate()).padStart(2, "0");
    const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
    return `${dd}/${mm}`;
  }
  if (unit === "week") {
    const dd = String(date.getUTCDate()).padStart(2, "0");
    const mon = date
      .toLocaleDateString("pt-BR", { month: "short", timeZone: "UTC" })
      .replace(".", "")
      .trim();
    return `${dd} ${mon}`;
  }
  if (unit === "month") {
    return date.toLocaleDateString("pt-BR", { month: "short", year: "2-digit", timeZone: "UTC" });
  }
  const q = Math.floor(date.getUTCMonth() / 3) + 1;
  return `T${q} ${date.getUTCFullYear()}`;
}

export function listTimelineTicks(window: TimelineWindow, zoom: TimelineZoom): TimelineTick[] {
  const unit = TIMELINE_SCALE[zoom].tickUnit;
  const ticks: TimelineTick[] = [];

  if (unit === "day") {
    for (let day = window.startDay; day <= window.endDay; day += 1) {
      ticks.push({
        day,
        ymd: timelineDayToYmd(day),
        label: formatTickLabel(day, unit),
      });
    }
    return ticks;
  }

  if (unit === "week") {
    let day = utcWeekStartDay(window.startDay);
    if (day < window.startDay) day += 7;
    for (; day <= window.endDay; day += 7) {
      ticks.push({
        day,
        ymd: timelineDayToYmd(day),
        label: formatTickLabel(day, unit),
      });
    }
    return ticks;
  }

  const startDate = new Date(window.startDay * 86_400_000);
  if (unit === "month") {
    let year = startDate.getUTCFullYear();
    let month = startDate.getUTCMonth();
    for (;;) {
      const first = Math.floor(Date.UTC(year, month, 1) / 86_400_000);
      if (first > window.endDay) break;
      if (first >= window.startDay) {
        ticks.push({
          day: first,
          ymd: timelineDayToYmd(first),
          label: formatTickLabel(first, unit),
        });
      }
      month += 1;
      if (month > 11) {
        month = 0;
        year += 1;
      }
    }
    return ticks;
  }

  let year = startDate.getUTCFullYear();
  let month = Math.floor(startDate.getUTCMonth() / 3) * 3;
  for (;;) {
    const first = Math.floor(Date.UTC(year, month, 1) / 86_400_000);
    if (first > window.endDay) break;
    if (first >= window.startDay) {
      ticks.push({
        day: first,
        ymd: timelineDayToYmd(first),
        label: formatTickLabel(first, unit),
      });
    }
    month += 3;
    if (month > 11) {
      month = 0;
      year += 1;
    }
  }
  return ticks;
}

export function listTimelineMonthBands(window: TimelineWindow): TimelineTick[] {
  return listTimelineTicks(window, "month");
}

export function barRectForRange(
  range: TimelineRange,
  window: TimelineWindow,
  zoom: TimelineZoom,
  rowY: number,
): { x: number; y: number; width: number; height: number } {
  const x = projectTimelineDay(range.startDay, window, zoom);
  const width = (range.endDay - range.startDay + 1) * TIMELINE_SCALE[zoom].pxPerDay;
  const y = rowY + (TIMELINE_ROW_HEIGHT_PX - TIMELINE_BAR_HEIGHT_PX) / 2;
  return { x, y, width, height: TIMELINE_BAR_HEIGHT_PX };
}

export function windowContainsDay(window: TimelineWindow, day: number): boolean {
  return day >= window.startDay && day <= window.endDay;
}
