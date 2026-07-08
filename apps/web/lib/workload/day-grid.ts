import { workloadWeekAnchor } from "@/lib/workload/anchor";
import { normalizeWorkDateIso } from "@/lib/workload/work-date";

export type CardForDayGrid = {
  id: string;
  assignee_id: string | null;
  estimated_hours: number | null;
  target_date?: string | null;
  due_date?: string | null;
  start_date?: string | null;
};

export type AllocationRow = {
  user_id: string;
  card_id: string;
  work_date: string;
  hours: number;
};

/** Agrega alocacoes diarias + fallback de estimated_hours na data ancora (sem double-count). */
export function buildMemberDayHours(
  dayKeys: string[],
  allocs: AllocationRow[],
  cards: CardForDayGrid[],
): Map<string, Record<string, number>> {
  const dayKeySet = new Set(dayKeys);
  const byUser = new Map<string, Record<string, number>>();
  const cardsWithDailyPlan = new Set<string>();

  for (const a of allocs) {
    if (a.hours <= 0) continue;
    const dayKey = normalizeWorkDateIso(a.work_date);
    if (!dayKeySet.has(dayKey)) continue;
    cardsWithDailyPlan.add(a.card_id);
    const days = byUser.get(a.user_id) ?? {};
    days[dayKey] = (days[dayKey] ?? 0) + a.hours;
    byUser.set(a.user_id, days);
  }

  for (const c of cards) {
    if (!c.assignee_id || cardsWithDailyPlan.has(c.id)) continue;
    const hours = Number(c.estimated_hours ?? 0);
    if (hours <= 0) continue;
    const anchor = workloadWeekAnchor(c);
    if (!anchor) continue;
    const dayKey = normalizeWorkDateIso(anchor);
    if (!dayKeySet.has(dayKey)) continue;
    const uid = c.assignee_id;
    const days = byUser.get(uid) ?? {};
    days[dayKey] = (days[dayKey] ?? 0) + hours;
    byUser.set(uid, days);
  }

  return byUser;
}

export function sumDayHours(days: Record<string, number>): number {
  return Object.values(days).reduce((s, h) => s + h, 0);
}
