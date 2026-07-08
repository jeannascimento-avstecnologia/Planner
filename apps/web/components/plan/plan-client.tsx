"use client";

import { Fragment, memo, useCallback, useEffect, useMemo, useRef, useState, useTransition, type ReactNode, type RefObject } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { GripVertical, X } from "lucide-react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  pointerWithin,
  rectIntersection,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type Over,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  addCardToPersonalPlanAction,
  clearCardFromPlanAction,
  moveAllocationAction,
  scheduleCardToDayAction,
  upsertAllocationAction,
} from "@/app/(app)/plan/actions";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { appToast } from "@/lib/toast";
import { PlanToolbar } from "@/components/plan/plan-toolbar";
import { PlanSidebar } from "@/components/plan/plan-sidebar";
import { classifyPlanSidebarBucket } from "@/lib/plan/classify-sidebar";
import { applySearchParamUpdates, replaceClientUrl, useClientSearchParamState } from "@/lib/client-url-state";
import { defaultPlanWindowStart, formatDateIso, isTodayIso, isWeekendIso } from "@/lib/plan/window";
import { normalizeWorkDateIso } from "@/lib/workload/work-date";
import {
  dataPanelClass,
  dataPanelEnterClass,
  dropTargetOverClass,
  planCellDropTargetClass,
  planColumnDropTargetClass,
  planDragOverlayCardClass,
  planDragOverlayClass,
  planGridDraggingClass,
  planGridSidebarDragClass,
  planRowDropTargetClass,
  planRowDraggingClass,
  planTodayColumnClass,
  planTodayColumnHeaderClass,
  planTargetDeliveryCellClass,
  planFinalDueCellClass,
  planPastDueCellClass,
  tableStickyCellClass,
  tableStickyHeadClass,
} from "@/lib/ui-classes";
import { formatDue } from "@/components/board/types";
import type { PlanGridData, PlanGridRow, PlanOrgSection, PlanSidebarCard } from "@/lib/plan/types";
import { OrgLogo } from "@/components/organizations/OrgLogo";
import {
  planAllocationLockKey,
  planRemoveLockKey,
  planScheduleLockKey,
  withInFlightLock,
} from "@/lib/plan/allocation-lock";
import { UTILIZATION_BAR_CLASS, UTILIZATION_TEXT_CLASS, utilizationLevel } from "@/lib/workload/utilization";
import {
  appendCardToBoardOrder,
  buildInitialRowOrderByBoard,
  findBoardIdForCard,
  reorderPlanRowsInBoard,
  resortBoardOrderBySchedule,
} from "@/lib/plan/sort-rows";

type OrgCalendarProps = {
  orgId: string;
  orgName: string;
  orgLogoUrl: string | null;
  initialData: PlanGridData;
  boardFilter: string;
  showWeekends: boolean;
  showOrgHeader?: boolean;
  sidebarTestId?: string;
};

function rowToSidebarCard(row: PlanGridRow, todayIso: string): PlanSidebarCard {
  const bucket =
    classifyPlanSidebarBucket(
      {
        estimated_hours: row.estimatedHours,
        target_date: row.targetDate,
        start_date: row.startDate,
        due_date: row.dueDate,
      },
      false,
      todayIso,
    ) ?? "unscheduled";
  return {
    cardId: row.cardId,
    boardId: row.boardId,
    boardName: row.boardName,
    title: row.title,
    description: row.description,
    estimatedHours: row.estimatedHours,
    startDate: row.startDate,
    targetDate: row.targetDate,
    dueDate: row.dueDate,
    bucket,
  };
}

function recalcDaysFromRows(days: PlanGridData["days"], rows: PlanGridRow[]): PlanGridData["days"] {
  const dayTotals: Record<string, number> = {};
  for (const d of days) {
    dayTotals[d.date] = rows.reduce((s, r) => s + (r.cells[d.date] ?? 0), 0);
  }
  return days.map((d) => ({
    ...d,
    allocatedHours: dayTotals[d.date] ?? 0,
    utilizationPct: d.capacityHours > 0 ? Math.round((dayTotals[d.date] / d.capacityHours) * 100) : 0,
  }));
}

const planCollisionDetection: CollisionDetection = (args) => {
  const activeType = args.active.data.current?.type as string | undefined;
  const pointerHits = pointerWithin(args);
  const dayOrCell = pointerHits.filter((c) => {
    const t = c.data?.current?.type as string | undefined;
    return t === "day" || t === "cell";
  });
  if (dayOrCell.length > 0) return dayOrCell;

  if (activeType === "plan-row") {
    const rowHits = closestCenter({
      ...args,
      droppableContainers: args.droppableContainers.filter(
        (c) => c.data.current?.type === "plan-row",
      ),
    });
    if (rowHits.length > 0) return rowHits;
  }

  if (pointerHits.length > 0) return pointerHits;
  return rectIntersection(args);
};

function resolveTargetDateFromOver(over: Over | null): string | null {
  if (!over) return null;
  const overData = over.data.current;
  if (overData?.type === "day" || overData?.type === "cell") {
    return overData.date as string;
  }
  return null;
}

function pointerEndX(event: DragEndEvent): number | null {
  const start = event.activatorEvent;
  if (!(start instanceof MouseEvent) && !(start instanceof PointerEvent)) return null;
  return start.clientX + event.delta.x;
}

