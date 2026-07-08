"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { addWeeks, formatDateIso, formatWeekRangeLabel, isCurrentWeek } from "@/lib/workload/week";
import { navChipBrandClass, navChipClass } from "@/lib/ui-classes";

type Props = {
  weekStart: Date;
};

export function WorkloadWeekNav({ weekStart }: Props) {
  const searchParams = useSearchParams();
  const prevIso = formatDateIso(addWeeks(weekStart, -1));
  const nextIso = formatDateIso(addWeeks(weekStart, 1));
  const current = isCurrentWeek(weekStart);

  function hrefForWeek(iso: string): string {
    const params = new URLSearchParams(searchParams.toString());
    params.set("week", iso);
    params.set("mode", "week");
    return `/workload?${params.toString()}`;
  }

  return (
    <nav
      className="inline-flex flex-wrap items-center gap-2 rounded-xl border border-aurora-border bg-aurora-surface px-2 py-1.5 shadow-sm"
      aria-label="Navegacao semanal"
      data-testid="workload-week-nav"
    >
      <Link href={hrefForWeek(prevIso)} className={navChipClass} aria-label="Semana anterior">
        <ChevronLeft className="h-4 w-4" />
        Anterior
      </Link>
      {!current ? (
        <Link href="/workload?mode=week" className={navChipBrandClass + " inline-flex items-center gap-1"}>
          <CalendarDays className="h-3.5 w-3.5" aria-hidden />
          Semana atual
        </Link>
      ) : null}
      <Link href={hrefForWeek(nextIso)} className={navChipClass} aria-label="Proxima semana">
        Proxima
        <ChevronRight className="h-4 w-4" />
      </Link>
      <span className="px-1 text-sm tabular-nums text-aurora-muted">
        {formatWeekRangeLabel(weekStart)}
      </span>
    </nav>
  );
}
