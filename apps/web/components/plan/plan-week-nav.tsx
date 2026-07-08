"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import {
  defaultPlanWindowStart,
  formatDateIso,
  formatPlanRangeLabel,
  isPlanWindowIncludingToday,
  parsePlanWindowStart,
  shiftPlanWindowStart,
} from "@/lib/plan/window";
import { navChipBrandClass, navChipClass } from "@/lib/ui-classes";

type Props = {
  windowStartIso: string;
  /** Rota base; default /plan. Em /workload use basePath="/workload". */
  basePath?: string;
};

function hrefForStart(basePath: string, searchParams: URLSearchParams, startIso: string): string {
  const params = new URLSearchParams(searchParams.toString());
  params.set("start", startIso);
  return `${basePath}?${params.toString()}`;
}

export function PlanWeekNav({ windowStartIso, basePath = "/plan" }: Props) {
  const searchParams = useSearchParams();
  const showWeekends = searchParams.get("weekends") === "1";
  const start = parsePlanWindowStart(windowStartIso, showWeekends);
  const prev = formatDateIso(shiftPlanWindowStart(start, -1, showWeekends));
  const next = formatDateIso(shiftPlanWindowStart(start, 1, showWeekends));
  const todayStart = formatDateIso(defaultPlanWindowStart(undefined, showWeekends));

  return (
    <nav
      className="inline-flex flex-wrap items-center gap-2 rounded-xl border border-aurora-border bg-aurora-surface px-2 py-1.5 shadow-sm"
      aria-label="Navegacao do periodo"
      data-testid="plan-week-nav"
    >
      <Link
        href={hrefForStart(basePath, searchParams, prev)}
        className={navChipClass}
        aria-label="Periodo anterior"
      >
        <ChevronLeft className="h-4 w-4" />
      </Link>
      <span className="min-w-[9rem] px-1 text-center text-sm font-medium tabular-nums text-aurora-fg">
        {formatPlanRangeLabel(start, showWeekends)}
      </span>
      <Link
        href={hrefForStart(basePath, searchParams, next)}
        className={navChipClass}
        aria-label="Proximo periodo"
      >
        <ChevronRight className="h-4 w-4" />
      </Link>
      {!isPlanWindowIncludingToday(start, showWeekends) ? (
        <Link
          href={hrefForStart(basePath, searchParams, todayStart)}
          className={navChipBrandClass + " inline-flex items-center gap-1"}
        >
          <CalendarDays className="h-3.5 w-3.5" aria-hidden />
          Hoje
        </Link>
      ) : null}
    </nav>
  );
}
