import type { PlanSidebarCard } from "@/lib/plan/types";

export type SidebarClassifyInput = {
  estimated_hours: number | null;
  target_date: string | null;
  start_date: string | null;
  due_date: string | null;
};

/**
 * Classifica card para bucket da sidebar do plano.
 * null = ja tem alocacao diaria na janela (aparece na grade, nao na sidebar).
 */
export function classifyPlanSidebarBucket(
  card: SidebarClassifyInput,
  hasAlloc: boolean,
  todayIso: string,
): PlanSidebarCard["bucket"] | null {
  if (hasAlloc) return null;

  const dueIso = card.due_date?.slice(0, 10) ?? null;
  if (dueIso && dueIso < todayIso) return "overdue";

  const hasDates = Boolean(card.target_date || card.start_date);
  const hasHours = Boolean(card.estimated_hours && card.estimated_hours > 0);

  if (!hasDates && !hasHours) return "no_estimate";

  return "unscheduled";
}
