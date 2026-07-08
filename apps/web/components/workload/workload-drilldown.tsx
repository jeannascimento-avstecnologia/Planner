"use client";

import Link from "next/link";
import type { WorkloadDrilldownCard } from "@/lib/load-workload";

type Props = {
  open: boolean;
  onClose: () => void;
  memberName: string;
  weekIso: string;
  cards: WorkloadDrilldownCard[];
};

function formatDateLabel(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("pt-BR");
}

export function WorkloadDrilldown({ open, onClose, memberName, weekIso, cards }: Props) {
  if (!open) return null;

  return (
    <tr className="border-t border-aurora-border bg-aurora-brand-muted/15 aurora-row-hover">
      <td colSpan={5} className="px-4 py-4">
        <div
          className="hub-panel-enter rounded-xl border border-aurora-border bg-aurora-surface p-4 shadow-sm"
          data-testid="workload-drilldown"
          role="dialog"
          aria-label={`Cards de ${memberName}`}
        >
          <div className="aurora-modal-hairline mb-3 rounded-full" aria-hidden />
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-aurora-fg">
              {memberName} — semana {weekIso}
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-aurora-border px-2 py-1 text-xs text-aurora-muted transition-colors hover:border-aurora-brand/40 hover:text-aurora-fg"
            >
              Fechar
            </button>
          </div>
          {cards.length === 0 ? (
            <p className="text-sm text-aurora-muted">Nenhum card nesta semana.</p>
          ) : (
            <ul className="space-y-2">
              {cards.map((c) => {
                const target = formatDateLabel(c.targetDate);
                const due = formatDateLabel(c.dueDate);
                const dateParts: string[] = [];
                if (target) dateParts.push(`entrega ${target}`);
                if (due && due !== target) dateParts.push(`prazo ${due}`);
                const hoursLabel =
                  c.weekHours != null && c.weekHours > 0
                    ? `${c.weekHours}h nesta semana`
                    : c.estimatedHours != null
                      ? `${c.estimatedHours}h`
                      : "";
                return (
                  <li key={c.id} className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                    <Link
                      href={`/boards/${c.boardId}?cardId=${c.id}`}
                      className="font-medium text-aurora-accent hover:underline"
                    >
                      {c.title}
                    </Link>
                    <span className="text-xs text-aurora-muted">
                      {c.boardName}
                      {hoursLabel ? ` · ${hoursLabel}` : ""}
                      {dateParts.length > 0 ? ` · ${dateParts.join(" · ")}` : ""}
                      {c.weekHours != null && c.weekHours > 0 ? (
                        <>
                          {" · "}
                          <Link href={`/plan?highlight=${c.id}`} className="text-violet-600 underline dark:text-violet-300">
                            plano
                          </Link>
                        </>
                      ) : null}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </td>
    </tr>
  );
}