function pointerEndY(event: DragEndEvent): number | null {
  const start = event.activatorEvent;
  if (!(start instanceof MouseEvent) && !(start instanceof PointerEvent)) return null;
  return start.clientY + event.delta.y;
}

function isPointerInsideGrid(event: DragEndEvent, grid: HTMLElement | null): boolean {
  const x = pointerEndX(event);
  const y = pointerEndY(event);
  if (x == null || y == null || !grid) return false;
  const rect = grid.getBoundingClientRect();
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

function isDropOnPlanSurface(over: Over | null): boolean {
  if (!over) return false;
  const type = over.data.current?.type as string | undefined;
  return type === "plan-grid" || type === "day" || type === "cell";
}

function resolveDayFromClientX(clientX: number, gridRoot: HTMLElement | null): string | null {
  if (!gridRoot) return null;
  const seen = new Set<string>();
  const cols: HTMLElement[] = [];
  for (const el of gridRoot.querySelectorAll<HTMLElement>("[data-plan-day-col]")) {
    const date = el.dataset.planDayCol;
    if (!date || seen.has(date)) continue;
    seen.add(date);
    cols.push(el);
  }
  for (const el of cols) {
    const date = el.dataset.planDayCol;
    if (!date) continue;
    const { left, right } = el.getBoundingClientRect();
    if (clientX >= left && clientX <= right) return date;
  }
  let nearest: { date: string; dist: number } | null = null;
  for (const el of cols) {
    const date = el.dataset.planDayCol;
    if (!date) continue;
    const { left, right } = el.getBoundingClientRect();
    const mid = (left + right) / 2;
    const dist = Math.abs(clientX - mid);
    if (!nearest || dist < nearest.dist) nearest = { date, dist };
  }
  return nearest?.date ?? null;
}

type PlanActiveDrag = {
  cardId: string;
  title: string;
  boardName?: string;
  source: "sidebar" | "row";
  hoursLabel?: string;
};

function formatPlanDropDayLabel(dateIso: string): string {
  const dt = new Date(`${dateIso}T12:00:00`);
  return dt.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" });
}

function PlanDragOverlayPreview({ drag }: { drag: PlanActiveDrag }) {
  return (
    <div className={`${planDragOverlayClass} ${planDragOverlayCardClass}`} data-testid="plan-drag-overlay">
      <div className="flex items-start gap-2.5 px-3 py-2.5">
        <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-aurora-brand" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-snug text-aurora-fg">{drag.title}</p>
          {drag.boardName ? (
            <p className="truncate text-xs text-aurora-muted">{drag.boardName}</p>
          ) : null}
          <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-aurora-brand">
            {drag.source === "sidebar" ? "Agendar no plano" : "Mover entrega"}
          </p>
        </div>
        {drag.hoursLabel ? (
          <span className="shrink-0 rounded-full bg-aurora-brand-muted px-2 py-0.5 text-xs font-semibold tabular-nums text-aurora-brand">
            {drag.hoursLabel}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function dayDropZoneClassName({
  base,
  isToday,
  tag,
  highlightDay,
  date,
  isOver,
}: {
  base: string;
  isToday: boolean;
  tag: "td" | "th";
  highlightDay?: string | null;
  date: string;
  isOver: boolean;
}): string {
  const todayClass = isToday ? (tag === "th" ? planTodayColumnHeaderClass : planTodayColumnClass) : "";
  const columnClass = highlightDay === date ? planColumnDropTargetClass : "";
  const overClass = isOver ? dropTargetOverClass : "";
  return `${base} transition-colors duration-[var(--motion-duration-fast)] ${todayClass} ${columnClass} ${overClass}`.trim();
}

function planDueCellFlags(
  date: string,
  dueDateIso: string | null,
): { isFinalDue: boolean; isPastFinalDue: boolean } {
  if (!dueDateIso) return { isFinalDue: false, isPastFinalDue: false };
  if (date === dueDateIso) return { isFinalDue: true, isPastFinalDue: false };
  return { isFinalDue: false, isPastFinalDue: date > dueDateIso };
}

function DayDropCell({
  date,
  cardId,
  hours,
  canEdit,
  isToday,
  isTargetDelivery,
  isFinalDue,
  isPastFinalDue,
  highlightDay,
  onCommit,
}: {
  date: string;
  cardId: string;
  hours: number;
  canEdit: boolean;
  isToday?: boolean;
  isTargetDelivery?: boolean;
  isFinalDue?: boolean;
  isPastFinalDue?: boolean;
  highlightDay?: string | null;
  onCommit: (hours: number) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `cell-${cardId}-${date}`,
    data: { type: "cell", cardId, date },
    disabled: !canEdit,
  });

  const isColumnTarget = highlightDay === date;
  const isCellTarget = isOver;

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(hours || ""));
  const skipBlurCommitRef = useRef(false);

  function commit() {
    const val = parseFloat(draft.replace(",", "."));
    if (Number.isNaN(val) || val < 0 || val > 24) {
      appToast.error("Horas invalidas (0–24).");
      setDraft(String(hours || ""));
      setEditing(false);
      return;
    }
    if (val === hours) {
      setEditing(false);
      return;
    }
    onCommit(val);
    setEditing(false);
  }

  return (
    <td
      ref={setNodeRef}
      data-plan-day-col={date}
      data-plan-today={isToday ? "true" : undefined}
      className={`border-l border-aurora-border/60 px-1 py-1 text-center transition-all duration-[var(--motion-duration-fast)] ${
        isToday ? planTodayColumnClass : ""
      } ${isPastFinalDue ? planPastDueCellClass : ""} ${isFinalDue ? planFinalDueCellClass : ""} ${
        isTargetDelivery ? planTargetDeliveryCellClass : ""
      } ${isColumnTarget ? planColumnDropTargetClass : ""} ${isCellTarget ? planCellDropTargetClass : ""}`}
      data-testid={
        isFinalDue
          ? `plan-cell-final-due-${cardId}`
          : isTargetDelivery
            ? `plan-cell-target-delivery-${cardId}`
            : isToday
              ? `plan-cell-today-${cardId}`
              : `plan-cell-${cardId}-${date}`
      }
      aria-label={
        isFinalDue
          ? `Prazo final em ${date}`
          : isTargetDelivery
            ? `Entrega estimada em ${date}`
            : undefined
      }
    >
      {canEdit && editing ? (
        <input
          type="number"
          min={0}
          max={24}
          step={0.5}
          value={draft}
          autoFocus
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            if (skipBlurCommitRef.current) {
              skipBlurCommitRef.current = false;
              return;
            }
            commit();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              skipBlurCommitRef.current = true;
              commit();
            }
            if (e.key === "Escape") {
              setDraft(String(hours || ""));
              setEditing(false);
            }
          }}
          className="w-12 rounded border border-aurora-border bg-aurora-surface px-1 text-center text-xs"
        />
      ) : (
        <button
          type="button"
          disabled={!canEdit}
          onClick={() => {
            if (!canEdit) return;
            setDraft(hours ? String(hours) : "");
            setEditing(true);
          }}
          className={`min-w-[2rem] rounded px-1 text-xs transition-colors duration-[var(--motion-duration-fast)] ${
            canEdit ? "hover:bg-aurora-brand-muted/40" : "cursor-default"
          } ${hours > 0 ? "font-semibold text-aurora-brand" : "text-aurora-muted"}`}
        >
          {hours > 0 ? `${hours}h` : "–"}
        </button>
      )}
    </td>
  );
}

