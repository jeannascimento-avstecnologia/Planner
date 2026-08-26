import "server-only";

import { tryCreateServiceClient } from "@/lib/supabase/service";

export const NOTIFICATION_EVENT_TYPES = {
  taskAssigned: "task_assigned",
  taskDueSoon: "task_due_soon",
  taskOverdue: "task_overdue",
  projectCreated: "project_created",
  scheduleCreated: "schedule_created",
} as const;

export type NotificationEventType = (typeof NOTIFICATION_EVENT_TYPES)[keyof typeof NOTIFICATION_EVENT_TYPES];

export async function wasNotificationSent(
  recipientId: string,
  eventType: NotificationEventType,
  entityId: string,
): Promise<boolean> {
  const service = tryCreateServiceClient();
  if (!service) return false;

  const { data } = await service
    .from("notification_log")
    .select("id")
    .eq("recipient_id", recipientId)
    .eq("event_type", eventType)
    .eq("entity_id", entityId)
    .maybeSingle();

  return Boolean(data);
}

export async function logNotificationSent(input: {
  orgId: string;
  recipientId: string;
  eventType: NotificationEventType;
  entityId: string;
}): Promise<void> {
  const service = tryCreateServiceClient();
  if (!service) return;

  const { error } = await service.from("notification_log").insert({
    org_id: input.orgId,
    recipient_id: input.recipientId,
    event_type: input.eventType,
    entity_id: input.entityId,
  });
  if (error && error.code !== "23505") {
    console.error("[email] notification_log insert failed", error.message);
  }
}

export function formatPtBrDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

export function formatPtBrDateFromYmd(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, 12));
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

export function boardUrl(boardId: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") || "http://localhost:3001";
  return `${base}/boards/${boardId}`;
}
