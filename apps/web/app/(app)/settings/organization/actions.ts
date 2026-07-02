"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAppUrl } from "@/lib/app-url";
import { makeSecureToken } from "@/lib/tokens";
import { inviteEmailFailureMessage } from "@/lib/invite-email-messages";
import { checkInviteBatchRateLimit } from "@/lib/invite-rate-limit";
import { sendOrgInviteEmail } from "@/lib/notifications/org-invite";
import { canManageOrg } from "@/lib/org-member-roles";
import {
  orgInviteBatchInput,
  removeOrgMemberInput,
  transferOrgOwnershipInput,
  updateOrgMemberRoleInput,
  updateOrganizationInput,
  type OrgInviteBatchInput,
} from "@nextgen/contracts";

export type OrgActionResult = { ok: true } | { ok: false; error: string };

export type OrgInviteBatchItemResult = {
  email: string;
  ok: boolean;
  inviteUrl?: string;
  emailSent?: boolean;
  emailErrorCode?: string;
  error?: string;
};

export type OrgInviteBatchResult =
  | { ok: true; results: OrgInviteBatchItemResult[] }
  | { ok: false; error: string };

async function assertOrgManager(orgId: string): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nao autenticado." };

  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership || !canManageOrg(membership.role)) {
    return { ok: false, error: "Sem permissao para gerenciar a organizacao." };
  }
  return { ok: true, userId: user.id };
}

export async function updateOrgMemberRoleAction(input: {
  orgId: string;
  userId: string;
  role: "admin" | "viewer" | "manager";
}): Promise<OrgActionResult> {
  const parsed = updateOrgMemberRoleInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados invalidos." };

  const access = await assertOrgManager(parsed.data.orgId);
  if (!access.ok) return access;

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_membership_role", {
    p_org: parsed.data.orgId,
    p_user: parsed.data.userId,
    p_role: parsed.data.role,
  });
  if (error) return { ok: false, error: mapOrgRpcError(error.message) };

  revalidatePath("/settings/organization");
  return { ok: true };
}

export async function removeOrgMemberAction(input: { orgId: string; userId: string }): Promise<OrgActionResult> {
  const parsed = removeOrgMemberInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados invalidos." };

  const access = await assertOrgManager(parsed.data.orgId);
  if (!access.ok) return access;

  const supabase = await createClient();
  const { error } = await supabase.rpc("remove_org_member", {
    p_org: parsed.data.orgId,
    p_user: parsed.data.userId,
  });
  if (error) return { ok: false, error: mapOrgRpcError(error.message) };

  revalidatePath("/settings/organization");
  return { ok: true };
}

export async function leaveOrganizationAction(orgId: string): Promise<OrgActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("leave_organization", { p_org: orgId });
  if (error) return { ok: false, error: mapOrgRpcError(error.message) };

  revalidatePath("/boards");
  revalidatePath("/settings/organization");
  return { ok: true };
}

export async function transferOrgOwnershipAction(input: {
  orgId: string;
  newOwnerId: string;
}): Promise<OrgActionResult> {
  const parsed = transferOrgOwnershipInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados invalidos." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("transfer_org_ownership", {
    p_org: parsed.data.orgId,
    p_new_owner: parsed.data.newOwnerId,
  });
  if (error) return { ok: false, error: mapOrgRpcError(error.message) };

  revalidatePath("/settings/organization");
  revalidatePath("/settings/organization/settings");
  return { ok: true };
}

export async function updateOrganizationAction(input: {
  orgId: string;
  name: string;
  slug: string;
}): Promise<OrgActionResult> {
  const parsed = updateOrganizationInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados invalidos." };

  const access = await assertOrgManager(parsed.data.orgId);
  if (!access.ok) return access;

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_organization", {
    p_org: parsed.data.orgId,
    p_name: parsed.data.name,
    p_slug: parsed.data.slug,
  });
  if (error) return { ok: false, error: mapOrgRpcError(error.message) };

  revalidatePath("/settings/organization");
  revalidatePath("/settings/organization/settings");
  revalidatePath("/boards");
  revalidatePath("/projects");
  return { ok: true };
}

export async function inviteToOrgBatch(input: OrgInviteBatchInput): Promise<OrgInviteBatchResult> {
  const parsed = orgInviteBatchInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados invalidos." };

  const access = await assertOrgManager(parsed.data.orgId);
  if (!access.ok) return { ok: false, error: access.error };

  const rate = await checkInviteBatchRateLimit(access.userId, parsed.data.invites.length);
  if (!rate.allowed) {
    return { ok: false, error: "Limite de convites por hora atingido. Tente novamente mais tarde." };
  }

  const supabase = await createClient();
  const { data: org } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", parsed.data.orgId)
    .single();
  if (!org) return { ok: false, error: "Organizacao nao encontrada." };

  const { data: inviterProfile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", access.userId)
    .maybeSingle();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const inviterName = inviterProfile?.full_name?.trim() || user?.email || "Um membro da equipe";
  const appUrl = await getAppUrl();
  const seen = new Set<string>();
  const results: OrgInviteBatchItemResult[] = [];

  for (const invite of parsed.data.invites) {
    const email = invite.email.trim().toLowerCase();
    if (seen.has(email)) {
      results.push({ email, ok: false, error: "Email duplicado na lista." });
      continue;
    }
    seen.add(email);

    const { token, hash } = makeSecureToken();
    const expires = new Date();
    expires.setDate(expires.getDate() + 7);
    const inviteUrl = `${appUrl}/invite/org?token=${token}`;

    const { error } = await supabase.from("organization_invitations").insert({
      org_id: parsed.data.orgId,
      email,
      role: invite.role,
      token_hash: hash,
      expires_at: expires.toISOString(),
      created_by: access.userId,
    });

    if (error) {
      results.push({ email, ok: false, error: error.message });
      continue;
    }

    const emailResult = await sendOrgInviteEmail({
      to: email,
      orgName: org.name,
      inviterName,
      role: invite.role,
      inviteUrl,
      appUrl,
      expiresAt: expires,
    });

    const emailSent = emailResult.ok;
    results.push({
      email,
      ok: true,
      inviteUrl,
      emailSent,
      emailErrorCode: emailSent ? undefined : emailResult.code,
      error: emailSent ? undefined : inviteEmailFailureMessage(emailResult.code),
    });
  }

  revalidatePath("/settings/organization/invites");
  return { ok: true, results };
}

function mapOrgRpcError(message: string): string {
  const map: Record<string, string> = {
    forbidden: "Sem permissao.",
    not_authenticated: "Faca login.",
    owner_cannot_leave: "Transfira a propriedade antes de sair.",
    cannot_remove_owner: "Nao e possivel remover o proprietario.",
    cannot_change_owner_role: "Use transferencia de propriedade.",
    cannot_assign_owner_directly: "Proprietario so via transferencia.",
    member_not_found: "Membro nao encontrado.",
    already_owner: "Voce ja e o proprietario.",
  };
  return map[message] ?? "Nao foi possivel concluir a operacao.";
}
