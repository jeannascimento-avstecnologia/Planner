import { z } from "zod";

export const uuid = z.string().uuid();

export const cardPriority = z.enum(["low", "medium", "high", "urgent"]);
export type CardPriority = z.infer<typeof cardPriority>;

export const membershipRole = z.enum(["admin", "viewer"]);
export type MembershipRole = z.infer<typeof membershipRole>;

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

export const createColumnInput = z.object({
  boardId: uuid,
  name: z.string().min(1).max(80),
});
export type CreateColumnInput = z.infer<typeof createColumnInput>;

export const createCardInput = z.object({
  boardId: uuid,
  columnId: uuid,
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  priority: cardPriority.default("medium"),
  dueDate: z.string().optional(),
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
  assigneeId: uuid.nullable().optional(),
});
export type UpdateCardInput = z.infer<typeof updateCardInput>;

export const createTagInput = z.object({
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

export const inviteBoardInput = z.object({
  boardId: uuid,
  email: z.string().email(),
  role: membershipRole.default("viewer"),
});
export type InviteBoardInput = z.infer<typeof inviteBoardInput>;

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
