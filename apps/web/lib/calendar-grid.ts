export type MonthGrid = {
  year: number;
  month: number;
  daysInMonth: number;
  firstDayOfWeek: number;
  monthLabel: string;
};

export function getMonthGrid(date: Date): MonthGrid {
  const year = date.getFullYear();
  const month = date.getMonth();
  return {
    year,
    month,
    daysInMonth: new Date(year, month + 1, 0).getDate(),
    firstDayOfWeek: new Date(year, month, 1).getDay(),
    monthLabel: date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }),
  };
}

export function toDateInputValue(year: number, month: number, day: number): string {
  const m = String(month + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

export function formatDateLabel(isoDate: string): string {
  return new Date(isoDate + "T12:00:00").toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "short",
  });
}

export function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const d = new Date(year, month + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}

/** Celulas vazias apos o ultimo dia do mes (completa a grade 7 colunas). */
export function getTrailingPadCount(firstDayOfWeek: number, daysInMonth: number): number {
  const total = firstDayOfWeek + daysInMonth;
  return (7 - (total % 7)) % 7;
}
