import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDue, isOverdue } from "@/components/board/types";
import { CalendarClient } from "./calendar-client";
import { IcalFeedButton } from "./ical-feed-button";

export default async function CalendarPage() {
  const supabase = await createClient();
  const { data: memberships } = await supabase.from("memberships").select("org_id").limit(1);
  const orgId = memberships?.[0]?.org_id;
  if (!orgId) {
    return <p className="text-aurora-muted">Sem organizacao.</p>;
  }

  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 2);

  const [{ data: cards }, { data: boards }, { data: columns }] = await Promise.all([
    supabase
      .from("cards")
      .select("id, title, due_date, completed_at, board_id, boards(name)")
      .eq("org_id", orgId)
      .not("due_date", "is", null)
      .gte("due_date", start.toISOString())
      .lte("due_date", end.toISOString())
      .order("due_date"),
    supabase.from("boards").select("id, name").eq("org_id", orgId).order("name"),
    supabase.from("columns").select("id, board_id, name").eq("org_id", orgId).order("position"),
  ]);

  const events = (cards ?? []).map((c) => ({
    id: c.id,
    title: c.title,
    due_date: c.due_date!,
    board_id: c.board_id,
    board_name:
      c.boards && typeof c.boards === "object" && "name" in c.boards
        ? String((c.boards as { name: string }).name)
        : "",
    overdue: isOverdue(c.due_date, c.completed_at),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-aurora-fg">Calendario de prazos</h2>
          <p className="text-sm text-aurora-muted">Clique em um dia para adicionar ou vincular prazos</p>
        </div>
        <IcalFeedButton />
      </div>

      <CalendarClient
        events={events}
        orgId={orgId}
        boards={boards ?? []}
        columns={columns ?? []}
      />

      <section className="rounded-xl border border-aurora-border bg-aurora-surface p-4">
        <h3 className="mb-2 text-sm font-semibold">Lista</h3>
        <ul className="space-y-2 text-sm">
          {events.length === 0 ? (
            <li className="text-aurora-muted">Nenhum prazo neste periodo.</li>
          ) : (
            events.map((e) => (
              <li key={e.id} className="flex justify-between gap-2">
                <Link href={`/boards/${e.board_id}`} className="text-aurora-fg hover:text-aurora-accent">
                  {e.title}
                  {e.board_name ? <span className="text-aurora-muted"> · {e.board_name}</span> : null}
                </Link>
                <span className={e.overdue ? "font-medium text-aurora-accent" : "text-aurora-muted"}>
                  {formatDue(e.due_date)}
                </span>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
