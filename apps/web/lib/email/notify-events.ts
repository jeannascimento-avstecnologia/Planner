import "server-only";

import {
  boardUrl,
  formatPtBrDate,
  formatPtBrDateFromYmd,
  logNotificationSent,
  NOTIFICATION_EVENT_TYPES,
  wasNotificationSent,
} from "@/lib/email/notification-log";
import { getRecipientProfile, getRecipientProfiles } from "@/lib/email/recipient";
import { sendNotificationEmail } from "@/lib/email/send-notification";
import { buildProjectCreatedEmail } from "@/lib/email/templates/project-created";
import { buildScheduleCreatedEmail } from "@/lib/email/templates/schedule-created";
import { buildTaskAssignedEmail } from "@/lib/email/templates/task-assigned";
import { buildTaskDueSoonEmail } from "@/lib/email/templates/task-due-soon";
import { buildTaskOverdueEmail } from "@/lib/email/templates/task-overdue";
import { tryCreateServiceClient } from "@/lib/supabase/service";

export type TaskAssignedNotifyInput = {
  orgId: string;
  boardId: string;
  cardId: string;
  taskTitle: string;
  projectName: string;
  dueDateIso: string | null;
  assigneeId: string;
  assignerName: string;
};

export async function notifyTaskAssigned(input: TaskAssignedNotifyInput): Promise<void> {
  if (await wasNotificationSent(input.assigneeId, NOTIFICATION_EVENT_TYPES.taskAssigned, input.cardId)) {
    return;
  }

  const recipient = await getRecipientProfile(input.assigneeId);
  if (!recipient) return;

  const { subject, html } = buildTaskAssignedEmail({
    taskTitle: input.taskTitle,
    projectName: input.projectName,
    dueDate: formatPtBrDate(input.dueDateIso),
    assigneeName: recipient.fullName,
    assignerName: input.assignerName,
    boardUrl: boardUrl(input.boardId),
  });

  const result = await sendNotificationEmail({ to: recipient.email, subject, html });
  if ("error" in result) return;

  await logNotificationSent({
    orgId: input.orgId,
    recipientId: input.assigneeId,
    eventType: NOTIFICATION_EVENT_TYPES.taskAssigned,
    entityId: input.cardId,
  });
}

export type ProjectCreatedNotifyInput = {
  orgId: string;
  boardId: string;
  projectName: string;
  creatorId: string;
  creatorName: string;
};

export async function notifyProjectCreated(input: ProjectCreatedNotifyInput): Promise<void> {
  const service = tryCreateServiceClient();
  if (!service) return;

  const { data: members } = await service
    .from("memberships")
    .select("user_id")
    .eq("org_id", input.orgId)
    .neq("user_id", input.creatorId);

  const recipientIds = (members ?? []).map((m) => m.user_id);
  if (recipientIds.length === 0) return;

  const profiles = await getRecipientProfiles(recipientIds);
  const url = boardUrl(input.boardId);

  for (const userId of recipientIds) {
    if (await wasNotificationSent(userId, NOTIFICATION_EVENT_TYPES.projectCreated, input.boardId)) continue;

    const recipient = profiles.get(userId);
    if (!recipient) continue;

    const { subject, html } = buildProjectCreatedEmail({
      projectName: input.projectName,
      creatorName: input.creatorName,
      boardUrl: url,
    });

    const result = await sendNotificationEmail({ to: recipient.email, subject, html });
    if ("error" in result) continue;

    await logNotificationSent({
      orgId: input.orgId,
      recipientId: userId,
      eventType: NOTIFICATION_EVENT_TYPES.projectCreated,
      entityId: input.boardId,
    });
  }
}

export type ScheduleCreatedNotifyInput = {
  orgId: string;
  boardId: string;
  cardId: string;
  taskTitle: string;
  projectName: string;
  workDate: string;
  assigneeId: string;
};

