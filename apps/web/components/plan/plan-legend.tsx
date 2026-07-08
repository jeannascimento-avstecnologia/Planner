import {
  planFinalDueCellClass,
  planPastDueCellClass,
  planTargetDeliveryCellClass,
  planTodayColumnClass,
} from "@/lib/ui-classes";
import { UTILIZATION_BAR_CLASS } from "@/lib/workload/utilization";

type ColorSwatch = { kind: "cell"; swatchClass: string; label: string; id: string };
type BarSwatch = { kind: "bar"; barClass: string; label: string; id: string };

const LEGEND_ITEMS: Array<ColorSwatch | BarSwatch> = [
  { id: "today", kind: "cell", label: "Hoje", swatchClass: planTodayColumnClass },
  { id: "target", kind: "cell", label: "Entrega estimada", swatchClass: planTargetDeliveryCellClass },
  { id: "due", kind: "cell", label: "Prazo final", swatchClass: planFinalDueCellClass },
  { id: "past-due", kind: "cell", label: "Prazo vencido", swatchClass: planPastDueCellClass },
  { id: "util-ok", kind: "bar", label: "Utilizacao OK", barClass: UTILIZATION_BAR_CLASS.ok },
  { id: "util-warn", kind: "bar", label: "Utilizacao alta (80–100%)", barClass: UTILIZATION_BAR_CLASS.warn },
  { id: "util-over", kind: "bar", label: "Acima da capacidade", barClass: UTILIZATION_BAR_CLASS.over },
];

/** Legenda visual do plano de trabalho — cores de colunas, prazos e utilizacao. */
export function PlanLegend() {
  return (
    <aside
      className="rounded-xl border border-aurora-border/70 bg-aurora-surface-2/40 px-3 py-2.5"
      aria-labelledby="plan-legend-title"
      data-testid="plan-legend"
    >
      <p id="plan-legend-title" className="mb-2 text-xs font-semibold uppercase tracking-wide text-aurora-muted">
        Legenda
      </p>
      <ul className="flex flex-wrap gap-x-4 gap-y-2">
        {LEGEND_ITEMS.map((item) => (
          <li key={item.id} className="flex items-center gap-2 text-xs text-aurora-fg">
            {item.kind === "bar" ? (
              <span className={`inline-block h-2.5 w-6 shrink-0 rounded-sm ${item.barClass}`} aria-hidden />
            ) : (
              <span
                className={`inline-block h-4 w-4 shrink-0 rounded border border-aurora-border/60 ${item.swatchClass}`}
                aria-hidden
              />
            )}
            <span>{item.label}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
