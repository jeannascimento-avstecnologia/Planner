"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { moveCard } from "@/app/(app)/boards/[boardId]/actions";
import { positionBetween } from "@/lib/fractional";
import { appToast } from "@/lib/toast";
import { BoardCardTile } from "./board-card-tile";
import { KanbanColumn, NewColumnSection } from "./kanban-column";
import type { BoardCard, ColumnRow, ProfileRow, StageRow, TagRow } from "./types";

type Props = {
  boardId: string;
  columns: ColumnRow[];
  stagesById: Map<string, StageRow>;
  cardsByColumn: Map<string, BoardCard[]>;
  swimlanes: { key: string; label: string; cards: BoardCard[] }[] | null;
  groupByAssignee: boolean;
  tags: TagRow[];
  profilesById: Record<string, ProfileRow>;
  tifluxEnabled: boolean;
  canEditBoard: boolean;
  canRenameColumns: boolean;
  readOnlyTiflux?: boolean;
  onSelectCard: (id: string) => void;
  onOpenTifluxCreate: (id: string) => void;
  onOpenTifluxLink: (id: string) => void;
};

function stubCard(cardId: string, title: string, columnId: string): BoardCard {
  return {
    id: cardId,
    column_id: columnId,
    position: "zzzzzzzz",
    title,
    description: null,
    priority: "medium",
    due_date: null,
    start_date: null,
    assignee_id: null,
    completed_at: null,
    stage_id: null,
    tagIds: [],
    tiflux_ticket_number: null,
    tiflux_ticket_id: null,
    tiflux_canceled_tickets: [],
  };
}

function buildItemsMap(
  columns: ColumnRow[],
  cardsByColumn: Map<string, BoardCard[]>,
): Record<string, string[]> {
  const items: Record<string, string[]> = {};
  for (const col of columns) {
    items[col.id] = (cardsByColumn.get(col.id) ?? []).map((c) => c.id);
  }
  return items;
}

function applyDragToItems(
  prev: Record<string, string[]>,
  columns: ColumnRow[],
  activeId: string,
  overId: string,
): Record<string, string[]> | null {
  const columnIds = new Set(columns.map((c) => c.id));
  const findContainer = (id: string): string | undefined => {
    if (columnIds.has(id)) return id;
    return columns.find((col) => prev[col.id]?.includes(id))?.id;
  };

  const activeContainer = findContainer(activeId);
  const overContainer = findContainer(overId);
  if (!activeContainer || !overContainer) return null;

  const activeItems = [...(prev[activeContainer] ?? [])];
  const overItems = [...(prev[overContainer] ?? [])];
  const activeIndex = activeItems.indexOf(activeId);
  if (activeIndex === -1) return null;

  let overIndex = overItems.indexOf(overId);
  if (overIndex === -1) overIndex = overItems.length;

  if (activeContainer === overContainer) {
    if (activeIndex === overIndex) return null;
    return { ...prev, [overContainer]: arrayMove(overItems, activeIndex, overIndex) };
  }

  activeItems.splice(activeIndex, 1);
  overItems.splice(overIndex, 0, activeId);
  return { ...prev, [activeContainer]: activeItems, [overContainer]: overItems };
}

