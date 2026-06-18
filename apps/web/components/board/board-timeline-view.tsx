"use client";

import { useMemo } from "react";
import { TifluxCardButton } from "./tiflux-card-button";
import { effectiveStartDate, type BoardCard } from "./types";

const MS_DAY = 86_400_000;
const RANGE_BEFORE = 14;
const RANGE_AFTER = 56;

type Props = {
  cards: BoardCard[];
  tifluxEnabled: boolean;
  onSelectCard: (id: string) => void;
  onOpenTifluxCreate: (id: string) => void;
  onOpenTifluxLink: (id: string) => void;
};

function dayStart(d: Date): number {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

function parseRange(card: BoardCard): { start: number; end: number } | null {
  const startIso = effectiveStartDate(card);
  if (startIso && card.due_date) {
    return { start: dayStart(new Date(startIso)), end: dayStart(new Date(card.due_date)) };
  }
  if (card.due_date) {
    const t = dayStart(new Date(card.due_date));
    return { start: t, end: t };
  }
  return null;
}

export function BoardTimelineView({ cards, tifluxEnabled, onSelectCard, onOpenTifluxCreate, onOpenTifluxLink }: Props) {
  const today = dayStart(new Date());
  const windowStart = today - RANGE_BEFORE * MS_DAY;
  const windowEnd = today + RANGE_AFTER * MS_DAY;
  const span = windowEnd - windowStart;

  const { scheduled, unscheduled } = useMemo(() => {
    const scheduled: { card: BoardCard; start: number; end: number }[] = [];
    const unscheduled: BoardCard[] = [];
    for (const c of cards) {
      const r = parseRange(c);
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

  const weeks: Date[] = useMemo(() => {
    const list: Date[] = [];
    const cur = new Date(windowStart);
    while (cur.getTime() <= windowEnd) {
      list.push(new Date(cur));
      cur.setDate(cur.getDate() + 7);
    }
    return list;
  }, [windowStart, windowEnd]);

  function leftPct(ts: number): number {
    return Math.max(0, ((ts - windowStart) / span) * 100);
  }

  function widthPct(start: number, end: number): number {
    const w = ((end - start + MS_DAY) / span) * 100;
    return Math.min(100 - leftPct(start), Math.max(1.5, w));
  }

  return (
    <div className="space-y-4">
      {unscheduled.length > 0 ? (
        <section className="rounded-xl border border-dashed border-board-border bg-board-surface/60 p-3">
          <h3 className="mb-2 text-xs font-semibold uppercase text-aurora-muted">Sem prazo</h3>
          <div className="flex flex-wrap gap-2">
            {unscheduled.map((c) => (
              <div key={c.id} className="inline-flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onSelectCard(c.id)}
                  className="rounded-md border border-board-border bg-board-surface px-2 py-1 text-xs hover:border-board-accent"
                >
                  {c.title}
                </button>
                <TifluxCardButton
                  card={c}
                  tifluxEnabled={tifluxEnabled}
                  onOpenTifluxCreate={onOpenTifluxCreate}
                  onOpenTifluxLink={onOpenTifluxLink}
                  compact
                />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="overflow-x-auto rounded-xl border border-board-border bg-board-surface p-4">
        <div className="relative min-w-[720px]">
          <div className="mb-2 flex border-b border-board-border pb-2 text-[10px] text-aurora-muted">
            {weeks.map((w) => (
              <div key={w.toISOString()} className="flex-1 text-center">
                {w.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
              </div>
            ))}
          </div>
          <div
            className="pointer-events-none absolute bottom-0 top-8 w-0.5 bg-board-accent"
            style={{ left: `${leftPct(today)}%` }}
            title="Hoje"
          />
          <ul className="space-y-2">
            {scheduled.length === 0 ? (
              <li className="py-6 text-center text-sm text-aurora-muted">Nenhum card com datas na janela.</li>
            ) : (
              scheduled.map(({ card, start, end }) => (
                <li key={card.id} className="relative flex h-8 items-center gap-1">
                  <span className="flex w-36 shrink-0 items-center gap-1 pr-2">
                    <span className="min-w-0 flex-1 truncate text-xs text-aurora-fg">{card.title}</span>
                    <TifluxCardButton
                      card={card}
                      tifluxEnabled={tifluxEnabled}
                      onOpenTifluxCreate={onOpenTifluxCreate}
                  onOpenTifluxLink={onOpenTifluxLink}
                      compact
                    />
                  </span>
                  <div className="relative ml-0 h-full min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => onSelectCard(card.id)}
                      className="absolute top-1 h-6 rounded bg-board-accent/85 px-1 text-[10px] text-white hover:bg-board-accent"
                      style={{
                        left: `${leftPct(start)}%`,
                        width: `${widthPct(start, end)}%`,
                      }}
                      title={card.title}
                    >
                      <span className="block truncate">{card.title}</span>
                    </button>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      </section>
    </div>
  );
}
