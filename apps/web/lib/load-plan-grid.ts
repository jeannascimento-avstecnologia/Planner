import { createClient } from "@/lib/supabase/server";
import type { CachedSupabaseClient } from "@/lib/loaders/cached-supabase";
import { buildDayTotals, buildUtilizationDays } from "@/lib/plan/rollup";
import { classifyPlanSidebarBucket } from "@/lib/plan/classify-sidebar";
import { normalizeWorkDateIso } from "@/lib/workload/work-date";
import { buildMemberDayHours, sumDayHours } from "@/lib/workload/day-grid";
import { workloadWeekAnchor } from "@/lib/workload/anchor";
import type { PlanGridData, PlanGridRow, PlanOrgSection, PlanSidebarCard } from "@/lib/plan/types";
import type { UserOrgRow } from "@/lib/active-org-constants";
import { buildPlanVisibleDayRange, buildWorkload15DayRange, dailyCapacityFromWeekly, formatDateIso } from "@/lib/plan/window";

type CardRow = {
  id: string;
  title: string;
  description: string | null;
  board_id: string;
  assignee_id: string | null;
  estimated_hours: number | null;
  target_date: string | null;
  due_date: string | null;
  start_date: string | null;
  personal_plan_at: string | null;
};

type AllocRow = {
  card_id: string;
  work_date: string;
  hours: number;
};

function cardOnPlanGrid(card: CardRow, allocByCard: Map<string, Record<string, number>>): boolean {
  if (card.personal_plan_at) return true;
  const cells = allocByCard.get(card.id) ?? {};
  return Object.values(cells).some((h) => h > 0);
}

function buildAllocByCard(allocs: AllocRow[]): Map<string, Record<string, number>> {
  const allocByCard = new Map<string, Record<string, number>>();
  for (const a of allocs) {
    const cells = allocByCard.get(a.card_id) ?? {};
    const dayKey = normalizeWorkDateIso(a.work_date);
    if (a.hours <= 0) continue;
    cells[dayKey] = (cells[dayKey] ?? 0) + a.hours;
    allocByCard.set(a.card_id, cells);
  }
  return allocByCard;
}

function buildPlanGridDataForOrg(
  windowStart: Date,
  showWeekends: boolean,
  canEdit: boolean,
  boardNames: Record<string, string>,
  weeklyCapacity: number,
  cardList: CardRow[],
  allocs: AllocRow[],
): PlanGridData {
  const dayDates = buildPlanVisibleDayRange(windowStart, showWeekends);
  const dayKeys = dayDates.map(formatDateIso);
  const todayIso = formatDateIso(new Date());
  const dailyCapacity = dailyCapacityFromWeekly(weeklyCapacity);
  const allocByCard = buildAllocByCard(allocs);

  const rows: PlanGridRow[] = cardList
    .filter((c) => cardOnPlanGrid(c, allocByCard))
    .map((c) => {
      const cells = allocByCard.get(c.id) ?? {};
      const totalFromCells = Object.values(cells).reduce((s, h) => s + h, 0);
      return {
        cardId: c.id,
        boardId: c.board_id,
        boardName: boardNames[c.board_id] ?? "Projeto",
        title: c.title,
        description: c.description,
        startDate: c.start_date,
        targetDate: c.target_date,
        dueDate: c.due_date,
        personalPlanAt: c.personal_plan_at,
        cells,
        totalHours: totalFromCells,
        estimatedHours: c.estimated_hours != null ? Number(c.estimated_hours) : null,
      };
    });

  const scheduledIds = new Set(cardList.filter((c) => cardOnPlanGrid(c, allocByCard)).map((c) => c.id));

  const sidebar: PlanSidebarCard[] = cardList
    .map((c) => {
      const bucket = classifyPlanSidebarBucket(c, scheduledIds.has(c.id), todayIso);
      if (!bucket) return null;
      return {
        cardId: c.id,
        boardId: c.board_id,
        boardName: boardNames[c.board_id] ?? "Projeto",
        title: c.title,
        description: c.description,
        estimatedHours: c.estimated_hours != null ? Number(c.estimated_hours) : null,
        startDate: c.start_date,
        targetDate: c.target_date,
        dueDate: c.due_date,
        bucket,
      };
    })
    .filter((s): s is PlanSidebarCard => s !== null);

  const dayTotals = buildDayTotals(rows, dayKeys);
  const days = buildUtilizationDays(dayKeys, dayTotals, dailyCapacity);

  return {
    days,
    rows,
    sidebar,
    dailyCapacityHours: dailyCapacity,
    canEdit,
  };
}

async function loadBoardNameMap(orgId: string): Promise<Record<string, string>> {
  const supabase = await createClient();
  const { data: boards } = await supabase.from("boards").select("id, name").eq("org_id", orgId);
  return Object.fromEntries((boards ?? []).map((b) => [b.id, b.name]));
}