const SortablePlanRow = memo(function SortablePlanRow({
  row,
  dayKeys,
  canEdit,
  highlightDay,
  onCellCommit,
  onRemove,
}: {
  row: PlanGridRow;
  dayKeys: string[];
  canEdit: boolean;
  highlightDay?: string | null;
  onCellCommit: (cardId: string, date: string, hours: number) => void;
  onRemove?: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({
    id: row.cardId,
    data: { type: "plan-row", cardId: row.cardId, boardId: row.boardId },
    disabled: !canEdit,
  });

  const targetDateIso = row.targetDate ? normalizeWorkDateIso(row.targetDate) : null;
  const dueDateIso = row.dueDate ? normalizeWorkDateIso(row.dueDate) : null;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`${planRowDraggingClass} aurora-row-hover border-t border-aurora-border/60 ${
        isOver && !isDragging ? planRowDropTargetClass : ""
      }`}
      data-plan-dragging={isDragging ? "true" : undefined}
      data-plan-drop-target={isOver && !isDragging ? "true" : undefined}
      data-testid={`plan-row-${row.cardId}`}
    >
      <td className={`sticky left-0 z-10 min-w-[180px] px-2 py-2 ${tableStickyCellClass}`}>
        <div className="relative flex items-start gap-1">
          {canEdit && (
            <button
              type="button"
              ref={setActivatorNodeRef}
              className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-aurora-muted transition-colors hover:bg-aurora-brand-muted/50 hover:text-aurora-brand active:cursor-grabbing"
              aria-label="Arrastar card"
              {...listeners}
              {...attributes}
            >
              <GripVertical className="h-4 w-4" aria-hidden />
            </button>
          )}
          <div className="min-w-0 flex-1">
            <Link
              href={`/boards/${row.boardId}?cardId=${row.cardId}`}
              className="block truncate text-sm font-medium text-aurora-fg hover:underline"
            >
              {row.title}
            </Link>
            {row.description?.trim() ? (
              <p className="line-clamp-2 text-xs text-aurora-muted">{row.description.trim()}</p>
            ) : null}
            <p className="truncate text-xs text-aurora-muted">
              Entrega estimada: {row.targetDate ? formatDue(row.targetDate) : "—"}
            </p>
            <p className="truncate text-xs text-aurora-muted">
              Prazo final: {row.dueDate ? formatDue(row.dueDate) : "—"}
            </p>
            <p className="truncate text-xs text-aurora-muted">{row.boardName}</p>
          </div>
          {canEdit && onRemove ? (
            <button
              type="button"
              aria-label="Remover do plano"
              title="Remover do plano"
              data-testid={`plan-row-remove-${row.cardId}`}
              onClick={onRemove}
              className="shrink-0 rounded p-0.5 text-aurora-muted transition hover:bg-aurora-surface-2 hover:text-aurora-danger"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      </td>
      {dayKeys.map((date) => {
        const dueFlags = planDueCellFlags(date, dueDateIso);
        return (
          <DayDropCell
            key={date}
            date={date}
            cardId={row.cardId}
            hours={row.cells[date] ?? 0}
            isToday={isTodayIso(date)}
            isTargetDelivery={targetDateIso === date}
            isFinalDue={dueFlags.isFinalDue}
            isPastFinalDue={dueFlags.isPastFinalDue}
            highlightDay={highlightDay}
            canEdit={canEdit}
            onCommit={(h) => onCellCommit(row.cardId, date, h)}
          />
        );
      })}
      <td className="border-l border-aurora-border px-2 py-1 text-center text-xs font-medium text-aurora-muted">
        {row.totalHours}h
      </td>
    </tr>
  );
});

function DayDropZone({
  date,
  zoneId,
  as: Tag = "td",
  className = "",
  columnAnchor = false,
  isToday = false,
  highlightDay = null,
  children,
}: {
  date: string;
  zoneId: string;
  as?: "td" | "th";
  className?: string;
  columnAnchor?: boolean;
  isToday?: boolean;
  highlightDay?: string | null;
  children?: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: zoneId,
    data: { type: "day", date },
  });

  const shared = {
    ref: setNodeRef,
    className: dayDropZoneClassName({
      base: className,
      isToday,
      tag: Tag,
      highlightDay,
      date,
      isOver,
    }),
    "data-plan-day-col": date,
    "data-plan-day-anchor": columnAnchor ? "true" : undefined,
    "data-plan-today": isToday ? "true" : undefined,
    "data-testid": zoneId.startsWith("day-header-") && isToday ? "plan-day-today" : undefined,
  };

  if (Tag === "th") {
    return (
      <th scope="col" {...shared}>
        {children}
      </th>
    );
  }

  return <td {...shared}>{children}</td>;
}

