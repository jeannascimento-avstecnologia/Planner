import type { CardPriority } from "@nextgen/contracts";

export type TagRow = { id: string; name: string; color: string };
export type ProfileRow = { id: string; full_name: string | null };
export type BoardCard = {
  id: string;
  column_id: string;
  title: string;
  description: string | null;
  priority: CardPriority;
  due_date: string | null;
  assignee_id: string | null;
  completed_at: string | null;
  tagIds: string[];
};

export type ColumnRow = { id: string; name: string };

export function isOverdue(dueDate: string | null, completedAt: string | null): boolean {
  if (!dueDate || completedAt) return false;
  return new Date(dueDate) < new Date();
}

export function formatDue(dueDate: string | null): string {
  if (!dueDate) return "";
  return new Date(dueDate).toLocaleDateString("pt-BR");
}

export function memberLabel(p: ProfileRow | undefined): string {
  return p?.full_name?.trim() || p?.id.slice(0, 8) || "?";
}

export type CardFilters = {
  text: string;
  tagIds: string[];
  assignees: string[]; // ids de membros + "none"
  duePreset: number | null; // proximos N dias
  dueExact: string | null; // YYYY-MM-DD
};

export const EMPTY_FILTERS: CardFilters = {
  text: "",
  tagIds: [],
  assignees: [],
  duePreset: null,
  dueExact: null,
};

export function hasActiveFilters(f: CardFilters): boolean {
  return (
    f.text.trim() !== "" ||
    f.tagIds.length > 0 ||
    f.assignees.length > 0 ||
    f.duePreset !== null ||
    f.dueExact !== null
  );
}

function dueWithinNextDays(due: string, days: number): boolean {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + days);
  end.setHours(23, 59, 59, 999);
  const d = new Date(due);
  return d >= start && d <= end;
}

export function matchesFilters(card: BoardCard, f: CardFilters): boolean {
  if (f.text.trim() && !card.title.toLowerCase().includes(f.text.trim().toLowerCase())) {
    return false;
  }
  if (f.tagIds.length > 0 && !f.tagIds.some((t) => card.tagIds.includes(t))) {
    return false;
  }
  if (f.assignees.length > 0) {
    const matchAssignee = card.assignee_id
      ? f.assignees.includes(card.assignee_id)
      : f.assignees.includes("none");
    if (!matchAssignee) return false;
  }
  if (f.duePreset !== null) {
    if (!card.due_date || !dueWithinNextDays(card.due_date, f.duePreset)) return false;
  }
  if (f.dueExact) {
    if (!card.due_date || card.due_date.slice(0, 10) !== f.dueExact) return false;
  }
  return true;
}
