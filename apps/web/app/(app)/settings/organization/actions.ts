"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { ACTIVE_ORG_COOKIE } from "@/lib/active-org";
import { getAppUrl } from "@/lib/app-url";
import { makeSecureToken } from "@/lib/tokens";
import { inviteEmailFailureMessage } from "@/lib/invite-email-messages";
import { checkInviteBatchRateLimit } from "@/lib/invite-rate-limit";
import { sendOrgInviteEmail } from "@/lib/notifications/org-invite";
import { canManageOrgIdentity, canManageOrgMembers } from "@/lib/org-member-roles";
import { uploadOrgLogoToStorage } from "@/lib/org-logo-storage-upload";
import {
  deleteOrganizationInput,
  setOrgMultiOwnerInput,
  orgInviteBatchInput,
  removeOrgMemberInput,
  transferOrgOwnershipInput,
  updateOrgMemberRoleInput,
  updateOrganizationInput,
  updateOrgLogoInput,
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

async function assertOrgMemberManager(orgId: string): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
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
  if (!membership || !canManageOrgMembers(membership.role)) {
    return { ok: false, error: "Sem permissao para gerenciar membros." };
  }
  return { ok: true, userId: user.id };
}

async function assertOrgOwner(orgId: string): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
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
  if (!membership || !canManageOrgIdentity(membership.role)) {
    return { ok: false, error: "Sem permissao. Apenas o proprietario pode fazer isso." };
  }
  return { ok: true, userId: user.id };
}

export async function updateOrgMemberRoleAction(input: {
  orgId: string;
  userId: string;
  role: "admin" | "viewer" | "manager" | "owner";
}): Promise<OrgActionResult> {
  const parsed = updateOrgMemberRoleInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados invalidos." };

  const access = await assertOrgMemberManager(parsed.data.orgId);
  if (!access.ok) return access;

  if (parsed.data.role === "owner") {
    const supabaseCheck = await createClient();
    const { data: membership } = await supabaseCheck
      .from("memberships")
      .select("role")
      .eq("org_id", parsed.data.orgId)
      .eq("user_id", access.userId)
      .maybeSingle();
    if (membership?.role !== "owner") {
      return { ok: false, error: "Sem permissao para promover proprietarios." };
    }
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_membership_role", {
    p_org: parsed.data.orgId,
    p_user: parsed.data.userId,
    p_role: parsed.data.role,
  });
  if (error) return { ok: false, error: mapOrgRpcError(error.message) };

  revalidatePath("/settings/organization");
  revalidatePath("/settings/organizations");
  return { ok: true };
}

export async function removeOrgMemberAction(input: { orgId: string; userId: string }): Promise<OrgActionResult> {
  const parsed = removeOrgMemberInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados invalidos." };

  const access = await assertOrgMemberManager(parsed.data.orgId);
  if (!access.ok) return access;

  const supabase = await createClient();
  const { error } = await supabase.rpc("remove_org_member", {
    p_org: parsed.data.orgId,
    p_user: parsed.data.userId,
  });
  if (error) return { ok: false, error: mapOrgRpcError(error.message) };

  revalidatePath("/settings/organization");
  revalidatePath("/settings/organizations");
  return { ok: true };
}

export async function leaveOrganizationAction(orgId: string): Promise<OrgActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("leave_organization", { p_org: orgId });
  if (error) return { ok: false, error: mapOrgRpcError(error.message) };

  revalidatePath("/boards");
  revalidatePath("/settings/organization");
  revalidatePath("/settings/organizations");
  return { ok: true };
}

export async function transferOrgOwnershipAction(input: {
  orgId: string;
  newOwnerId: string;
}): Promise<OrgActionResult> {
  const parsed = transferOrgOwnershipInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados invalidos." };

  const access = await assertOrgOwner(parsed.data.orgId);
  if (!access.ok) return access;

  const supabase = await createClient();
  const { error } = await supabase.rpc("transfer_org_ownership", {
    p_org: parsed.data.orgId,
    p_new_owner: parsed.data.newOwnerId,
  });
  if (error) return { ok: false, error: mapOrgRpcError(error.message) };

  revalidatePath("/settings/organization");
  revalidatePath("/settings/organizations");
  revalidatePath("/settings/organization/settings");
  revalidatePath("/boards");
  revalidatePath("/projects");
  return { ok: true };
}

export async function deleteOrganizationAction(orgId: string): Promise<OrgActionResult> {
  const parsed = deleteOrganizationInput.safeParse({ orgId });
  if (!parsed.success) return { ok: false, error: "Dados invalidos." };

  const access = await assertOrgOwner(parsed.data.orgId);
  if (!access.ok) return access;

  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_organization", { p_org: parsed.data.orgId });
  if (error) return { ok: false, error: mapOrgRpcError(error.message) };

  const cookieStore = await cookies();
  if (cookieStore.get(ACTIVE_ORG_COOKIE)?.value === parsed.data.orgId) {
    cookieStore.delete(ACTIVE_ORG_COOKIE);
  }

  revalidatePath("/boards");
  revalidatePath("/projects");
  revalidatePath("/settings/organization");
  revalidatePath("/settings/organizations");
  return { ok: true };
}

