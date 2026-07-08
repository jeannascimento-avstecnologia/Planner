import { formatDateIso } from "./week";

export type AllocWeekRow = {
  user_id: string;
  card_id: string;
  hours: number;
};

export type UserWeekAllocAgg = {
  totalHours: number;
  cardIds: Set<string>;
  hoursByCard: Map<string, number>;
};

export function weekDateBounds(weekStart: Date): { from: string; to: string } {
  const from = formatDateIso(weekStart);
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);
  return { from, to: formatDateIso(end) };
}

export function aggregateAllocationsByUser(
  allocs: AllocWeekRow[],
): Map<string, UserWeekAllocAgg> {
  const byUser = new Map<string, UserWeekAllocAgg>();
  for (const a of allocs) {
    const hours = Number(a.hours);
    if (hours <= 0) continue;
    let agg = byUser.get(a.user_id);
    if (!agg) {
      agg = { totalHours: 0, cardIds: new Set(), hoursByCard: new Map() };
      byUser.set(a.user_id, agg);
    }
    agg.totalHours += hours;
    agg.cardIds.add(a.card_id);
    agg.hoursByCard.set(a.card_id, (agg.hoursByCard.get(a.card_id) ?? 0) + hours);
  }
  return byUser;
}
