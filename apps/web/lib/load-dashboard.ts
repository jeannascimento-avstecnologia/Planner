import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { CachedSupabaseClient } from "@/lib/loaders/cached-supabase";
import {
  parseBundle,
  type BoardDashboardData,
  type DashboardBottleneck,
  type DashboardCfdPoint,
  type DashboardLeadTime,
  type DashboardThroughputPoint,
} from "@/lib/dashboard/parse-bundle";

export type {
  BoardDashboardData,
  DashboardBottleneck,
  DashboardCfdPoint,
  DashboardLeadTime,
  DashboardThroughputPoint,
};

export async function fetchBoardDashboard(
  supabase: CachedSupabaseClient,
  boardId: string,
): Promise<BoardDashboardData | { error: string }> {
  const { data, error } = await supabase.rpc("get_board_dashboard_bundle", { p_board: boardId });
  if (error) return { error: error.message };
  return parseBundle(data);
}

export async function loadBoardDashboard(boardId: string): Promise<BoardDashboardData | { error: string }> {
  const supabase = await createClient();
  return fetchBoardDashboard(supabase, boardId);
}