export function BoardKanbanView({
  boardId,
  columns,
  stagesById,
  cardsByColumn,
  swimlanes,
  groupByAssignee,
  tags,
  profilesById,
  tifluxEnabled,
  canEditBoard,
  canRenameColumns,
  readOnlyTiflux = false,
  onSelectCard,
  onOpenTifluxCreate,
  onOpenTifluxLink,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [extraCards, setExtraCards] = useState<Map<string, BoardCard>>(() => new Map());
  const [items, setItems] = useState<Record<string, string[]>>(() =>
    buildItemsMap(columns, cardsByColumn),
  );
  const itemsRef = useRef(items);
  const movingRef = useRef(false);

  useEffect(() => {
    const next = buildItemsMap(columns, cardsByColumn);
    itemsRef.current = next;
    setItems(next);
    setExtraCards(new Map());
  }, [columns, cardsByColumn]);

  const cardById = useMemo(() => {
    const map = new Map<string, BoardCard>();
    for (const list of cardsByColumn.values()) {
      for (const card of list) map.set(card.id, card);
    }
    for (const card of extraCards.values()) map.set(card.id, card);
    return map;
  }, [cardsByColumn, extraCards]);

  const handleCardCreated = useCallback((cardId: string, title: string, columnId: string) => {
    const card = stubCard(cardId, title, columnId);
    setExtraCards((prev) => new Map(prev).set(cardId, card));
    setItems((prev) => {
      const next = { ...prev, [columnId]: [...(prev[columnId] ?? []), cardId] };
      itemsRef.current = next;
      return next;
    });
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  const activeCard = activeCardId ? (cardById.get(activeCardId) ?? null) : null;

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveCardId(String(event.active.id));
  }, []);

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      if (!over) return;

      const activeId = String(active.id);
      const overId = String(over.id);
      const synced = applyDragToItems(itemsRef.current, columns, activeId, overId);
      if (synced) {
        itemsRef.current = synced;
        setItems(synced);
      }
    },
    [columns],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveCardId(null);
      if (!canEditBoard || movingRef.current) return;

      const { active, over } = event;
      if (!over) return;

      const activeId = String(active.id);
      const overId = String(over.id);
      const synced = applyDragToItems(itemsRef.current, columns, activeId, overId);
      if (synced) {
        itemsRef.current = synced;
        setItems(synced);
      }

      const card = cardById.get(activeId);
      if (!card) return;

      const targetContainer = columns.find((col) => itemsRef.current[col.id]?.includes(activeId))?.id;
      if (!targetContainer) return;

      const orderedIds = itemsRef.current[targetContainer] ?? [];
      const index = orderedIds.indexOf(activeId);
      if (index === -1) return;

      const beforePos = index > 0 ? (cardById.get(orderedIds[index - 1]!)?.position ?? null) : null;
      const afterPos =
        index < orderedIds.length - 1 ? (cardById.get(orderedIds[index + 1]!)?.position ?? null) : null;
      const newPosition = positionBetween(beforePos, afterPos);

      if (card.column_id === targetContainer && card.position === newPosition) {
        return;
      }

      const fd = new FormData();
      fd.set("cardId", activeId);
      fd.set("boardId", boardId);
      fd.set("columnId", targetContainer);
      fd.set("position", newPosition);

      movingRef.current = true;
      startTransition(async () => {
        try {
          const result = await moveCard(fd);
          if ("error" in result) {
            appToast.error(result.error);
            const next = buildItemsMap(columns, cardsByColumn);
            itemsRef.current = next;
            setItems(next);
            return;
          }
        } finally {
          movingRef.current = false;
        }
      });
    },
    [boardId, canEditBoard, cardById, cardsByColumn, columns],
  );

  if (groupByAssignee && swimlanes) {
    return (
      <div className="space-y-4">
        {swimlanes.map((lane) => (
          <section key={lane.key} className="rounded-xl border border-board-border bg-board-surface/60 p-3">
            <h3 className="mb-2 text-sm font-semibold text-aurora-fg">
              {lane.label} ({lane.cards.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {lane.cards.map((card) => (
                <div key={card.id} className="w-72">
                  <BoardCardTile
                    card={card}
                    columns={columns}
                    stagesById={stagesById}
                    tags={tags}
                    profilesById={profilesById}
                    tifluxEnabled={tifluxEnabled}
                    readOnlyTiflux={readOnlyTiflux}
                    onSelect={onSelectCard}
                    onOpenTifluxCreate={onOpenTifluxCreate}
                    onOpenTifluxLink={onOpenTifluxLink}
                  />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    );
  }

  return (
    <>
      {pending ? (
        <p className="pointer-events-none fixed bottom-4 right-4 z-50 rounded-lg bg-board-surface px-3 py-1.5 text-xs text-aurora-muted shadow-lg" aria-live="polite">
          Salvando...
        </p>
      ) : null}
      <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={() => {
        setActiveCardId(null);
        const next = buildItemsMap(columns, cardsByColumn);
        itemsRef.current = next;
        setItems(next);
      }}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((col) => (
          <KanbanColumn
            key={col.id}
            boardId={boardId}
            column={col}
            columns={columns}
            cardIds={items[col.id] ?? []}
            cardsById={cardById}
            stagesById={stagesById}
            tags={tags}
            profilesById={profilesById}
            tifluxEnabled={tifluxEnabled}
            canEditBoard={canEditBoard}
            canRenameColumns={canRenameColumns}
            readOnlyTiflux={readOnlyTiflux}
            onSelectCard={onSelectCard}
            onOpenTifluxCreate={onOpenTifluxCreate}
            onOpenTifluxLink={onOpenTifluxLink}
            onCardCreated={handleCardCreated}
          />
        ))}
        {canEditBoard ? <NewColumnSection boardId={boardId} /> : null}
      </div>
      <DragOverlay dropAnimation={null}>
        {activeCard ? (
          <div className="w-72 rotate-1 opacity-95 shadow-lg">
            <BoardCardTile
              card={activeCard}
              columns={columns}
              stagesById={stagesById}
              tags={tags}
              profilesById={profilesById}
              tifluxEnabled={tifluxEnabled}
              readOnlyTiflux={readOnlyTiflux}
              onSelect={() => {}}
              onOpenTifluxCreate={() => {}}
              onOpenTifluxLink={() => {}}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
    </>
  );
}
