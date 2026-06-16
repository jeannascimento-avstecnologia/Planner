import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createBoard, createOrganization } from "./actions";
import { inputClass, btnPrimary, DEFAULT_BOARD_COLOR } from "@/lib/ui-classes";
import { DeadlineTiles, type DeadlineTileItem } from "@/components/home/deadline-tiles";
import { BoardIcon } from "@/components/board/board-icon";
import { IconPicker } from "@/components/ui/icon-picker";
import { ColorPicker } from "@/components/ui/color-picker";

export default async function BoardsPage() {
  const supabase = await createClient();

  const { data: memberships } = await supabase.from("memberships").select("org_id").limit(1);
  const orgId = memberships?.[0]?.org_id ?? null;

  if (!orgId) {
    return (
      <div className="mx-auto max-w-sm rounded-2xl border border-aurora-border bg-aurora-surface p-6">
        <h2 className="mb-1 text-lg font-semibold">Crie sua organizacao</h2>
        <p className="mb-4 text-sm text-aurora-muted">Voce ainda nao pertence a nenhuma organizacao.</p>
        <form action={createOrganization} className="flex gap-2">
          <input name="orgName" placeholder="Nome da organizacao" required className={inputClass} />
          <button className={btnPrimary + " shrink-0"}>Criar</button>
        </form>
      </div>
    );
  }

  const { data: org } = await supabase.from("organizations").select("name").eq("id", orgId).single();
  const { data: boards } = await supabase
    .from("boards")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: true });

  const now = new Date();
  const weekAhead = new Date(now);
  weekAhead.setDate(weekAhead.getDate() + 7);

  const { data: upcoming } = await supabase
    .from("cards")
    .select("id, title, due_date, completed_at, board_id, boards(name)")
    .eq("org_id", orgId)
    .not("due_date", "is", null)
    .is("completed_at", null)
    .gte("due_date", now.toISOString())
    .lte("due_date", weekAhead.toISOString())
    .order("due_date", { ascending: true })
    .limit(10);

  const deadlineItems: DeadlineTileItem[] = (upcoming ?? []).map((c) => ({
    id: c.id,
    title: c.title,
    due_date: c.due_date!,
    completed_at: c.completed_at,
    board_id: c.board_id,
    board_name:
      c.boards && typeof c.boards === "object" && "name" in c.boards
        ? String((c.boards as { name: string }).name)
        : "",
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-aurora-fg">Projetos</h2>
        <p className="text-sm text-aurora-muted">{org?.name}</p>
      </div>

      <DeadlineTiles items={deadlineItems} />

      <form
        action={createBoard}
        className="flex flex-wrap items-center gap-2 rounded-xl border border-aurora-border bg-aurora-surface p-3"
      >
        <input name="name" placeholder="Nome do projeto" required className={inputClass + " min-w-40 flex-1"} />
        <input
          name="description"
          placeholder="Descricao (opcional)"
          className={inputClass + " min-w-40 flex-1"}
        />
        <IconPicker name="icon" />
        <ColorPicker name="color" />
        <button className={btnPrimary + " shrink-0"}>Novo projeto</button>
      </form>

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(boards ?? []).map((board) => {
          const tint = board.color || DEFAULT_BOARD_COLOR;
          return (
            <li key={board.id}>
              <Link
                href={`/boards/${board.id}`}
                className="block rounded-xl border border-aurora-border bg-aurora-surface p-4 transition hover:-translate-y-0.5 hover:shadow-md"
                style={{ borderLeft: `4px solid ${tint}` }}
              >
                <div className="flex items-center gap-3">
                  <BoardIcon icon={board.icon} color={board.color} />
                  <p className="font-medium text-aurora-fg">{board.name}</p>
                </div>
                {board.description ? (
                  <p className="mt-2 line-clamp-2 text-sm text-aurora-muted">{board.description}</p>
                ) : null}
              </Link>
            </li>
          );
        })}
        {(boards ?? []).length === 0 ? (
          <li className="text-sm text-aurora-muted">Nenhum projeto ainda. Crie o primeiro acima.</li>
        ) : null}
      </ul>
    </div>
  );
}
