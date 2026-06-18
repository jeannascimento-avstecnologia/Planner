/** Classes Tailwind baseadas nos tokens Aurora — unico lugar para inputs/botoes. */

const motionBase =
  "transition-[transform,box-shadow,border-color,background-color,opacity] duration-[var(--motion-duration-fast)] ease-[var(--motion-ease-out)]";

export const inputClass =
  `w-full rounded-lg border border-aurora-border bg-aurora-surface px-3 py-2 text-sm text-aurora-fg outline-none ${motionBase} focus:border-aurora-accent focus:ring-2 focus:ring-aurora-accent-muted hover:border-aurora-accent/40`;

export const inputClassSm =
  `w-full rounded-md border border-aurora-border bg-aurora-surface px-2 py-1.5 text-sm text-aurora-fg outline-none ${motionBase} focus:border-aurora-accent focus:ring-2 focus:ring-aurora-accent-muted hover:border-aurora-accent/40`;

export const btnPrimary =
  `rounded-lg bg-aurora-brand-red px-3 py-2 text-sm font-medium text-white ${motionBase} hover:shadow-md hover:brightness-110 active:scale-[0.98] disabled:opacity-60`;

export const btnPrimarySm =
  `rounded-md bg-aurora-accent px-2 py-1.5 text-sm font-medium text-white ${motionBase} hover:shadow-sm hover:brightness-110 active:scale-[0.98]`;

export const btnSecondary =
  `rounded-lg border border-aurora-border bg-aurora-surface px-3 py-2 text-sm font-medium text-aurora-fg ${motionBase} hover:border-aurora-accent/50 hover:bg-aurora-accent-muted/50 hover:shadow-sm`;

export const btnDanger =
  `rounded-lg border border-aurora-danger/40 bg-aurora-danger/10 px-3 py-2 text-sm font-medium text-aurora-danger ${motionBase} hover:bg-aurora-danger/20 disabled:opacity-60`;

export const btnBoardPrimary =
  `rounded-lg bg-board-accent px-3 py-2 text-sm font-medium text-white ${motionBase} hover:shadow-md hover:brightness-110 active:scale-[0.98] disabled:opacity-60`;

export const btnBoardPrimarySm =
  `rounded-md bg-board-accent px-2 py-1.5 text-sm font-medium text-white ${motionBase} hover:shadow-sm hover:brightness-110 active:scale-[0.98]`;

export const btnBoardSecondary =
  `rounded-lg border border-board-border bg-board-surface px-3 py-2 text-sm font-medium text-aurora-fg ${motionBase} hover:border-board-accent/50 hover:bg-board-accent-muted hover:shadow-sm`;

export const tileInteractive =
  `rounded-xl border border-aurora-border bg-aurora-surface ${motionBase} hover:-translate-y-0.5 hover:border-aurora-accent hover:bg-aurora-surface-2 hover:shadow-md`;

export const tileSelected =
  "ring-2 ring-aurora-accent ring-offset-2 ring-offset-aurora-bg";

export const inputBoardClassSm =
  `w-full rounded-md border border-board-border bg-board-surface px-2 py-1.5 text-sm text-aurora-fg outline-none ${motionBase} focus:border-board-accent focus:ring-2 focus:ring-board-accent-muted hover:border-board-accent/40`;

export const linkBoardClass = "text-board-accent hover:underline";

export const linkClass = "text-aurora-brand-red hover:underline";

export const priorityClass = {
  low: "bg-aurora-muted/15 text-aurora-muted",
  medium: "bg-aurora-info/15 text-aurora-info",
  high: "bg-aurora-warning/20 text-aurora-warning",
  urgent: "bg-aurora-danger text-white",
} as const;

export const TAG_DEFAULT_COLORS = ["#1D4ED8", "#10B981", "#F59E0B", "#EF4444"] as const;

/** Paleta de cores vivas para projetos (board.color) e color-picker. */
export const COLOR_PRESETS = [
  "#6366F1", // indigo
  "#8B5CF6", // violet
  "#EC4899", // pink
  "#EF4444", // red
  "#F59E0B", // amber
  "#10B981", // emerald
  "#14B8A6", // teal
  "#0EA5E9", // sky
  "#3B82F6", // blue
  "#64748B", // slate
  "#F97316", // orange
  "#84CC16", // lime
] as const;

export const DEFAULT_BOARD_COLOR = COLOR_PRESETS[0];
