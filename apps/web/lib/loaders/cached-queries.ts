import { unstable_cache } from "next/cache";
import { cache } from "react";
import { CACHE_TAGS } from "@/lib/revalidation";
import { isOverdue } from "@/components/board/types";
import {
  createCachedSupabaseClient,
  getAccessTokenForCache,
  type CachedSupabaseClient,
} from "@/lib/loaders/cached-supabase";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrgIdCached } from "@/lib/loaders/session";
import { fetchOrgProjectsData, loadDeadlines, type LoadOrgProjectsResult } from "@/lib/load-org-projects";
import type { DeadlineTileItem } from "@/components/home/deadline-tiles";

/** Dedupe por request + cross-request unstable_cache (chave userId+activeOrgId). */
export const loadOrgProjectsCached = cache(async (userId: string): Promise<LoadOrgProjectsResult> => {
  const activeOrgId = await getActiveOrgIdCached();
  const orgKey = activeOrgId ?? "none";
  const tags = [CACHE_TAGS.boards, CACHE_TAGS.shell(userId)];
  if (activeOrgId) tags.push(CACHE_TAGS.orgProjects(activeOrgId));

  const accessToken = await getAccessTokenForCache();
  if (!accessToken) {
    const supabase = await createClient();
    return fetchOrgProjectsData(supabase, userId, activeOrgId);
  }

  return unstable_cache(
    () => fetchOrgProjectsData(createCachedSupabaseClient(accessToken), userId, activeOrgId),
    [`org-projects-${userId}-${orgKey}`],
    { tags },
  )();
});

/** @deprecated Prefer deadlineItems from loadOrgProjectsCached — evita query duplicada em /boards. */
export const loadDeadlinesCached = cache(async (_userId: string): Promise<DeadlineTileItem[]> => {
  return loadDeadlines();
});

export type CalendarEvent = {
  id: string;
  title: string;
  due_date: string;
  board_id: string;
  board_name: string;
  board_color: string | null;
  overdue: boolean;
};

export type CalendarPageData = {
  events: CalendarEvent[];
  boards: { id: string; name: string }[];
  columns: { id: string; board_id: string; name: string }[];
};

function monthKeyFromDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

async function fetchCalendarPage(supabase: CachedSupabaseClient, orgId: string): Promise<CalendarPageData> {
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 2);

  const [{ data: cards }, { data: boards }, { data: columns }] = await Promise.all([
    supabase
      .from("cards")
      .select("id, title, due_date, completed_at, board_id, boards(name, color)")
      .eq("org_id", orgId)
      .not("due_date", "is", null)
      .gte("due_date", start.toISOString())
      .lte("due_date", end.toISOString())
      .order("due_date"),
    supabase.from("boards").select("id, name").eq("org_id", orgId).order("name"),
    supabase.from("columns").select("id, board_id, name").eq("org_id", orgId).order("position"),
  ]);

  const events: CalendarEvent[] = (cards ?? []).map((c) => {
    const boardMeta =
      c.boards && typeof c.boards === "object" && "name" in c.boards
        ? (c.boards as { name: string; color: string | null })
        : null;
    return {
      id: c.id,
      title: c.title,
      due_date: c.due_date!,
      board_id: c.board_id,
      board_name: boardMeta?.name ?? "",
      board_color: boardMeta?.color ?? null,
      overdue: isOverdue(c.due_date, c.completed_at),
    };
  });

  return { events, boards: boards ?? [], columns: columns ?? [] };
}

/** Cross-request cache calendario por user+org+mes; invalidar via revalidateBoard(calendar) ou tag calendar. */
export async function loadCalendarPageCached(userId: string, orgId: string): Promise<CalendarPageData> {
  const monthKey = monthKeyFromDate(new Date());
  const accessToken = await getAccessTokenForCache();
  if (!accessToken) {
    const supabase = await createClient();
    return fetchCalendarPage(supabase, orgId);
  }
  return unstable_cache(
    () => fetchCalendarPage(createCachedSupabaseClient(accessToken), orgId),
    [`calendar-${userId}-${orgId}-${monthKey}`],
    { tags: [CACHE_TAGS.calendar, CACHE_TAGS.calendarOrg(orgId, monthKey)] },
  )();
}

export function calendarMonthKey(d = new Date()): string {
  return monthKeyFromDate(d);
}
