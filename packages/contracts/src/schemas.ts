import { z } from "zod";

export const uuid = z.string().uuid();

export const cardPriority = z.enum(["low", "medium", "high", "urgent"]);
export type CardPriority = z.infer<typeof cardPriority>;

export const membershipRole = z.enum(["admin", "viewer", "manager"]);
export type MembershipRole = z.infer<typeof membershipRole>;

export const boardMemberRole = z.enum(["admin", "viewer", "manager"]);
export type BoardMemberRole = z.infer<typeof boardMemberRole>;

export const hexColor = z.string().regex(/^#[0-9A-Fa-f]{6}$/);

// --- Auth ---
export const signInInput = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
export type SignInInput = z.infer<typeof signInInput>;

export const signUpInput = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72),
  fullName: z.string().min(1).max(120),
  orgName: z.string().min(1).max(120),
});
export type SignUpInput = z.infer<typeof signUpInput>;

export const inviteSignUpInput = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72),
  fullName: z.string().min(1).max(120),
});
export type InviteSignUpInput = z.infer<typeof inviteSignUpInput>;

export const forgotPasswordInput = z.object({
  email: z.string().email(),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordInput>;

// --- Boards / Columns / Cards ---
export const createBoardInput = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
  icon: z.string().max(40).optional(),
  color: hexColor.optional(),
});
export type CreateBoardInput = z.infer<typeof createBoardInput>;

export const updateBoardAppearanceInput = z.object({
  boardId: uuid,
  icon: z.string().max(40).nullable().optional(),
  color: hexColor.nullable().optional(),
});
export type UpdateBoardAppearanceInput = z.infer<typeof updateBoardAppearanceInput>;

export const boardTifluxDefaultsSchema = z.object({
  clientName: z.string().max(200).optional(),
  deskName: z.string().max(200).optional(),
  responsibleName: z.string().max(200).optional(),
  requestorName: z.string().max(200).optional(),
  requestorEmail: z.string().email().optional(),
});
export type BoardTifluxDefaults = z.infer<typeof boardTifluxDefaultsSchema>;

export const updateBoardSettingsInput = z.object({
  boardId: uuid,
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(2000).nullable().optional(),
  icon: z.string().max(40).nullable().optional(),
  color: hexColor.nullable().optional(),
  archived: z.coerce.boolean().optional(),
  tifluxEnabled: z.coerce.boolean().optional(),
  tifluxDefaults: boardTifluxDefaultsSchema.optional(),
});
export type UpdateBoardSettingsInput = z.infer<typeof updateBoardSettingsInput>;

export const deleteBoardInput = z.object({
  boardId: uuid,
});
export type DeleteBoardInput = z.infer<typeof deleteBoardInput>;

export const tifluxLookupKind = z.enum([
  "client",
  "desk",
  "priority",
  "services_catalog_item",
  "requestor",
  "user",
  "parent_ticket",
]);
export type TifluxLookupKind = z.infer<typeof tifluxLookupKind>;

export const tifluxSearchInput = z.object({
  boardId: uuid,
  kind: tifluxLookupKind,
  query: z.string().max(120).optional(),
  deskId: z.coerce.number().int().positive().optional(),
  clientId: z.coerce.number().int().positive().optional(),
});
export type TifluxSearchInput = z.infer<typeof tifluxSearchInput>;

export const createTifluxTicketInput = z.object({
  cardId: uuid,
  boardId: uuid,
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(5000),
  clientId: z.coerce.number().int().positive(),
  deskId: z.coerce.number().int().positive(),
  priorityId: z.coerce.number().int().positive().optional(),
  servicesCatalogsItemId: z.coerce.number().int().positive().optional(),
  requestorId: z.coerce.number().int().positive().optional(),
  requestorName: z.string().max(200).optional(),
  requestorEmail: z.string().email().optional(),
  followers: z.array(z.string().email()).max(50).optional(),
  parentTicketNumber: z.coerce.number().int().positive().optional(),
});
export type CreateTifluxTicketInput = z.infer<typeof createTifluxTicketInput>;

export const linkTifluxTicketInput = z.object({
  cardId: uuid,
  boardId: uuid,
  clientId: z.coerce.number().int().positive(),
  deskId: z.coerce.number().int().positive(),
  ticketNumber: z.coerce.number().int().positive(),
  parentTicketNumber: z.coerce.number().int().positive().optional(),
  childTicketNumber: z.coerce.number().int().positive().optional(),
});
export type LinkTifluxTicketInput = z.infer<typeof linkTifluxTicketInput>;

export const changePasswordInput = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8).max(128),
    confirmPassword: z.string().min(8).max(128),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "As senhas nao coincidem.",
    path: ["confirmPassword"],
  });
