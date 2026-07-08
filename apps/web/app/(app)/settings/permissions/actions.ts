"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isOrgAdminRole } from "@/lib/org-member-roles";
import { setUserFieldPermissionInput, type UserFieldPermissionAccess } from "@nextgen/contracts";

export type PermissionActionResult = { ok: true } | { ok: false; error: string };

async function assertOrgAdmin(orgId: string): Promise<PermissionActionResult | { ok: true; userId: string }> {
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
  if (!membership || !isOrgAdminRole(membership.role)) {
    return { ok: false, error: "Sem permissao para gerenciar permissoes." };
  }
  return { ok: true, userId: user.id };
}

export async function setUserFieldPermission(
  orgId: string,
  userId: string,
  fieldName: string,
  access: UserFieldPermissionAccess,
): Promise<PermissionActionResult> {
  const parsed = setUserFieldPermissionInput.safeParse({ orgId, userId, fieldName, access });
  if (!parsed.success) return { ok: false, error: "Dados invalidos." };

  const gate = await assertOrgAdmin(orgId);
  if (!gate.ok) return gate;

  const supabase = await createClient();

  const { data: targetMember } = await supabase
    .from("memberships")
    .select("user_id")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!targetMember) return { ok: false, error: "Membro nao encontrado na organizacao." };

  if (access === "default") {
    const { error } = await supabase
      .from("user_field_permission_overrides")
      .delete()
      .eq("org_id", orgId)
      .eq("user_id", userId)
      .eq("resource", "card")
      .eq("field_name", fieldName);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase.from("user_field_permission_overrides").upsert(
      {
        org_id: orgId,
        user_id: userId,
        resource: "card",
        field_name: fieldName,
        access,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "org_id,user_id,resource,field_name" },
    );
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath("/settings/permissions");
  return { ok: true };
}
