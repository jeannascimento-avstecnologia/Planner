import { createClient } from "@/lib/supabase/server";
import type { CachedSupabaseClient } from "@/lib/loaders/cached-supabase";
import { cardWeekIso, isUnscheduledWorkload, workloadWeekAnchor } from "@/lib/workload/anchor";
import { aggregateAllocationsByUser, weekDateBounds } from "@/lib/workload/allocation-week";
import { formatDateIso } from "@/lib/workload/week";

export type WorkloadMemberRow = {
  userId: string;
  fullName: string;
  totalHours: number;
  totalPoints: number;
  cardCount: number;
  capacityHours: number;
};

export type WorkloadDrilldownCard = {
  id: string;
  title: string;
  boardId: string;
  boardName: string;
  estimatedHours: number | null;
  /** Horas alocadas nesta semana via plano diario (quando aplicavel). */
  weekHours?: number | null;
  storyPoints: number | null;
  targetDate: string | null;
  dueDate: string | null;
  startDate: string | null;
};

export type WorkloadUnscheduledCard = {
  id: string;
  title: string;
  boardId: string;
  boardName: string;
  assigneeId: string;
  assigneeName: string;
  estimatedHours: number | null;
};

type WorkloadSupabase = CachedSupabaseClient;

async function resolveSupabase(client?: WorkloadSupabase): Promise<WorkloadSupabase> {
  return client ?? (await createClient());
}

async function loadBoardNameMap(orgId: string, client?: WorkloadSupabase): Promise<Record<string, string>> {
  const supabase = await resolveSupabase(client);
  const { data: boards } = await supabase.from("boards").select("id, name").eq("org_id", orgId);
  return Object.fromEntries((boards ?? []).map((b) => [b.id, b.name]));
}

export async function fetchBoardNameMap(
  orgId: string,
  client?: WorkloadSupabase,
): Promise<Record<string, string>> {
  return loadBoardNameMap(orgId, client);
}

export async function loadWorkloadMembers(
  orgId: string,
  weekStart: Date,
  client?: WorkloadSupabase,
): Promise<WorkloadMemberRow[]> {
  const supabase = await resolveSupabase(client);
  const weekIso = formatDateIso(weekStart);
  const { from, to } = weekDateBounds(weekStart);

  const [{ data: allocs }, { data: cards }] = await Promise.all([
    supabase
      .from("card_workload_allocations")
      .select("user_id, card_id, hours")
      .eq("org_id", orgId)
      .gte("work_date", from)
      .lte("work_date", to)
      .gt("hours", 0),
    supabase
      .from("cards")
      .select("id, assignee_id, estimated_hours, story_points, target_date, due_date, start_date")
      .eq("org_id", orgId)
      .not("assignee_id", "is", null)
      .is("completed_at", null),
  ]);

  const allocByUser = aggregateAllocationsByUser(
    (allocs ?? []).map((a) => ({
      user_id: a.user_id as string,
      card_id: a.card_id as string,
      hours: Number(a.hours),
    })),
  );

  const cardById = new Map((cards ?? []).map((c) => [c.id as string, c]));

  type Agg = { hours: number; points: number; cardIds: Set<string> };
  const byUser = new Map<string, Agg>();

  for (const [userId, allocAgg] of allocByUser) {
    let points = 0;
    for (const cardId of allocAgg.cardIds) {
      points += Number(cardById.get(cardId)?.story_points ?? 0);
    }
    byUser.set(userId, {
      hours: allocAgg.totalHours,
      points,
      cardIds: new Set(allocAgg.cardIds),
    });
  }

  for (const c of cards ?? []) {
    if (!c.assignee_id) continue;
    const uid = c.assignee_id as string;
    const userAgg = byUser.get(uid);
    if (userAgg?.cardIds.has(c.id as string)) continue;
    const anchor = workloadWeekAnchor(c);
    if (!anchor) continue;
    if (cardWeekIso(anchor) !== weekIso) continue;
    const agg = userAgg ?? { hours: 0, points: 0, cardIds: new Set<string>() };
    agg.hours += Number(c.estimated_hours ?? 0);
    agg.points += Number(c.story_points ?? 0);
    agg.cardIds.add(c.id as string);
    byUser.set(uid, agg);
  }

  const userIds = [...byUser.keys()];

  const { data: allMemberships } = await supabase
    .from("memberships")
    .select("user_id, weekly_capacity_hours")
    .eq("org_id", orgId);

  const memberUserIds = [
    ...new Set([...(allMemberships ?? []).map((m) => m.user_id as string), ...userIds]),
  ];

  if (memberUserIds.length === 0) return [];

  const [{ data: memberships }, { data: profiles }] = await Promise.all([
    supabase
      .from("memberships")
      .select("user_id, weekly_capacity_hours")
      .eq("org_id", orgId)
      .in("user_id", memberUserIds),
    supabase.from("profiles").select("id, full_name").in("id", memberUserIds),
  ]);

  const membershipMap = Object.fromEntries((memberships ?? []).map((m) => [m.user_id, m]));
  const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));

  return memberUserIds
    .map((userId) => {
      const agg = byUser.get(userId) ?? { hours: 0, points: 0, cardIds: new Set<string>() };
      const m = membershipMap[userId];
      const profile = profileMap[userId];
      return {
        userId,
        fullName: profile?.full_name ?? userId.slice(0, 8),
        totalHours: agg.hours,
        totalPoints: agg.points,
        cardCount: agg.cardIds.size,
        capacityHours: Number(m?.weekly_capacity_hours ?? 40),
      };
    })
    .sort((a, b) => {
      if (b.totalHours !== a.totalHours) return b.totalHours - a.totalHours;
      return a.fullName.localeCompare(b.fullName, "pt-BR");
    });
}

