"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getMonthGrid, shiftMonth } from "@/lib/calendar-grid";
import { DEFAULT_BOARD_COLOR } from "@/lib/ui-classes";
import { DeadlineAgendaModal } from "@/components/calendar/deadline-agenda-modal";
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

export function CalendarClient({ events, orgId, boards, columns }: Props) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [agendaDate, setAgendaDate] = useState<Date | null>(null);

  const grid = getMonthGrid(new Date(viewYear, viewMonth, 1));

  const byDay = useMemo(() => {
    const map = new Map<number, CalendarEvent[]>();
    for (const e of events) {
      const d = new Date(e.due_date);
      if (d.getMonth() !== viewMonth || d.getFullYear() !== viewYear) continue;
      const day = d.getDate();
      const list = map.get(day) ?? [];
      list.push(e);
      map.set(day, list);
    }
    return map;
  }, [events, viewMonth, viewYear]);

  const agendaDayEvents = agendaDate
    ? (byDay.get(agendaDate.getDate()) ?? []).filter(
        (e) =>
          new Date(e.due_date).getMonth() === agendaDate.getMonth() &&
          new Date(e.due_date).getFullYear() === agendaDate.getFullYear(),
      )
    : [];

  return (
    <>
      <section className="rounded-xl border border-aurora-border bg-aurora-surface p-4">
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            aria-label="Mes anterior"
            onClick={() => {
              const n = shiftMonth(viewYear, viewMonth, -1);
              setViewYear(n.year);
              setViewMonth(n.month);
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
            }}
            className="rounded p-1 hover:bg-aurora-accent-muted"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
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
            return (
              <button
                key={day}
                type="button"
                onClick={() => setAgendaDate(new Date(viewYear, viewMonth, day))}
                className={`min-h-16 rounded border p-1 text-left transition hover:border-aurora-accent hover:bg-aurora-accent-muted/20 ${
                  isToday ? "border-aurora-accent bg-aurora-accent-muted/40" : "border-aurora-border"
                }`}
              >
                <span className="text-xs font-medium text-aurora-fg">{day}</span>
                <ul className="mt-1 space-y-0.5">
                  {dayEvents.slice(0, 2).map((e) => {
                    const tint = e.board_color || DEFAULT_BOARD_COLOR;
                    return (
                      <li key={e.id}>
                        <Link
                          href={`/boards/${e.board_id}`}
                          onClick={(ev) => ev.stopPropagation()}
                          className={`block truncate rounded px-1 py-0.5 text-[10px] font-medium ${
                            e.overdue ? "bg-aurora-danger/15 text-aurora-danger" : "text-white"
                          }`}
                          style={e.overdue ? undefined : { backgroundColor: tint }}
                          title={e.title}
                        >
                          {e.title}
                        </Link>
                      </li>
                    );
                  })}
                  {dayEvents.length > 2 ? (
                    <li className="text-[10px] text-aurora-muted">+{dayEvents.length - 2}</li>
                  ) : null}
                  {dayEvents.length === 0 ? (
                    <li className="text-[10px] text-aurora-muted/60">+</li>
                  ) : null}
                </ul>
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-aurora-muted">Clique em um dia para gerenciar prazos.</p>
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
