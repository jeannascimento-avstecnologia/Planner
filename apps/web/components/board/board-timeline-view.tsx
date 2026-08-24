"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateCardFieldsAction } from "@/app/(app)/boards/[boardId]/card-actions";
import { KANBAN_DRAG_ACTIVATION_CONSTRAINT } from "@/lib/kanban-dnd";
import { applyCardFieldsPatchToList } from "@/lib/query/board-cards-cache";
import { boardCardsQueryKey } from "@/lib/query/board-cards-keys";
import {
  TIMELINE_MS_DAY,
  computeScheduleForWeekDrop,
  listTimelineWeeks,
  parseTimelineCardDragId,
  parseTimelineRange,
  parseTimelineWeekId,
  timelineCardDragId,
  timelineDayStart,
  timelineWeekId,
} from "@/lib/timeline-schedule";
import { formatWeekRangeLabel } from "@/lib/workload/week";
import { appToast } from "@/lib/toast";
import type { BoardCard } from "./types";

const RANGE_BEFORE = 14;
const RANGE_AFTER = 56;
const LABEL_COL_CLASS = "w-36 shrink-0";

type Props = {
  boardId: string;
  cards: BoardCard[];
  canEdit?: boolean;
  onSelectCard: (id: string) => void;
};

const timelineWeekCollision: CollisionDetection = (args) => {
  const weekContainers = args.droppableContainers.filter((c) =>
    String(c.id).startsWith("timeline-week-"),
  );
  return closestCenter({ ...args, droppableContainers: weekContainers });
};

function leftPct(ts: number, windowStart: number, span: number): number {
  return Math.max(0, ((ts - windowStart) / span) * 100);
}

function widthPct(start: number, end: number, windowStart: number, span: number): number {
  const w = ((end - start + TIMELINE_MS_DAY) / span) * 100;
  return Math.min(100 - leftPct(start, windowStart, span), Math.max(1.5, w));
}

function TimelineBacklogChip({
  card,
  canEdit,
  onSelect,
}: {
  card: BoardCard;
  canEdit: boolean;
  onSelect: (id: string) => void;
}) {
  const didDragRef = useRef(false);
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: timelineCardDragId(card.id),
    disabled: !canEdit,
    data: { cardId: card.id },
  });

  if (isDragging) didDragRef.current = true;

  return (
    <button
      ref={setNodeRef}
      type="button"
      {...(canEdit ? listeners : {})}
      {...(canEdit ? attributes : {})}
      onClick={() => {
        if (didDragRef.current) {
          didDragRef.current = false;
          return;
        }
        onSelect(card.id);
      }}
      className={`rounded-md border border-board-border bg-board-surface px-2 py-1 text-xs hover:border-board-accent ${
        canEdit ? "cursor-grab touch-none active:cursor-grabbing" : ""
      } ${isDragging ? "opacity-40" : ""}`}
      data-testid={`timeline-backlog-${card.id}`}
    >
      {card.title}
    </button>
  );
}

function TimelineWeekDropZone({
  weekMonday,
  canEdit,
}: {
  weekMonday: Date;
  canEdit: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: timelineWeekId(weekMonday),
    disabled: !canEdit,
  });

  return (
    <div
      ref={setNodeRef}
      className={`absolute inset-0 ${isOver ? "bg-board-accent/10 ring-1 ring-inset ring-board-accent/40" : ""}`}
      data-testid={timelineWeekId(weekMonday)}
      title={formatWeekRangeLabel(weekMonday)}
    />
  );
}

function TimelineBar({
  card,
  start,
  end,
  canEdit,
  windowStart,
  span,
  onSelect,
}: {
  card: BoardCard;
  start: number;
  end: number;
  canEdit: boolean;
  windowStart: number;
  span: number;
  onSelect: (id: string) => void;
}) {
  const didDragRef = useRef(false);
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: timelineCardDragId(card.id),
    disabled: !canEdit,
    data: { cardId: card.id },
  });

  if (isDragging) didDragRef.current = true;

  return (
    <button
      ref={setNodeRef}
      type="button"
      {...(canEdit ? listeners : {})}
      {...(canEdit ? attributes : {})}
      onClick={() => {
        if (didDragRef.current) {
          didDragRef.current = false;
          return;
        }
        onSelect(card.id);
      }}
      className={`absolute top-1 z-10 h-6 rounded bg-board-accent/85 px-1 text-[10px] text-white hover:bg-board-accent ${
        canEdit ? "cursor-grab touch-none active:cursor-grabbing" : ""
      } ${isDragging ? "opacity-30" : ""}`}
      style={{
        left: `${leftPct(start, windowStart, span)}%`,
        width: `${widthPct(start, end, windowStart, span)}%`,
      }}
      title={card.title}
      data-testid={`timeline-bar-${card.id}`}
    >
      <span className="block truncate">{card.title}</span>
    </button>
  );
}

