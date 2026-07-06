import { z } from "zod";

export const fieldAccess = z.enum(["read", "write", "hidden"]);
export type FieldAccess = z.infer<typeof fieldAccess>;

export const CARD_PERMISSION_FIELDS = [
  "title",
  "description",
  "due_date",
  "start_date",
  "priority",
  "assignee_id",
  "column_id",
  "estimated_hours",
  "story_points",
] as const;

export type CardPermissionField = (typeof CARD_PERMISSION_FIELDS)[number];

export const updateCardFieldsInput = z.object({
  cardId: z.string().uuid(),
  patch: z.record(z.unknown()),
});

export type UpdateCardFieldsInput = z.infer<typeof updateCardFieldsInput>;
