import { redirect } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { BarChart3 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrgId } from "@/lib/active-org";
import { loadWorkloadDrilldownForRange } from "@/lib/load-workload";
import { loadWorkload15DayCached, loadWorkloadWeekCached } from "@/lib/loaders/workload-cache";
import { canViewWorkload } from "@/lib/workload/permissions";
import { canManageOrgMembers } from "@/lib/org-member-roles";
import { formatDateIso, parseWeekParam } from "@/lib/workload/week";
import { buildWorkload15DayRange, parseStartParam } from "@/lib/plan/window";
import {
  formatWorkloadContextBadge,
  loadWorkloadViewerContext,
} from "@/lib/load-workload-viewer-context";
import { WorkloadWeekNav } from "@/components/workload/workload-week-nav";
import { WorkloadTable } from "@/components/workload/workload-table";
import { Workload15DayGrid } from "@/components/workload/workload-15d-grid";
import { WorkloadViewToggle } from "@/components/workload/workload-view-toggle";
import { PlanWeekNav } from "@/components/plan/plan-week-nav";
import { PlanningPageHeader } from "@/components/shell/planning-page-header";
import { PageTourTrigger } from "@/components/onboarding/page-tour-trigger";
import { PAGE_COPY } from "@/lib/page-copy";
import { linkClass } from "@/lib/ui-classes";

type Props = { searchParams: Promise<{ week?: string; mode?: string; start?: string }> };

export default async function WorkloadPage({ searchParams }: Props) {
  const { week: weekParam, mode: modeParam, start: startParam } = await searchParams;
  const viewMode = modeParam === "15d" ? "15d" : "week";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const orgId = await getActiveOrgId();
  if (!orgId) redirect("/boards");

  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!canViewWorkload(membership?.role)) redirect("/boards");

  const viewerContext = await loadWorkloadViewerContext(orgId, user.id);
  const contextBadge = viewerContext ? formatWorkloadContextBadge(viewerContext) : null;

  const canEditCapacity = canManageOrgMembers(membership?.role);

  const weekStart = parseWeekParam(weekParam);
  const weekIso = formatDateIso(weekStart);
  const planStart = parseStartParam(startParam);
  const planStartIso = formatDateIso(planStart);
  const dayKeys = buildWorkload15DayRange(planStart).map(formatDateIso);

  const descriptionWithContext = (
    <>
      {viewMode === "15d" ? PAGE_COPY.workload15d.description : PAGE_COPY.workloadWeek.description}
      {contextBadge ? (
        <span className="mt-1 block text-xs font-medium text-aurora-brand">{contextBadge}</span>
      ) : null}
    </>
  );

  if (viewMode === "15d") {
    const fromIso = dayKeys[0]!;
    const toIso = dayKeys[dayKeys.length - 1]!;
    const [members15d, drilldownByUser] = await Promise.all([
      loadWorkload15DayCached(orgId, user.id, planStart),
      loadWorkloadDrilldownForRange(orgId, fromIso, toIso),
    ]);

    return (
      <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6" data-testid="workload-page">
        <div data-tour="workload-header">
          <PlanningPageHeader
            title={PAGE_COPY.workload15d.title}
            icon={<BarChart3 className="h-5 w-5" aria-hidden />}
            actions={<PageTourTrigger />}
            description={
            <>
              {descriptionWithContext}
              <span className="mt-1 block text-xs text-aurora-muted">
                Edite alocacoes no{" "}
                <Link href={`/plan?start=${planStartIso}`} className={linkClass}>
                  Meu plano
                </Link>
                .
              </span>
            </>
          }
          toolbar={
            <div className="flex flex-wrap items-center gap-3" data-tour="workload-mode">
              <WorkloadViewToggle mode={viewMode} weekStartIso={weekIso} planStartIso={planStartIso} />
              <Suspense fallback={<span className="text-sm text-aurora-muted">…</span>}>
                <PlanWeekNav windowStartIso={planStartIso} basePath="/workload" />
              </Suspense>
            </div>
          }
        />
        </div>
        <div data-tour="workload-main">
          <Workload15DayGrid
          members={members15d}
          dayKeys={dayKeys}
          windowStartIso={planStartIso}
          drilldownByUser={drilldownByUser}
          planStartIso={planStartIso}
        />
        </div>
      </div>
    );
  }

  const { members, drilldownByUser, unscheduled } = await loadWorkloadWeekCached(orgId, user.id, weekStart);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6" data-testid="workload-page">
      <div data-tour="workload-header">
        <PlanningPageHeader
          title={PAGE_COPY.workloadWeek.title}
          icon={<BarChart3 className="h-5 w-5" aria-hidden />}
          actions={<PageTourTrigger />}
          description={descriptionWithContext}
          toolbar={
            <div className="flex flex-wrap items-center gap-3" data-tour="workload-mode">
              <WorkloadViewToggle mode={viewMode} weekStartIso={weekIso} planStartIso={planStartIso} />
              <WorkloadWeekNav weekStart={weekStart} />
            </div>
          }
        />
      </div>
      <div data-tour="workload-main">
        <WorkloadTable
        orgId={orgId}
        members={members}
        weekIso={weekIso}
        drilldownByUser={drilldownByUser}
        unscheduled={unscheduled}
        canEditCapacity={canEditCapacity}
      />
      </div>
    </div>
  );
}
