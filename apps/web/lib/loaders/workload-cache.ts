import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "@/lib/revalidation";
import {
  createCachedSupabaseClient,
  getAccessTokenForCache,
  type CachedSupabaseClient,
} from "@/lib/loaders/cached-supabase";
import { createClient } from "@/lib/supabase/server";
import { formatDateIso } from "@/lib/workload/week";
import {
  loadUnscheduledWorkload,
  loadWorkloadDrilldownByOrg,
  loadWorkloadMembers,
  type WorkloadDrilldownCard,
  type WorkloadMemberRow,
  type WorkloadUnscheduledCard,
} from "@/lib/load-workload";
import { loadWorkload15Days, type Workload15DayMember } from "@/lib/load-plan-grid";

export type WorkloadWeekBundle = {
  members: WorkloadMemberRow[];
  drilldownByUser: Record<string, WorkloadDrilldownCard[]>;
  unscheduled: WorkloadUnscheduledCard[];
};

async function fetchWorkloadWeekBundle(
  supabase: CachedSupabaseClient,
  orgId: string,
  weekStart: Date,
): Promise<WorkloadWeekBundle> {
  const [members, drilldownByUser, unscheduled] = await Promise.all([
    loadWorkloadMembers(orgId, weekStart, supabase),
    loadWorkloadDrilldownByOrg(orgId, weekStart, supabase),
    loadUnscheduledWorkload(orgId, supabase),
  ]);
  members.sort((a, b) => a.fullName.localeCompare(b.fullName, "pt-BR"));
  return { members, drilldownByUser, unscheduled };
}

/** Cross-request cache visao semanal — chave userId+orgId+week; invalidar via revalidatePlanViews(). */
export async function loadWorkloadWeekCached(
  orgId: string,
  userId: string,
  weekStart: Date,
): Promise<WorkloadWeekBundle> {
  const weekIso = formatDateIso(weekStart);
  const accessToken = await getAccessTokenForCache();
  if (!accessToken) {
    const supabase = await createClient();
    return fetchWorkloadWeekBundle(supabase, orgId, weekStart);
  }

  return unstable_cache(
    () => fetchWorkloadWeekBundle(createCachedSupabaseClient(accessToken), orgId, weekStart),
    [`workload-week-${userId}-${orgId}-${weekIso}`],
    { tags: [CACHE_TAGS.workload, CACHE_TAGS.workloadOrg(orgId)] },
  )();
}

/** Cross-request cache visao 15d — chave userId+orgId+start. */
export async function loadWorkload15DayCached(
  orgId: string,
  userId: string,
  windowStart: Date,
): Promise<Workload15DayMember[]> {
  const startIso = formatDateIso(windowStart);
  const accessToken = await getAccessTokenForCache();
  if (!accessToken) {
    const supabase = await createClient();
    return loadWorkload15Days(orgId, windowStart, { client: supabase });
  }

  return unstable_cache(
    () => loadWorkload15Days(orgId, windowStart, { client: createCachedSupabaseClient(accessToken) }),
    [`workload-15d-${userId}-${orgId}-${startIso}`],
    { tags: [CACHE_TAGS.workload, CACHE_TAGS.workloadOrg(orgId)] },
  )();
}
