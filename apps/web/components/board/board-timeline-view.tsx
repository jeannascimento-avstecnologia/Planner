"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateCardFieldsAction } from "@/app/(app)/boards/[boardId]/card-actions";
import { KANBAN_DRAG_ACTIVATION_CONSTRAINT } from "@/lib/kanban-dnd";
import { applyCardFieldsPatchToList } from "@/lib/query/board-cards-cache";
import { boardCardsQueryKey } from "@/lib/query/board-cards-keys";
import { useClientSearchParamState } from "@/lib/client-url-state";
import { appToast } from "@/lib/toast";
import {
  TIMELINE_CANVAS_DROPPABLE_ID,
  computeScheduleFromRange,
  isTimelineUnscheduled,
  parseTimelineCardDragId,
  parseTimelineRange,
  parseTimelineResizeDragId,
  parseTimelineYmd,
  resizeTimelineRange,
  shiftTimelineRange,
  timelineCardDragId,
  type TimelineDatePatch,
  type TimelineRange,
} from "@/lib/timeline-schedule";
import {
  TIMELINE_LABEL_COL_PX,
  TIMELINE_LANE_HEADER_PX,
  TIMELINE_MONTH_BAND_PX,
  TIMELINE_SCALE,
  TIMELINE_TICK_HEADER_PX,
  TIMELINE_ZOOMS,
  barRectForRange,
  computeTimelineWindow,
  listTimelineMonthBands,
  listTimelineTicks,
  parseTimelineZoom,
  projectTimelineDay,
  timelineCanvasWidth,
  timelineDeltaXToDays,
  timelineTodayYmd,
  timelineXToYmd,
  timelineZoomParam,
  type TimelineZoom,
} from "@/lib/timeline-scale";
import {
  deriveTimelineLanes,
  layoutTimelineRows,
  parseTimelineGroupBy,
  timelineGroupParam,
  type TimelineGroupBy,
} from "@/lib/timeline-grouping";
import { buildTimelineDependencyPaths } from "@/lib/timeline-dependencies";
import {
  displayStageName,
  memberLabel,
  resolveCardStage,
  STAGE_NONE_LABEL,
  type BoardCard,
  type CardDependencyRow,
  type ColumnRow,
  type ProfileRow,
  type StageRow,
  type TagRow,
} from "./types";
import { TimelinePersonAvatar, TimelineRow, TIMELINE_STAGE_FALLBACK } from "./timeline-row";
import { TimelinePeriodModal } from "./timeline-period-modal";
import { TimelineDependencyLayer } from "./timeline-dependency-layer";

const ZOOM_LABELS: Record<TimelineZoom, string> = {
  day: "Dia",
  week: "Semana",
  month: "Mes",
  quarter: "Trimestre",
};

const GROUP_LABELS: Record<TimelineGroupBy, string> = {
  none: "Nenhum",
  column: "Coluna",
  assignee: "Responsavel",
  tag: "Marcador",
  stage: "Estagio",
};

const GROUP_TOOLBAR_ORDER: TimelineGroupBy[] = [
  "column",
  "assignee",
  "tag",
  "stage",
  "none",
];

const SEGMENT_WRAP = "inline-flex flex-wrap rounded-lg bg-board-surface-2 p-0.5";
const SEGMENT_BTN_IDLE = "rounded-md px-2 py-1 text-xs font-medium text-aurora-muted";
const SEGMENT_BTN_ACTIVE =
  "rounded-md bg-board-accent px-2 py-1 text-xs font-semibold text-[#0e1017]";

function laneAccentColor(
  groupBy: TimelineGroupBy,
  laneKey: string,
  columns: ColumnRow[],
  stagesById: Map<string, StageRow>,
  tags: TagRow[],
): string {
  if (laneKey === "none") return TIMELINE_STAGE_FALLBACK;
  if (groupBy === "stage") return stagesById.get(laneKey)?.color ?? TIMELINE_STAGE_FALLBACK;
  if (groupBy === "column") {
    const col = columns.find((c) => c.id === laneKey);
    const stageId = col?.default_stage_id;
    return (stageId ? stagesById.get(stageId)?.color : undefined) ?? TIMELINE_STAGE_FALLBACK;
  }
  if (groupBy === "tag") {
    const first = laneKey.split("|")[0] ?? "";
    return tags.find((t) => t.id === first)?.color ?? TIMELINE_STAGE_FALLBACK;
  }
  return TIMELINE_STAGE_FALLBACK;
}

