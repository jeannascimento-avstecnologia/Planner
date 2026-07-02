import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@nextgen/contracts";

export const ACTIVE_ORG_COOKIE = "ngp:active-org";

type MembershipRole = Database["public"]["Enums"]["membership_role"];

export type UserOrgRow = {
  orgId: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  role: MembershipRole;
  isOwner: boolean;
};

export async function listUserOrgs(): Promise<UserOrgRow[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: memberships } = await supabase
    .from("memberships")
    .select("org_id, role, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });
  // #region agent log
  fetch("http://127.0.0.1:7735/ingest/ccfd0ebe-18ad-4f5a-9b22-eccef37739f9", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "fa60ca" },
    body: JSON.stringify({
      sessionId: "fa60ca",
      runId: "post-fix",
      hypothesisId: "H1",
      location: "active-org.ts:listUserOrgs",
      message: "memberships loaded for current user only",
      data: {
        rowCount: memberships?.length ?? 0,
        orgIds: [...new Set((memberships ?? []).map((m) => m.org_id))],
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
  if (!memberships?.length) return [];

  const orgIds = memberships.map((m) => m.org_id);
  let orgs:
    | { id: string; name: string; slug: string; logo_url: string | null }[]
    | null = null;
  const withLogo = await supabase
    .from("organizations")
    .select("id, name, slug, logo_url")
    .in("id", orgIds);
  if (withLogo.error?.code === "42703" || withLogo.error?.message?.includes("logo_url")) {
    const fallback = await supabase.from("organizations").select("id, name, slug").in("id", orgIds);
    orgs = (fallback.data ?? []).map((o) => ({ ...o, logo_url: null }));
  } else {
    orgs = withLogo.data;
  }
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
        role: m.role,
        isOwner: m.role === "owner",
      },
    ];
  });
}

export async function getActiveOrgId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const orgs = await listUserOrgs();
  if (orgs.length === 0) return null;

  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(ACTIVE_ORG_COOKIE)?.value;
  if (fromCookie && orgs.some((o) => o.orgId === fromCookie)) {
    return fromCookie;
  }

  return orgs[0]?.orgId ?? null;
}

export async function getActiveOrgDisplay(): Promise<{
  orgId: string;
  name: string;
  logoUrl: string | null;
} | null> {
  const orgId = await getActiveOrgId();
  if (!orgId) return null;

  const supabase = await createClient();
  const withLogo = await supabase
    .from("organizations")
    .select("id, name, logo_url")
    .eq("id", orgId)
    .maybeSingle();
  if (withLogo.error?.code === "42703" || withLogo.error?.message?.includes("logo_url")) {
    const fallback = await supabase.from("organizations").select("id, name").eq("id", orgId).maybeSingle();
    if (!fallback.data) return null;
    return { orgId: fallback.data.id, name: fallback.data.name, logoUrl: null };
  }
  if (!withLogo.data) return null;
  return {
    orgId: withLogo.data.id,
    name: withLogo.data.name,
    logoUrl: withLogo.data.logo_url,
  };
}

export async function getActiveOrgMembership(): Promise<{
  orgId: string;
  role: string;
} | null> {
  const orgId = await getActiveOrgId();
  if (!orgId) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) return null;

  return { orgId, role: membership.role };
}
