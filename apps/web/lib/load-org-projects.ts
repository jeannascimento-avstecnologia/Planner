import { createClient } from "@/lib/supabase/server";
import { cache } from "react";
import {
  getActiveOrgIdCached,
  getSessionUser,
} from "@/lib/loaders/session";
import { isOrgAdminRole, isOrgOwnerRole } from "@/lib/org-member-roles";
import { canCreateInDepartment } from "@/lib/department-roles";
import { DEFAULT_BOARD_COLOR } from "@/lib/ui-classes";
import type { DeadlineTileItem } from "@/components/home/deadline-tiles";
import type { BoardMember } from "@/components/board/share-project-panel";
import type { UpcomingTask } from "@/components/projects/project-hub-detail";
import type { ProjectBoardRow } from "@/components/projects/types";
import type { CachedSupabaseClient } from "@/lib/loaders/cached-supabase";
import type { UserOrgRow } from "@/lib/active-org-constants";
import type { Database } from "@nextgen/contracts";

type MembershipRole = Database["public"]["Enums"]["membership_role"];
type OrgSupabase = CachedSupabaseClient;

export type DepartmentProjectGroup = {
  departmentId: string | null;
  name: string;
  icon: string | null;
  color: string | null;
  hasAccess: boolean;
  boards: ProjectBoardRow[];
};

export type OrgProjectSection = {
  orgId: string;
  orgName: string;
  logoUrl: string | null;
  isActive: boolean;
  isOrgAdmin: boolean;
  isOrgOwner: boolean;
  boards: ProjectBoardRow[];
  departmentGroups: DepartmentProjectGroup[];
  departments: { id: string; name: string; icon: string | null; color: string | null }[];
};

export type OrgProjectsData = {
  activeOrgId: string;
  activeOrgName: string | null;
  activeOrgLogoUrl: string | null;
  sections: OrgProjectSection[];
  orgId: string;
  orgName: string | null;
  isOrgAdmin: boolean;
  isOrgOwner: boolean;
  currentUserId: string | null;
  boards: ProjectBoardRow[];
  boardMembersByBoardId: Record<string, BoardMember[]>;
  upcomingTasksByBoard: Record<string, UpcomingTask[]>;
  deadlineItems: DeadlineTileItem[];
  creatableDepartments: { orgId: string; departmentId: string | null; label: string }[];
};

export type LoadOrgProjectsResult =
  | { kind: "no-org" }
  | { kind: "ok"; data: OrgProjectsData };

const getAccessibleBoardIds = cache(async (): Promise<string[]> => {
  const supabase = await createClient();
  const { data } = await supabase.from("boards").select("id");
  return (data ?? []).map((b) => b.id);
});