function toDrilldownCard(
  c: {
    id: string;
    title: string;
    board_id: string;
    estimated_hours: number | null;
    story_points: number | null;
    target_date: string | null;
    due_date: string | null;
    start_date: string | null;
  },
  boardNames: Record<string, string>,
  weekHours?: number | null,
): WorkloadDrilldownCard {
  return {
    id: c.id,
    title: c.title,
    boardId: c.board_id,
    boardName: boardNames[c.board_id] ?? "Projeto",
    estimatedHours: c.estimated_hours != null ? Number(c.estimated_hours) : null,
    weekHours: weekHours ?? null,
    storyPoints: c.story_points != null ? Number(c.story_points) : null,
    targetDate: c.target_date,
    dueDate: c.due_date,
    startDate: c.start_date,
  };
}

export async function loadWorkloadDrilldownByOrg(
  orgId: string,
  weekStart: Date,
  client?: WorkloadSupabase,
  boardNames?: Record<string, string>,
): Promise<Record<string, WorkloadDrilldownCard[]>> {
  const supabase = await resolveSupabase(client);
  const weekIso = formatDateIso(weekStart);
  const { from, to } = weekDateBounds(weekStart);

  const [{ data: allocs }, { data: cards }] = await Promise.all([
    supabase
      .from("card_workload_allocations")
      .select("user_id, card_id, work_date, hours")
      .eq("org_id", orgId)
      .gte("work_date", from)
      .lte("work_date", to)
      .gt("hours", 0),
    supabase
      .from("cards")
      .select("id, title, board_id, assignee_id, estimated_hours, story_points, target_date, due_date, start_date")
      .eq("org_id", orgId)
      .not("assignee_id", "is", null)
      .is("completed_at", null),
  ]);

  const resolvedBoardNames = boardNames ?? (await loadBoardNameMap(orgId, supabase));
  const cardById = new Map((cards ?? []).map((c) => [c.id as string, c]));
  const grouped: Record<string, WorkloadDrilldownCard[]> = {};

  const allocByUser = aggregateAllocationsByUser(
    (allocs ?? []).map((a) => ({
      user_id: a.user_id as string,
      card_id: a.card_id as string,
      hours: Number(a.hours),
    })),
  );

  for (const [userId, allocAgg] of allocByUser) {
    grouped[userId] = [];
    for (const [cardId, weekHours] of allocAgg.hoursByCard) {
      const c = cardById.get(cardId);
      if (!c) continue;
      grouped[userId].push(toDrilldownCard(c, resolvedBoardNames, weekHours));
    }
  }

  for (const c of cards ?? []) {
    if (!c.assignee_id) continue;
    const uid = c.assignee_id as string;
    const allocCardIds = allocByUser.get(uid)?.cardIds;
    if (allocCardIds?.has(c.id as string)) continue;

    const anchor = workloadWeekAnchor(c);
    if (!anchor) continue;
    if (cardWeekIso(anchor) !== weekIso) continue;

    grouped[uid] = grouped[uid] ?? [];
    grouped[uid].push(toDrilldownCard(c, resolvedBoardNames));
  }

  for (const uid of Object.keys(grouped)) {
    grouped[uid].sort((a, b) => a.title.localeCompare(b.title, "pt-BR"));
  }

  return grouped;
}

export async function loadWorkloadDrilldown(
  orgId: string,
  userId: string,
  weekStart: Date,
): Promise<WorkloadDrilldownCard[]> {
  const all = await loadWorkloadDrilldownByOrg(orgId, weekStart);
  return all[userId] ?? [];
}

