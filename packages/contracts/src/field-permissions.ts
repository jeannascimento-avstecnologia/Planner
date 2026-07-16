import { z } from "zod";

export const fieldAccess = z.enum(["read", "write", "hidden"]);
export type FieldAccess = z.infer<typeof fieldAccess>;

export const CARD_PERMISSION_FIELDS = [
  "title",
  "description",
  "due_date",
  "start_date",
  "target_date",
  "priority",
  "assignee_id",
  "column_id",
  "estimated_hours",
  "parent_id",
  "tree_x",
  "tree_y",
] as const;

export type CardPermissionField = (typeof CARD_PERMISSION_FIELDS)[number];

export const userFieldPermissionAccess = z.union([fieldAccess, z.literal("default")]);
export type UserFieldPermissionAccess = z.infer<typeof userFieldPermissionAccess>;

export const setUserFieldPermissionInput = z.object({
  orgId: z.string().uuid(),
  userId: z.string().uuid(),
  fieldName: z.enum(CARD_PERMISSION_FIELDS),
  access: userFieldPermissionAccess,
});

export type SetUserFieldPermissionInput = z.infer<typeof setUserFieldPermissionInput>;

const cardFieldPatchValue = z.union([z.string(), z.number(), z.null()]);

export const cardFieldsPatchSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(5000).nullable().optional(),
    due_date: z.string().nullable().optional(),
    start_date: z.string().nullable().optional(),
    target_date: z.string().nullable().optional(),
    priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
    assignee_id: z.string().uuid().nullable().optional(),
    column_id: z.string().uuid().optional(),
    estimated_hours: z.number().min(0).max(999.99).nullable().optional(),
    parent_id: z.string().uuid().nullable().optional(),
    tree_x: z.number().finite().min(-1_000_000).max(1_000_000).nullable().optional(),
    tree_y: z.number().finite().min(-1_000_000).max(1_000_000).nullable().optional(),
  })
  .strict();

export type CardFieldsPatch = z.infer<typeof cardFieldsPatchSchema>;

export const updateCardFieldsInput = z.object({
  cardId: z.string().uuid(),
  patch: cardFieldsPatchSchema,
});

export type UpdateCardFieldsInput = z.infer<typeof updateCardFieldsInput>;
