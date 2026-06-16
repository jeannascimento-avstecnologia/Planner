import { getBoardIcon } from "@/lib/icon-catalog";
import { DEFAULT_BOARD_COLOR } from "@/lib/ui-classes";

type Props = {
  icon: string | null;
  color: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const boxClass = { sm: "h-7 w-7", md: "h-9 w-9", lg: "h-11 w-11" } as const;
const iconClass = { sm: "h-4 w-4", md: "h-5 w-5", lg: "h-6 w-6" } as const;

/** Quadrado com tint da cor do projeto + icone Lucide. */
export function BoardIcon({ icon, color, size = "md", className = "" }: Props) {
  const Icon = getBoardIcon(icon);
  const tint = color || DEFAULT_BOARD_COLOR;
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-lg ${boxClass[size]} ${className}`}
      style={{ backgroundColor: `${tint}20`, color: tint }}
    >
      <Icon className={iconClass[size]} />
    </span>
  );
}
