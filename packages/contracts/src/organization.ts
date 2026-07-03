import { z } from "zod";
import { membershipRole, orgManageableRole, orgMemberRole, uuid } from "./schemas";

export const orgMemberRowSchema = z.object({
  user_id: uuid,
  full_name: z.string().nullable(),
  avatar_url: z.string().nullable(),
  role: membershipRole,
  created_at: z.string(),
});
export type OrgMemberRow = z.infer<typeof orgMemberRowSchema>;

export const updateOrgMemberRoleInput = z.object({
  orgId: uuid,
  userId: uuid,
  role: orgMemberRole,
});
export type UpdateOrgMemberRoleInput = z.infer<typeof updateOrgMemberRoleInput>;

export const setOrgMultiOwnerInput = z.object({
  orgId: uuid,
  enabled: z.boolean(),
});
export type SetOrgMultiOwnerInput = z.infer<typeof setOrgMultiOwnerInput>;

export const removeOrgMemberInput = z.object({
  orgId: uuid,
  userId: uuid,
});
export type RemoveOrgMemberInput = z.infer<typeof removeOrgMemberInput>;

export const transferOrgOwnershipInput = z.object({
  orgId: uuid,
  newOwnerId: uuid,
});
export type TransferOrgOwnershipInput = z.infer<typeof transferOrgOwnershipInput>;

export const deleteOrganizationInput = z.object({
  orgId: uuid,
});
export type DeleteOrganizationInput = z.infer<typeof deleteOrganizationInput>;

export const updateOrganizationInput = z.object({
  orgId: uuid,
  legalName: z.string().max(120).optional(),
  displayName: z.string().min(1).max(120),
  cnpj: z
    .string()
    .optional()
    .transform((v) => (v ? v.replace(/\D/g, "") : ""))
    .refine((v) => v === "" || v.length === 14, { message: "CNPJ invalido." }),
  slug: z.string().min(1).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
});
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationInput>;

export const updateOrgLogoInput = z.object({
  orgId: uuid,
  logoUrl: z.string().nullable(),
});
export type UpdateOrgLogoInput = z.infer<typeof updateOrgLogoInput>;

export const orgInviteItemSchema = z.object({
  email: z.string().email(),
  role: orgMemberRole.default("viewer"),
});
export type OrgInviteItem = z.infer<typeof orgInviteItemSchema>;

export const orgInviteBatchInput = z.object({
  orgId: uuid,
  invites: z.array(orgInviteItemSchema).min(1).max(20),
});
export type OrgInviteBatchInput = z.infer<typeof orgInviteBatchInput>;

export const resolveOrgInvitationSchema = z.object({
  status: z.enum(["pending", "accepted", "expired", "not_found"]),
  org_id: uuid.nullable(),
  email: z.string().nullable(),
  role: membershipRole.nullable(),
});
export type ResolveOrgInvitation = z.infer<typeof resolveOrgInvitationSchema>;
