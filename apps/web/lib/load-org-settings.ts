import { createClient } from "@/lib/supabase/server";
import { getActiveOrgId } from "@/lib/active-org";
import {
  canManageOrgIdentity,
  canManageOrgMembers,
  isOrgOwnerRole,
} from "@/lib/org-member-roles";
import type { OrgMemberRow } from "@nextgen/contracts";

export type OrgSettingsContext = {
  orgId: string;
  orgName: string;
  orgSlug: string;
  orgLogoUrl: string | null;
  multiOwnerEnabled: boolean;
  userRole: string;
  canManageMembers: boolean;
  canManageIdentity: boolean;
  /** @deprecated use canManageMembers */
  canManage: boolean;
  isOwner: boolean;
  currentUserId: string;
  members: OrgMemberRow[];
  pendingInvites: { id: string; email: string; role: string; expires_at: string }[];
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

  const canManageMembers = canManageOrgMembers(membership.role);
  let pendingInvites: OrgSettingsContext["pendingInvites"] = [];
  if (canManageMembers) {
    const { data: pendingRaw } = await supabase
      .from("organization_invitations")
      .select("id, email, role, expires_at")
      .eq("org_id", org.id)
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });
    pendingInvites = (pendingRaw ?? []) as OrgSettingsContext["pendingInvites"];
  }

  return {
    orgId: org.id,
    orgName: org.name,
    orgSlug: org.slug,
    orgLogoUrl: org.logo_url,
    multiOwnerEnabled: org.multi_owner_enabled ?? false,
    userRole: membership.role,
    canManageMembers,
    canManageIdentity: canManageOrgIdentity(membership.role),
    canManage: canManageMembers,
    isOwner: isOrgOwnerRole(membership.role),
    currentUserId: user.id,
    members,
    pendingInvites,
  };
}