export function BoardTimelineView({ boardId, cards, canEdit = false, onSelectCard }: Props) {
  const queryClient = useQueryClient();
  const [activeCardId, setActiveCardId] = useState<string | null>(null);

  const today = timelineDayStart(new Date());
  const windowStart = today - RANGE_BEFORE * TIMELINE_MS_DAY;
  const windowEnd = today + RANGE_AFTER * TIMELINE_MS_DAY;
  const span = windowEnd - windowStart;

  const cardsById = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards]);

  const { scheduled, unscheduled } = useMemo(() => {
    const scheduled: { card: BoardCard; start: number; end: number }[] = [];
    const unscheduled: BoardCard[] = [];
    for (const c of cards) {
      const r = parseTimelineRange(c);
      if (!r) {
        unscheduled.push(c);
        continue;
      }
      if (r.end < windowStart || r.start > windowEnd) continue;
      scheduled.push({ card: c, start: r.start, end: r.end });
    }
    scheduled.sort((a, b) => a.start - b.start);
    return { scheduled, unscheduled };
  }, [cards, windowStart, windowEnd]);

  const weeks = useMemo(() => listTimelineWeeks(windowStart, windowEnd), [windowStart, windowEnd]);

  const scheduleMutation = useMutation({
    mutationFn: async ({
      cardId,
      patch,
    }: {
      cardId: string;
      patch: { start_date: string; due_date: string };
    }) => {
      const result = await updateCardFieldsAction({ cardId, patch });
      if (!result.ok) throw new Error(result.error ?? "Falha ao salvar datas.");
      return result;
    },
    onMutate: async ({ cardId, patch }) => {
      const key = boardCardsQueryKey(boardId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<BoardCard[]>(key);
      if (previous) {
        queryClient.setQueryData(key, applyCardFieldsPatchToList(previous, cardId, patch));
      }
      return { previous };
    },
    onError: (err, _vars, ctx) => {
      appToast.error(err instanceof Error ? err.message : "Falha ao salvar datas.");
      if (ctx?.previous) {
        queryClient.setQueryData(boardCardsQueryKey(boardId), ctx.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: boardCardsQueryKey(boardId) });
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: KANBAN_DRAG_ACTIVATION_CONSTRAINT }),
    useSensor(TouchSensor, { activationConstraint: KANBAN_DRAG_ACTIVATION_CONSTRAINT }),
  );

  const activeCard = activeCardId ? (cardsById.get(activeCardId) ?? null) : null;

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const cardId = parseTimelineCardDragId(String(event.active.id));
    if (cardId) setActiveCardId(cardId);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveCardId(null);
      if (!canEdit || scheduleMutation.isPending) return;

      const cardId = parseTimelineCardDragId(String(event.active.id));
      const weekMonday = event.over ? parseTimelineWeekId(String(event.over.id)) : null;
      if (!cardId || !weekMonday) return;

      const card = cardsById.get(cardId);
      if (!card) return;

      const patch = computeScheduleForWeekDrop(card, weekMonday);
      const unchanged =
        card.start_date === patch.start_date && card.due_date === patch.due_date;
      if (unchanged) return;

      scheduleMutation.mutate({ cardId, patch });
    },
    [canEdit, cardsById, scheduleMutation],
  );

  const chartMinHeight = Math.max(scheduled.length, 1) * 2.5;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={timelineWeekCollision}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveCardId(null)}
    >
      <div className="space-y-4" data-testid="board-timeline-view">
        {unscheduled.length > 0 ? (
          <section className="rounded-xl border border-dashed border-board-border bg-board-surface/60 p-3">
            <h3 className="mb-2 text-xs font-semibold uppercase text-aurora-muted">Sem prazo</h3>
            {canEdit ? (
              <p className="mb-2 text-[11px] text-aurora-muted">
                Arraste para a timeline para definir o periodo da semana.
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              {unscheduled.map((c) => (
                <TimelineBacklogChip key={c.id} card={c} canEdit={canEdit} onSelect={onSelectCard} />
              ))}
            </div>
          </section>
        ) : null}

        <section className="overflow-x-auto rounded-xl border border-board-border bg-board-surface p-4">
          <div className="relative min-w-[720px]">
            <div className="mb-2 flex">
              <div className={LABEL_COL_CLASS} />
              <div className="flex min-w-0 flex-1 border-b border-board-border pb-2 text-[10px] text-aurora-muted">
                {weeks.map((w) => (
                  <div key={w.toISOString()} className="flex-1 text-center">
                    {w.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                  </div>
                ))}
              </div>
            </div>

            <div className="relative flex" style={{ minHeight: `${chartMinHeight}rem` }}>
              <div className={LABEL_COL_CLASS} />
              <div className="relative min-w-0 flex-1">
                {canEdit ? (
                  <div className="pointer-events-none absolute inset-0 flex">
                    {weeks.map((w) => (
                      <div
                        key={w.toISOString()}
                        className="relative min-w-0 flex-1 border-r border-board-border/30 last:border-r-0"
                      >
                        <div className="pointer-events-auto absolute inset-0">
                          <TimelineWeekDropZone weekMonday={w} canEdit={canEdit} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}

                <div
                  className="pointer-events-none absolute bottom-0 top-0 z-[1] w-0.5 bg-board-accent"
                  style={{ left: `${leftPct(today, windowStart, span)}%` }}
                  title="Hoje"
                />

                <ul className="relative z-[2] space-y-2">
                {scheduled.length === 0 ? (
                  <li className={`flex ${canEdit ? "h-10" : ""} items-center`}>
                    <span className={`${LABEL_COL_CLASS} pr-2 text-sm text-aurora-muted`}>
                      {canEdit
                        ? "Arraste cards do backlog para agendar."
                        : "Nenhum card com datas na janela."}
                    </span>
                  </li>
                ) : (
                  scheduled.map(({ card, start, end }) => (
                    <li key={card.id} className="relative flex h-8 items-center">
                      <span className={`${LABEL_COL_CLASS} truncate pr-2 text-xs text-aurora-fg`}>
                        {card.title}
                      </span>
                      <div className="relative h-full min-w-0 flex-1">
                        <TimelineBar
                          card={card}
                          start={start}
                          end={end}
                          canEdit={canEdit}
                          windowStart={windowStart}
                          span={span}
                          onSelect={onSelectCard}
                        />
                      </div>
                    </li>
                  ))
                )}
                </ul>
              </div>
            </div>
          </div>
        </section>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeCard ? (
          <div className="max-w-xs rounded-md border border-board-accent bg-board-surface px-2 py-1 text-xs shadow-lg">
            {activeCard.title}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
