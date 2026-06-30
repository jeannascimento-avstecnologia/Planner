export type AuroraSurfaceVariant = "app" | "board";

export type AuroraModalSize = "sm" | "md" | "lg" | "full";

export const MODAL_SIZE_CLASS: Record<AuroraModalSize, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-2xl",
  full: "max-w-4xl",
};

export function surfacePanelClass(variant: AuroraSurfaceVariant): string {
  const base = "aurora-modal-panel overflow-hidden rounded-xl border shadow-xl";
  if (variant === "board") {
    return `${base} aurora-modal-panel--board border-board-border bg-board-surface`;
  }
  return `${base} border-aurora-border bg-aurora-surface`;
}

export function surfacePopoverClass(variant: AuroraSurfaceVariant): string {
  if (variant === "board") {
    return "rounded-lg border border-board-border bg-board-surface p-2 shadow-xl";
  }
  return "rounded-lg border border-aurora-border bg-aurora-surface p-2 shadow-xl";
}
