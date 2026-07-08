import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "@/lib/revalidation";
import {
  createCachedSupabaseClient,
  getAccessTokenForCache,
} from "@/lib/loaders/cached-supabase";
import { createClient } from "@/lib/supabase/server";
import { fetchPlanGridsForUser } from "@/lib/load-plan-grid";
import { formatDateIso } from "@/lib/plan/window";
import type { PlanOrgSection } from "@/lib/plan/types";
import type { UserOrgRow } from "@/lib/active-org-constants";

/** Cross-request cache do plano pessoal — chave userId+window+orgs; invalidar via revalidatePlanViews(). */
export async function loadPlanGridsForUserCached(
  userId: string,
  windowStart: Date,
  orgs: UserOrgRow[],
  showWeekends = true,
): Promise<PlanOrgSection[]> {
  const windowStartIso = formatDateIso(windowStart);
  const orgKey = orgs
    .map((o) => o.orgId)
    .sort()
    .join(",");
  const weekendsKey = showWeekends ? "cal" : "wd";

  const accessToken = await getAccessTokenForCache();
  if (!accessToken) {
    const supabase = await createClient();
    return fetchPlanGridsForUser(supabase, userId, windowStart, orgs, showWeekends);
  }

  return unstable_cache(
    () => fetchPlanGridsForUser(createCachedSupabaseClient(accessToken), userId, windowStart, orgs, showWeekends),
    [`plan-grids-v2-${userId}-${windowStartIso}-${orgKey}-${weekendsKey}`],
    { tags: [CACHE_TAGS.plan, CACHE_TAGS.planUser(userId)] },
  )();
}
