import {
  getActiveOrgIdCached,
  getActiveOrgMembershipCached,
  getSessionUser,
  listUserOrgsCached,
} from "@/lib/loaders/session";

export { ACTIVE_ORG_COOKIE } from "@/lib/active-org-constants";
export type { UserOrgRow } from "@/lib/active-org-constants";

export async function listUserOrgs() {
  return listUserOrgsCached();
}

export async function getActiveOrgId() {
  return getActiveOrgIdCached();
}

export async function getActiveOrgMembership() {
  return getActiveOrgMembershipCached();
}

export async function getActiveOrgDisplay(): Promise<{
  orgId: string;
  name: string;
  logoUrl: string | null;
} | null> {
  const orgId = await getActiveOrgIdCached();
  if (!orgId) return null;

  const orgs = await listUserOrgsCached();
  const org = orgs.find((o) => o.orgId === orgId);
  if (org) {
    return { orgId: org.orgId, name: org.name, logoUrl: org.logoUrl };
  }

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data } = await supabase.from("organizations").select("id, name, logo_url").eq("id", orgId).maybeSingle();
  if (!data) return null;
  return { orgId: data.id, name: data.name, logoUrl: data.logo_url };
}

export async function getCurrentUserId(): Promise<string | null> {
  const user = await getSessionUser();
  return user?.id ?? null;
}
