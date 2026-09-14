import type { BoardCard } from "@/components/board/types";
import { effectiveStartDate } from "@/components/board/types";

export const TIMELINE_MS_DAY = 86_400_000;

export type TimelineYmd = string;
export type TimelineDatePatch = Pick<BoardCard, "start_date" | "due_date">;
export type TimelineRangeErrorCode = "invalid_date" | "start_after_end";
export type TimelineScheduleResult =
  | { ok: true; patch: TimelineDatePatch }
  | { ok: false; code: TimelineRangeErrorCode; message: string };

export interface TimelineRange {
  startYmd: TimelineYmd;
  endYmd: TimelineYmd;
  startDay: number;
  endDay: number;
}

const YMD_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Ordinal UTC de YYYY-MM-DD (dias desde epoch). Null se inválido/calendário impossível. */
export function parseTimelineYmd(value: string): number | null {
  const match = YMD_RE.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return Math.floor(date.getTime() / TIMELINE_MS_DAY);
}

export function timelineDayToYmd(day: number): TimelineYmd {
  return new Date(day * TIMELINE_MS_DAY).toISOString().slice(0, 10);
}

export function timelineRangeFromDays(startDay: number, endDay: number): TimelineRange {
  return {
    startDay,
    endDay,
    startYmd: timelineDayToYmd(startDay),
    endYmd: timelineDayToYmd(endDay),
  };
}

function isoToYmd(iso: string): TimelineYmd | null {
  const ymd = iso.slice(0, 10);
  return parseTimelineYmd(ymd) === null ? null : ymd;
}

/** Faixa visível na timeline (start efetivo + due, ou dia único no due). */
export function parseTimelineRange(card: BoardCard): TimelineRange | null {
  const startIso = effectiveStartDate(card);
  if (startIso && card.due_date) {
    const startYmd = isoToYmd(startIso);
    const endYmd = isoToYmd(card.due_date);
    if (!startYmd || !endYmd) return null;
    const startDay = parseTimelineYmd(startYmd);
    const endDay = parseTimelineYmd(endYmd);
    if (startDay === null || endDay === null) return null;
    if (startDay > endDay) return timelineRangeFromDays(endDay, startDay);
    return { startYmd, endYmd, startDay, endDay };
  }
  if (card.due_date) {
    const endYmd = isoToYmd(card.due_date);
    if (!endYmd) return null;
    const day = parseTimelineYmd(endYmd);
    if (day === null) return null;
    return { startYmd: endYmd, endYmd, startDay: day, endDay: day };
  }
  return null;
}

export function isTimelineUnscheduled(card: BoardCard): boolean {
  return parseTimelineRange(card) === null;
}

export function timelineCardDragId(cardId: string): string {
  return `timeline-card-${cardId}`;
}

export function parseTimelineCardDragId(id: string): string | null {
  const match = id.match(/^timeline-card-(.+)$/);
  return match?.[1] ?? null;
}

export function timelineResizeDragId(cardId: string, edge: "start" | "end"): string {
  return `timeline-resize-${edge}-${cardId}`;
}

export function parseTimelineResizeDragId(
  id: string,
): { cardId: string; edge: "start" | "end" } | null {
  const match = id.match(/^timeline-resize-(start|end)-(.+)$/);
  if (!match) return null;
  return { edge: match[1] as "start" | "end", cardId: match[2] };
}

export const TIMELINE_CANVAS_DROPPABLE_ID = "timeline-canvas";

export function toTimelineDbDate(isoYmd: string): string {
  return `${isoYmd}T12:00:00.000Z`;
}

export function computeScheduleFromRange(startYmd: string, endYmd: string): TimelineScheduleResult {
  const startDay = parseTimelineYmd(startYmd);
  const endDay = parseTimelineYmd(endYmd);
  if (startDay === null || endDay === null) {
    return { ok: false, code: "invalid_date", message: "Data invalida." };
  }
  if (startDay > endDay) {
    return {
      ok: false,
      code: "start_after_end",
      message: "Inicio deve ser anterior ou igual ao fim.",
    };
  }
  return {
    ok: true,
    patch: {
      start_date: toTimelineDbDate(startYmd),
      due_date: toTimelineDbDate(endYmd),
    },
  };
}

export function shiftTimelineRange(range: TimelineRange, deltaDays: number): TimelineRange {
  return timelineRangeFromDays(range.startDay + deltaDays, range.endDay + deltaDays);
}

export function resizeTimelineRange(
  range: TimelineRange,
  edge: "start" | "end",
  deltaDays: number,
): TimelineRange {
  if (edge === "start") {
    const startDay = Math.min(range.startDay + deltaDays, range.endDay);
    return timelineRangeFromDays(startDay, range.endDay);
  }
  const endDay = Math.max(range.endDay + deltaDays, range.startDay);
  return timelineRangeFromDays(range.startDay, endDay);
}
