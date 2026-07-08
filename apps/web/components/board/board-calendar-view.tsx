"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getMonthGrid, shiftMonth } from "@/lib/calendar-grid";
import { TifluxCardButton } from "./tiflux-card-button";
import { planningCalendarDate, type BoardCard } from "./types";

type Props = {
  cards: BoardCard[];
  tifluxEnabled: boolean;
  readOnlyTiflux?: boolean;
  onSelectCard: (id: string) => void;
  onOpenTifluxCreate: (id: string) => void;
  onOpenTifluxLink: (id: string) => void;
};

export function BoardCalendarView({
  cards,
  tifluxEnabled,
  readOnlyTiflux = false,
  onSelectCard,
  onOpenTifluxCreate,
  onOpenTifluxLink,
}: Props) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const grid = getMonthGrid(new Date(viewYear, viewMonth, 1));

  const byDay = useMemo(() => {
    const map = new Map<number, BoardCard[]>();
    for (const c of cards) {
      const planDate = planningCalendarDate(c);
      if (!planDate) continue;
      const d = new Date(planDate);
      if (d.getMonth() !== viewMonth || d.getFullYear() !== viewYear) continue;
      const day = d.getDate();
      const list = map.get(day) ?? [];
      list.push(c);
      map.set(day, list);
    }
    return map;
  }, [cards, viewMonth, viewYear]);

  return (
    <section className="rounded-xl border border-board-border bg-board-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          aria-label="Mes anterior"
          onClick={() => {
            const n = shiftMonth(viewYear, viewMonth, -1);
            setViewYear(n.year);
            setViewMonth(n.month);
          }}
          className="rounded p-1 hover:bg-board-accent-muted"
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
          className="rounded p-1 hover:bg-board-accent-muted"
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
          <div key={`pad-${i}`} />
        ))}
        {Array.from({ length: grid.daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dayCards = byDay.get(day) ?? [];
          return (
            <div
              key={day}
              className="min-h-16 rounded border border-board-border bg-board-surface-2/50 p-0.5 text-left"
            >
              <span className="block text-center text-[10px] font-medium text-aurora-fg">{day}</span>
              <ul className="mt-0.5 space-y-0.5">
                {dayCards.slice(0, 3).map((c) => (
                  <li key={c.id} className="flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => onSelectCard(c.id)}
                      className="min-w-0 flex-1 truncate rounded bg-board-accent/90 px-0.5 text-[9px] text-white hover:opacity-90"
                      title={c.title}
                    >
                      {c.title}
                    </button>
                    <TifluxCardButton
                      card={c}
                      tifluxEnabled={tifluxEnabled}
                      readOnly={readOnlyTiflux}
                      onOpenTifluxCreate={onOpenTifluxCreate}
                      onOpenTifluxLink={onOpenTifluxLink}
                      compact
                    />
                  </li>
                ))}
                {dayCards.length > 3 ? (
                  <li className="text-center text-[9px] text-aurora-muted">+{dayCards.length - 3}</li>
                ) : null}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
