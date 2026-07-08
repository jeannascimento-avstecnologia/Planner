"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { updateMemberCapacityAction } from "@/app/(app)/workload/actions";
import { acquireInFlightLock, releaseInFlightLock } from "@/lib/in-flight-submit";
import {
  UTILIZATION_BAR_CLASS,
  UTILIZATION_TEXT_CLASS,
  utilizationLevel,
  utilizationPct,
} from "@/lib/workload/utilization";
import type { WorkloadDrilldownCard, WorkloadMemberRow } from "@/lib/load-workload";
import { inputClassSm, linkClass, memberAvatarClass } from "@/lib/ui-classes";
import { WorkloadDrilldown } from "./workload-drilldown";

type Props = {
  orgId: string;
  row: WorkloadMemberRow;
  weekIso: string;
  drilldownCards: WorkloadDrilldownCard[];
  canEditCapacity?: boolean;
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function WorkloadMemberRow({ orgId, row, weekIso, drilldownCards, canEditCapacity = false }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const savingRef = useRef(false);
  const pct = utilizationPct(row.totalHours, row.capacityHours);
  const level = utilizationLevel(pct);

  function saveCapacity(raw: string) {
    if (pending || savingRef.current) return;
    const v = Number(raw);
    if (!Number.isFinite(v) || v < 1 || v > 168) {
      toast.error("Capacidade entre 1 e 168 horas.");
      return;
    }
    if (v === row.capacityHours) return;

    const lockKey = `workload-capacity:${orgId}:${row.userId}`;
    if (!acquireInFlightLock(lockKey)) return;

    savingRef.current = true;
    startTransition(async () => {
      try {
        const r = await updateMemberCapacityAction({
          orgId,
          userId: row.userId,
          weeklyCapacityHours: v,
        });
        if (!r.ok) toast.error(r.error);
        else toast.success("Capacidade atualizada");
      } finally {
        savingRef.current = false;
        releaseInFlightLock(lockKey);
      }
    });
  }

  return (
    <>
      <tr className="aurora-row-hover border-t border-aurora-border" data-testid="workload-row">
        <td className="px-4 py-3">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="group flex w-full items-center gap-3 rounded-lg text-left transition-colors hover:text-aurora-brand"
            data-testid={`workload-member-${row.userId}`}
          >
            <span className={memberAvatarClass}>{initials(row.fullName)}</span>
            <span className="font-medium text-aurora-fg group-hover:text-aurora-brand">{row.fullName}</span>
          </button>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="h-2 min-w-[6rem] flex-1 overflow-hidden rounded-full bg-aurora-surface-2">
              <div
                className={`h-full rounded-full ${UTILIZATION_BAR_CLASS[level]}`}
                style={{ width: `${Math.min(pct, 100)}%` }}
                data-testid={`workload-bar-${row.userId}`}
              />
            </div>
            <span className={`text-xs font-medium tabular-nums ${UTILIZATION_TEXT_CLASS[level]}`}>
              {pct}%
            </span>
          </div>
        </td>
        <td className="px-4 py-3 tabular-nums">{row.totalHours}h</td>
        <td className="px-4 py-3 tabular-nums">
          {canEditCapacity ? (
            <input
              type="number"
              min={1}
              max={168}
              step={1}
              defaultValue={row.capacityHours}
              disabled={pending}
              className={inputClassSm + " w-16 tabular-nums"}
              data-testid={`workload-capacity-${row.userId}`}
              onBlur={(e) => saveCapacity(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              }}
            />
          ) : (
            `${row.capacityHours}h`
          )}
        </td>
        <td className="px-4 py-3 tabular-nums text-aurora-muted">{row.cardCount}</td>
      </tr>
      <WorkloadDrilldown
        open={open}
        onClose={() => setOpen(false)}
        memberName={row.fullName}
        weekIso={weekIso}
        cards={drilldownCards}
      />
    </>
  );
}

export function WorkloadUnscheduledRow({
  card,
}: {
  card: { id: string; title: string; boardId: string; boardName: string; assigneeName: string; estimatedHours: number | null };
}) {
  return (
    <tr className="border-t border-aurora-border" data-testid="workload-unscheduled-row">
      <td className="px-4 py-3">{card.assigneeName}</td>
      <td className="px-4 py-3">
        <Link href={`/boards/${card.boardId}?cardId=${card.id}`} className={linkClass}>
          {card.title}
        </Link>
      </td>
      <td className="px-4 py-3 text-aurora-muted">{card.boardName}</td>
      <td className="px-4 py-3 tabular-nums">{card.estimatedHours ?? 0}h</td>
    </tr>
  );
}
