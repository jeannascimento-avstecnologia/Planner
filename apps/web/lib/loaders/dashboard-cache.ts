import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "@/lib/revalidation";
import {
  createCachedSupabaseClient,
  getAccessTokenForCache,
} from "@/lib/loaders/cached-supabase";
import { createClient } from "@/lib/supabase/server";
import { fetchBoardDashboard, type BoardDashboardData } from "@/lib/load-dashboard";

export async function loadBoardDashboardCached(
  boardId: string,
  userId: string,
): Promise<BoardDashboardData | { error: string }> {
  const accessToken = await getAccessTokenForCache();
  if (!accessToken) {
    const supabase = await createClient();
    return fetchBoardDashboard(supabase, boardId);
  }

  return unstable_cache(
    () => fetchBoardDashboard(createCachedSupabaseClient(accessToken), boardId),
    [`dashboard-${userId}-${boardId}`],
    { tags: [CACHE_TAGS.dashboard, CACHE_TAGS.dashboardBoard(boardId)] },
  )();
}
