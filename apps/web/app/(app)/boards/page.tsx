import { createClient } from "@/lib/supabase/server";
import { createBoard, createOrganization } from "./actions";
import { inputClass, btnPrimary, DEFAULT_BOARD_COLOR } from "@/lib/ui-classes";
import { DeadlineTiles, type DeadlineTileItem } from "@/components/home/deadline-tiles";
import { IconPicker } from "@/components/ui/icon-picker";
import { ColorPicker } from "@/components/ui/color-picker";
import { ProjectsViews } from "@/components/projects/projects-views";
import { ProjectsHubLayout } from "@/components/projects/projects-hub-shell";
import type { UpcomingTask } from "@/components/projects/project-hub-detail";
import type { ProjectBoardRow } from "@/components/projects/types";

export default async function BoardsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: memberships } = await supabase.from("memberships").select("org_id, role").limit(1);
  const orgId = memberships?.[0]?.org_id ?? null;
  const isOrgAdmin = memberships?.[0]?.role === "admin";

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
  const { data: boardsRaw } = await supabase
    .from("boards")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: true });

  const boardIds = (boardsRaw ?? []).map((b) => b.id);
  const creatorIds = [...new Set((boardsRaw ?? []).map((b) => b.created_by).filter(Boolean))] as string[];

  const [{ data: profiles }, { data: cardStats }, { data: boardMembersRaw }] = await Promise.all([
    creatorIds.length
      ? supabase.from("profiles").select("id, full_name").in("id", creatorIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string | null }[] }),
    boardIds.length
      ? supabase
          .from("cards")
          .select("board_id, due_date, completed_at")
          .in("board_id", boardIds)
          .is("completed_at", null)
      : Promise.resolve({ data: [] as { board_id: string; due_date: string | null; completed_at: string | null }[] }),
    boardIds.length
      ? supabase.from("board_members").select("board_id, user_id, role").in("board_id", boardIds)
      : Promise.resolve({ data: [] as { board_id: string; user_id: string; role: string }[] }),
  ]);

  const memberUserIds = [...new Set((boardMembersRaw ?? []).map((m) => m.user_id))];
  const { data: memberProfiles } = memberUserIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", memberUserIds)
    : { data: [] as { id: string; full_name: string | null }[] };
  const memberProfileById = new Map((memberProfiles ?? []).map((p) => [p.id, p]));

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
  const statsByBoard = new Map<string, { open: number; nextDue: string | null }>();
  const now = new Date();
  for (const c of cardStats ?? []) {
    const cur = statsByBoard.get(c.board_id) ?? { open: 0, nextDue: null };
    cur.open += 1;
    if (c.due_date && new Date(c.due_date) >= now) {
      if (!cur.nextDue || new Date(c.due_date) < new Date(cur.nextDue)) {
        cur.nextDue = c.due_date;
      }
    }
    statsByBoard.set(c.board_id, cur);
  }

  const boards: ProjectBoardRow[] = (boardsRaw ?? []).map((b) => {
    const st = statsByBoard.get(b.id);
    return {
      id: b.id,
      org_id: b.org_id,
      name: b.name,
      description: b.description,
      icon: b.icon,
      color: b.color,
      archived: b.archived,
      tiflux_enabled: b.tiflux_enabled ?? false,
      integrations: (b.integrations as Record<string, unknown>) ?? {},
      created_at: b.created_at,
      created_by: b.created_by,
      owner_name: b.created_by ? profileById.get(b.created_by) ?? null : null,
      open_cards: st?.open ?? 0,
      next_due: st?.nextDue ?? null,
    };
  });

  const boardMembersByBoardId: Record<string, { user_id: string; role: string; profile?: { id: string; full_name: string | null } }[]> = {};
  for (const bm of boardMembersRaw ?? []) {
    const list = boardMembersByBoardId[bm.board_id] ?? [];
    const profile = memberProfileById.get(bm.user_id);
    list.push({
      user_id: bm.user_id,
      role: bm.role,
      profile: profile ? { id: profile.id, full_name: profile.full_name } : undefined,
    });
    boardMembersByBoardId[bm.board_id] = list;
  }

  const upcomingTasksByBoard: Record<string, UpcomingTask[]> = {};
  const { data: allUpcomingTasks } = await supabase
    .from("cards")
    .select("id, title, due_date, board_id")
    .eq("org_id", orgId)
    .is("completed_at", null)
    .not("due_date", "is", null)
    .gte("due_date", now.toISOString())
    .order("due_date", { ascending: true });

  for (const c of allUpcomingTasks ?? []) {
    const list = upcomingTasksByBoard[c.board_id] ?? [];
    if (list.length < 10 && c.due_date) {
      list.push({ id: c.id, title: c.title, due_date: c.due_date });
      upcomingTasksByBoard[c.board_id] = list;
    }
  }

  const weekAhead = new Date(now);
  weekAhead.setDate(weekAhead.getDate() + 7);

  const { data: upcoming } = await supabase
    .from("cards")
    .select("id, title, due_date, completed_at, board_id, boards(name, color)")
    .eq("org_id", orgId)
    .not("due_date", "is", null)
    .is("completed_at", null)
    .gte("due_date", now.toISOString())
    .lte("due_date", weekAhead.toISOString())
    .order("due_date", { ascending: true })
    .limit(20);

  const deadlineItems: DeadlineTileItem[] = (upcoming ?? []).map((c) => {
    const board =
      c.boards && typeof c.boards === "object" && "name" in c.boards
        ? (c.boards as { name: string; color?: string | null })
        : null;
    return {
      id: c.id,
      title: c.title,
      due_date: c.due_date!,
      completed_at: c.completed_at,
      board_id: c.board_id,
      board_name: board?.name ?? "",
      board_color: board?.color ?? DEFAULT_BOARD_COLOR,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-aurora-fg">Projetos</h2>
        <p className="text-sm text-aurora-muted">{org?.name}</p>
      </div>

      <ProjectsHubLayout
        boards={boards}
        boardMembersByBoardId={boardMembersByBoardId}
        isOrgAdmin={isOrgAdmin}
        currentUserId={user?.id ?? null}
        deadlineItems={deadlineItems}
        upcomingTasksByBoard={upcomingTasksByBoard}
      >
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

        <ProjectsViews boards={boards} boardMembersByBoardId={boardMembersByBoardId} isOrgAdmin={isOrgAdmin} currentUserId={user?.id ?? null} />
      </ProjectsHubLayout>
    </div>
  );
}