export async function loadDeadlines(): Promise<DeadlineTileItem[]> {
  const supabase = await createClient();
  const boardIds = await getAccessibleBoardIds();
  if (!boardIds.length) return [];

  const now = new Date();
  const weekAhead = new Date(now);
  weekAhead.setDate(weekAhead.getDate() + 7);

  const { data: upcoming } = await supabase
    .from("cards")
    .select("id, title, due_date, completed_at, board_id, boards(name, color)")
    .not("due_date", "is", null)
    .is("completed_at", null)
    .gte("due_date", now.toISOString())
    .lte("due_date", weekAhead.toISOString())
    .in("board_id", boardIds)
    .order("due_date", { ascending: true })
    .limit(20);

  return (upcoming ?? []).map((c) => {
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
}

export async function loadOrgProjects(): Promise<LoadOrgProjectsResult> {
  return loadOrgProjectsImpl();
}

async function fetchUserOrgs(supabase: OrgSupabase, userId: string): Promise<UserOrgRow[]> {
  const { data: memberships } = await supabase
    .from("memberships")
    .select("org_id, role, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (!memberships?.length) return [];

  const orgIds = memberships.map((m) => m.org_id);
  const { data: orgs } = await supabase.from("organizations").select("id, name, slug, logo_url").in("id", orgIds);
  const orgById = new Map((orgs ?? []).map((o) => [o.id, o]));

  return memberships.flatMap((m) => {
    const org = orgById.get(m.org_id);
    if (!org) return [];
    return [
      {
        orgId: org.id,
        name: org.name,
        slug: org.slug,
        logoUrl: org.logo_url,
        role: m.role as MembershipRole,
        isOwner: m.role === "owner",
      },
    ];
  });
}

/** Fetch home/projects data — usado por React cache e unstable_cache (token estatico). */
export async function fetchOrgProjectsData(
  supabase: OrgSupabase,
  userId: string,
  activeOrgId: string | null,
): Promise<LoadOrgProjectsResult> {
  const userOrgs = await fetchUserOrgs(supabase, userId);

  const BOARD_COLUMNS =
    "id, org_id, name, description, icon, color, department_id, archived, tiflux_enabled, integrations, created_at, created_by";

  const { data: boardsRaw } = await supabase
    .from("boards")
    .select(BOARD_COLUMNS)
    .order("created_at", { ascending: true });

  const accessibleBoardCount = boardsRaw?.length ?? 0;
  if (userOrgs.length === 0 && accessibleBoardCount === 0) {
    return { kind: "no-org" };
  }

  const { data: membershipRow } = activeOrgId
    ? await supabase
        .from("memberships")
        .select("role")
        .eq("org_id", activeOrgId)
        .eq("user_id", userId)
        .maybeSingle()
    : { data: null };

  const isOrgAdmin = isOrgAdminRole(membershipRow?.role);
  const effectiveOrgId = activeOrgId ?? userOrgs[0]?.orgId ?? boardsRaw?.[0]?.org_id ?? null;

  const orgIdsForDepts = [...new Set(userOrgs.map((o) => o.orgId))];
  const [{ data: departmentsRaw }, { data: myDeptMemberships }, { data: activeOrgRow }] = await Promise.all([
    orgIdsForDepts.length
      ? supabase.from("departments").select("id, org_id, name, icon, color").in("org_id", orgIdsForDepts)
      : Promise.resolve({ data: [] as { id: string; org_id: string; name: string; icon: string | null; color: string | null }[] }),
    userId
      ? supabase.from("department_members").select("department_id, org_id, role").eq("user_id", userId)
      : Promise.resolve({ data: [] as { department_id: string; org_id: string; role: string }[] }),
    effectiveOrgId
      ? supabase.from("organizations").select("name, logo_url").eq("id", effectiveOrgId).maybeSingle()
      : Promise.resolve({ data: null as { name: string; logo_url: string | null } | null }),
  ]);

  const deptRoleById = new Map((myDeptMemberships ?? []).map((m) => [m.department_id, m.role]));
  const deptsByOrg = new Map<string, { id: string; name: string; icon: string | null; color: string | null }[]>();
  for (const d of departmentsRaw ?? []) {
    const list = deptsByOrg.get(d.org_id) ?? [];
    list.push({ id: d.id, name: d.name, icon: d.icon, color: d.color });
    deptsByOrg.set(d.org_id, list);
  }

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
      ? supabase.from("board_members").select("board_id, user_id, role, preset_id").in("board_id", boardIds)
      : Promise.resolve({
          data: [] as { board_id: string; user_id: string; role: string; preset_id: string | null }[],
        }),
  ]);

  const memberUserIds = [...new Set((boardMembersRaw ?? []).map((m) => m.user_id))];
  const presetIds = [
    ...new Set(
      (boardMembersRaw ?? [])
        .map((m) => m.preset_id)
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    ),
  ];
  const now = new Date();
  const weekAhead = new Date(now);
  weekAhead.setDate(weekAhead.getDate() + 7);

  const upcomingQuery = supabase
    .from("cards")
    .select("id, title, due_date, board_id")
    .is("completed_at", null)
    .not("due_date", "is", null)
    .gte("due_date", now.toISOString())
    .order("due_date", { ascending: true });

  const deadlineQuery = supabase
    .from("cards")
    .select("id, title, due_date, completed_at, board_id, boards(name, color)")
    .not("due_date", "is", null)
    .is("completed_at", null)
    .gte("due_date", now.toISOString())
    .lte("due_date", weekAhead.toISOString())
    .order("due_date", { ascending: true })
    .limit(20);

  const [{ data: memberProfiles }, { data: presetNameRows }, { data: allUpcomingTasks }, { data: upcoming }] =
    await Promise.all([
      memberUserIds.length
        ? supabase.from("profiles").select("id, full_name").in("id", memberUserIds)
        : Promise.resolve({ data: [] as { id: string; full_name: string | null }[] }),
      presetIds.length
        ? supabase.from("access_presets").select("id, name").in("id", presetIds)
        : Promise.resolve({ data: [] as { id: string; name: string }[] }),
      boardIds.length ? upcomingQuery.in("board_id", boardIds) : upcomingQuery,
      boardIds.length ? deadlineQuery.in("board_id", boardIds) : deadlineQuery,
    ]);
  const memberProfileById = new Map((memberProfiles ?? []).map((p) => [p.id, p]));

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
  const statsByBoard = new Map<string, { open: number; nextDue: string | null }>();
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
      department_id: b.department_id ?? null,
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
      const orgBoards = boardsByOrg.get(id) ?? [];
      const orgDepts = deptsByOrg.get(id) ?? [];
      const sectionOwner = isOrgOwnerRole(meta?.role);
      const departmentGroups: DepartmentProjectGroup[] = [
        {
          departmentId: null,
          name: "Geral",
          icon: null,
          color: null,
          hasAccess: true,
          boards: orgBoards.filter((b) => !b.department_id),
        },
        ...orgDepts
          .slice()
          .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
          .map((dept) => ({
            departmentId: dept.id,
            name: dept.name,
            icon: dept.icon,
            color: dept.color,
            hasAccess: sectionOwner || deptRoleById.has(dept.id),
            boards: orgBoards.filter((b) => b.department_id === dept.id),
          }))
          .filter((g) => g.boards.length > 0 || g.hasAccess),
      ];
      return {
        orgId: id,
        orgName: meta?.name ?? "Organizacao",
        logoUrl: meta?.logoUrl ?? null,
        isActive: id === effectiveOrgId,
        isOrgAdmin: isOrgAdminRole(meta?.role),
        isOrgOwner: sectionOwner,
        boards: orgBoards,
        departmentGroups,
        departments: orgDepts,
      };
    })
    .sort((a, b) => {
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
      return a.orgName.localeCompare(b.orgName, "pt-BR");
    });

  const boardMembersByBoardId: Record<string, BoardMember[]> = {};
  const presetNameById = new Map((presetNameRows ?? []).map((p) => [p.id, p.name]));
  for (const bm of boardMembersRaw ?? []) {
    const list = boardMembersByBoardId[bm.board_id] ?? [];
    const profile = memberProfileById.get(bm.user_id);
    list.push({
      user_id: bm.user_id,
      role: bm.role,
      preset_id: bm.preset_id ?? null,
      presetName: bm.preset_id ? presetNameById.get(bm.preset_id) : undefined,
      profile: profile ? { id: profile.id, full_name: profile.full_name } : undefined,
    });
    boardMembersByBoardId[bm.board_id] = list;
  }

  const upcomingTasksByBoard: Record<string, UpcomingTask[]> = {};

  for (const c of allUpcomingTasks ?? []) {
    const list = upcomingTasksByBoard[c.board_id] ?? [];
    if (list.length < 10 && c.due_date) {
      list.push({ id: c.id, title: c.title, due_date: c.due_date });
      upcomingTasksByBoard[c.board_id] = list;
    }
  }

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

  const creatableDepartments: { orgId: string; departmentId: string | null; label: string }[] = [];
  for (const org of userOrgs) {
    if (canCreateInDepartment(org.role, null, org.isOwner)) {
      creatableDepartments.push({ orgId: org.orgId, departmentId: null, label: `${org.name} — Geral` });
    }
    for (const dept of deptsByOrg.get(org.orgId) ?? []) {
      const deptRole = deptRoleById.get(dept.id);
      if (canCreateInDepartment(org.role, deptRole, org.isOwner)) {
        creatableDepartments.push({
          orgId: org.orgId,
          departmentId: dept.id,
          label: `${org.name} — ${dept.name}`,
        });
      }
    }
  }

  return {
    kind: "ok",
    data: {
      activeOrgId: effectiveOrgId ?? "",
      activeOrgName: activeOrgRow?.name ?? null,
      activeOrgLogoUrl: activeOrgRow?.logo_url ?? null,
      sections,
      orgId: effectiveOrgId ?? "",
      orgName: activeOrgRow?.name ?? (activeOrgId ? null : "Projetos compartilhados"),
      isOrgAdmin,
      isOrgOwner: isOrgOwnerRole(membershipRow?.role),
      currentUserId: userId,
      boards,
      boardMembersByBoardId,
      upcomingTasksByBoard,
      deadlineItems,
      creatableDepartments,
    },
  };
}

const loadOrgProjectsImpl = cache(async (): Promise<LoadOrgProjectsResult> => {
  const supabase = await createClient();
  const user = await getSessionUser();
  const orgId = await getActiveOrgIdCached();
  if (!user) return { kind: "no-org" };
  return fetchOrgProjectsData(supabase, user.id, orgId);
});