function segmentClass(active: boolean): string {
  return active ? SEGMENT_BTN_ACTIVE : SEGMENT_BTN_IDLE;
}

type PeriodDraft = {
  cardId: string;
  startYmd: string;
  endYmd: string;
};

type Props = {
  boardId: string;
  cards: BoardCard[];
  columns: ColumnRow[];
  members: ProfileRow[];
  tags: TagRow[];
  stagesById: Map<string, StageRow>;
  profilesById: Record<string, ProfileRow>;
  dependencies?: CardDependencyRow[];
  canEdit?: boolean;
  onSelectCard: (id: string) => void;
};

const timelineCanvasCollision: CollisionDetection = (args) =>
  pointerWithin(args).filter((c) => c.id === TIMELINE_CANVAS_DROPPABLE_ID);

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
    data: { cardId: card.id, kind: "chip" as const },
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

function TimelineCanvasDrop({
  canEdit,
  width,
  height,
  isActive,
  children,
}: {
  canEdit: boolean;
  width: number;
  height: number;
  isActive: boolean;
  children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: TIMELINE_CANVAS_DROPPABLE_ID,
    disabled: !canEdit,
  });
  return (
    <div
      ref={setNodeRef}
      data-testid="timeline-canvas"
      className={`absolute top-0 z-0 ${isOver || isActive ? "bg-board-accent/5" : ""}`}
      style={{ left: TIMELINE_LABEL_COL_PX, width, height }}
    >
      {children}
    </div>
  );
}

