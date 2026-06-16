import Link from "next/link";
import { formatDue, isOverdue } from "@/components/board/types";

export type DeadlineTileItem = {
  id: string;
  title: string;
  due_date: string;
  completed_at: string | null;
  board_id: string;
  board_name: string;
};

type Props = { items: DeadlineTileItem[] };

function tileDateParts(iso: string): { day: string; month: string } {
  const d = new Date(iso);
  return {
    day: String(d.getDate()),
    month: d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
  };
}

export function DeadlineTiles({ items }: Props) {
  if (items.length === 0) return null;

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-aurora-fg">Proximos prazos</h3>
        <Link href="/calendar" className="text-xs text-aurora-accent hover:underline">
          Ver calendario
        </Link>
      </div>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((c) => {
          const { day, month } = tileDateParts(c.due_date);
          const overdue = isOverdue(c.due_date, c.completed_at);
          return (
            <li key={c.id}>
              <Link
                href={`/boards/${c.board_id}`}
                className={`flex aspect-square flex-col rounded-xl border bg-aurora-surface p-3 transition hover:border-aurora-accent hover:shadow-sm ${
                  overdue ? "border-aurora-accent ring-1 ring-aurora-accent/30" : "border-aurora-border"
                }`}
              >
                <div className="text-center">
                  <span className={`text-2xl font-bold ${overdue ? "text-aurora-accent" : "text-aurora-fg"}`}>
                    {day}
                  </span>
                  <span className="ml-1 text-xs uppercase text-aurora-muted">{month}</span>
                </div>
                <p className="mt-2 line-clamp-3 flex-1 text-sm font-medium text-aurora-fg">{c.title}</p>
                {c.board_name ? (
                  <p className="mt-1 truncate text-xs text-aurora-muted">{c.board_name}</p>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