export async function fetchPlanGridsForUser(
  supabase: CachedSupabaseClient,
  userId: string,
  windowStart: Date,
  orgs: UserOrgRow[],
  showWeekends = true,
): Promise<PlanOrgSection[]> {
  if (orgs.length === 0) return [];

  const orgIds = orgs.map((o) => o.orgId);
  const dayKeys = buildPlanVisibleDayRange(windowStart, showWeekends).map(formatDateIso);
  const from = dayKeys[0]!;
  const to = dayKeys[dayKeys.length - 1]!;

  const [{ data: memberships }, { data: boards }, { data: cards }, { data: allocData }, { data: orgRows }] =
    await Promise.all([
    supabase.from("memberships").select("org_id, weekly_capacity_hours").eq("user_id", userId).in("org_id", orgIds),
    supabase.from("boards").select("id, name, org_id").in("org_id", orgIds).order("name"),
    supabase
      .from("cards")
      .select(
        "id, org_id, title, description, board_id, assignee_id, estimated_hours, target_date, due_date, start_date, personal_plan_at",
      )
      .in("org_id", orgIds)
      .eq("assignee_id", userId)
      .is("completed_at", null),
    supabase
      .from("card_workload_allocations")
      .select("card_id, work_date, hours")
      .in("org_id", orgIds)
      .eq("user_id", userId)
      .gte("work_date", from)
      .lte("work_date", to),
    supabase.from("organizations").select("id, logo_url").in("id", orgIds),
  ]);

  const logoByOrgId = Object.fromEntries((orgRows ?? []).map((o) => [o.id as string, o.logo_url as string | null]));

  const capacityByOrg = Object.fromEntries(
    (memberships ?? []).map((m) => [m.org_id as string, Number(m.weekly_capacity_hours ?? 40)]),
  );

  const boardsByOrg = new Map<string, { id: string; name: string }[]>();
  const boardNamesByOrg = new Map<string, Record<string, string>>();
  for (const b of boards ?? []) {
    const orgId = b.org_id as string;
    const list = boardsByOrg.get(orgId) ?? [];
    list.push({ id: b.id as string, name: b.name as string });
    boardsByOrg.set(orgId, list);
    const names = boardNamesByOrg.get(orgId) ?? {};
    names[b.id as string] = b.name as string;
    boardNamesByOrg.set(orgId, names);
  }

  const cardsByOrg = new Map<string, CardRow[]>();
  for (const c of (cards ?? []) as (CardRow & { org_id: string })[]) {
    const orgId = c.org_id;
    const list = cardsByOrg.get(orgId) ?? [];
    list.push(c);
    cardsByOrg.set(orgId, list);
  }

  const cardIds = new Set((cards ?? []).map((c) => c.id as string));
  const allocs: AllocRow[] = (allocData ?? [])
    .filter((a) => cardIds.has(a.card_id as string))
    .map((a) => ({
      card_id: a.card_id as string,
      work_date: a.work_date as string,
      hours: Number(a.hours),
    }));

  return orgs.map((org) => {
    const orgCards = cardsByOrg.get(org.orgId) ?? [];
    const orgCardIds = new Set(orgCards.map((c) => c.id));
    const orgAllocs = allocs.filter((a) => orgCardIds.has(a.card_id));
    return {
      orgId: org.orgId,
      orgName: org.name,
      orgLogoUrl: logoByOrgId[org.orgId] ?? org.logoUrl ?? null,
      initialData: buildPlanGridDataForOrg(
        windowStart,
        showWeekends,
        org.role !== "viewer",
        boardNamesByOrg.get(org.orgId) ?? {},
        capacityByOrg[org.orgId] ?? 40,
        orgCards,
        orgAllocs,
      ),
      boards: boardsByOrg.get(org.orgId) ?? [],
    };
  });
}

export async function loadPlanGridsForUser(
  userId: string,
  windowStart: Date,
  orgs: UserOrgRow[],
  showWeekends = true,
): Promise<PlanOrgSection[]> {
  const supabase = await createClient();
  return fetchPlanGridsForUser(supabase, userId, windowStart, orgs, showWeekends);
}

export async function loadPlanGrid(
  orgId: string,
  userId: string,
  windowStart: Date,
  canEdit: boolean,
  boardNames?: Record<string, string>,
): Promise<PlanGridData> {
  const supabase = await createClient();
  const dayKeys = buildPlanVisibleDayRange(windowStart, false).map(formatDateIso);

  const { data: membership } = await supabase
    .from("memberships")
    .select("weekly_capacity_hours")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .maybeSingle();

  const { data: cards } = await supabase
    .from("cards")
    .select("id, title, description, board_id, assignee_id, estimated_hours, target_date, due_date, start_date, personal_plan_at")
    .eq("org_id", orgId)
    .eq("assignee_id", userId)
    .is("completed_at", null);

  const cardList = (cards ?? []) as CardRow[];
  const cardIds = cardList.map((c) => c.id);

  let allocs: AllocRow[] = [];
  if (cardIds.length > 0) {
    const from = dayKeys[0]!;
    const to = dayKeys[dayKeys.length - 1]!;
    const { data: allocData } = await supabase
      .from("card_workload_allocations")
      .select("card_id, work_date, hours")
      .eq("org_id", orgId)
      .eq("user_id", userId)
      .in("card_id", cardIds)
      .gte("work_date", from)
      .lte("work_date", to);
    allocs = (allocData ?? []).map((a) => ({
      card_id: a.card_id,
      work_date: a.work_date as string,
      hours: Number(a.hours),
    }));
  }

  const names = boardNames ?? (await loadBoardNameMap(orgId));

  return buildPlanGridDataForOrg(
    windowStart,
    false,
    canEdit,
    names,
    Number(membership?.weekly_capacity_hours ?? 40),
    cardList,
    allocs,
  );
}

