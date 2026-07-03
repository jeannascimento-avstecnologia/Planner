import { revalidatePath, revalidateTag } from "next/cache";

export const CACHE_TAGS = {
  boards: "boards",
  board: (id: string) => `board:${id}`,
  orgProjects: (orgId: string) => `org:${orgId}:projects`,
  orgMembers: (orgId: string) => `org:${orgId}:members`,
  orgDepartments: (orgId: string) => `org:${orgId}:deps`,
  calendar: "calendar",
  notifications: (userId: string) => `notifications:${userId}`,
} as const;

export function revalidateBoard(boardId: string, opts?: { calendar?: boolean }) {
  revalidateTag(CACHE_TAGS.board(boardId));
  revalidatePath(`/boards/${boardId}`);
  if (opts?.calendar) {
    revalidateTag(CACHE_TAGS.calendar);
    revalidatePath("/calendar");
  }
}

export function revalidateHomeProjects() {
  revalidateTag(CACHE_TAGS.boards);
  revalidatePath("/boards");
  revalidatePath("/projects");
}

export function revalidateOrgSettings(orgId: string) {
  revalidateTag(CACHE_TAGS.orgMembers(orgId));
  revalidateTag(CACHE_TAGS.orgDepartments(orgId));
  revalidateTag(CACHE_TAGS.orgProjects(orgId));
  revalidatePath("/settings/organizations");
  revalidatePath("/settings/organization");
  revalidatePath("/settings/organization/settings");
}

export function revalidateOrgIdentity(orgId: string) {
  revalidateOrgSettings(orgId);
  revalidateHomeProjects();
}

export function revalidateUserNotifications(userId: string) {
  revalidateTag(CACHE_TAGS.notifications(userId));
  revalidatePath("/", "layout");
}