export type ChangePasswordInput = z.infer<typeof changePasswordInput>;

export const createColumnInput = z.object({
  boardId: uuid,
  name: z.string().min(1).max(80),
});
export type CreateColumnInput = z.infer<typeof createColumnInput>;

export const updateColumnInput = z.object({
  columnId: uuid,
  boardId: uuid,
  name: z.string().min(1).max(80),
});
export type UpdateColumnInput = z.infer<typeof updateColumnInput>;

export const createCardInput = z.object({
  boardId: uuid,
  columnId: uuid,
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  priority: cardPriority.default("medium"),
  dueDate: z.string().optional(),
  startDate: z.string().optional(),
  assigneeId: uuid.optional(),
});
export type CreateCardInput = z.infer<typeof createCardInput>;

export const updateCardInput = z.object({
  cardId: uuid,
  boardId: uuid,
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).nullable().optional(),
  priority: cardPriority.optional(),
  dueDate: z.string().nullable().optional(),
  startDate: z.string().nullable().optional(),
  assigneeId: uuid.nullable().optional(),
});
export type UpdateCardInput = z.infer<typeof updateCardInput>;

export const deleteCardInput = z.object({
  cardId: uuid,
  boardId: uuid,
});
export type DeleteCardInput = z.infer<typeof deleteCardInput>;

export const createTagInput = z.object({
  boardId: uuid,
  name: z.string().min(1).max(40),
  color: hexColor,
});
export type CreateTagInput = z.infer<typeof createTagInput>;

export const attachTagInput = z.object({
  cardId: uuid,
  boardId: uuid,
  tagId: uuid,
});
export type AttachTagInput = z.infer<typeof attachTagInput>;

export const detachTagInput = z.object({
  cardId: uuid,
  boardId: uuid,
  tagId: uuid,
});
export type DetachTagInput = z.infer<typeof detachTagInput>;

export const deleteTagInput = z.object({
  tagId: uuid,
  boardId: uuid,
});
export type DeleteTagInput = z.infer<typeof deleteTagInput>;

export const inviteBoardInput = z.object({
  boardId: uuid,
  email: z.string().email(),
  role: boardMemberRole.default("viewer"),
});
export type InviteBoardInput = z.infer<typeof inviteBoardInput>;

export const inviteBoardBatchInput = z.object({
  boardId: uuid,
  invites: z
    .array(
      z.object({
        email: z.string().email(),
        role: boardMemberRole.default("viewer"),
      }),
    )
    .min(1)
    .max(20),
});
export type InviteBoardBatchInput = z.infer<typeof inviteBoardBatchInput>;

export const updateBoardMemberRoleInput = z.object({
  boardId: uuid,
  userId: uuid,
  role: boardMemberRole,
});
export type UpdateBoardMemberRoleInput = z.infer<typeof updateBoardMemberRoleInput>;

export const removeBoardMemberInput = z.object({
  boardId: uuid,
  userId: uuid,
});
export type RemoveBoardMemberInput = z.infer<typeof removeBoardMemberInput>;

export const createIcalTokenInput = z.object({
  boardId: uuid.optional(),
});
export type CreateIcalTokenInput = z.infer<typeof createIcalTokenInput>;

export const profileLocale = z.enum(["pt-BR", "en-US"]);
export type ProfileLocale = z.infer<typeof profileLocale>;

export const updateProfileInput = z.object({
  fullName: z.string().min(1).max(120).optional(),
  backupEmail: z.string().email().nullable().optional(),
  phone: z.string().max(40).nullable().optional(),
  locale: profileLocale.optional(),
  avatarUrl: z.string().url().nullable().optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileInput>;

// --- Stages ---
export const createStageInput = z.object({
  boardId: uuid,
  name: z.string().min(1).max(40),
  color: hexColor,
});
export type CreateStageInput = z.infer<typeof createStageInput>;

export const updateStageInput = z.object({
  stageId: uuid,
  boardId: uuid,
  name: z.string().min(1).max(40).optional(),
  color: hexColor.optional(),
  position: z.coerce.number().int().min(0).optional(),
});
export type UpdateStageInput = z.infer<typeof updateStageInput>;

export const deleteStageInput = z.object({
  stageId: uuid,
  boardId: uuid,
});
export type DeleteStageInput = z.infer<typeof deleteStageInput>;

export const setCardStageInput = z.object({
  cardId: uuid,
  boardId: uuid,
  stageId: uuid.nullable(),
});
export type SetCardStageInput = z.infer<typeof setCardStageInput>;

export const setColumnDefaultStageInput = z.object({
  columnId: uuid,
  boardId: uuid,
  stageId: uuid.nullable(),
});
export type SetColumnDefaultStageInput = z.infer<typeof setColumnDefaultStageInput>;
