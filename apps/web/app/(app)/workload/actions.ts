"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { updateMemberCapacityInput } from "@nextgen/contracts";
import { canManageOrgMembers } from "@/lib/org-member-roles";
import { CACHE_TAGS } from "@/lib/revalidation";

export type CapacityActionResult = { ok: true } | { ok: false; error: string };

export async function updateMemberCapacityAction(input: unknown): Promise<CapacityActionResult> {
  const parsed = updateMemberCapacityInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados invalidos." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nao autenticado." };

  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("org_id", parsed.data.orgId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!canManageOrgMembers(membership?.role)) {
    return { ok: false, error: "Sem permissao para alterar capacidade." };
  }

  const { error } = await supabase.rpc("update_member_capacity", {
    p_org: parsed.data.orgId,
    p_user: parsed.data.userId,
    p_hours: parsed.data.weeklyCapacityHours,
  });
  if (error) return { ok: false, error: error.message };

  revalidateTag(CACHE_TAGS.workload);
  revalidateTag(CACHE_TAGS.workloadOrg(parsed.data.orgId));
  revalidatePath("/workload");
  revalidatePath("/settings/organizations");
  return { ok: true };
}
