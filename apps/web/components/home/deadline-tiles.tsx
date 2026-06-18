import Link from "next/link";
import { formatDue, isOverdue } from "@/components/board/types";
import { DEFAULT_BOARD_COLOR } from "@/lib/ui-classes";

export type DeadlineTileItem = {
  id: string;
  title: string;
  due_date: string;
  completed_at: string | null;
  board_id: string;
  board_name: string;
  board_color: string;
};

type Props = { items: DeadlineTileItem[]; subtitle?: string };

const MAX_CHIPS_PER_DAY = 2;

function toDayKeyFromDate(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function toDayKey(iso: string): string {
  return iso.slice(0, 10);
}

function buildWeekDays(): Date[] {
  const start = new Date();
  start.setHours(12, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

/** Abrevia titulo para caber no cubo do dia. */
export function abbreviateTitle(title: string, max = 10): string {
  const t = title.trim();
  if (t.length <= max) return t;
  const word = t.split(/\s+/)[0];
  if (word.length <= max) return word;
  return `${t.slice(0, max - 1)}…`;
}

export function DeadlineTiles({ items, subtitle }: Props) {
  const week = buildWeekDays();
  const itemsByDay = new Map<string, DeadlineTileItem[]>();
  for (const item of items) {
    const key = toDayKey(item.due_date);
    const list = itemsByDay.get(key) ?? [];
    list.push(item);
    itemsByDay.set(key, list);
  }

  const todayKey = toDayKeyFromDate(new Date());

  return (
    <section className="rounded-xl border border-aurora-border bg-aurora-surface p-3">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-aurora-fg">Proximos 7 dias</h3>
          {subtitle ? <p className="text-xs text-aurora-muted">{subtitle}</p> : null}
        </div>
        <Link href="/calendar" className="text-xs text-aurora-accent hover:underline">
          Ver calendario
        </Link>
      </div>

      <div className="mb-4 grid grid-cols-7 gap-1">
        {week.map((d) => {
          const key = toDayKeyFromDate(d);
          const dayItems = itemsByDay.get(key) ?? [];
          const isToday = key === todayKey;
          const visible = dayItems.slice(0, MAX_CHIPS_PER_DAY);
          const overflow = dayItems.length - visible.length;

          return (
            <div
              key={key}
              className={`flex min-h-[4.5rem] flex-col rounded-lg border px-0.5 py-1 text-center ${
                isToday
                  ? "border-aurora-accent bg-aurora-accent-muted/40"
                  : "border-aurora-border bg-aurora-surface-2"
              }`}
            >
              <span className="text-[10px] uppercase text-aurora-muted">
                {d.toLocaleDateString("pt-BR", { weekday: "narrow" })}
              </span>
              <span className={`text-sm font-semibold ${isToday ? "text-aurora-accent" : "text-aurora-fg"}`}>
                {d.getDate()}
              </span>
              <div className="mt-0.5 flex flex-1 flex-col gap-0.5 px-0.5">
                {visible.map((item) => {
                  const color = item.board_color || DEFAULT_BOARD_COLOR;
                  return (
                    <Link
                      key={item.id}
                      href={`/boards/${item.board_id}`}
                      title={item.title}
                      className="block truncate rounded px-0.5 py-px text-[9px] font-medium leading-tight text-white"
                      style={{ backgroundColor: color }}
                    >
                      {abbreviateTitle(item.title)}
                    </Link>
                  );
                })}
                {overflow > 0 ? (
                  <span className="text-[9px] font-medium text-aurora-muted">+{overflow}</span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <h4 className="mb-2 text-xs font-medium text-aurora-muted">Prazos</h4>
      {items.length === 0 ? (
        <p className="text-xs text-aurora-muted">Nenhum prazo nos proximos 7 dias.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((c) => {
            const overdue = isOverdue(c.due_date, c.completed_at);
            const tint = c.board_color || DEFAULT_BOARD_COLOR;
            return (
              <li key={c.id}>
                <Link
                  href={`/boards/${c.board_id}`}
                  className={`block rounded-lg border bg-aurora-surface-2 px-2 py-1.5 transition hover:border-aurora-accent hover:shadow-sm ${
                    overdue ? "border-aurora-accent/50" : "border-aurora-border"
                  }`}
                  style={{ borderLeft: `3px solid ${tint}` }}
                >
                  <p className="text-[10px] font-medium uppercase text-aurora-muted">{formatDue(c.due_date)}</p>
                  <p className="line-clamp-1 text-xs font-medium text-aurora-fg">{c.title}</p>
                  {c.board_name ? (
                    <p className="line-clamp-1 text-[10px] text-aurora-muted">{c.board_name}</p>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
