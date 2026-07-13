import { redirect } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { CalendarRange } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { listUserOrgs } from "@/lib/active-org";
import { loadPlanGridsForUserCached } from "@/lib/loaders/plan-cache";
import { formatDateIso, parsePlanWindowStart } from "@/lib/plan/window";
import { PlanClient } from "@/components/plan/plan-client";
import { PlanExportSection } from "@/components/plan/plan-export-section";
import { PlanWeekNav } from "@/components/plan/plan-week-nav";
import { PlanAutoRefresh } from "@/components/plan/plan-auto-refresh";
import { PlanLegend } from "@/components/plan/plan-legend";
import { PlanningPageHeader } from "@/components/shell/planning-page-header";
import { PageTourTrigger } from "@/components/onboarding/page-tour-trigger";
import { PAGE_COPY } from "@/lib/page-copy";
import { Skeleton } from "@/components/ui/skeleton";
import { linkClass } from "@/lib/ui-classes";
import type { UserOrgRow } from "@/lib/active-org-constants";

type Props = { searchParams: Promise<{ start?: string; board?: string; org?: string; weekends?: string }> };

async function PlanSections({
  userId,
  windowStartIso,
  showWeekends,
  orgs,
  orgLogoById,
}: {
  userId: string;
  windowStartIso: string;
  showWeekends: boolean;
  orgs: UserOrgRow[];
  orgLogoById: Record<string, string | null>;
}) {
  const windowStart = parsePlanWindowStart(windowStartIso, showWeekends);
  const sections = await loadPlanGridsForUserCached(userId, windowStart, orgs, showWeekends);
  return (
    <PlanClient
      key={`${windowStartIso}-${showWeekends ? "cal" : "wd"}`}
      sections={sections}
      orgLogoById={orgLogoById}
      showWeekends={showWeekends}
    />
  );
}

function PlanSectionsFallback() {
  return (
    <div className="space-y-6" data-testid="plan-sections-loading">
      <Skeleton className="h-10 w-full max-w-xl rounded-lg" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}

export default async function PlanPage({ searchParams }: Props) {
  const { start: startParam, org: orgParam, weekends: weekendsParam } = await searchParams;
  const showWeekends = weekendsParam === "1";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const orgs = await listUserOrgs();
  if (orgs.length === 0) redirect("/boards");

  const windowStart = parsePlanWindowStart(startParam, showWeekends);
  const windowStartIso = formatDateIso(windowStart);
  const visibleOrgs =
    orgParam && orgs.some((o) => o.orgId === orgParam) ? orgs.filter((o) => o.orgId === orgParam) : orgs;

  const exportOrgId =
    orgParam && orgs.some((o) => o.orgId === orgParam)
      ? orgParam
      : orgs.length === 1
        ? orgs[0]!.orgId
        : null;

  const orgLogoById = Object.fromEntries(orgs.map((o) => [o.orgId, o.logoUrl]));

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 p-4 md:p-6" data-testid="plan-page">
      <PlanAutoRefresh />
      <div data-tour="plan-header">
        <PlanningPageHeader
          title={PAGE_COPY.plan.title}
          icon={<CalendarRange className="h-5 w-5" aria-hidden />}
          actions={<PageTourTrigger />}
          description={
          <>
            {PAGE_COPY.plan.description}{" "}
            <Link href="/calendar" className={linkClass}>
              Calendario de prazos
            </Link>
            .
          </>
        }
        toolbar={
          <>
            <Suspense fallback={<span className="text-sm text-aurora-muted">…</span>}>
              <PlanWeekNav windowStartIso={windowStartIso} />
            </Suspense>
            <div className="flex flex-wrap items-center gap-3">
              <Link href={`/workload?mode=15d&start=${windowStartIso}`} className={linkClass + " text-xs"}>
                Ver carga 15d →
              </Link>
              {exportOrgId ? (
                <Suspense
                  fallback={
                    <span className="text-xs text-aurora-muted" data-testid="plan-export-loading">
                      Carregando export…
                    </span>
                  }
                >
                  <PlanExportSection orgId={exportOrgId} />
                </Suspense>
              ) : null}
            </div>
          </>
        }
        />
      </div>

      <div data-tour="plan-legend">
        <PlanLegend />
      </div>

      <Suspense fallback={<PlanSectionsFallback />}>
        <PlanSections
          userId={user.id}
          windowStartIso={windowStartIso}
          showWeekends={showWeekends}
          orgs={visibleOrgs}
          orgLogoById={orgLogoById}
        />
      </Suspense>
    </div>
  );
}
