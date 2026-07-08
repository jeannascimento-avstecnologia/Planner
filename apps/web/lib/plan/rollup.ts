import { utilizationPct } from "@/lib/workload/utilization";

export function sumCellHours(cells: Record<string, number>): number {
  return Object.values(cells).reduce((a, b) => a + b, 0);
}

export function buildDayTotals(rows: { cells: Record<string, number> }[], dayKeys: string[]): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const day of dayKeys) {
    totals[day] = rows.reduce((sum, row) => sum + (row.cells[day] ?? 0), 0);
  }
  return totals;
}

export function buildUtilizationDays(
  dayKeys: string[],
  dayTotals: Record<string, number>,
  dailyCapacity: number,
): { date: string; capacityHours: number; allocatedHours: number; utilizationPct: number }[] {
  return dayKeys.map((date) => {
    const allocatedHours = dayTotals[date] ?? 0;
    return {
      date,
      capacityHours: dailyCapacity,
      allocatedHours,
      utilizationPct: utilizationPct(allocatedHours, dailyCapacity),
    };
  });
}
