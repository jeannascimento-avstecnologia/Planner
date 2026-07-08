import Link from "next/link";
import { redirect } from "next/navigation";
import { getActiveOrgId } from "@/lib/active-org";
import { loadCalendarPageCached } from "@/lib/loaders/cached-queries";
import { getSessionUser } from "@/lib/loaders/session";
import { formatDue } from "@/components/board/types";
import { DEFAULT_BOARD_COLOR } from "@/lib/ui-classes";
import { PAGE_COPY } from "@/lib/page-copy";
import { CalendarClient } from "./calendar-client";
import { IcalFeedButton } from "./ical-feed-button";

export default async function CalendarPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const orgId = await getActiveOrgId();
  if (!orgId) {
    return <p className="text-aurora-muted">Sem organizacao.</p>;
  }

  const { events, boards, columns } = await loadCalendarPageCached(user.id, orgId);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-aurora-fg">Calendario de prazos</h2>
          <p className="text-sm text-aurora-muted">{PAGE_COPY.calendar.description}</p>
        </div>
        <IcalFeedButton />
      </div>

      <CalendarClient events={events} orgId={orgId} boards={boards} columns={columns} />

      <section className="rounded-xl border border-aurora-border bg-aurora-surface p-4">
        <h3 className="mb-2 text-sm font-semibold">Lista</h3>
        <ul className="space-y-2 text-sm">
          {events.length === 0 ? (
            <li className="text-aurora-muted">Nenhum prazo neste periodo.</li>
          ) : (
            events.map((e) => {
              const tint = e.board_color || DEFAULT_BOARD_COLOR;
              return (
                <li key={e.id} className="flex justify-between gap-2">
                  <Link
                    href={`/boards/${e.board_id}`}
                    className="text-aurora-fg hover:underline"
                    style={{ borderLeft: `3px solid ${tint}`, paddingLeft: 8 }}
                  >
                    {e.title}
                  </Link>
                  <span className={e.overdue ? "text-red-600" : "text-aurora-muted"}>
                    {formatDue(e.due_date)}
                  </span>
                </li>
              );
            })
          )}
        </ul>
      </section>
    </div>
  );
}
