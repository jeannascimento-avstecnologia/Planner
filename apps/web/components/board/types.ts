import type { CardPriority } from "@nextgen/contracts";
import { inferStartDateWhenUnset } from "@/lib/parse-date-br";
import type { TifluxCanceledTicket } from "@/lib/tiflux-canceled-tickets";

export type TagRow = { id: string; name: string; color: string };
export type StageRow = {
  id: string;
  name: string;
  color: string;
  position: number;
  is_system: boolean;
  system_key: string | null;
};
export type ProfileRow = { id: string; full_name: string | null };
export type BoardCard = {
  id: string;
  column_id: string;
  title: string;
  description: string | null;
  priority: CardPriority;
  due_date: string | null;
  start_date: string | null;
  assignee_id: string | null;
  completed_at: string | null;
  stage_id: string | null;
  tagIds: string[];
  tiflux_ticket_number: string | null;
  tiflux_ticket_id: string | null;
  tiflux_canceled_tickets: TifluxCanceledTicket[];
};

export type ColumnRow = { id: string; name: string; default_stage_id?: string | null };

export function resolveCardStage(
  card: BoardCard,
  columns: ColumnRow[],
  stagesById: Map<string, StageRow>,
): StageRow | null {
  if (card.stage_id && stagesById.has(card.stage_id)) {
    return stagesById.get(card.stage_id)!;
  }
  const col = columns.find((c) => c.id === card.column_id);
  if (col?.default_stage_id && stagesById.has(col.default_stage_id)) {
    return stagesById.get(col.default_stage_id)!;
  }
  return null;
}

function startOfTodayLocal(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function dueDateStartLocal(dueDate: string): number {
  const d = new Date(dueDate);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function isOverdue(dueDate: string | null, completedAt: string | null): boolean {
  if (!dueDate || completedAt) return false;
  return dueDateStartLocal(dueDate) < startOfTodayLocal();
}

/** Prazo vencido em card aberto (ignora estagio Concluido). */
export function isCardOverdue(
  card: Pick<BoardCard, "due_date" | "completed_at" | "stage_id">,
  stagesById?: Map<string, StageRow>,
): boolean {
  if (card.completed_at) return false;
  if (stagesById && card.stage_id) {
    const stage = stagesById.get(card.stage_id);
    if (stage?.system_key === "concluido") return false;
  }
  return isOverdue(card.due_date, card.completed_at);
}

export function formatDue(dueDate: string | null): string {
  if (!dueDate) return "";
  return new Date(dueDate).toLocaleDateString("pt-BR");
}

export function formatStart(startDate: string | null): string {
  if (!startDate) return "";
  return new Date(startDate).toLocaleDateString("pt-BR");
}

/** start_date efetivo para timeline: inferido do prazo quando start vazio. */
export function effectiveStartDate(card: { start_date: string | null; due_date: string | null }): string | null {
  if (card.start_date) return card.start_date;
  if (card.due_date) return inferStartDateWhenUnset(card.due_date);
  return null;
}

export type BoardViewMode = "kanban" | "timeline" | "calendar" | "table";

export const BOARD_VIEW_MODES: BoardViewMode[] = ["kanban", "timeline", "calendar", "table"];

export function parseBoardViewMode(raw: string | null): BoardViewMode {
  if (raw && BOARD_VIEW_MODES.includes(raw as BoardViewMode)) return raw as BoardViewMode;
  return "kanban";
}

export function memberLabel(p: ProfileRow | undefined): string {
  return p?.full_name?.trim() || p?.id.slice(0, 8) || "?";
}

export type CardFilters = {
  text: string;
  tagIds: string[];
  stageIds: string[];
  assignees: string[]; // ids de membros + "none"
  duePreset: number | null; // proximos N dias
  dueExact: string | null; // YYYY-MM-DD
};

export const EMPTY_FILTERS: CardFilters = {
  text: "",
  tagIds: [],
  stageIds: [],
  assignees: [],
  duePreset: null,
  dueExact: null,
};

export function hasActiveFilters(f: CardFilters): boolean {
  return (
    f.text.trim() !== "" ||
    f.tagIds.length > 0 ||
    f.stageIds.length > 0 ||
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

export function matchesFilters(
  card: BoardCard,
  f: CardFilters,
  ctx?: { columns: ColumnRow[]; stagesById: Map<string, StageRow> },
): boolean {
  if (f.text.trim() && !card.title.toLowerCase().includes(f.text.trim().toLowerCase())) {
    return false;
  }
  if (f.tagIds.length > 0 && !f.tagIds.some((t) => card.tagIds.includes(t))) {
    return false;
  }
  if (f.stageIds.length > 0 && ctx) {
    const effective = resolveCardStage(card, ctx.columns, ctx.stagesById);
    const matchNone = f.stageIds.includes("none") && effective === null;
    const matchStage = effective !== null && f.stageIds.includes(effective.id);
    if (!matchNone && !matchStage) return false;
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
