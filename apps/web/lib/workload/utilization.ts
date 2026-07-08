export type UtilizationLevel = "ok" | "warn" | "over";

export function utilizationPct(hours: number, capacity: number): number {
  if (capacity <= 0) return 0;
  return Math.round((hours / capacity) * 100);
}

export function utilizationLevel(pct: number): UtilizationLevel {
  if (pct > 100) return "over";
  if (pct >= 80) return "warn";
  return "ok";
}

export const UTILIZATION_BAR_CLASS: Record<UtilizationLevel, string> = {
  ok: "bg-aurora-success",
  warn: "bg-amber-500",
  over: "bg-red-500",
};

export const UTILIZATION_TEXT_CLASS: Record<UtilizationLevel, string> = {
  ok: "text-aurora-success",
  warn: "text-amber-600",
  over: "text-red-600",
};

/** Fundo heatmap celula (estilo ClickUp/monday). */
export const UTILIZATION_CELL_BG: Record<UtilizationLevel, string> = {
  ok: "bg-emerald-500/18",
  warn: "bg-amber-500/22",
  over: "bg-red-500/25",
};

export const UTILIZATION_CELL_BORDER: Record<UtilizationLevel, string> = {
  ok: "border-emerald-500/30",
  warn: "border-amber-500/40",
  over: "border-red-500/45",
};

export function isWeekendIso(iso: string): boolean {
  const dow = new Date(`${iso}T12:00:00`).getDay();
  return dow === 0 || dow === 6;
}
