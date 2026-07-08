import { formatDateIso } from "./week";

/** ISO week anchor for workload bucketing: target > due > start. */
export function workloadWeekAnchor(card: {
  target_date?: string | null;
  targetDate?: string | null;
  due_date?: string | null;
  dueDate?: string | null;
  start_date?: string | null;
  startDate?: string | null;
}): string | null {
  const raw =
    card.target_date ??
    card.targetDate ??
    card.due_date ??
    card.dueDate ??
    card.start_date ??
    card.startDate ??
    null;
  return raw ? String(raw) : null;
}

export function cardWeekIso(anchor: string): string {
  const dateOnly = anchor.slice(0, 10);
  const d = new Date(`${dateOnly}T12:00:00`);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return formatDateIso(d);
}

export function isUnscheduledWorkload(card: {
  target_date?: string | null;
  targetDate?: string | null;
  due_date?: string | null;
  dueDate?: string | null;
  start_date?: string | null;
  startDate?: string | null;
  estimated_hours?: number | null;
  estimatedHours?: number | null;
  assignee_id?: string | null;
  assigneeId?: string | null;
}): boolean {
  if (!card.assignee_id && !card.assigneeId) return false;
  const hours = Number(card.estimated_hours ?? card.estimatedHours ?? 0);
  if (hours <= 0) return false;
  return workloadWeekAnchor(card) === null;
}
