import { createClient } from "@/lib/supabase/server";
import { getActiveOrgId, getActiveOrgMembership, listUserOrgs } from "@/lib/active-org";
import { isOrgAdminRole } from "@/lib/org-member-roles";
import { DEFAULT_BOARD_COLOR } from "@/lib/ui-classes";
import type { DeadlineTileItem } from "@/components/home/deadline-tiles";
import type { BoardMember } from "@/components/board/share-project-panel";
import type { UpcomingTask } from "@/components/projects/project-hub-detail";
import type { ProjectBoardRow } from "@/components/projects/types";

export type OrgProjectSection = {
  orgId: string;
  orgName: string;
  logoUrl: string | null;
  isActive: boolean;
  isOrgAdmin: boolean;
  boards: ProjectBoardRow[];
};

export type OrgProjectsData = {
  activeOrgId: string;
  activeOrgName: string | null;
  activeOrgLogoUrl: string | null;
  sections: OrgProjectSection[];
  orgId: string;
  orgName: string | null;
  isOrgAdmin: boolean;
  currentUserId: string | null;
  boards: ProjectBoardRow[];
  boardMembersByBoardId: Record<string, BoardMember[]>;
  upcomingTasksByBoard: Record<string, UpcomingTask[]>;
  deadlineItems: DeadlineTileItem[];
};

export type LoadOrgProjectsResult =
  | { kind: "no-org" }
  | { kind: "ok"; data: OrgProjectsData };

export async function loadOrgProjects(): Promise<LoadOrgProjectsResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const orgId = await getActiveOrgId();
  const membership = await getActiveOrgMembership();
  const userOrgs = await listUserOrgs();

  const { data: allAccessibleBoards } = await supabase
    .from("boards")
    .select("id, org_id, name, archived")
    .order("created_at", { ascending: true });

  const accessibleBoardCount = allAccessibleBoards?.length ?? 0;
  if (userOrgs.length === 0 && accessibleBoardCount === 0) {
    return { kind: "no-org" };
  }

  const isOrgAdmin = isOrgAdminRole(membership?.role);
  const effectiveOrgId = orgId ?? userOrgs[0]?.orgId ?? allAccessibleBoards?.[0]?.org_id ?? null;
  const { data: activeOrgRow } = effectiveOrgId
    ? await supabase.from("organizations").select("name, logo_url").eq("id", effectiveOrgId).maybeSingle()
    : { data: null };

  const { data: boardsRaw } = await supabase
    .from("boards")
    .select("*")
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

  const boardsByOrg = new Map<string, ProjectBoardRow[]>();
  for (const board of boards) {
    const list = boardsByOrg.get(board.org_id) ?? [];
    list.push(board);
    boardsByOrg.set(board.org_id, list);
  }

  const orgMetaById = new Map(userOrgs.map((o) => [o.orgId, o]));
  const sectionOrgIds = new Set<string>([
    ...userOrgs.map((o) => o.orgId),
    ...boards.map((b) => b.org_id),
  ]);

  const missingOrgIds = [...sectionOrgIds].filter((id) => !orgMetaById.has(id));
  if (missingOrgIds.length) {
    const { data: extraOrgs } = await supabase
      .from("organizations")
      .select("id, name, logo_url")
      .in("id", missingOrgIds);
    for (const o of extraOrgs ?? []) {
      orgMetaById.set(o.id, {
        orgId: o.id,
        name: o.name,
        slug: "",
        logoUrl: o.logo_url,
        role: "viewer",
        isOwner: false,
      });
    }
  }

  const sections: OrgProjectSection[] = [...sectionOrgIds]
    .map((id) => {
      const meta = orgMetaById.get(id);
      return {
        orgId: id,
        orgName: meta?.name ?? "Organizacao",
        logoUrl: meta?.logoUrl ?? null,
        isActive: id === effectiveOrgId,
        isOrgAdmin: isOrgAdminRole(meta?.role),
        boards: boardsByOrg.get(id) ?? [],
      };
    })
    .sort((a, b) => {
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
      return a.orgName.localeCompare(b.orgName, "pt-BR");
    });

  const boardMembersByBoardId: Record<string, BoardMember[]> = {};
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
  const upcomingQuery = supabase
    .from("cards")
    .select("id, title, due_date, board_id")
    .is("completed_at", null)
    .not("due_date", "is", null)
    .gte("due_date", now.toISOString())
    .order("due_date", { ascending: true });
  const { data: allUpcomingTasks } = boardIds.length
    ? await upcomingQuery.in("board_id", boardIds)
    : await upcomingQuery;

  for (const c of allUpcomingTasks ?? []) {
    const list = upcomingTasksByBoard[c.board_id] ?? [];
    if (list.length < 10 && c.due_date) {
      list.push({ id: c.id, title: c.title, due_date: c.due_date });
      upcomingTasksByBoard[c.board_id] = list;
    }
  }

  const weekAhead = new Date(now);
  weekAhead.setDate(weekAhead.getDate() + 7);

  const deadlineQuery = supabase
    .from("cards")
    .select("id, title, due_date, completed_at, board_id, boards(name, color)")
    .not("due_date", "is", null)
    .is("completed_at", null)
    .gte("due_date", now.toISOString())
    .lte("due_date", weekAhead.toISOString())
    .order("due_date", { ascending: true })
    .limit(20);
  const { data: upcoming } = boardIds.length
    ? await deadlineQuery.in("board_id", boardIds)
    : await deadlineQuery;

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

  return {
    kind: "ok",
    data: {
      activeOrgId: effectiveOrgId ?? "",
      activeOrgName: activeOrgRow?.name ?? null,
      activeOrgLogoUrl: activeOrgRow?.logo_url ?? null,
      sections,
      orgId: effectiveOrgId ?? "",
      orgName: activeOrgRow?.name ?? (orgId ? null : "Projetos compartilhados"),
      isOrgAdmin,
      currentUserId: user?.id ?? null,
      boards,
      boardMembersByBoardId,
      upcomingTasksByBoard,
      deadlineItems,
    },
  };
}