function DayColumnDrop({
  date,
  label,
  isToday,
  className,
  highlightDay,
}: {
  date: string;
  label: string;
  isToday: boolean;
  className?: string;
  highlightDay?: string | null;
}) {
  return (
    <DayDropZone
      as="th"
      date={date}
      zoneId={`day-header-${date}`}
      columnAnchor
      isToday={isToday}
      highlightDay={highlightDay}
      className={`min-w-[3rem] border-l border-aurora-border/60 px-1 py-2 text-center text-xs font-normal${className ? ` ${className}` : ""}`}
    >
      <span aria-label={isToday ? `Hoje, ${label}` : `Dia ${label}`}>{label}</span>
    </DayDropZone>
  );
}

function PlanGridDropPanel({
  gridRef,
  className,
  isDragging,
  isSidebarDrag,
  hoverDay,
  children,
}: {
  gridRef: RefObject<HTMLDivElement | null>;
  className?: string;
  isDragging?: boolean;
  isSidebarDrag?: boolean;
  hoverDay?: string | null;
  children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: "plan-grid",
    data: { type: "plan-grid" },
  });

  const mergedRef = useCallback(
    (node: HTMLDivElement | null) => {
      setNodeRef(node);
      gridRef.current = node;
    },
    [gridRef, setNodeRef],
  );

  return (
    <div
      ref={mergedRef}
      className={`relative ${className ?? ""} ${
        isDragging ? `${planGridDraggingClass}${isSidebarDrag ? ` ${planGridSidebarDragClass}` : ""}` : ""
      } ${isOver ? "ring-2 ring-inset ring-aurora-brand/30" : ""}`}
      data-testid="plan-grid-drop"
    >
      {isDragging && hoverDay ? (
        <div
          className="plan-drop-hint absolute right-3 top-2 z-30 rounded-lg border border-aurora-brand/40 bg-aurora-brand px-2.5 py-1 text-xs font-semibold text-white shadow-lg"
          data-testid="plan-drop-hint"
        >
          Soltar em {formatPlanDropDayLabel(hoverDay)}
        </div>
      ) : null}
      {children}
    </div>
  );
}

