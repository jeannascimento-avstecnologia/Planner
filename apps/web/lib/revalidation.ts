import { revalidatePath, revalidateTag } from "next/cache";

export const CACHE_TAGS = {
  boards: "boards",
  board: (id: string) => `board:${id}`,
  shell: (userId: string) => `shell:user:${userId}`,
  orgProjects: (orgId: string) => `org:${orgId}:projects`,
  orgMembers: (orgId: string) => `org:${orgId}:members`,
  orgDepartments: (orgId: string) => `org:${orgId}:deps`,
  calendar: "calendar",
  calendarOrg: (orgId: string, monthKey: string) => `calendar:${orgId}:${monthKey}`,
  notifications: (userId: string) => `notifications:${userId}`,
  plan: "plan",
  planUser: (userId: string) => `plan:user:${userId}`,
  workload: "workload",
  workloadOrg: (orgId: string) => `workload:${orgId}`,
  dashboard: "dashboard",
  dashboardBoard: (boardId: string) => `dashboard:${boardId}`,
  orgIntegrations: (orgId: string) => `org:${orgId}:integrations`,
} as const;

export function revalidateShell(userId: string, orgId?: string | null) {
  revalidateTag(CACHE_TAGS.shell(userId));
  if (orgId) {
    revalidateTag(CACHE_TAGS.orgProjects(orgId));
    revalidateTag(CACHE_TAGS.orgMembers(orgId));
  }
}

export function revalidateBoard(
  boardId: string,
  opts?: { calendar?: boolean; userId?: string; orgId?: string },
) {
  revalidateTag(CACHE_TAGS.board(boardId));
  revalidatePath(`/boards/${boardId}`);
  if (opts?.userId) revalidateTag(CACHE_TAGS.shell(opts.userId));
  if (opts?.orgId) revalidateTag(CACHE_TAGS.orgProjects(opts.orgId));
  if (opts?.calendar) {
    revalidateTag(CACHE_TAGS.calendar);
    revalidatePath("/calendar");
    if (opts.orgId) {
      const now = new Date();
      for (let i = -1; i <= 1; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        revalidateTag(CACHE_TAGS.calendarOrg(opts.orgId, monthKey));
      }
    }
  }
}

export function revalidateHomeProjects(userId?: string) {
  revalidateTag(CACHE_TAGS.boards);
  revalidatePath("/boards");
  revalidatePath("/projects");
  if (userId) revalidateTag(CACHE_TAGS.shell(userId));
}

export function revalidateOrgSettings(orgId: string, userId?: string) {
  revalidateTag(CACHE_TAGS.orgMembers(orgId));
  revalidateTag(CACHE_TAGS.orgDepartments(orgId));
  revalidateTag(CACHE_TAGS.orgProjects(orgId));
  revalidatePath("/settings/organizations");
  revalidatePath("/settings/organization");
  revalidatePath("/settings/organization/settings");
  if (userId) revalidateTag(CACHE_TAGS.shell(userId));
}

export function revalidateOrgIdentity(orgId: string, userId?: string) {
  revalidateOrgSettings(orgId, userId);
  revalidateHomeProjects(userId);
}

export function revalidateUserNotifications(userId: string) {
  revalidateTag(CACHE_TAGS.notifications(userId));
  revalidatePath("/", "layout");
}

/** Alocacoes diarias / plano — nao invalida /boards (evita cascade RSC pesado). */
export function revalidatePlanViews(userId?: string) {
  revalidateTag(CACHE_TAGS.plan);
  revalidateTag(CACHE_TAGS.workload);
  if (userId) revalidateTag(CACHE_TAGS.planUser(userId));
  revalidatePath("/plan");
  revalidatePath("/workload");
}

export function revalidateDashboard(boardId: string, orgId?: string) {
  revalidateTag(CACHE_TAGS.dashboard);
  revalidateTag(CACHE_TAGS.dashboardBoard(boardId));
  revalidatePath(`/boards/${boardId}/dashboard`);
  if (orgId) revalidateTag(CACHE_TAGS.dashboardBoard(boardId));
}

export function revalidateIntegrations(orgId: string) {
  revalidateTag(CACHE_TAGS.orgIntegrations(orgId));
  revalidatePath("/settings");
  revalidatePath("/settings/integrations");
  revalidatePath("/settings/integrations/slack");
  revalidatePath("/settings/integrations/teams");
  revalidatePath("/settings/integrations/google");
}
