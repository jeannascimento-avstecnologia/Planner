"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";
import { KANBAN_DRAG_ACTIVATION_DELAY_MS } from "@/lib/kanban-dnd";
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
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id, disabled: dragDisabled });

  const [holdReady, setHoldReady] = useState(false);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHold = useCallback(() => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    setHoldReady(false);
  }, []);

  const dragListeners = useMemo(() => {
    if (!listeners || dragDisabled) return undefined;
    return {
      ...listeners,
      onPointerDown: (event: React.PointerEvent) => {
        clearHold();
        holdTimerRef.current = setTimeout(() => setHoldReady(true), KANBAN_DRAG_ACTIVATION_DELAY_MS);
        listeners.onPointerDown?.(event);
      },
      onPointerUp: (event: React.PointerEvent) => {
        clearHold();
        listeners.onPointerUp?.(event);
      },
      onPointerCancel: (event: React.PointerEvent) => {
        clearHold();
        listeners.onPointerCancel?.(event);
      },
    };
  }, [clearHold, dragDisabled, listeners]);

  useEffect(() => {
    if (isDragging) clearHold();
  }, [clearHold, isDragging]);

  useEffect(() => () => clearHold(), [clearHold]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="transition-all duration-300"
      data-testid={`sortable-card-${card.id}`}
    >
      <BoardCardTile
        card={card}
        {...tileProps}
        dragReady={holdReady}
        isDragging={isDragging}
        dragProps={
          dragDisabled
            ? undefined
            : {
                listeners: dragListeners,
                attributes,
              }
        }
      />
    </div>
  );
}
