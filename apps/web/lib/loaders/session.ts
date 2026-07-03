import { cache } from "react";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { ACTIVE_ORG_COOKIE, type UserOrgRow } from "@/lib/active-org-constants";
import type { Database } from "@nextgen/contracts";

type MembershipRole = Database["public"]["Enums"]["membership_role"];

export const getSessionUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export const listUserOrgsCached = cache(async (): Promise<UserOrgRow[]> => {
  const user = await getSessionUser();
  if (!user) return [];

  const supabase = await createClient();
  const { data: memberships } = await supabase
    .from("memberships")
    .select("org_id, role, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });
  if (!memberships?.length) return [];

  const orgIds = memberships.map((m) => m.org_id);
  const { data: orgs } = await supabase
    .from("organizations")
    .select("id, name, slug, logo_url")
    .in("id", orgIds);
  const orgById = new Map((orgs ?? []).map((o) => [o.id, o]));

  return memberships.flatMap((m) => {
    const org = orgById.get(m.org_id);
    if (!org) return [];
    return [
      {
        orgId: org.id,
        name: org.name,
        slug: org.slug,
        logoUrl: org.logo_url,
        role: m.role as MembershipRole,
        isOwner: m.role === "owner",
      },
    ];
  });
});

export const getActiveOrgIdCached = cache(async (): Promise<string | null> => {
  const orgs = await listUserOrgsCached();
  if (orgs.length === 0) return null;

  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(ACTIVE_ORG_COOKIE)?.value;
  if (fromCookie && orgs.some((o) => o.orgId === fromCookie)) {
    return fromCookie;
  }
  return orgs[0]?.orgId ?? null;
});

export const getActiveOrgMembershipCached = cache(async () => {
  const orgId = await getActiveOrgIdCached();
  const user = await getSessionUser();
  if (!orgId || !user) return null;

  const supabase = await createClient();
  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) return null;
  return { orgId, role: membership.role };
});
