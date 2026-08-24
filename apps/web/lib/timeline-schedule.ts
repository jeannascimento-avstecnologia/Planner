import type { BoardCard } from "@/components/board/types";
import { effectiveStartDate } from "@/components/board/types";
import { weekDateBounds } from "@/lib/workload/allocation-week";
import { addWeeks, formatDateIso, getIsoWeekStart } from "@/lib/workload/week";

export const TIMELINE_MS_DAY = 86_400_000;

export function timelineDayStart(d: Date): number {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

/** Faixa visivel na timeline (start_date + due_date, ou dia unico no due). */
export function parseTimelineRange(card: BoardCard): { start: number; end: number } | null {
  const startIso = effectiveStartDate(card);
  if (startIso && card.due_date) {
    return {
      start: timelineDayStart(new Date(startIso)),
      end: timelineDayStart(new Date(card.due_date)),
    };
  }
  if (card.due_date) {
    const t = timelineDayStart(new Date(card.due_date));
    return { start: t, end: t };
  }
  return null;
}

export function isTimelineUnscheduled(card: BoardCard): boolean {
  return parseTimelineRange(card) === null;
}

export function hasStoredTimelineDates(card: BoardCard): boolean {
  return Boolean(card.start_date || card.due_date);
}

export function timelineWeekId(monday: Date): string {
  return `timeline-week-${formatDateIso(monday)}`;
}

export function parseTimelineWeekId(id: string): Date | null {
  const match = id.match(/^timeline-week-(\d{4}-\d{2}-\d{2})$/);
  if (!match) return null;
  const parsed = new Date(`${match[1]}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  return getIsoWeekStart(parsed);
}

export function timelineCardDragId(cardId: string): string {
  return `timeline-card-${cardId}`;
}

export function parseTimelineCardDragId(id: string): string | null {
  const match = id.match(/^timeline-card-(.+)$/);
  return match?.[1] ?? null;
}

export function toTimelineDbDate(isoYmd: string): string {
  return `${isoYmd}T12:00:00.000Z`;
}

/** Sem datas: segunda–domingo da semana alvo. Com datas: reposiciona mantendo duracao. */
export function computeScheduleForWeekDrop(
  card: BoardCard,
  weekMonday: Date,
): { start_date: string; due_date: string } {
  const monday = getIsoWeekStart(weekMonday);

  if (!hasStoredTimelineDates(card)) {
    const { from, to } = weekDateBounds(monday);
    return { start_date: toTimelineDbDate(from), due_date: toTimelineDbDate(to) };
  }

  const range = parseTimelineRange(card);
  if (!range) {
    const { from, to } = weekDateBounds(monday);
    return { start_date: toTimelineDbDate(from), due_date: toTimelineDbDate(to) };
  }

  const durationMs = range.end - range.start;
  const newStart = timelineDayStart(monday);
  const newEnd = newStart + durationMs;
  return {
    start_date: toTimelineDbDate(formatDateIso(new Date(newStart))),
    due_date: toTimelineDbDate(formatDateIso(new Date(newEnd))),
  };
}

export function listTimelineWeeks(windowStart: number, windowEnd: number): Date[] {
  const list: Date[] = [];
  let cur = getIsoWeekStart(new Date(windowStart));
  while (cur.getTime() <= windowEnd) {
    list.push(new Date(cur));
    cur = addWeeks(cur, 1);
  }
  return list;
}
