import { createClient } from "@/lib/supabase/server";
import { getActiveOrgId } from "@/lib/active-org";
import { canManageOrg, isOrgOwnerRole } from "@/lib/org-member-roles";
import type { OrgMemberRow } from "@nextgen/contracts";

export type OrgSettingsContext = {
  orgId: string;
  orgName: string;
  orgSlug: string;
  orgLogoUrl: string | null;
  multiOwnerEnabled: boolean;
  userRole: string;
  canManage: boolean;
  isOwner: boolean;
  currentUserId: string;
  members: OrgMemberRow[];
};

export async function loadOrgSettingsContext(): Promise<OrgSettingsContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const orgId = await getActiveOrgId();
  if (!orgId) return null;

  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) return null;

  const { data: org } = await supabase
    .from("organizations")
    .select("id, name, slug, logo_url, multi_owner_enabled")
    .eq("id", orgId)
    .single();
  if (!org) return null;

  const { data: membersRaw } = await supabase.rpc("list_org_members", { p_org: org.id });
  const members = (membersRaw ?? []) as OrgMemberRow[];

  return {
    orgId: org.id,
    orgName: org.name,
    orgSlug: org.slug,
    orgLogoUrl: org.logo_url,
    multiOwnerEnabled: org.multi_owner_enabled ?? false,
    userRole: membership.role,
    canManage: canManageOrg(membership.role),
    isOwner: isOrgOwnerRole(membership.role),
    currentUserId: user.id,
    members,
  };
}
