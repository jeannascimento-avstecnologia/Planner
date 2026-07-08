import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { loadBoardDashboardCached } from "@/lib/loaders/dashboard-cache";
import { BoardDashboardCharts } from "@/components/dashboard/board-dashboard-charts";
import { PAGE_COPY } from "@/lib/page-copy";
import { linkClass } from "@/lib/ui-classes";

type Props = { params: Promise<{ boardId: string }> };

export default async function BoardDashboardPage({ params }: Props) {
  const { boardId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: board } = await supabase.from("boards").select("id, name, org_id").eq("id", boardId).maybeSingle();
  if (!board) notFound();

  const dashboard = await loadBoardDashboardCached(boardId, user.id);
  const chartData = "error" in dashboard ? { throughput: [], cfd: [], bottlenecks: [], leadTime: { avgHours: 0, samples: 0 } } : dashboard;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-6" data-testid="board-dashboard-page">
      <header className="space-y-2">
        <Link href={`/boards/${boardId}`} className={linkClass + " text-sm"}>
          ← Voltar ao projeto
        </Link>
        <h1 className="text-2xl font-semibold text-aurora-fg">Dashboard — {board.name}</h1>
        <p className="text-sm text-aurora-muted">{PAGE_COPY.boardDashboard.description}</p>
      </header>
      {"error" in dashboard ? (
        <p className="text-sm text-amber-600" data-testid="board-dashboard-error">
          {dashboard.error}
        </p>
      ) : null}
      <BoardDashboardCharts data={chartData} />
    </div>
  );
}
