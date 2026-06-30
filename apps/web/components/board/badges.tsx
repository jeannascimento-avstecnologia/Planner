import type { CardPriority } from "@nextgen/contracts";
import { stageBadgeStyle } from "@/lib/color-utils";
import { priorityClass, TAG_DEFAULT_COLORS } from "@/lib/ui-classes";
import type { TagRow } from "./types";

export function tagColor(color: string | null | undefined): string {
  return color && /^#[0-9A-Fa-f]{6}$/.test(color) ? color : TAG_DEFAULT_COLORS[0];
}

export function PriorityBadge({ priority }: { priority: CardPriority }) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${priorityClass[priority]}`}>
      {priority}
    </span>
  );
}

export function TagChip({ tag }: { tag: TagRow }) {
  const bg = tagColor(tag.color);
  return (
    <span
      className="inline-block max-w-full truncate whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium text-white"
      style={{ backgroundColor: bg }}
      title={tag.name}
    >
      {tag.name}
    </span>
  );
}

export function StageBadge({ name, color }: { name: string; color: string }) {
  const { backgroundColor, color: textColor } = stageBadgeStyle(color);
  return (
    <span
      className="inline-block max-w-full truncate whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ backgroundColor, color: textColor }}
      title={name}
    >
      {name}
    </span>
  );
}