/** Drill-down por membro num intervalo de dias (visao 15d). */
export async function loadWorkloadDrilldownForRange(
  orgId: string,
  fromIso: string,
  toIso: string,
  client?: WorkloadSupabase,
): Promise<Record<string, WorkloadDrilldownCard[]>> {
  const supabase = await resolveSupabase(client);
  const daySet = new Set<string>();
  const cursor = new Date(`${fromIso}T12:00:00`);
  const end = new Date(`${toIso}T12:00:00`);
  while (cursor <= end) {
    daySet.add(formatDateIso(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  const [{ data: allocs }, { data: cards }] = await Promise.all([
    supabase
      .from("card_workload_allocations")
      .select("user_id, card_id, work_date, hours")
      .eq("org_id", orgId)
      .gte("work_date", fromIso)
      .lte("work_date", toIso)
      .gt("hours", 0),
    supabase
      .from("cards")
      .select("id, title, board_id, assignee_id, estimated_hours, story_points, target_date, due_date, start_date")
      .eq("org_id", orgId)
      .not("assignee_id", "is", null)
      .is("completed_at", null),
  ]);

  const boardNames = await loadBoardNameMap(orgId, supabase);
  const cardById = new Map((cards ?? []).map((c) => [c.id as string, c]));
  const grouped: Record<string, WorkloadDrilldownCard[]> = {};
  const seenByUser = new Map<string, Set<string>>();

  const allocByUser = aggregateAllocationsByUser(
    (allocs ?? []).map((a) => ({
      user_id: a.user_id as string,
      card_id: a.card_id as string,
      hours: Number(a.hours),
    })),
  );

  const cardsWithDailyPlan = new Set((allocs ?? []).map((a) => a.card_id as string));

  for (const [userId, allocAgg] of allocByUser) {
    grouped[userId] = [];
    seenByUser.set(userId, new Set());
    for (const [cardId, weekHours] of allocAgg.hoursByCard) {
      const c = cardById.get(cardId);
      if (!c) continue;
      grouped[userId].push(toDrilldownCard(c, boardNames, weekHours));
      seenByUser.get(userId)!.add(cardId);
    }
  }

  for (const c of cards ?? []) {
    if (!c.assignee_id || cardsWithDailyPlan.has(c.id as string)) continue;
    const hours = Number(c.estimated_hours ?? 0);
    if (hours <= 0) continue;
    const anchor = workloadWeekAnchor(c);
    if (!anchor) continue;
    const dayKey = anchor.slice(0, 10);
    if (!daySet.has(dayKey)) continue;
    const uid = c.assignee_id as string;
    const seen = seenByUser.get(uid) ?? new Set<string>();
    if (seen.has(c.id as string)) continue;
    grouped[uid] = grouped[uid] ?? [];
    grouped[uid].push(toDrilldownCard(c, boardNames, hours));
    seen.add(c.id as string);
    seenByUser.set(uid, seen);
  }

  for (const uid of Object.keys(grouped)) {
    grouped[uid].sort((a, b) => a.title.localeCompare(b.title, "pt-BR"));
  }

  return grouped;
}

export async function loadUnscheduledWorkload(
  orgId: string,
  client?: WorkloadSupabase,
  boardNames?: Record<string, string>,
): Promise<WorkloadUnscheduledCard[]> {
  const supabase = await resolveSupabase(client);

  const [{ data: cards }, { data: anyAllocCards }] = await Promise.all([
    supabase
      .from("cards")
      .select("id, title, board_id, assignee_id, estimated_hours, target_date, due_date, start_date")
      .eq("org_id", orgId)
      .is("completed_at", null)
      .not("assignee_id", "is", null)
      .gt("estimated_hours", 0),
    supabase.from("card_workload_allocations").select("card_id").eq("org_id", orgId),
  ]);

  const cardsWithDailyPlan = new Set((anyAllocCards ?? []).map((a) => a.card_id as string));
  const resolvedBoardNames = boardNames ?? (await loadBoardNameMap(orgId, supabase));

  const unscheduled = (cards ?? []).filter(
    (c) => !cardsWithDailyPlan.has(c.id as string) && isUnscheduledWorkload(c),
  );

  const assigneeIds = [...new Set(unscheduled.map((c) => c.assignee_id).filter(Boolean))] as string[];
  const { data: profiles } =
    assigneeIds.length > 0
      ? await supabase.from("profiles").select("id, full_name").in("id", assigneeIds)
      : { data: [] };
  const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p.full_name]));

  return unscheduled.map((c) => {
    const assigneeId = c.assignee_id as string;
    return {
      id: c.id,
      title: c.title,
      boardId: c.board_id,
      boardName: resolvedBoardNames[c.board_id] ?? "Projeto",
      assigneeId,
      assigneeName: profileMap[assigneeId] ?? assigneeId.slice(0, 8),
      estimatedHours: c.estimated_hours != null ? Number(c.estimated_hours) : null,
    };
  });
}

export async function userIsBoardManagerInOrg(userId: string, orgId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data: boards } = await supabase.from("boards").select("id").eq("org_id", orgId);
  const boardIds = (boards ?? []).map((b) => b.id);
  if (boardIds.length === 0) return false;

  const { data: members } = await supabase
    .from("board_members")
    .select("role")
    .eq("user_id", userId)
    .in("board_id", boardIds)
    .eq("role", "manager")
    .limit(1);

  return (members ?? []).length > 0;
}
