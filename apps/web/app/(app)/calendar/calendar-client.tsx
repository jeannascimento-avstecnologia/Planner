"use client";

import { useRouter } from "next/navigation";
import { memo, useCallback, useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type CollisionDetection,
} from "@dnd-kit/core";
import { assignDueDate } from "@/app/(app)/calendar/actions";
import { DeadlineAgendaModal } from "@/components/calendar/deadline-agenda-modal";
import { formatDateLabel, getMonthGrid, shiftMonth, toDateInputValue } from "@/lib/calendar-grid";
import { appToast } from "@/lib/toast";
import { btnPrimary, btnSecondary, DEFAULT_BOARD_COLOR } from "@/lib/ui-classes";
import type { BoardOption, ColumnOption } from "@/app/(app)/calendar/actions";

export type CalendarEvent = {
  id: string;
  title: string;
  due_date: string;
  board_id: string;
  board_name: string;
  board_color: string | null;
  overdue: boolean;
};

type Props = {
  events: CalendarEvent[];
  orgId: string;
  boards: BoardOption[];
  columns: ColumnOption[];
};

type PendingMove = {
  event: CalendarEvent;
  targetDay: number;
  targetIso: string;
};

function eventDayInMonth(e: CalendarEvent, year: number, month: number): number | null {
  const d = new Date(e.due_date);
  if (d.getMonth() !== month || d.getFullYear() !== year) return null;
  return d.getDate();
}

function dayDropId(year: number, month: number, day: number): string {
  return `cal-day-${year}-${month}-${day}`;
}

function parseDayFromDropId(id: string | number): number | null {
  const parts = String(id).split("-");
  const day = Number(parts[parts.length - 1]);
  return Number.isFinite(day) ? day : null;
}

const calendarCollisionDetection: CollisionDetection = (args) => {
  const pointerHits = pointerWithin(args);
  const dayHits = pointerHits.filter((c) => c.data?.current?.type === "calendar-day");
  if (dayHits.length > 0) return dayHits;
  if (pointerHits.length > 0) return pointerHits;
  return rectIntersection(args);
};

const DraggableDeadlineChip = memo(function DraggableDeadlineChip({
  event,
  preview,
  onNavigate,
}: {
  event: CalendarEvent;
  preview?: boolean;
  onNavigate: (boardId: string, cardId: string) => void;
}) {
  const tint = event.board_color || DEFAULT_BOARD_COLOR;
  const didDragRef = useRef(false);
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `deadline-${event.id}`,
    data: { type: "deadline", eventId: event.id, boardId: event.board_id },
  });

  useEffect(() => {
    if (isDragging) didDragRef.current = true;
  }, [isDragging]);

  return (
    <button
      ref={setNodeRef}
      type="button"
      {...listeners}
      {...attributes}
      onClick={(ev) => {
        ev.stopPropagation();
        if (didDragRef.current) {
          didDragRef.current = false;
          return;
        }
        onNavigate(event.board_id, event.id);
      }}
      className={`calendar-deadline-chip block w-full truncate rounded px-1 py-0.5 text-left text-[10px] font-medium ${
        event.overdue ? "bg-aurora-danger/15 text-aurora-danger" : "text-white"
      } ${preview ? "calendar-deadline-preview" : ""} ${isDragging ? "calendar-deadline-dragging" : ""}`}
      style={event.overdue ? undefined : { backgroundColor: tint }}
      title={`${event.title} — arraste para reagendar`}
    >
      {event.title}
    </button>
  );
});

const CalendarDayCell = memo(function CalendarDayCell({
  day,
  year,
  month,
  isToday,
  isDropTarget,
  onOpenAgenda,
  children,
}: {
  day: number;
  year: number;
  month: number;
  isToday: boolean;
  isDropTarget: boolean;
  onOpenAgenda: () => void;
  children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: dayDropId(year, month, day),
    data: { type: "calendar-day", day, dateIso: toDateInputValue(year, month, day) },
  });

  return (
    <div
      ref={setNodeRef}
      role="button"
      tabIndex={0}
      onClick={onOpenAgenda}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpenAgenda();
        }
      }}
      className={`calendar-day-cell min-h-16 cursor-pointer rounded border p-1 text-left transition ${
        isToday ? "border-aurora-accent bg-aurora-accent-muted/40" : "border-aurora-border"
      } ${isDropTarget || isOver ? "calendar-day-drop-target" : "hover:border-aurora-accent hover:bg-aurora-accent-muted/20"}`}
      data-testid={`calendar-day-${day}`}
    >
      <span className="text-xs font-medium text-aurora-fg">{day}</span>
      <ul
        className="mt-1 space-y-0.5"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </ul>
    </div>
  );
});

