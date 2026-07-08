export const PLAN_PAST_DAYS = 5;
export const PLAN_FUTURE_DAYS = 5;
/** Calendario pessoal: 5 dias passados + hoje + 5 futuros. */
export const PLAN_WINDOW_DAYS = PLAN_PAST_DAYS + 1 + PLAN_FUTURE_DAYS;
/** Grade gerencial em /workload?mode=15d (inalterada). */
export const WORKLOAD_15D_WINDOW_DAYS = 15;

export interface PlanGridDay {
  date: string;
  capacityHours: number;
  allocatedHours: number;
  utilizationPct: number;
}

export interface PlanGridRow {
  cardId: string;
  boardId: string;
  boardName: string;
  title: string;
  description: string | null;
  startDate: string | null;
  targetDate: string | null;
  dueDate: string | null;
  personalPlanAt: string | null;
  cells: Record<string, number>;
  totalHours: number;
  estimatedHours: number | null;
}

export interface PlanSidebarCard {
  cardId: string;
  boardId: string;
  boardName: string;
  title: string;
  description: string | null;
  estimatedHours: number | null;
  startDate: string | null;
  targetDate: string | null;
  dueDate: string | null;
  bucket: "unscheduled" | "no_estimate" | "overdue";
}

export interface PlanGridData {
  days: PlanGridDay[];
  rows: PlanGridRow[];
  sidebar: PlanSidebarCard[];
  dailyCapacityHours: number;
  canEdit: boolean;
}

export interface PlanOrgSection {
  orgId: string;
  orgName: string;
  orgLogoUrl: string | null;
  initialData: PlanGridData;
  boards: { id: string; name: string }[];
}

export interface Workload15DayMember {
  userId: string;
  fullName: string;
  capacityHours: number;
  days: Record<string, number>;
  totalHours: number;
}