export function BoardTimelineView({
  boardId,
  cards,
  columns,
  members,
  tags,
  stagesById,
  profilesById,
  dependencies = [],
  canEdit = false,
  onSelectCard,
}: Props) {
  const queryClient = useQueryClient();
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [periodDraft, setPeriodDraft] = useState<PeriodDraft | null>(null);
  const [resizePreview, setResizePreview] = useState<{
    cardId: string;
    range: TimelineRange;
  } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [zoom, setZoom] = useClientSearchParamState(
    "timelineZoom",
    parseTimelineZoom,
    timelineZoomParam,
  );
  const [groupBy, setGroupBy] = useClientSearchParamState(
    "timelineGroup",
    parseTimelineGroupBy,
    timelineGroupParam,
  );

  const todayYmd = timelineTodayYmd();
  const cardsById = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards]);

  const { scheduled, unscheduled } = useMemo(() => {
    const scheduledCards: BoardCard[] = [];
    const unscheduledCards: BoardCard[] = [];
    for (const card of cards) {
      if (isTimelineUnscheduled(card)) unscheduledCards.push(card);
      else scheduledCards.push(card);
    }
    scheduledCards.sort((a, b) => {
      const ra = parseTimelineRange(a);
      const rb = parseTimelineRange(b);
      return (ra?.startDay ?? 0) - (rb?.startDay ?? 0);
    });
    return { scheduled: scheduledCards, unscheduled: unscheduledCards };
  }, [cards]);

  const ranges = useMemo(() => {
    const list: TimelineRange[] = [];
    for (const card of scheduled) {
      const r = parseTimelineRange(card);
      if (r) list.push(r);
    }
    return list;
  }, [scheduled]);

  const window = useMemo(() => computeTimelineWindow(ranges, todayYmd), [ranges, todayYmd]);
  const canvasWidth = timelineCanvasWidth(window, zoom);
  const ticks = useMemo(() => listTimelineTicks(window, zoom), [window, zoom]);
  const monthBands = useMemo(
    () => (zoom === "day" || zoom === "week" ? listTimelineMonthBands(window) : []),
    [window, zoom],
  );
  const tickHeaderPx =
    monthBands.length > 0 ? TIMELINE_TICK_HEADER_PX + TIMELINE_MONTH_BAND_PX : TIMELINE_TICK_HEADER_PX;
  const pxPerDay = TIMELINE_SCALE[zoom].pxPerDay;
  const todayDay = parseTimelineYmd(todayYmd);
  const todayLineX = todayDay === null ? 0 : projectTimelineDay(todayDay, window, zoom);

  const groupingCtx = useMemo(
    () => ({ columns, members, tags, stagesById }),
    [columns, members, tags, stagesById],
  );

  const lanes = useMemo(
    () => deriveTimelineLanes(scheduled, groupBy, groupingCtx),
    [scheduled, groupBy, groupingCtx],
  );
  const laidOut = useMemo(() => layoutTimelineRows(lanes, groupBy), [lanes, groupBy]);

  const rangeByCardId = useMemo(() => {
    const map = new Map<string, TimelineRange>();
    for (const card of scheduled) {
      const r = parseTimelineRange(card);
      if (r) map.set(card.id, r);
    }
    if (resizePreview) map.set(resizePreview.cardId, resizePreview.range);
    return map;
  }, [scheduled, resizePreview]);

  const barRects = useMemo(() => {
    const map = new Map<
      string,
      { cardId: string; x: number; y: number; width: number; height: number }
    >();
    for (const row of laidOut.rows) {
      const range = rangeByCardId.get(row.card.id);
      if (!range) continue;
      const rect = barRectForRange(range, window, zoom, row.y);
      map.set(row.card.id, { cardId: row.card.id, ...rect });
    }
    return map;
  }, [laidOut.rows, rangeByCardId, window, zoom]);

  const depPaths = useMemo(
    () => buildTimelineDependencyPaths(dependencies, barRects),
    [dependencies, barRects],
  );

  const scheduleMutation = useMutation({
    mutationFn: async ({
      cardId,
      patch,
    }: {
      cardId: string;
      patch: TimelineDatePatch;
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

  const persistPatch = useCallback(
    (cardId: string, patch: TimelineDatePatch) => {
      const card = cardsById.get(cardId);
      if (!card) return Promise.resolve();
      if (card.start_date === patch.start_date && card.due_date === patch.due_date) {
        return Promise.resolve();
      }
      return scheduleMutation.mutateAsync({ cardId, patch });
    },
    [cardsById, scheduleMutation],
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const cardId =
      parseTimelineCardDragId(String(event.active.id)) ??
      parseTimelineResizeDragId(String(event.active.id))?.cardId ??
      null;
    if (cardId) setActiveCardId(cardId);
  }, []);

  const handleDragMove = useCallback(
    (event: DragMoveEvent) => {
      const resize = parseTimelineResizeDragId(String(event.active.id));
      if (!resize) return;
      const card = cardsById.get(resize.cardId);
      if (!card) return;
      const range = parseTimelineRange(card);
      if (!range) return;
      const days = timelineDeltaXToDays(event.delta.x, zoom);
      setResizePreview({
        cardId: resize.cardId,
        range: resizeTimelineRange(range, resize.edge, days),
      });
    },
    [cardsById, zoom],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveCardId(null);
      const resize = parseTimelineResizeDragId(String(event.active.id));
      if (resize) {
        const preview = resizePreview;
        setResizePreview(null);
        if (!canEdit || scheduleMutation.isPending) return;
        const range = preview?.cardId === resize.cardId ? preview.range : null;
        if (!range) return;
        const result = computeScheduleFromRange(range.startYmd, range.endYmd);
        if (!result.ok) return;
        persistPatch(resize.cardId, result.patch);
        return;
      }

      setResizePreview(null);
      if (!canEdit || scheduleMutation.isPending) return;
      const cardId = parseTimelineCardDragId(String(event.active.id));
      if (!cardId || String(event.over?.id) !== TIMELINE_CANVAS_DROPPABLE_ID) return;
      const card = cardsById.get(cardId);
      if (!card) return;

      const existing = parseTimelineRange(card);
      if (existing) {
        const days = timelineDeltaXToDays(event.delta.x, zoom);
        const shifted = shiftTimelineRange(existing, days);
        setPeriodDraft({
          cardId,
          startYmd: shifted.startYmd,
          endYmd: shifted.endYmd,
        });
        return;
      }

      const overRect = event.over?.rect;
      const translated = event.active.rect.current.translated;
      if (!overRect || !translated) return;
      const x = translated.left + translated.width / 2 - overRect.left;
      const dropYmd = timelineXToYmd(x, window, zoom);
      setPeriodDraft({ cardId, startYmd: dropYmd, endYmd: dropYmd });
    },
    [
      canEdit,
      cardsById,
      persistPatch,
      resizePreview,
      scheduleMutation.isPending,
      window,
      zoom,
    ],
  );

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || todayDay === null) return;
    const todayX = projectTimelineDay(todayDay, window, zoom);
    el.scrollLeft = Math.max(0, todayX + TIMELINE_LABEL_COL_PX - 120);
  }, [zoom, window, todayDay]);

  const activeCard = activeCardId ? (cardsById.get(activeCardId) ?? null) : null;
  const draftCard = periodDraft ? (cardsById.get(periodDraft.cardId) ?? null) : null;
  const showHeaders = groupBy !== "none";

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={timelineCanvasCollision}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onDragCancel={() => {
        setActiveCardId(null);
        setResizePreview(null);
      }}
    >
      <div className="space-y-3" data-testid="board-timeline-view">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-aurora-muted">Agrupar por</span>
            <div
              role="radiogroup"
              aria-label="Agrupar timeline"
              className={SEGMENT_WRAP}
              data-testid="timeline-group-by"
            >
              {GROUP_TOOLBAR_ORDER.map((g) => (
                <button
                  key={g}
                  type="button"
                  role="radio"
                  aria-checked={groupBy === g}
                  data-testid={`timeline-group-${g}`}
                  onClick={() => setGroupBy(g)}
                  className={segmentClass(groupBy === g)}
                >
                  {GROUP_LABELS[g]}
                </button>
              ))}
            </div>
          </div>
          <div
            role="radiogroup"
            aria-label="Zoom da timeline"
            className={SEGMENT_WRAP}
            data-testid="timeline-zoom"
          >
            {TIMELINE_ZOOMS.map((z) => (
              <button
                key={z}
                type="button"
                role="radio"
                aria-checked={zoom === z}
                data-testid={`timeline-zoom-${z}`}
                onClick={() => setZoom(z)}
                className={segmentClass(zoom === z)}
              >
                {ZOOM_LABELS[z]}
              </button>
            ))}
          </div>
        </div>

        {unscheduled.length > 0 ? (
          <section className="rounded-xl border border-dashed border-board-border bg-board-surface/60 p-3">
            <h3 className="mb-2 text-xs font-semibold uppercase text-aurora-muted">Sem prazo</h3>
            {canEdit ? (
              <p className="mb-2 text-[11px] text-aurora-muted">
                Arraste para a timeline e confirme o periodo (inicio e fim).
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              {unscheduled.map((c) => (
                <TimelineBacklogChip key={c.id} card={c} canEdit={canEdit} onSelect={onSelectCard} />
              ))}
            </div>
          </section>
        ) : null}

        <section className="overflow-hidden rounded-xl border border-board-border bg-board-surface">
          <div ref={scrollRef} className="overflow-x-auto" data-testid="timeline-scroll">
            <div style={{ minWidth: TIMELINE_LABEL_COL_PX + canvasWidth }}>
              <div
                className="flex border-b border-board-border"
                style={{ height: tickHeaderPx }}
              >
                <div
                  className="sticky left-0 z-20 shrink-0 border-r border-board-border bg-board-surface"
                  style={{ width: TIMELINE_LABEL_COL_PX }}
                />
                <div className="relative" style={{ width: canvasWidth, height: tickHeaderPx }}>
                  {monthBands.map((band, i) => {
                    const left = projectTimelineDay(band.day, window, zoom);
                    const next = monthBands[i + 1];
                    const slot =
                      next != null
                        ? projectTimelineDay(next.day, window, zoom) - left
                        : canvasWidth - left;
                    return (
                      <div
                        key={`band-${band.ymd}`}
                        className="absolute top-0 overflow-hidden border-l border-board-border/40 text-[10px] font-medium uppercase tracking-wide text-aurora-muted"
                        style={{ left, width: Math.max(slot, 48), height: TIMELINE_MONTH_BAND_PX }}
                      >
                        <span className="block truncate pl-1 pt-0.5">{band.label}</span>
                      </div>
                    );
                  })}
                  {ticks.map((tick, i) => {
                    const left = projectTimelineDay(tick.day, window, zoom);
                    const next = ticks[i + 1];
                    const slot =
                      next != null
                        ? projectTimelineDay(next.day, window, zoom) - left
                        : canvasWidth - left;
                    const top = monthBands.length > 0 ? TIMELINE_MONTH_BAND_PX : 0;
                    return (
                    <div
                      key={tick.ymd}
                      className="absolute overflow-hidden whitespace-nowrap text-[10px] leading-4 text-aurora-muted"
                      style={{
                        left,
                        top,
                        width: Math.max(slot, pxPerDay),
                        height: TIMELINE_TICK_HEADER_PX,
                      }}
                      data-testid={`timeline-tick-${tick.ymd}`}
                    >
                      <span className="block truncate border-l border-board-border/50 pl-1 pt-1">
                        {tick.label}
                      </span>
                    </div>
                    );
                  })}
                  {todayDay !== null ? (
                    <span
                      className="pointer-events-none absolute z-[4] -translate-x-1/2 rounded-sm bg-board-accent px-1 py-px text-[9px] font-semibold tracking-wide text-[#0e1017]"
                      style={{ left: todayLineX, top: 1 }}
                      data-testid="timeline-today-flag"
                    >
                      HOJE ·{" "}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="relative" style={{ height: laidOut.height }}>
                <TimelineCanvasDrop
                  canEdit={canEdit}
                  width={canvasWidth}
                  height={laidOut.height}
                  isActive={Boolean(activeCardId)}
                >
                  <div
                    className="pointer-events-none absolute bottom-0 top-0 z-[1] w-0.5 bg-board-accent"
                    style={{ left: todayLineX }}
                    title="Hoje"
                    data-testid="timeline-today"
                  />
                  {ticks.map((tick) => (
                    <div
                      key={`grid-${tick.ymd}`}
                      className="pointer-events-none absolute bottom-0 top-0 border-l border-board-border/20"
                      style={{ left: projectTimelineDay(tick.day, window, zoom) }}
                    />
                  ))}
                  <TimelineDependencyLayer
                    width={canvasWidth}
                    height={laidOut.height}
                    paths={depPaths}
                  />
                </TimelineCanvasDrop>

                {lanes.map((lane) => (
                  <div key={lane.key}>
                    {showHeaders ? (
                      <div
                        className="flex items-center border-b border-board-border/60 bg-board-surface-2 px-2 text-[11px] font-medium text-aurora-fg"
                        style={{ height: TIMELINE_LANE_HEADER_PX }}
                        data-testid={`timeline-lane-${lane.key}`}
                        data-lane-count={lane.cards.length}
                      >
                        <span className="sticky left-0 z-[1] flex items-center gap-2 bg-board-surface-2 pr-2">
                          {groupBy === "assignee" ? (
                            <TimelinePersonAvatar
                              id={lane.key === "none" ? null : lane.key}
                              label={lane.label}
                            />
                          ) : (
                            <span
                              className="h-2.5 w-2.5 shrink-0 rounded-sm"
                              style={{
                                backgroundColor: laneAccentColor(
                                  groupBy,
                                  lane.key,
                                  columns,
                                  stagesById,
                                  tags,
                                ),
                              }}
                              aria-hidden
                            />
                          )}
                          {lane.label}
                          <span className="text-aurora-muted/70">({lane.cards.length})</span>
                        </span>
                      </div>
                    ) : null}
                    {lane.cards.map((card) => {
                      const rect = barRects.get(card.id);
                      const stage = resolveCardStage(card, columns, stagesById);
                      const stageColor = stage?.color ?? TIMELINE_STAGE_FALLBACK;
                      return (
                        <TimelineRow
                          key={card.id}
                          card={card}
                          stageLabel={stage ? displayStageName(stage.name) : STAGE_NONE_LABEL}
                          stageColor={stageColor}
                          assigneeLabel={
                            card.assignee_id
                              ? memberLabel(profilesById[card.assignee_id])
                              : "Sem responsavel"
                          }
                          labelWidth={TIMELINE_LABEL_COL_PX}
                          canvasWidth={canvasWidth}
                          barX={rect?.x ?? 0}
                          barWidth={rect?.width ?? pxPerDay}
                          barColor={stageColor}
                          canEdit={canEdit}
                          onSelect={onSelectCard}
                        />
                      );
                    })}
                  </div>
                ))}

                {laidOut.rows.length === 0 ? (
                  <p className="px-3 py-6 text-sm text-aurora-muted">
                    {canEdit
                      ? "Arraste cards do backlog para agendar."
                      : "Nenhum card com datas na janela."}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      </div>

      <TimelinePeriodModal
        open={Boolean(periodDraft)}
        cardTitle={draftCard?.title ?? ""}
        initialStartYmd={periodDraft?.startYmd ?? ""}
        initialEndYmd={periodDraft?.endYmd ?? ""}
        pending={scheduleMutation.isPending}
        onCancel={() => setPeriodDraft(null)}
        onSave={(startYmd, endYmd) => {
          if (!periodDraft) return;
          const result = computeScheduleFromRange(startYmd, endYmd);
          if (!result.ok) return;
          void persistPatch(periodDraft.cardId, result.patch).then(
            () => setPeriodDraft(null),
            () => undefined,
          );
        }}
      />

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
