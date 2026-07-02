import { createClient } from "@/lib/supabase/server";
import { canManageOrg, isOrgOwnerRole } from "@/lib/org-member-roles";
import type { OrgMemberRow } from "@nextgen/contracts";

export type OrgSettingsContext = {
  orgId: string;
  orgName: string;
  orgSlug: string;
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

  const { data: membership } = await supabase
    .from("memberships")
    .select("org_id, role")
    .limit(1)
    .maybeSingle();
  if (!membership?.org_id) return null;

  const { data: org } = await supabase
    .from("organizations")
    .select("id, name, slug")
    .eq("id", membership.org_id)
    .single();
  if (!org) return null;

  const { data: membersRaw } = await supabase.rpc("list_org_members", { p_org: org.id });
  const members = (membersRaw ?? []) as OrgMemberRow[];

  return {
    orgId: org.id,
    orgName: org.name,
    orgSlug: org.slug,
    userRole: membership.role,
    canManage: canManageOrg(membership.role),
    isOwner: isOrgOwnerRole(membership.role),
    currentUserId: user.id,
    members,
  };
}