export type Workload15DayMember = {
  userId: string;
  fullName: string;
  capacityHours: number;
  days: Record<string, number>;
  totalHours: number;
  cardCount: number;
};

export async function loadWorkload15Days(
  orgId: string,
  windowStart: Date,
  opts?: { client?: CachedSupabaseClient },
): Promise<Workload15DayMember[]> {
  const supabase = opts?.client ?? (await createClient());
  const dayKeys = buildWorkload15DayRange(windowStart).map(formatDateIso);
  const from = dayKeys[0]!;
  const to = dayKeys[dayKeys.length - 1]!;

  const [{ data: allocs }, { data: memberships }, { data: cards }] = await Promise.all([
    supabase
      .from("card_workload_allocations")
      .select("user_id, card_id, work_date, hours")
      .eq("org_id", orgId)
      .gte("work_date", from)
      .lte("work_date", to)
      .gt("hours", 0),
    supabase.from("memberships").select("user_id, weekly_capacity_hours").eq("org_id", orgId),
    supabase
      .from("cards")
      .select("id, assignee_id, estimated_hours, target_date, due_date, start_date")
      .eq("org_id", orgId)
      .not("assignee_id", "is", null)
      .is("completed_at", null)
      .gt("estimated_hours", 0),
  ]);

  const byUser = buildMemberDayHours(
    dayKeys,
    (allocs ?? []).map((a) => ({
      user_id: a.user_id as string,
      card_id: a.card_id as string,
      work_date: a.work_date as string,
      hours: Number(a.hours),
    })),
    (cards ?? []).map((c) => ({
      id: c.id as string,
      assignee_id: c.assignee_id as string | null,
      estimated_hours: c.estimated_hours != null ? Number(c.estimated_hours) : null,
      target_date: c.target_date as string | null,
      due_date: c.due_date as string | null,
      start_date: c.start_date as string | null,
    })),
  );

  const cardCountByUser = new Map<string, number>();
  const cardsWithDailyPlan = new Set((allocs ?? []).map((a) => a.card_id as string));
  for (const c of cards ?? []) {
    if (!c.assignee_id) continue;
    const uid = c.assignee_id as string;
    const anchor = workloadWeekAnchor(c);
    const anchorDay = anchor ? anchor.slice(0, 10) : null;
    const inRange = anchorDay ? dayKeys.includes(anchorDay) : false;
    const hasAlloc = cardsWithDailyPlan.has(c.id as string);
    if (hasAlloc || inRange) {
      cardCountByUser.set(uid, (cardCountByUser.get(uid) ?? 0) + 1);
    }
  }

  const membershipMap = Object.fromEntries(
    (memberships ?? []).map((m) => [m.user_id as string, m]),
  );

  const userIds = [
    ...new Set([
      ...(memberships ?? []).map((m) => m.user_id as string),
      ...byUser.keys(),
    ]),
  ];

  if (userIds.length === 0) return [];

  const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", userIds);
  const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));

  return userIds
    .map((userId) => {
      const days = byUser.get(userId) ?? {};
      const totalHours = sumDayHours(days);
      return {
        userId,
        fullName: profileMap[userId]?.full_name ?? userId.slice(0, 8),
        capacityHours: Number(membershipMap[userId]?.weekly_capacity_hours ?? 40),
        days,
        totalHours,
        cardCount: cardCountByUser.get(userId) ?? 0,
      };
    })
    .sort((a, b) => {
      if (b.totalHours !== a.totalHours) return b.totalHours - a.totalHours;
      return a.fullName.localeCompare(b.fullName, "pt-BR");
    });
}

export async function loadCardAllocationSummary(
  orgId: string,
  cardId: string,
  userId: string,
): Promise<{ totalHours: number; dayCount: number; hasAllocations: boolean }> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("card_workload_allocations")
    .select("hours")
    .eq("org_id", orgId)
    .eq("card_id", cardId)
    .eq("user_id", userId)
    .gt("hours", 0);

  const rows = data ?? [];
  return {
    totalHours: rows.reduce((s, r) => s + Number(r.hours), 0),
    dayCount: rows.length,
    hasAllocations: rows.length > 0,
  };
}

export async function orgTeamsIntegrationConfigured(orgId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("org_teams_integrations")
    .select("org_id")
    .eq("org_id", orgId)
    .maybeSingle();
  return Boolean(data);
}

export async function userMicrosoftConnected(): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("user_has_microsoft_connection");
  if (error) return false;
  return Boolean(data);
}
