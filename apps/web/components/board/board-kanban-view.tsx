"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { moveCard } from "@/app/(app)/boards/[boardId]/card-actions";
import { positionBetween } from "@/lib/fractional";
import { applyCardMoveToList, shouldIgnoreRemoteCardsSync } from "@/lib/query/board-cards-cache";
import { boardCardsQueryKey } from "@/lib/query/board-cards-keys";
import { appToast } from "@/lib/toast";
import { BoardCardTile } from "./board-card-tile";
import { KanbanColumn, NewColumnSection } from "./kanban-column";
import { countChildrenProgress } from "@/lib/card-tree";
import type { BoardCard, ColumnRow, ProfileRow, StageRow, TagRow } from "./types";

type Props = {
  boardId: string;
  columns: ColumnRow[];
  stagesById: Map<string, StageRow>;
  cardsByColumn: Map<string, BoardCard[]>;
  allCards: BoardCard[];
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
    parent_id: null,
    tree_x: null,
    tree_y: null,
    title,
    description: null,
    priority: "medium",
    due_date: null,
    start_date: null,
    target_date: null,
    estimated_hours: null,
    story_points: null,
    assignee_id: null,
    completed_at: null,
    stage_id: null,
    tagIds: [],
    checklistItems: [],
    treeParentIds: [],
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
  allCards,
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
  const queryClient = useQueryClient();
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [extraCards, setExtraCards] = useState<Map<string, BoardCard>>(() => new Map());
  const [items, setItems] = useState<Record<string, string[]>>(() =>
    buildItemsMap(columns, cardsByColumn),
  );
  const itemsRef = useRef(items);
  const isDraggingRef = useRef(false);

  const moveMutation = useMutation({
    mutationFn: async (fd: FormData) => {
      const result = await moveCard(fd);
      if ("error" in result) throw new Error(result.error);
      return result;
    },
    onMutate: async (fd) => {
      const cardId = String(fd.get("cardId") ?? "");
      const columnId = String(fd.get("columnId") ?? "");
      const position = String(fd.get("position") ?? "");
      const key = boardCardsQueryKey(boardId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<BoardCard[]>(key);
      if (previous && cardId && columnId && position) {
        queryClient.setQueryData(key, applyCardMoveToList(previous, cardId, columnId, position));
      }
      return { previous };
    },
    onError: (err, _fd, ctx) => {
      appToast.error(err instanceof Error ? err.message : "Falha ao mover card.");
      if (ctx?.previous) {
        queryClient.setQueryData(boardCardsQueryKey(boardId), ctx.previous);
      }
      const next = buildItemsMap(columns, cardsByColumn);
      itemsRef.current = next;
      setItems(next);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: boardCardsQueryKey(boardId) });
    },
  });

  useEffect(() => {
    if (
      shouldIgnoreRemoteCardsSync({
        isDragging: isDraggingRef.current,
        isMutating: moveMutation.isPending,
      })
    ) {
      return;
    }
    const next = buildItemsMap(columns, cardsByColumn);
    itemsRef.current = next;
    setItems(next);
    setExtraCards(new Map());
  }, [columns, cardsByColumn, moveMutation.isPending]);

  const cardById = useMemo(() => {
    const map = new Map<string, BoardCard>();
    for (const list of cardsByColumn.values()) {
      for (const card of list) map.set(card.id, card);
    }
    for (const card of extraCards.values()) map.set(card.id, card);
    return map;
  }, [cardsByColumn, extraCards]);

  const handleCardCreated = useCallback((cardId: string, title: string, columnId: string) => {
    if (itemsRef.current[columnId]?.includes(cardId)) return;

    const card = stubCard(cardId, title, columnId);
    setExtraCards((prev) => {
      if (prev.has(cardId)) return prev;
      return new Map(prev).set(cardId, card);
    });
    setItems((prev) => {
      const col = prev[columnId] ?? [];
      if (col.includes(cardId)) return prev;
      const next = { ...prev, [columnId]: [...col, cardId] };
      itemsRef.current = next;
      return next;
    });
    void queryClient.invalidateQueries({ queryKey: boardCardsQueryKey(boardId) });
  }, [boardId, queryClient]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  const activeCard = activeCardId ? (cardById.get(activeCardId) ?? null) : null;

  const handleDragStart = useCallback((event: DragStartEvent) => {
    isDraggingRef.current = true;
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
      isDraggingRef.current = false;
      setActiveCardId(null);
      if (!canEditBoard || moveMutation.isPending) return;

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

      moveMutation.mutate(fd);
    },
    [boardId, canEditBoard, cardById, columns, moveMutation],
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
              {lane.cards.map((card) => {
                  const progress = countChildrenProgress(allCards, card.id);
                  return (
                <div key={card.id} className="w-72">
                  <BoardCardTile
                    card={card}
                    columns={columns}
                    stagesById={stagesById}
                    tags={tags}
                    profilesById={profilesById}
                    tifluxEnabled={tifluxEnabled}
                    readOnlyTiflux={readOnlyTiflux}
                    subtasksProgress={progress.total > 0 ? progress : null}
                    onSelect={onSelectCard}
                    onOpenTifluxCreate={onOpenTifluxCreate}
                    onOpenTifluxLink={onOpenTifluxLink}
                  />
                </div>
                  );
                })}
            </div>
          </section>
        ))}
      </div>
    );
  }

  return (
    <>
      {moveMutation.isPending ? (
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
        isDraggingRef.current = false;
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
            allCards={allCards}
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
              subtasksProgress={(() => {
                const p = countChildrenProgress(allCards, activeCard.id);
                return p.total > 0 ? p : null;
              })()}
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
