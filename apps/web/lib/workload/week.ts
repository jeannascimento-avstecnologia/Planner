/** ISO week starts Monday (matches PostgreSQL date_trunc('week')). */
export function getIsoWeekStart(input: Date = new Date()): Date {
  const d = new Date(input);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

export function formatDateIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseWeekParam(value: string | undefined): Date {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return getIsoWeekStart();
  }
  const parsed = new Date(`${value}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return getIsoWeekStart();
  return getIsoWeekStart(parsed);
}

export function addWeeks(weekStart: Date, weeks: number): Date {
  const next = new Date(weekStart);
  next.setDate(next.getDate() + weeks * 7);
  return next;
}

export function formatWeekRangeLabel(weekStart: Date): string {
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);
  const fmt = (x: Date) => x.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  return `${fmt(weekStart)} – ${fmt(end)}`;
}

export function isCurrentWeek(weekStart: Date): boolean {
  return formatDateIso(weekStart) === formatDateIso(getIsoWeekStart());
}
