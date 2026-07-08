import {
  PLAN_FUTURE_DAYS,
  PLAN_PAST_DAYS,
  PLAN_WINDOW_DAYS,
  WORKLOAD_15D_WINDOW_DAYS,
} from "./types";

export function formatDateIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseStartParam(value: string | undefined): Date {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  }
  const parsed = new Date(`${value}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  }
  parsed.setHours(0, 0, 0, 0);
  return parsed;
}

/** Primeiro dia visivel: calendario = hoje - 5; uteis = 5 dias uteis antes de hoje. */
export function defaultPlanWindowStart(reference = new Date(), showWeekends = true): Date {
  const today = new Date(reference);
  today.setHours(0, 0, 0, 0);
  return showWeekends ? addDays(today, -PLAN_PAST_DAYS) : addWeekdays(today, -PLAN_PAST_DAYS);
}

export function parsePlanWindowStart(value: string | undefined, showWeekends = true): Date {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return defaultPlanWindowStart(undefined, showWeekends);
  }
  const parsed = new Date(`${value}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return defaultPlanWindowStart(undefined, showWeekends);
  parsed.setHours(0, 0, 0, 0);
  return parsed;
}

export function isPlanWindowIncludingToday(windowStart: Date, showWeekends = true): boolean {
  const todayIso = formatDateIso(new Date());
  const days = buildPlanVisibleDayRange(windowStart, showWeekends);
  return days.some((d) => formatDateIso(d) === todayIso);
}

export function addDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}

/** Desloca N dias uteis (ignora sab/dom). */
export function addWeekdays(d: Date, weekdays: number): Date {
  if (weekdays === 0) {
    const copy = new Date(d);
    copy.setHours(0, 0, 0, 0);
    return copy;
  }
  const dir = weekdays > 0 ? 1 : -1;
  let remaining = Math.abs(weekdays);
  const current = new Date(d);
  current.setHours(0, 0, 0, 0);
  while (remaining > 0) {
    current.setDate(current.getDate() + dir);
    if (!isWeekendIso(formatDateIso(current))) remaining--;
  }
  return current;
}

export function buildDayRange(start: Date, count = PLAN_WINDOW_DAYS): Date[] {
  const days: Date[] = [];
  for (let i = 0; i < count; i++) {
    days.push(addDays(start, i));
  }
  return days;
}

export function buildPlanDayRange(windowStart: Date): Date[] {
  return buildDayRange(windowStart, PLAN_WINDOW_DAYS);
}

/** 11 dias uteis consecutivos a partir de windowStart (ajusta se cair em fim de semana). */
export function buildWeekdayDayRange(windowStart: Date, count = PLAN_WINDOW_DAYS): Date[] {
  const days: Date[] = [];
  let current = new Date(windowStart);
  current.setHours(0, 0, 0, 0);
  while (isWeekendIso(formatDateIso(current))) {
    current = addDays(current, 1);
  }
  while (days.length < count) {
    const iso = formatDateIso(current);
    if (!isWeekendIso(iso)) {
      days.push(new Date(current));
    }
    if (days.length < count) current = addDays(current, 1);
  }
  return days;
}

export function buildPlanVisibleDayRange(windowStart: Date, showWeekends: boolean): Date[] {
  return showWeekends ? buildPlanDayRange(windowStart) : buildWeekdayDayRange(windowStart);
}

export function shiftPlanWindowStart(windowStart: Date, steps: number, showWeekends: boolean): Date {
  const delta = steps * PLAN_WINDOW_DAYS;
  return showWeekends ? addDays(windowStart, delta) : addWeekdays(windowStart, delta);
}

export function buildWorkload15DayRange(start: Date): Date[] {
  return buildDayRange(start, WORKLOAD_15D_WINDOW_DAYS);
}

export function formatPlanRangeLabel(start: Date, showWeekendsOrCount: boolean | number = true, count = PLAN_WINDOW_DAYS): string {
  const days =
    typeof showWeekendsOrCount === "number"
      ? buildDayRange(start, showWeekendsOrCount)
      : showWeekendsOrCount
        ? buildDayRange(start, count)
        : buildWeekdayDayRange(start, count);
  const end = days[days.length - 1] ?? start;
  const fmt = (x: Date) => x.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  return `${fmt(start)} – ${fmt(end)}`;
}

export function isToday(d: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return formatDateIso(d) === formatDateIso(today);
}

export function isTodayIso(dateIso: string): boolean {
  return dateIso === formatDateIso(new Date());
}

/** Weekday capacity from weekly hours (Mon–Fri). */
export function dailyCapacityFromWeekly(weeklyHours: number): number {
  return Math.round((weeklyHours / 5) * 100) / 100;
}

export function isWeekday(dateIso: string): boolean {
  return !isWeekendIso(dateIso);
}

export function isWeekendIso(dateIso: string): boolean {
  const dow = new Date(`${dateIso}T12:00:00`).getDay();
  return dow === 0 || dow === 6;
}

export { PLAN_PAST_DAYS, PLAN_FUTURE_DAYS, PLAN_WINDOW_DAYS, WORKLOAD_15D_WINDOW_DAYS };
