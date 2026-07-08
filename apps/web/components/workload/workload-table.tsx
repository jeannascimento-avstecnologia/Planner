"use client";

import { WorkloadMemberRow, WorkloadUnscheduledRow } from "@/components/workload/workload-member-row";
import type { WorkloadDrilldownCard, WorkloadMemberRow as MemberRow, WorkloadUnscheduledCard } from "@/lib/load-workload";
import { dataPanelClass, dataPanelEnterClass } from "@/lib/ui-classes";

type Props = {
  orgId: string;
  members: MemberRow[];
  weekIso: string;
  drilldownByUser: Record<string, WorkloadDrilldownCard[]>;
  unscheduled: WorkloadUnscheduledCard[];
  canEditCapacity?: boolean;
};

export function WorkloadTable({ orgId, members, weekIso, drilldownByUser, unscheduled, canEditCapacity = false }: Props) {
  return (
    <div className={`space-y-6 ${dataPanelEnterClass}`}>
      <div className={`overflow-x-auto ${dataPanelClass}`}>
        <table className="w-full text-left text-sm">
          <thead className="border-b border-aurora-border bg-aurora-surface-2 text-xs uppercase tracking-wide text-aurora-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">Membro</th>
              <th className="px-4 py-3 font-semibold">Utilizacao</th>
              <th className="px-4 py-3 font-semibold">Horas</th>
              <th className="px-4 py-3 font-semibold">Capacidade</th>
              <th className="px-4 py-3 font-semibold">Cards</th>
            </tr>
          </thead>
          <tbody>
            {members.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-aurora-muted" data-testid="workload-empty">
                  Nenhum membro nesta organizacao.
                </td>
              </tr>
            ) : (
              members.map((row) => (
                <WorkloadMemberRow
                  key={row.userId}
                  orgId={orgId}
                  row={row}
                  weekIso={weekIso}
                  drilldownCards={drilldownByUser[row.userId] ?? []}
                  canEditCapacity={canEditCapacity}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {unscheduled.length > 0 ? (
        <div className={`overflow-x-auto ${dataPanelClass}`}>
          <h2 className="flex items-center gap-2 border-b border-aurora-border bg-aurora-surface-2 px-4 py-3 text-sm font-semibold text-aurora-fg">
            Sem data planejada
            <span className="rounded-full bg-aurora-brand-muted px-2 py-0.5 text-xs font-bold text-aurora-brand">
              {unscheduled.length}
            </span>
          </h2>
          <table className="w-full text-left text-sm">
            <thead className="border-b border-aurora-border bg-aurora-surface-2/80 text-xs uppercase tracking-wide text-aurora-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">Membro</th>
                <th className="px-4 py-3 font-semibold">Card</th>
                <th className="px-4 py-3 font-semibold">Projeto</th>
                <th className="px-4 py-3 font-semibold">Horas</th>
              </tr>
            </thead>
            <tbody>
              {unscheduled.map((c) => (
                <WorkloadUnscheduledRow key={c.id} card={c} />
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
