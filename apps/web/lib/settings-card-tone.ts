export type SettingsCardTone =
  | "sky"
  | "violet"
  | "emerald"
  | "amber"
  | "indigo"
  | "rose"
  | "teal"
  | "orange";

type ToneStyle = {
  icon: string;
  border: string;
  link: string;
  ring: string;
};

export const SETTINGS_CARD_TONES: Record<SettingsCardTone, ToneStyle> = {
  sky: {
    icon: "bg-sky-100 text-sky-700 dark:bg-sky-950/80 dark:text-sky-300",
    border: "border-sky-200 hover:border-sky-400 dark:border-aurora-border dark:hover:border-sky-600",
    link: "text-sky-700 dark:text-sky-400",
    ring: "ring-sky-200/80 dark:ring-sky-800/60",
  },
  violet: {
    icon: "bg-violet-100 text-violet-700 dark:bg-violet-950/80 dark:text-violet-300",
    border: "border-violet-200 hover:border-violet-400 dark:border-aurora-border dark:hover:border-violet-600",
    link: "text-violet-700 dark:text-violet-400",
    ring: "ring-violet-200/80 dark:ring-violet-800/60",
  },
  emerald: {
    icon: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300",
    border: "border-emerald-200 hover:border-emerald-400 dark:border-aurora-border dark:hover:border-emerald-600",
    link: "text-emerald-700 dark:text-emerald-400",
    ring: "ring-emerald-200/80 dark:ring-emerald-800/60",
  },
  amber: {
    icon: "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300",
    border: "border-amber-200 hover:border-amber-400 dark:border-aurora-border dark:hover:border-amber-600",
    link: "text-amber-800 dark:text-amber-400",
    ring: "ring-amber-200/80 dark:ring-amber-800/60",
  },
  indigo: {
    icon: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300",
    border: "border-indigo-200 hover:border-indigo-400 dark:border-aurora-border dark:hover:border-indigo-600",
    link: "text-indigo-700 dark:text-indigo-400",
    ring: "ring-indigo-200/80 dark:ring-indigo-800/60",
  },
  rose: {
    icon: "bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300",
    border: "border-rose-200 hover:border-rose-400 dark:border-aurora-border dark:hover:border-rose-600",
    link: "text-rose-700 dark:text-rose-400",
    ring: "ring-rose-200/80 dark:ring-rose-800/60",
  },
  teal: {
    icon: "bg-teal-100 text-teal-700 dark:bg-teal-950/80 dark:text-teal-300",
    border: "border-teal-200 hover:border-teal-400 dark:border-aurora-border dark:hover:border-teal-600",
    link: "text-teal-700 dark:text-teal-400",
    ring: "ring-teal-200/80 dark:ring-teal-800/60",
  },
  orange: {
    icon: "bg-orange-100 text-orange-700 dark:bg-orange-950/80 dark:text-orange-300",
    border: "border-orange-200 hover:border-orange-400 dark:border-aurora-border dark:hover:border-orange-600",
    link: "text-orange-700 dark:text-orange-400",
    ring: "ring-orange-200/80 dark:ring-orange-800/60",
  },
};

export function settingsCardToneClasses(tone: SettingsCardTone): ToneStyle {
  return SETTINGS_CARD_TONES[tone];
}