function PlanOrgCalendarBlock({
  orgId,
  orgName,
  orgLogoUrl,
  initialData,
  boardFilter,
  showWeekends,
  showOrgHeader = true,
  sidebarTestId = "plan-sidebar",
}: OrgCalendarProps) {
  const [data, setData] = useState(initialData);
  const [rowOrderByBoard, setRowOrderByBoard] = useState(() => buildInitialRowOrderByBoard(initialData.rows));
  const [activeDrag, setActiveDrag] = useState<PlanActiveDrag | null>(null);
  const [hoverDay, setHoverDay] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<PlanGridRow | null>(null);
  const [pending, startTransition] = useTransition();
  const dragMutationRef = useRef(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const lastOverRef = useRef<Over | null>(null);

  const planDataKey = useMemo(
    () =>
      [
        orgId,
        initialData.rows.length,
        initialData.sidebar.length,
        ...initialData.rows.map((r) => r.cardId),
        ...initialData.sidebar.map((s) => s.cardId),
      ].join("|"),
    [orgId, initialData],
  );

  useEffect(() => {
    setData(initialData);
    setRowOrderByBoard(buildInitialRowOrderByBoard(initialData.rows));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync only on structural change, not stale RSC refetch
  }, [planDataKey]);

  const dayKeys = useMemo(() => data.days.map((d) => d.date), [data.days]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const filteredRows = useMemo(() => {
    if (!boardFilter) return data.rows;
    return data.rows.filter((r) => r.boardId === boardFilter);
  }, [data.rows, boardFilter]);

  const groupedRows = useMemo(() => {
    const rowsByBoardId = new Map<string, PlanGridRow[]>();
    const boardNames = new Map<string, string>();
    for (const row of filteredRows) {
      boardNames.set(row.boardId, row.boardName);
      const list = rowsByBoardId.get(row.boardId) ?? [];
      list.push(row);
      rowsByBoardId.set(row.boardId, list);
    }

    return [...rowsByBoardId.entries()]
      .map(([boardId, boardRows]) => {
        const order = rowOrderByBoard[boardId];
        const byId = new Map(boardRows.map((r) => [r.cardId, r]));
        const ordered: PlanGridRow[] = [];
        if (order) {
          for (const id of order) {
            const row = byId.get(id);
            if (row) ordered.push(row);
          }
        }
        for (const row of boardRows) {
          if (!ordered.some((r) => r.cardId === row.cardId)) ordered.push(row);
        }
        return [boardNames.get(boardId)!, boardId, ordered] as const;
      })
      .sort((a, b) => a[0].localeCompare(b[0], "pt-BR"));
  }, [filteredRows, rowOrderByBoard]);

  const scheduleCardOnDayLocal = useCallback((cardId: string, date: string) => {
    setData((prev) => {
      const nextRows = prev.rows.map((r) => (r.cardId === cardId ? { ...r, targetDate: date } : r));
      const boardId = nextRows.find((r) => r.cardId === cardId)?.boardId;
      if (boardId) {
        setRowOrderByBoard((order) => resortBoardOrderBySchedule(order, nextRows, boardId));
      }
      return { ...prev, rows: nextRows };
    });
  }, []);

  const moveLocalAllocation = useCallback((cardId: string, fromDate: string, toDate: string, hours: number) => {
    setData((prev) => {
      const nextRows = prev.rows.map((r) => {
        if (r.cardId !== cardId) return r;
        const cells = { ...r.cells };
        delete cells[fromDate];
        cells[toDate] = hours;
        const totalHours = Object.values(cells).reduce((s, h) => s + h, 0);
        return { ...r, cells, totalHours };
      });
      return { ...prev, rows: nextRows, days: recalcDaysFromRows(prev.days, nextRows) };
    });
  }, []);

  const updateLocalCell = useCallback((cardId: string, date: string, hours: number) => {
    setData((prev) => {
      const todayIso = formatDateIso(new Date());
      const existing = prev.rows.find((r) => r.cardId === cardId);
      const sidebarCard = prev.sidebar.find((s) => s.cardId === cardId);

      let nextRows: typeof prev.rows = existing
        ? prev.rows.map((r) => {
            if (r.cardId !== cardId) return r;
            const cells = { ...r.cells };
            if (hours <= 0) delete cells[date];
            else cells[date] = hours;
            const totalHours = Object.values(cells).reduce((s, h) => s + h, 0);
            return {
              ...r,
              cells,
              totalHours,
              personalPlanAt: r.personalPlanAt ?? new Date().toISOString(),
            };
          })
        : sidebarCard && hours > 0
          ? [
              ...prev.rows,
              {
                cardId,
                boardId: sidebarCard.boardId,
                boardName: sidebarCard.boardName,
                title: sidebarCard.title,
                description: sidebarCard.description,
                startDate: sidebarCard.startDate,
                targetDate: sidebarCard.targetDate,
                dueDate: sidebarCard.dueDate,
                estimatedHours: sidebarCard.estimatedHours,
                personalPlanAt: new Date().toISOString(),
                cells: { [date]: hours },
                totalHours: hours,
              },
            ]
          : prev.rows;

      const removedRows: typeof prev.rows = [];
      nextRows = nextRows.filter((r) => {
        const hasAlloc = Object.values(r.cells).some((h) => h > 0);
        if (hasAlloc || r.personalPlanAt) return true;
        removedRows.push(r);
        return false;
      });

      let sidebar = prev.sidebar;
      for (const removed of removedRows) {
        if (sidebar.some((s) => s.cardId === removed.cardId)) continue;
        sidebar = [...sidebar, rowToSidebarCard(removed, todayIso)];
      }

      return {
        ...prev,
        rows: nextRows,
        sidebar,
        days: recalcDaysFromRows(prev.days, nextRows),
      };
    });
  }, []);

  const addCardToPlan = useCallback((cardId: string) => {
    setData((prev) => {
      if (prev.rows.some((r) => r.cardId === cardId)) return prev;
      const sidebarCard = prev.sidebar.find((s) => s.cardId === cardId);
      if (!sidebarCard) return prev;

      setRowOrderByBoard((order) => appendCardToBoardOrder(order, sidebarCard.boardId, cardId));

      const personalPlanAt = new Date().toISOString();
      const nextRows: typeof prev.rows = [
        ...prev.rows,
        {
          cardId,
          boardId: sidebarCard.boardId,
          boardName: sidebarCard.boardName,
          title: sidebarCard.title,
          description: sidebarCard.description,
          startDate: sidebarCard.startDate,
          targetDate: sidebarCard.targetDate,
          dueDate: sidebarCard.dueDate,
          estimatedHours: sidebarCard.estimatedHours,
          personalPlanAt,
          cells: {},
          totalHours: 0,
        },
      ];

      return {
        ...prev,
        rows: nextRows,
        sidebar: prev.sidebar.filter((s) => s.cardId !== cardId),
        days: recalcDaysFromRows(prev.days, nextRows),
      };
    });
  }, []);

  const removePlanRowFromGrid = useCallback((row: PlanGridRow) => {
    setData((prev) => {
      const todayIso = formatDateIso(new Date());
      const nextRows = prev.rows.filter((r) => r.cardId !== row.cardId);
      let sidebar = prev.sidebar;
      if (!sidebar.some((s) => s.cardId === row.cardId)) {
        sidebar = [...sidebar, rowToSidebarCard(row, todayIso)];
      }
      return {
        ...prev,
        rows: nextRows,
        sidebar,
        days: recalcDaysFromRows(prev.days, nextRows),
      };
    });
    setRowOrderByBoard((prev) => {
      const boardId = findBoardIdForCard(prev, row.cardId);
      if (!boardId) return prev;
      return { ...prev, [boardId]: prev[boardId].filter((id) => id !== row.cardId) };
    });
  }, []);

  const confirmRemoveFromPlan = useCallback(() => {
    if (!removeTarget) return;
    const row = removeTarget;
    setRemoveTarget(null);
    removePlanRowFromGrid(row);

    startTransition(async () => {
      const result = await withInFlightLock(planRemoveLockKey(row.cardId), () =>
        clearCardFromPlanAction({ cardId: row.cardId }),
      );
      if (result === null) return;
      if (!result.ok) {
        appToast.error(result.error);
        setData(initialData);
      }
    });
  }, [initialData, removePlanRowFromGrid, removeTarget]);

  const handleCellCommit = useCallback(
    (cardId: string, date: string, hours: number) => {
      const row = data.rows.find((r) => r.cardId === cardId);
      const prevHours = row?.cells[date] ?? 0;
      if (prevHours === hours) return;

      updateLocalCell(cardId, date, hours);
      startTransition(async () => {
        const result = await withInFlightLock(planAllocationLockKey(cardId, date), () =>
          upsertAllocationAction({ cardId, workDate: date, hours }),
        );
        if (result === null) return;
        if (!result.ok) {
          appToast.error(result.error);
          setData(initialData);
        }
      });
    },
    [data.rows, initialData, updateLocalCell],
  );

  function handleDragStart(event: DragStartEvent) {
    const active = event.active;
    const cardId =
      (active.data.current?.cardId as string | undefined) ??
      String(active.id).replace(/^(sidebar-|row-)/, "");
    const row = data.rows.find((r) => r.cardId === cardId);
    const sidebar = data.sidebar.find((s) => s.cardId === cardId);
    const title = row?.title ?? sidebar?.title;
    if (!title) return;
    setActiveDrag({
      cardId,
      title,
      boardName: row?.boardName ?? sidebar?.boardName,
      source: active.data.current?.type === "sidebar-card" ? "sidebar" : "row",
      hoursLabel: row && row.totalHours > 0 ? `${row.totalHours}h` : undefined,
    });
    setHoverDay(null);
  }

  function handleDragOver(event: DragOverEvent) {
    lastOverRef.current = event.over;
    setHoverDay(resolveTargetDateFromOver(event.over));

    const { active, over } = event;
    if (!over) return;
    const activeType = active.data.current?.type as string | undefined;
    if (activeType !== "plan-row") return;
    const overType = over.data.current?.type as string | undefined;
    if (overType !== "plan-row") return;

    const activeCardId = active.data.current?.cardId as string | undefined;
    const overCardId = over.data.current?.cardId as string | undefined;
    if (!activeCardId || !overCardId || activeCardId === overCardId) return;

    setRowOrderByBoard((prev) => reorderPlanRowsInBoard(prev, activeCardId, overCardId) ?? prev);
  }

  function handleDragCancel() {
    setActiveDrag(null);
    setHoverDay(null);
    lastOverRef.current = null;
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDrag(null);
    setHoverDay(null);

    const { active } = event;
    const over = event.over ?? lastOverRef.current;
    lastOverRef.current = null;

    const cardId =
      (active.data.current?.cardId as string | undefined) ??
      String(active.id).replace(/^(sidebar-|row-)/, "");
    const activeType = active.data.current?.type as string | undefined;

    let targetDate = resolveTargetDateFromOver(event.over) ?? resolveTargetDateFromOver(over);
    if (!targetDate) {
      const x = pointerEndX(event);
      if (x != null) targetDate = resolveDayFromClientX(x, gridRef.current);
    }

    const droppedOnPlan = isDropOnPlanSurface(over) || isPointerInsideGrid(event, gridRef.current);
    const blocked = dragMutationRef.current || pending || !data.canEdit;

    if (blocked) return;

    if (activeType === "sidebar-card") {
      if (!droppedOnPlan) return;

      addCardToPlan(cardId);
      if (targetDate) scheduleCardOnDayLocal(cardId, targetDate);
      dragMutationRef.current = true;

      startTransition(async () => {
        try {
          const addResult = await withInFlightLock(planScheduleLockKey(cardId), () =>
            addCardToPersonalPlanAction({ cardId }),
          );
          if (addResult === null) return;
          if (!addResult.ok) {
            appToast.error(addResult.error);
            setData(initialData);
            return;
          }
          if (targetDate) {
            const schedResult = await scheduleCardToDayAction({
              cardId,
              workDate: targetDate,
              defaultHours: 0,
            });
            if (!schedResult.ok) {
              appToast.error(schedResult.error);
              setData(initialData);
            }
          }
        } finally {
          dragMutationRef.current = false;
        }
      });
      return;
    }

    if (activeType === "plan-row") {
      const overType = over?.data.current?.type as string | undefined;
      if (!targetDate && overType === "plan-row") return;
      if (!targetDate) return;

      const row = data.rows.find((r) => r.cardId === cardId);
      if (!row) return;

      const targetExisting = row.cells[targetDate] ?? 0;
      if (targetExisting > 0) return;

      const sourceDates = Object.entries(row.cells).filter(([, h]) => h > 0);
      dragMutationRef.current = true;

      if (sourceDates.length > 0) {
        const [fromDate, hours] = sourceDates[0]!;
        if (fromDate === targetDate) {
          dragMutationRef.current = false;
          return;
        }
        moveLocalAllocation(cardId, fromDate, targetDate, hours);
        startTransition(async () => {
          try {
            const result = await withInFlightLock(planAllocationLockKey(cardId, targetDate), () =>
              moveAllocationAction({ cardId, fromDate, toDate: targetDate, hours }),
            );
            if (result === null) return;
            if (!result.ok) {
              appToast.error(result.error);
              setData(initialData);
              setRowOrderByBoard(buildInitialRowOrderByBoard(initialData.rows));
            }
          } finally {
            dragMutationRef.current = false;
          }
        });
        return;
      }

      scheduleCardOnDayLocal(cardId, targetDate);
      startTransition(async () => {
        try {
          const result = await withInFlightLock(planScheduleLockKey(cardId), () =>
            scheduleCardToDayAction({ cardId, workDate: targetDate, defaultHours: 0 }),
          );
          if (result === null) return;
          if (!result.ok) {
            appToast.error(result.error);
            setData(initialData);
            setRowOrderByBoard(buildInitialRowOrderByBoard(initialData.rows));
          }
        } finally {
          dragMutationRef.current = false;
        }
      });
    }
  }

  return (
    <section className="relative space-y-3" data-testid={`plan-org-section-${orgId}`}>
      {pending ? <div className="aurora-pending-bar" aria-hidden /> : null}
      {showOrgHeader ? (
        <div className="flex items-center gap-2.5" data-testid={`plan-org-title-${orgId}`}>
          <OrgLogo name={orgName} logoUrl={orgLogoUrl} size="sm" />
          <h2 className="text-sm font-semibold text-aurora-fg">{orgName}</h2>
        </div>
      ) : null}

      <DndContext
        sensors={sensors}
        collisionDetection={planCollisionDetection}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragCancel={handleDragCancel}
        onDragEnd={handleDragEnd}
      >
        <div className="flex flex-col gap-4 lg:flex-row">
          <PlanGridDropPanel
            gridRef={gridRef}
            isDragging={activeDrag !== null}
            isSidebarDrag={activeDrag?.source === "sidebar"}
            hoverDay={hoverDay}
            className={`relative min-w-0 flex-1 overflow-x-auto ${dataPanelClass} ${dataPanelEnterClass}`}
          >
            <table className="w-max min-w-full text-sm">
              <thead className="bg-aurora-surface-2">
                <tr>
                  <th className={`sticky left-0 z-20 min-w-[180px] px-2 py-2 text-left text-xs uppercase tracking-wide text-aurora-muted ${tableStickyHeadClass}`}>
                    Card
                  </th>
                  {data.days.map((d) => {
                    const dt = new Date(`${d.date}T12:00:00`);
                    const label = dt.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit" });
                    const today = isTodayIso(d.date);
                    const weekend = showWeekends && isWeekendIso(d.date);
                    return (
                      <DayColumnDrop
                        key={d.date}
                        date={d.date}
                        label={label}
                        isToday={today}
                        highlightDay={hoverDay}
                        className={weekend ? "bg-aurora-surface-2/30" : undefined}
                      />
                    );
                  })}
                  <th className="border-l border-aurora-border px-2 py-2 text-xs uppercase text-aurora-muted">Σ</th>
                </tr>
                <tr className="border-t border-aurora-border/60 text-xs">
                  <td className={`sticky left-0 z-10 px-2 py-1 text-xs font-medium text-aurora-muted ${tableStickyCellClass}`}>
                    Utilizacao
                  </td>
                  {data.days.map((d) => {
                    const level = utilizationLevel(d.utilizationPct);
                    const today = isTodayIso(d.date);
                    const weekend = showWeekends && isWeekendIso(d.date);
                    return (
                      <DayDropZone
                        key={d.date}
                        date={d.date}
                        zoneId={`day-util-${d.date}`}
                        columnAnchor
                        isToday={today}
                        highlightDay={hoverDay}
                        className={`border-l border-aurora-border/60 px-1 py-1 text-center${weekend ? " bg-aurora-surface-2/30" : ""}`}
                      >
                        <span className={UTILIZATION_TEXT_CLASS[level]}>{d.utilizationPct}%</span>
                        <div className="mx-auto mt-0.5 h-1 w-8 overflow-hidden rounded bg-aurora-border">
                          <div
                            className={`h-full ${UTILIZATION_BAR_CLASS[level]}`}
                            style={{ width: `${Math.min(d.utilizationPct, 100)}%` }}
                          />
                        </div>
                      </DayDropZone>
                    );
                  })}
                  <td />
                </tr>
              </thead>
              <tbody>
                {groupedRows.map(([boardName, boardId, rows]) => (
                  <Fragment key={boardId}>
                    <tr className="bg-aurora-brand-muted/20">
                      <td
                        colSpan={dayKeys.length + 2}
                        className="sticky left-0 px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-aurora-brand"
                      >
                        {boardName}
                      </td>
                    </tr>
                    <SortableContext items={rows.map((r) => r.cardId)} strategy={verticalListSortingStrategy}>
                      {rows.map((row) => (
                        <SortablePlanRow
                          key={row.cardId}
                          row={row}
                          dayKeys={dayKeys}
                          canEdit={data.canEdit}
                          highlightDay={hoverDay}
                          onCellCommit={handleCellCommit}
                          onRemove={data.canEdit ? () => setRemoveTarget(row) : undefined}
                        />
                      ))}
                    </SortableContext>
                  </Fragment>
                ))}
                {filteredRows.length === 0 && (
                  <tr>
                    <td
                      className={`sticky left-0 px-4 py-8 text-center text-xs text-aurora-muted ${tableStickyCellClass}`}
                    >
                      Arraste cards para o calendario.
                    </td>
                    {dayKeys.map((date) => {
                      const today = isTodayIso(date);
                      return (
                        <DayDropZone
                          key={date}
                          date={date}
                          zoneId={`day-empty-${date}`}
                          isToday={today}
                          highlightDay={hoverDay}
                          className="min-h-[5rem] border-l border-aurora-border/60"
                        />
                      );
                    })}
                    <td />
                  </tr>
                )}
                <tr className="h-10" aria-hidden>
                  <td className={`sticky left-0 ${tableStickyCellClass}`} />
                  {dayKeys.map((date) => {
                    const today = isTodayIso(date);
                    return (
                      <DayDropZone
                        key={date}
                        date={date}
                        zoneId={`day-pad-${date}`}
                        isToday={today}
                        highlightDay={hoverDay}
                        className="min-h-[2.5rem] border-l border-aurora-border/40"
                      />
                    );
                  })}
                  <td />
                </tr>
              </tbody>
            </table>
          </PlanGridDropPanel>
          <PlanSidebar
            cards={boardFilter ? data.sidebar.filter((c) => c.boardId === boardFilter) : data.sidebar}
            canEdit={data.canEdit}
            testId={sidebarTestId}
          />
        </div>
        <DragOverlay dropAnimation={{ duration: 200, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }}>
          {activeDrag ? <PlanDragOverlayPreview drag={activeDrag} /> : null}
        </DragOverlay>
      </DndContext>
      <ConfirmDialog
        open={removeTarget !== null}
        title="Remover do plano semanal"
        message={
          removeTarget
            ? `Remover "${removeTarget.title}" do plano de 11 dias? As horas alocadas neste periodo serao apagadas.`
            : ""
        }
        confirmLabel="Remover"
        pending={pending}
        onConfirm={confirmRemoveFromPlan}
        onCancel={() => setRemoveTarget(null)}
      />
    </section>
  );
}

type PlanClientProps = {
  sections: PlanOrgSection[];
  orgLogoById?: Record<string, string | null>;
  showWeekends: boolean;
};

export function PlanClient({ sections, orgLogoById = {}, showWeekends }: PlanClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [orgFilter, setOrgFilter] = useClientSearchParamState(
    "org",
    (raw) => raw ?? "",
    (v) => v || null,
  );
  const [boardFilter, setBoardFilter] = useClientSearchParamState(
    "board",
    (raw) => raw ?? "",
    (v) => v || null,
  );

  function onShowWeekendsChange(next: boolean) {
    if (next === showWeekends) return;
    const params = applySearchParamUpdates(searchParams, {
      weekends: next ? "1" : null,
      start: formatDateIso(defaultPlanWindowStart(new Date(), next)),
    });
    replaceClientUrl(pathname, params);
    router.refresh();
  }

  const orgOptions = useMemo(
    () =>
      sections.map((s) => ({
        id: s.orgId,
        name: s.orgName,
        logoUrl: s.orgLogoUrl ?? orgLogoById[s.orgId] ?? null,
      })),
    [orgLogoById, sections],
  );

  const visibleSections = useMemo(() => {
    if (!orgFilter) return sections;
    return sections.filter((s) => s.orgId === orgFilter);
  }, [orgFilter, sections]);

  const boardOptions = useMemo(() => {
    const byId = new Map<string, string>();
    for (const section of visibleSections) {
      for (const board of section.boards) {
        byId.set(board.id, board.name);
      }
    }
    return [...byId.entries()].map(([id, name]) => ({ id, name }));
  }, [visibleSections]);

  useEffect(() => {
    if (!boardFilter) return;
    if (!boardOptions.some((b) => b.id === boardFilter)) {
      setBoardFilter("");
    }
  }, [boardFilter, boardOptions, setBoardFilter]);

  const showOrgHeaders = visibleSections.length > 0;

  return (
    <div className="relative space-y-8" data-testid="plan-client">
      {sections.length > 0 ? (
        <PlanToolbar
          orgs={orgOptions}
          orgFilter={orgFilter}
          onOrgFilterChange={setOrgFilter}
          boards={boardOptions}
          boardFilter={boardFilter}
          onBoardFilterChange={setBoardFilter}
          showWeekends={showWeekends}
          onShowWeekendsChange={onShowWeekendsChange}
        />
      ) : null}
      {visibleSections.map((section, index) => (
        <PlanOrgCalendarBlock
          key={section.orgId}
          orgId={section.orgId}
          orgName={section.orgName}
          orgLogoUrl={section.orgLogoUrl ?? orgLogoById[section.orgId] ?? null}
          initialData={section.initialData}
          boardFilter={boardFilter}
          showWeekends={showWeekends}
          showOrgHeader={showOrgHeaders}
          sidebarTestId={index === 0 ? "plan-sidebar" : `plan-sidebar-${section.orgId}`}
        />
      ))}
      {visibleSections.length === 0 ? (
        <p className="rounded-xl border border-dashed border-aurora-border px-4 py-8 text-center text-sm text-aurora-muted">
          Nenhuma organizacao encontrada para planejamento no momento.
        </p>
      ) : null}
    </div>
  );
}