export function CalendarClient({ events, orgId, boards, columns }: Props) {
  const router = useRouter();
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [agendaDate, setAgendaDate] = useState<Date | null>(null);
  const [localEvents, setLocalEvents] = useState(events);
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const [dragPreviewDay, setDragPreviewDay] = useState<number | null>(null);
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setLocalEvents(events);
  }, [events]);

  const grid = getMonthGrid(new Date(viewYear, viewMonth, 1));
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const displayDayForEvent = useCallback(
    (e: CalendarEvent): number | null => {
      if (pendingMove?.event.id === e.id) return pendingMove.targetDay;
      if (activeEventId === e.id && dragPreviewDay != null) return dragPreviewDay;
      return eventDayInMonth(e, viewYear, viewMonth);
    },
    [activeEventId, dragPreviewDay, pendingMove, viewMonth, viewYear],
  );

  const byDay = useMemo(() => {
    const map = new Map<number, CalendarEvent[]>();
    for (const e of localEvents) {
      const day = displayDayForEvent(e);
      if (day == null) continue;
      const list = map.get(day) ?? [];
      list.push(e);
      map.set(day, list);
    }
    return map;
  }, [localEvents, displayDayForEvent]);

  const activeEvent = activeEventId ? localEvents.find((e) => e.id === activeEventId) : null;

  const agendaDayEvents = agendaDate
    ? localEvents.filter((e) => displayDayForEvent(e) === agendaDate.getDate())
    : [];

  function handleDragStart(event: DragStartEvent) {
    const eventId = event.active.data.current?.eventId as string | undefined;
    if (!eventId) return;
    setPendingMove(null);
    setActiveEventId(eventId);
    const sourceDay = eventDayInMonth(localEvents.find((e) => e.id === eventId)!, viewYear, viewMonth);
    setDragPreviewDay(sourceDay);
  }

  function handleDragOver(event: DragOverEvent) {
    const overType = event.over?.data.current?.type as string | undefined;
    if (overType !== "calendar-day") return;
    const day = event.over?.data.current?.day as number | undefined;
    if (day == null) return;
    setDragPreviewDay(day);
  }

  function handleDragCancel() {
    setActiveEventId(null);
    setDragPreviewDay(null);
  }

  function handleDragEnd(event: DragEndEvent) {
    const eventId = (event.active.data.current?.eventId as string | undefined) ?? activeEventId;
    setActiveEventId(null);

    let targetDay = dragPreviewDay;
    if (event.over?.data.current?.type === "calendar-day") {
      targetDay = event.over.data.current.day as number;
    } else if (event.over) {
      targetDay = parseDayFromDropId(event.over.id);
    }

    setDragPreviewDay(null);

    if (!eventId || targetDay == null) return;

    const ev = localEvents.find((e) => e.id === eventId);
    const sourceDay = ev ? eventDayInMonth(ev, viewYear, viewMonth) : null;

    if (!ev || sourceDay == null || sourceDay === targetDay) return;

    setPendingMove({
      event: ev,
      targetDay,
      targetIso: toDateInputValue(viewYear, viewMonth, targetDay),
    });
  }

  function cancelPendingMove() {
    setPendingMove(null);
  }

  function confirmPendingMove() {
    if (!pendingMove) return;
    const { event, targetIso, targetDay } = pendingMove;

    setLocalEvents((prev) =>
      prev.map((e) => (e.id === event.id ? { ...e, due_date: `${targetIso}T12:00:00.000Z`, overdue: false } : e)),
    );

    startTransition(async () => {
      const res = await assignDueDate(event.id, event.board_id, targetIso);
      if (!res.ok) {
        appToast.error(res.error ?? "Erro ao reagendar");
        setLocalEvents(events);
        setPendingMove(null);
        return;
      }
      appToast.success("Prazo reagendado");
      setPendingMove(null);
      router.refresh();
    });
  }

  function openAgenda(day: number) {
    if (activeEventId || pendingMove) return;
    setAgendaDate(new Date(viewYear, viewMonth, day));
  }

  return (
    <>
      <section className="relative rounded-xl border border-aurora-border bg-aurora-surface p-4">
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            aria-label="Mes anterior"
            onClick={() => {
              const n = shiftMonth(viewYear, viewMonth, -1);
              setViewYear(n.year);
              setViewMonth(n.month);
              setPendingMove(null);
            }}
            className="rounded p-1 hover:bg-aurora-accent-muted"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <h3 className="text-sm font-semibold capitalize text-aurora-fg">{grid.monthLabel}</h3>
          <button
            type="button"
            aria-label="Proximo mes"
            onClick={() => {
              const n = shiftMonth(viewYear, viewMonth, 1);
              setViewYear(n.year);
              setViewMonth(n.month);
              setPendingMove(null);
            }}
            className="rounded p-1 hover:bg-aurora-accent-muted"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {activeEvent && dragPreviewDay != null ? (
          <div
            className="calendar-drop-hint absolute right-4 top-14 z-20 rounded-lg border border-aurora-brand/40 bg-aurora-brand px-2.5 py-1 text-xs font-semibold text-white shadow-lg"
            data-testid="calendar-drop-hint"
          >
            Soltar em {formatDateLabel(toDateInputValue(viewYear, viewMonth, dragPreviewDay))}
          </div>
        ) : null}

        <DndContext
          sensors={sensors}
          collisionDetection={calendarCollisionDetection}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragCancel={handleDragCancel}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-aurora-muted">
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"].map((d) => (
              <div key={d} className="py-1 font-medium">
                {d}
              </div>
            ))}
            {Array.from({ length: grid.firstDayOfWeek }).map((_, i) => (
              <div key={`e-${i}`} />
            ))}
            {Array.from({ length: grid.daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayEvents = byDay.get(day) ?? [];
              const isToday =
                day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
              const isDropTarget =
                (activeEventId != null && dragPreviewDay === day) ||
                (pendingMove?.targetDay === day && activeEventId == null);

              return (
                <CalendarDayCell
                  key={day}
                  day={day}
                  year={viewYear}
                  month={viewMonth}
                  isToday={isToday}
                  isDropTarget={isDropTarget}
                  onOpenAgenda={() => openAgenda(day)}
                >
                  {dayEvents.slice(0, 3).map((e) => {
                    const sourceDay = eventDayInMonth(e, viewYear, viewMonth);
                    const isPreview =
                      (activeEventId === e.id &&
                        dragPreviewDay === day &&
                        dragPreviewDay !== sourceDay) ||
                      (pendingMove?.event.id === e.id && pendingMove.targetDay === day);
                    return (
                      <li key={e.id}>
                        <DraggableDeadlineChip
                          event={e}
                          preview={isPreview}
                          onNavigate={(boardId, cardId) =>
                            router.push(`/boards/${boardId}?cardId=${cardId}`)
                          }
                        />
                      </li>
                    );
                  })}
                  {dayEvents.length > 3 ? (
                    <li className="text-[10px] text-aurora-muted">+{dayEvents.length - 3}</li>
                  ) : null}
                  {dayEvents.length === 0 ? (
                    <li className="text-[10px] text-aurora-muted/60">+</li>
                  ) : null}
                </CalendarDayCell>
              );
            })}
          </div>

          <DragOverlay dropAnimation={null}>
            {activeEvent ? (
              <div
                className="calendar-deadline-overlay truncate rounded px-2 py-1 text-[10px] font-medium text-white shadow-lg"
                style={{ backgroundColor: activeEvent.board_color || DEFAULT_BOARD_COLOR }}
              >
                {activeEvent.title}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        {pendingMove ? (
          <div
            className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-aurora-brand/40 bg-aurora-brand-muted/30 px-3 py-2"
            data-testid="calendar-reschedule-confirm"
          >
            <p className="text-sm text-aurora-fg">
              Mover <span className="font-semibold">{pendingMove.event.title}</span> para{" "}
              <span className="font-semibold">{formatDateLabel(pendingMove.targetIso)}</span>?
            </p>
            <div className="flex shrink-0 gap-2">
              <button type="button" onClick={cancelPendingMove} className={btnSecondary} disabled={pending}>
                Cancelar
              </button>
              <button type="button" onClick={confirmPendingMove} className={btnPrimary} disabled={pending}>
                {pending ? "Salvando…" : "Confirmar"}
              </button>
            </div>
          </div>
        ) : null}

        <p className="mt-2 text-xs text-aurora-muted">
          Arraste prazos entre dias ou clique em um dia para gerenciar.
        </p>
      </section>

      {agendaDate ? (
        <DeadlineAgendaModal
          date={agendaDate}
          orgId={orgId}
          boards={boards}
          columns={columns}
          dayEvents={agendaDayEvents}
          onClose={() => setAgendaDate(null)}
        />
      ) : null}
    </>
  );
}
