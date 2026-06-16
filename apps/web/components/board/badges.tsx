import type { CardPriority } from "@nextgen/contracts";
import { priorityClass } from "@/lib/ui-classes";
import type { TagRow } from "./types";

export function PriorityBadge({ priority }: { priority: CardPriority }) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${priorityClass[priority]}`}>
      {priority}
    </span>
  );
}

export function TagChip({ tag }: { tag: TagRow }) {
  return (
    <span
      className="inline-block rounded-full px-2 py-0.5 text-xs font-medium text-white"
      style={{ backgroundColor: tag.color }}
    >
      {tag.name}
    </span>
  );
}
