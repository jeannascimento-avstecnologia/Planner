"use client";

import { useState } from "react";
import type { Workload15DayMember } from "@/lib/load-plan-grid";
import type { WorkloadDrilldownCard } from "@/lib/load-workload";
import {
  formatPlanRangeLabel,
  isTodayIso,
  parseStartParam,
  dailyCapacityFromWeekly,
  WORKLOAD_15D_WINDOW_DAYS,
} from "@/lib/plan/window";
import {
  UTILIZATION_BAR_CLASS,
  UTILIZATION_CELL_BG,
  UTILIZATION_CELL_BORDER,
  UTILIZATION_TEXT_CLASS,
  isWeekendIso,
  utilizationLevel,
  utilizationPct,
} from "@/lib/workload/utilization";
import {
  dataPanelClass,
  dataPanelEnterClass,
  memberAvatarClass,
  tableStickyCellClass,
  tableStickyHeadClass,
  planTodayColumnClass,
  planTodayColumnHeaderClass,
} from "@/lib/ui-classes";
import { WorkloadDrilldown } from "./workload-drilldown";

type Props = {
  members: Workload15DayMember[];
  dayKeys: string[];
  windowStartIso: string;
  drilldownByUser: Record<string, WorkloadDrilldownCard[]>;
  planStartIso: string;
};

function weekdayCount(keys: string[]): number {
  return keys.filter((d) => !isWeekendIso(d)).length;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function WorkloadHeatmapLegend() {
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs text-aurora-muted">
      <span className="font-medium text-aurora-fg">Utilizacao diaria:</span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-3 w-3 rounded-sm bg-emerald-500/25 border border-emerald-500/30" />
        &lt; 80%
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-3 w-3 rounded-sm bg-amber-500/25 border border-amber-500/40" />
        80–100%
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-3 w-3 rounded-sm bg-red-500/25 border border-red-500/45" />
        &gt; 100%
      </span>
    </div>
  );
}

type RowProps = {
  member: Workload15DayMember;
  dayKeys: string[];
  workdays: number;
  windowStartIso: string;
  drilldownCards: WorkloadDrilldownCard[];
};

function Workload15DayMemberRow({ member, dayKeys, workdays, windowStartIso, drilldownCards }: RowProps) {
  const [open, setOpen] = useState(false);
  const dailyCap = dailyCapacityFromWeekly(member.capacityHours);
  const periodPct = utilizationPct(member.totalHours, dailyCap * workdays);
  const periodLevel = utilizationLevel(periodPct);

  return (
    <>
      <tr className="aurora-row-hover border-t border-aurora-border/60" data-testid={`workload-15d-row-${member.userId}`}>
        <td className={`sticky left-0 z-10 px-3 py-2 ${tableStickyCellClass}`}>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="group flex w-full items-center gap-2 rounded-lg text-left"
            title="Ver cards deste membro"
          >
            <span className={memberAvatarClass + " h-7 w-7 text-[10px]"}>{initials(member.fullName)}</span>
            <span className="min-w-0 truncate font-medium text-aurora-fg group-hover:text-aurora-brand">
              {member.fullName}
            </span>
          </button>
        </td>
        {dayKeys.map((d) => {
          const hours = member.days[d] ?? 0;
          const dayPct = dailyCap > 0 ? utilizationPct(hours, dailyCap) : 0;
          const dayLevel = utilizationLevel(dayPct);
          const today = isTodayIso(d);
          const weekend = isWeekendIso(d);
          const barPct = dailyCap > 0 ? Math.min(100, Math.round((hours / dailyCap) * 100)) : 0;

          return (
            <td
              key={d}
              className={`border-l border-aurora-border/60 px-0.5 py-1.5 align-bottom ${
                today ? planTodayColumnClass : weekend ? "bg-aurora-surface-2/30" : ""
              }`}
              title={
                hours > 0
                  ? `${hours}h / ${dailyCap}h (${dayPct}%)`
                  : weekend
                    ? "Fim de semana"
                    : `0h / ${dailyCap}h`
              }
            >
              <div
                className={`mx-auto flex h-10 w-9 flex-col justify-end rounded-md border ${
                  hours > 0
                    ? `${UTILIZATION_CELL_BG[dayLevel]} ${UTILIZATION_CELL_BORDER[dayLevel]}`
                    : "border-transparent bg-aurora-surface-2/40"
                }`}
              >
                {hours > 0 ? (
                  <>
                    <div className="flex flex-1 items-end px-0.5 pb-0.5">
                      <div
                        className={`w-full rounded-sm ${UTILIZATION_BAR_CLASS[dayLevel]}`}
                        style={{ height: `${Math.max(barPct, 12)}%` }}
                      />
                    </div>
                    <span
                      className={`pb-0.5 text-center text-[10px] font-semibold tabular-nums ${UTILIZATION_TEXT_CLASS[dayLevel]}`}
                    >
                      {hours}h
                    </span>
                  </>
                ) : (
                  <span className="flex h-full items-center justify-center text-[10px] text-aurora-muted/50">–</span>
                )}
              </div>
            </td>
          );
        })}
        <td className="border-l border-aurora-border px-2 py-2">
          <div className="flex min-w-[4.5rem] flex-col gap-1">
            <div className="h-1.5 overflow-hidden rounded-full bg-aurora-surface-2">
              <div
                className={`h-full rounded-full ${UTILIZATION_BAR_CLASS[periodLevel]}`}
                style={{ width: `${Math.min(periodPct, 100)}%` }}
              />
            </div>
            <span className={`text-center text-xs font-semibold tabular-nums ${UTILIZATION_TEXT_CLASS[periodLevel]}`}>
              {member.totalHours}h
            </span>
          </div>
        </td>
      </tr>
      <WorkloadDrilldown
        open={open}
        onClose={() => setOpen(false)}
        memberName={member.fullName}
        weekIso={windowStartIso}
        cards={drilldownCards}
      />
    </>
  );
}

