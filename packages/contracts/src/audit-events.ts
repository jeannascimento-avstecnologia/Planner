import { z } from "zod";

export const auditEventScope = z.enum(["card", "board", "org"]);
export type AuditEventScope = z.infer<typeof auditEventScope>;

export const cardAuditEventTypes = [
  "card_created",
  "card_updated",
  "card_deleted",
  "card_moved",
  "card_assigned",
  "card_comment_added",
  "card_attachment_added",
  "card_tiflux_linked",
  "stage_changed",
  "card_completed",
  "card_reopened",
] as const;

export const boardAuditEventTypes = [
  "board_created",
  "board_deleted",
  "board_renamed",
  "board_member_added",
  "board_member_removed",
  "column_created",
  "column_renamed",
  "column_deleted",
  "tiflux_configured",
  "tiflux_cleared",
  "preset_assigned",
] as const;

export const orgAuditEventTypes = [
  "member_invited",
  "member_removed",
  "role_changed",
  "department_moved",
  "org_renamed",
  "org_logo_updated",
  "preset_created",
  "preset_updated",
  "preset_deleted",
] as const;

export const auditEventType = z.enum([
  ...cardAuditEventTypes,
  ...boardAuditEventTypes,
  ...orgAuditEventTypes,
]);
export type AuditEventType = z.infer<typeof auditEventType>;

export const emitAuditEventInput = z.object({
  orgId: z.string().uuid(),
  eventScope: auditEventScope,
  eventType: auditEventType,
  payload: z.record(z.unknown()).default({}),
  boardId: z.string().uuid().optional().nullable(),
  cardId: z.string().uuid().optional().nullable(),
});

export type EmitAuditEventInput = z.infer<typeof emitAuditEventInput>;

export const auditLogFilterInput = z.object({
  orgId: z.string().uuid(),
  actorId: z.string().uuid().optional(),
  eventTypes: z.array(auditEventType).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  cursorOccurredAt: z.string().datetime().optional(),
  cursorId: z.coerce.number().int().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type AuditLogFilterInput = z.infer<typeof auditLogFilterInput>;

export type AuditLogRow = {
  id: number;
  org_id: string;
  board_id: string | null;
  card_id: string | null;
  actor_id: string | null;
  event_scope: AuditEventScope;
  event_type: AuditEventType;
  payload: Record<string, unknown>;
  occurred_at: string;
  actor_name: string | null;
  actor_avatar: string | null;
};
