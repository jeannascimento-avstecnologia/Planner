export type AuroraSurfaceVariant = "app" | "board";

export type AuroraModalSize = "sm" | "md" | "lg" | "full";

export const MODAL_SIZE_CLASS: Record<AuroraModalSize, string> = {
  sm: "max-w-lg",
  md: "max-w-2xl",
  lg: "max-w-4xl",
  full: "max-w-6xl",
};

/** Scroll ceiling — sem padding; compor com padding local */
export const MODAL_BODY_SCROLL_MAX = "overflow-x-hidden overflow-y-auto max-h-[min(calc(90dvh-7rem),720px)]";

export const MODAL_BODY_CLASS = `${MODAL_BODY_SCROLL_MAX} px-4 py-4 sm:px-6`;

export const MODAL_BODY_PADDED_CLASS = `${MODAL_BODY_SCROLL_MAX} p-5`;

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