export function Workload15DayGrid({ members, dayKeys, windowStartIso, drilldownByUser, planStartIso }: Props) {
  const start = parseStartParam(windowStartIso);
  const workdays = weekdayCount(dayKeys);
  const hasAnyHours = members.some((m) => m.totalHours > 0);

  return (
    <div className={`space-y-3 ${dataPanelEnterClass}`}>
      <WorkloadHeatmapLegend />
      <div className={`${dataPanelClass} overflow-x-auto`} data-testid="workload-15d-grid">
        <table className="w-max min-w-full text-sm">
          <thead className="border-b border-aurora-border bg-aurora-surface-2 text-xs uppercase tracking-wide text-aurora-muted">
            <tr>
              <th
                className={`sticky left-0 z-10 min-w-[160px] px-3 py-2.5 text-left font-semibold ${tableStickyHeadClass}`}
              >
                Membro
              </th>
              {dayKeys.map((d) => {
                const dt = new Date(`${d}T12:00:00`);
                const today = isTodayIso(d);
                const weekend = isWeekendIso(d);
                return (
                  <th
                    key={d}
                    className={`min-w-[2.75rem] border-l border-aurora-border/60 px-0.5 py-2.5 text-center font-normal ${
                      today ? planTodayColumnHeaderClass : weekend ? "text-aurora-muted/70" : ""
                    }`}
                  >
                    {dt.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit" })}
                  </th>
                );
              })}
              <th className="min-w-[4.5rem] border-l border-aurora-border px-2 py-2.5 font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {members.length === 0 ? (
              <tr>
                <td colSpan={dayKeys.length + 2} className="px-4 py-8 text-center text-aurora-muted">
                  Nenhum membro nesta organizacao.
                </td>
              </tr>
            ) : (
              members.map((m) => (
                <Workload15DayMemberRow
                  key={m.userId}
                  member={m}
                  dayKeys={dayKeys}
                  workdays={workdays}
                  windowStartIso={windowStartIso}
                  drilldownCards={drilldownByUser[m.userId] ?? []}
                />
              ))
            )}
          </tbody>
        </table>
        <p className="border-t border-aurora-border bg-aurora-surface-2/40 px-3 py-2 text-xs text-aurora-muted">
          {formatPlanRangeLabel(start, WORKLOAD_15D_WINDOW_DAYS)} · alocacoes do{" "}
          <a href={`/plan?start=${planStartIso}`} className="text-aurora-brand hover:underline">
            Meu plano
          </a>
          {hasAnyHours ? "" : " · atribua responsavel, horas e data nos cards para ver carga estimada"}
        </p>
      </div>
    </div>
  );
}