export async function notifyScheduleCreated(input: ScheduleCreatedNotifyInput): Promise<void> {
  const entityId = `${input.cardId}:${input.workDate}`;
  if (await wasNotificationSent(input.assigneeId, NOTIFICATION_EVENT_TYPES.scheduleCreated, entityId)) {
    return;
  }

  const recipient = await getRecipientProfile(input.assigneeId);
  if (!recipient) return;

  const { subject, html } = buildScheduleCreatedEmail({
    taskTitle: input.taskTitle,
    projectName: input.projectName,
    workDate: formatPtBrDateFromYmd(input.workDate),
    boardUrl: `${boardUrl(input.boardId)}?view=plan`,
  });

  const result = await sendNotificationEmail({ to: recipient.email, subject, html });
  if ("error" in result) return;

  await logNotificationSent({
    orgId: input.orgId,
    recipientId: input.assigneeId,
    eventType: NOTIFICATION_EVENT_TYPES.scheduleCreated,
    entityId: entityId,
  });
}

type DueCardRow = {
  id: string;
  org_id: string;
  board_id: string;
  title: string;
  due_date: string;
  assignee_id: string;
};

export async function sendDueDateNotifications(): Promise<number> {
  const service = tryCreateServiceClient();
  if (!service) return 0;

  const now = new Date();
  const inThreeDays = new Date(now);
  inThreeDays.setDate(inThreeDays.getDate() + 3);

  const { data: cards, error } = await service
    .from("cards")
    .select("id, org_id, board_id, title, due_date, assignee_id")
    .is("completed_at", null)
    .not("due_date", "is", null)
    .not("assignee_id", "is", null)
    .lte("due_date", inThreeDays.toISOString());

  if (error) {
    console.error("[cron] due notifications query failed", error.message);
    return 0;
  }

  const boardIds = [...new Set((cards ?? []).map((c) => c.board_id))];
  const { data: boards } =
    boardIds.length > 0
      ? await service.from("boards").select("id, name").in("id", boardIds)
      : { data: [] as { id: string; name: string }[] };
  const boardNames = new Map((boards ?? []).map((b) => [b.id, b.name]));

  let sent = 0;
  for (const row of (cards ?? []) as DueCardRow[]) {
    const due = new Date(row.due_date);
    const isOverdue = due < now;
    const eventType = isOverdue ? NOTIFICATION_EVENT_TYPES.taskOverdue : NOTIFICATION_EVENT_TYPES.taskDueSoon;

    if (!isOverdue && due > inThreeDays) continue;

    if (await wasNotificationSent(row.assignee_id, eventType, row.id)) continue;

    const recipient = await getRecipientProfile(row.assignee_id);
    if (!recipient) continue;

    const projectName = boardNames.get(row.board_id) ?? "Projeto";
    const dueLabel = formatPtBrDate(row.due_date) ?? row.due_date;
    const url = boardUrl(row.board_id);

    const email = isOverdue
      ? buildTaskOverdueEmail({
          taskTitle: row.title,
          projectName,
          dueDate: dueLabel,
          boardUrl: url,
        })
      : buildTaskDueSoonEmail({
          taskTitle: row.title,
          projectName,
          dueDate: dueLabel,
          boardUrl: url,
        });

    const result = await sendNotificationEmail({
      to: recipient.email,
      subject: email.subject,
      html: email.html,
    });
    if ("error" in result) continue;

    await logNotificationSent({
      orgId: row.org_id,
      recipientId: row.assignee_id,
      eventType,
      entityId: row.id,
    });
    sent += 1;
  }

  return sent;
}

export async function getActorDisplayName(userId: string): Promise<string> {
  const profile = await getRecipientProfile(userId);
  return profile?.fullName ?? "Um integrante";
}

type SupabaseServer = Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>;

export async function fireTaskAssignedIfChanged(
  supabase: SupabaseServer,
  input: {
    cardId: string;
    boardId: string;
    assigneeId: string | null | undefined;
    previousAssigneeId: string | null;
    actorId: string;
  },
): Promise<void> {
  const next = input.assigneeId ?? null;
  if (!next || next === input.previousAssigneeId) return;

  const [{ data: card }, { data: board }] = await Promise.all([
    supabase.from("cards").select("title, due_date, org_id").eq("id", input.cardId).maybeSingle(),
    supabase.from("boards").select("name").eq("id", input.boardId).maybeSingle(),
  ]);
  if (!card?.org_id || !board) return;

  const assignerName = await getActorDisplayName(input.actorId);
  await notifyTaskAssigned({
    orgId: card.org_id,
    boardId: input.boardId,
    cardId: input.cardId,
    taskTitle: card.title,
    projectName: board.name,
    dueDateIso: card.due_date,
    assigneeId: next,
    assignerName,
  });
}
