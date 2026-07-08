import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "@/lib/revalidation";
import { canViewWorkload } from "@/lib/workload/permissions";
import type { BoardMeta } from "@/lib/recent-boards";
import {
  createCachedSupabaseClient,
  getAccessTokenForCache,
  type CachedSupabaseClient,
} from "@/lib/loaders/cached-supabase";
import { createClient } from "@/lib/supabase/server";

export type ShellCacheData = {
  avatarUrl: string;
  fullName: string;
  accessibleBoardIds: string[];
  boardMetaById: Record<string, BoardMeta>;
  showWorkload: boolean;
};

async function fetchShellData(
  supabase: CachedSupabaseClient,
  userId: string,
  orgId: string | null,
): Promise<ShellCacheData> {
  const boardsQuery = orgId
    ? supabase.from("boards").select("id, name, icon, color").eq("org_id", orgId)
    : supabase.from("boards").select("id, name, icon, color");

  const [{ data: profile }, { data: accessibleBoards }, { data: membership }] = await Promise.all([
      supabase.from("profiles").select("avatar_url, full_name").eq("id", userId).single(),
      boardsQuery,
      orgId
        ? supabase
            .from("memberships")
            .select("role")
            .eq("org_id", orgId)
            .eq("user_id", userId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

  const boardMetaById: Record<string, BoardMeta> = {};
  for (const b of accessibleBoards ?? []) {
    boardMetaById[b.id] = { name: b.name, icon: b.icon, color: b.color };
  }

  return {
    avatarUrl: profile?.avatar_url ?? "",
    fullName: profile?.full_name ?? "",
    accessibleBoardIds: (accessibleBoards ?? []).map((b) => b.id),
    boardMetaById,
    showWorkload: canViewWorkload(membership?.role),
  };
}

/** Cross-request cache do shell — token extraido fora do unstable_cache; invalidar via revalidateShell(). */
export async function loadShellDataCached(userId: string, orgId: string | null): Promise<ShellCacheData> {
  const accessToken = await getAccessTokenForCache();
  const orgKey = orgId ?? "none";
  const tags = [CACHE_TAGS.shell(userId), CACHE_TAGS.boards];
  if (orgId) {
    tags.push(CACHE_TAGS.orgProjects(orgId), CACHE_TAGS.orgMembers(orgId));
  }

  if (!accessToken) {
    const supabase = await createClient();
    return fetchShellData(supabase, userId, orgId);
  }

  return unstable_cache(
    () => fetchShellData(createCachedSupabaseClient(accessToken), userId, orgId),
    [`shell-${userId}-${orgKey}`],
    { tags },
  )();
}
