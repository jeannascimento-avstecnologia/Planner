"use client";

import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";
import { BoardCardTile } from "./board-card-tile";
import type { BoardCard, ColumnRow, ProfileRow, StageRow, TagRow } from "./types";

type Props = {
  card: BoardCard;
  columns: ColumnRow[];
  stagesById: Map<string, StageRow>;
  tags: TagRow[];
  profilesById: Record<string, ProfileRow>;
  tifluxEnabled: boolean;
  readOnlyTiflux: boolean;
  dragDisabled: boolean;
  subtasksProgress?: { done: number; total: number } | null;
  onSelect: (id: string) => void;
  onOpenTifluxCreate: (id: string) => void;
  onOpenTifluxLink: (id: string) => void;
};

export function SortableCardTile({
  card,
  dragDisabled,
  ...tileProps
}: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id, disabled: dragDisabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} data-testid={`sortable-card-${card.id}`}>
      <BoardCardTile
        card={card}
        {...tileProps}
        moveHandle={
          dragDisabled
            ? undefined
            : {
                setActivatorNodeRef: setActivatorNodeRef,
                listeners,
                attributes,
              }
        }
      />
    </div>
  );
}