export async function setOrgMultiOwnerAction(input: {
  orgId: string;
  enabled: boolean;
}): Promise<OrgActionResult> {
  const parsed = setOrgMultiOwnerInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados invalidos." };

  const access = await assertOrgOwner(parsed.data.orgId);
  if (!access.ok) return access;

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_org_multi_owner", {
    p_org: parsed.data.orgId,
    p_enabled: parsed.data.enabled,
  });
  if (error) return { ok: false, error: mapOrgRpcError(error.message) };

  revalidatePath("/settings/organization");
  revalidatePath("/settings/organizations");
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

  const access = await assertOrgOwner(parsed.data.orgId);
  if (!access.ok) return access;

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_organization", {
    p_org: parsed.data.orgId,
    p_name: parsed.data.name,
    p_slug: parsed.data.slug,
  });
  if (error) return { ok: false, error: mapOrgRpcError(error.message) };

  revalidatePath("/settings/organization");
  revalidatePath("/settings/organizations");
  revalidatePath("/settings/organization/settings");
  revalidatePath("/boards");
  revalidatePath("/projects");
  return { ok: true };
}

export async function uploadOrgLogoFileAction(formData: FormData): Promise<
  | { ok: true; logoUrl: string }
  | { ok: false; error: string }
> {
  const orgId = String(formData.get("orgId") ?? "").trim();
  const file = formData.get("file");
  if (!orgId) return { ok: false, error: "Organizacao invalida." };
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Selecione uma imagem." };
  }

  const access = await assertOrgOwner(orgId);
  if (!access.ok) return access;

  let logoUrl: string;
  const supabase = await createClient();
  try {
    logoUrl = await uploadOrgLogoToStorage(supabase, orgId, file);
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Falha no upload da imagem.",
    };
  }

  const saved = await updateOrgLogoAction({ orgId, logoUrl });
  if (!saved.ok) return saved;
  return { ok: true, logoUrl };
}

export async function updateOrgLogoAction(input: {
  orgId: string;
  logoUrl: string | null;
}): Promise<OrgActionResult> {
  const parsed = updateOrgLogoInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados invalidos." };
  const logoUrl = parsed.data.logoUrl?.trim() ?? "";
  if (logoUrl && !/^https?:\/\//i.test(logoUrl)) {
    return { ok: false, error: "URL invalida." };
  }

  const access = await assertOrgOwner(parsed.data.orgId);
  if (!access.ok) return access;

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_org_logo", {
    p_org: parsed.data.orgId,
    p_logo_url: logoUrl,
  });
  if (error) return { ok: false, error: mapOrgRpcError(error.message) };

  revalidatePath("/settings/organization");
  revalidatePath("/settings/organizations");
  revalidatePath("/boards");
  revalidatePath("/projects");
  return { ok: true };
}

export async function inviteToOrgBatch(input: OrgInviteBatchInput): Promise<OrgInviteBatchResult> {
  const parsed = orgInviteBatchInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados invalidos." };

  const access = await assertOrgMemberManager(parsed.data.orgId);
  if (!access.ok) return { ok: false, error: access.error };

  const rate = await checkInviteBatchRateLimit(access.userId, parsed.data.invites.length);
  if (!rate.allowed) {
    return { ok: false, error: "Limite de convites por hora atingido. Tente novamente mais tarde." };
  }

  const supabase = await createClient();
  const { data: org } = await supabase
    .from("organizations")
    .select("name, multi_owner_enabled")
    .eq("id", parsed.data.orgId)
    .single();
  if (!org) return { ok: false, error: "Organizacao nao encontrada." };

  const hasOwnerInvite = parsed.data.invites.some((i) => i.role === "owner");
  if (hasOwnerInvite) {
    const ownerAccess = await assertOrgOwner(parsed.data.orgId);
    if (!ownerAccess.ok) return { ok: false, error: "Apenas o proprietario pode convidar socios." };
    if (!org.multi_owner_enabled) {
      return { ok: false, error: "Ative multiplos proprietarios para convidar como owner." };
    }
  }

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
    owner_cannot_leave: "Transfira a propriedade ou ative multiplos proprietarios antes de sair.",
    cannot_remove_owner: "Nao e possivel remover o proprietario.",
    cannot_change_owner_role: "Use transferencia de propriedade ou ative multiplos proprietarios.",
    cannot_assign_owner_directly: "Ative multiplos proprietarios para promover ou convidar owners.",
    cannot_invite_as_owner: "Ative multiplos proprietarios para convidar como proprietario.",
    demote_extra_owners_first: "Reduza para um proprietario antes de desativar a chave.",
    last_owner_cannot_demote: "Deve haver ao menos um proprietario na organizacao.",
    last_owner_cannot_remove: "Nao e possivel remover o ultimo proprietario.",
    last_owner_cannot_leave: "Nao e possivel sair sendo o unico proprietario.",
    use_multi_owner_promotion: "Com multiplos proprietarios ativos, promova membros em vez de transferir.",
    member_not_found: "Membro nao encontrado.",
    already_owner: "Voce ja e o proprietario.",
    org_not_found: "Organizacao nao encontrada.",
  };
  return map[message] ?? "Nao foi possivel concluir a operacao.";
}
