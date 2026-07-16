import { unstable_cache } from "next/cache";
import { notFound } from "next/navigation";
import { CACHE_TAGS } from "@/lib/revalidation";
import {
  createCachedSupabaseClient,
  getAccessTokenForCache,
  type CachedSupabaseClient,
} from "@/lib/loaders/cached-supabase";
import { createClient } from "@/lib/supabase/server";
import { parseTifluxCanceledTickets } from "@/lib/tiflux-canceled-tickets";
import {
  buildProfilesById,
  collectAssigneeUserIds,
  sortAssigneeProfiles,
} from "@/lib/board-assignees";
import { isOrgAdminRole } from "@/lib/org-member-roles";
import { dedupeCardsById } from "@/lib/dedupe-cards";
import type { BoardCard, ProfileRow } from "@/components/board/types";
import { groupChecklistItemsByCard } from "@/lib/card-kernel/checklist-group";
import {
  CARD_SELECT_CORE,
  CARD_SELECT_WITH_TREE,
  isMissingTreeCoordColumnError,
} from "@/lib/card-select";
import { groupTreeParentsByChild, resolveTreeParentIds } from "@/lib/card-tree/tree-parents";

const BOARD_SELECT =
  "id, org_id, name, icon, color, tiflux_enabled, department_id, archived, created_by";

export type BoardSnapshot = {
  board: {
    id: string;
    org_id: string;
    name: string;
    icon: string | null;
    color: string | null;
    tiflux_enabled: boolean;
  };
  orgName: string;
  orgLogoUrl: string | null;
  columns: { id: string; name: string; default_stage_id: string | null }[];
  cards: BoardCard[];
  stages: {
    id: string;
    name: string;
    color: string;
    position: number;
    is_system: boolean;
    system_key: string | null;
  }[];
  tags: { id: string; name: string; color: string }[];
  members: ProfileRow[];
  boardMembers: { user_id: string; role: string; profile?: ProfileRow }[];
  profilesById: Record<string, ProfileRow>;
  isOrgAdmin: boolean;
};

async function fetchBoardSnapshot(
  supabase: CachedSupabaseClient,
  boardId: string,
  userId: string,
): Promise<BoardSnapshot> {

  const { data: board } = await supabase.from("boards").select(BOARD_SELECT).eq("id", boardId).single();
  if (!board) notFound();

  const [
    { data: org },
    { data: myMembership },
    { data: columns },
    cardsFirst,
    { data: tags },
    { data: boardMembers },
    { data: stages },
    { data: memberships },
  ] = await Promise.all([
    supabase.from("organizations").select("name, logo_url").eq("id", board.org_id).maybeSingle(),
    supabase
      .from("memberships")
      .select("role")
      .eq("org_id", board.org_id)
      .eq("user_id", userId)
      .maybeSingle(),
    supabase.from("columns").select("id, name, default_stage_id").eq("board_id", boardId).order("position"),
    supabase.from("cards").select(CARD_SELECT_WITH_TREE).eq("board_id", boardId).order("position"),
    supabase.from("tags").select("id, name, color").eq("board_id", board.id).order("name"),
    supabase.from("board_members").select("user_id, role").eq("board_id", boardId),
    supabase
      .from("stages")
      .select("id, name, color, position, is_system, system_key")
      .eq("board_id", boardId)
      .order("position"),
    supabase.from("memberships").select("user_id").eq("org_id", board.org_id),
  ]);

  let cardsRaw: unknown[] | null = cardsFirst.data as unknown[] | null;
  let cardsError = cardsFirst.error;
  if (isMissingTreeCoordColumnError(cardsError)) {
    const fallback = await supabase
      .from("cards")
      .select(CARD_SELECT_CORE)
      .eq("board_id", boardId)
      .order("position");
    cardsRaw = fallback.data as unknown[] | null;
    cardsError = fallback.error;
  }

  const isOrgAdmin = isOrgAdminRole(myMembership?.role);
  type CardRow = {
    id: string;
    column_id: string;
    position: string;
    parent_id: string | null;
    title: string;
    description: string | null;
    priority: BoardCard["priority"];
    due_date: string | null;
    start_date: string | null;
    target_date: string | null;
    estimated_hours: number | null;
    story_points: number | null;
    assignee_id: string | null;
    completed_at: string | null;
    stage_id: string | null;
    tiflux_ticket_number: string | null;
    tiflux_ticket_id: string | null;
    tiflux_canceled_tickets: unknown;
    tree_x?: number | null;
    tree_y?: number | null;
  };
  const cardsUnique = dedupeCardsById((cardsRaw ?? []) as CardRow[]);
  const cardIds = cardsUnique.map((c) => c.id);

  const assigneeIds = collectAssigneeUserIds(
    (memberships ?? []).map((m) => m.user_id),
    [
      ...(boardMembers ?? []).map((m) => m.user_id),
      ...cardsUnique.map((c) => c.assignee_id).filter((id): id is string => Boolean(id)),
    ],
  );

  const [tagsRes, profilesRes, checklistRes, treeEdgesRes] = await Promise.all([
    cardIds.length
      ? supabase.from("card_tags").select("card_id, tag_id").in("card_id", cardIds)
      : Promise.resolve({ data: [] as { card_id: string; tag_id: string }[], error: null }),
    assigneeIds.length
      ? supabase.from("profiles").select("id, full_name").in("id", assigneeIds)
      : Promise.resolve({ data: [] as ProfileRow[], error: null }),
    cardIds.length
      ? supabase
          .from("card_checklist_items")
          .select("id, card_id, title, done, position")
          .in("card_id", cardIds)
          .order("position")
      : Promise.resolve({
          data: [] as {
            id: string;
            card_id: string;
            title: string;
            done: boolean;
            position: string;
          }[],
          error: null,
        }),
    cardIds.length
      ? supabase.from("card_tree_edges").select("parent_card_id, child_card_id").eq("board_id", boardId)
      : Promise.resolve({
          data: [] as { parent_card_id: string; child_card_id: string }[],
          error: null,
        }),
  ]);

  if (treeEdgesRes.error) {
    throw new Error(treeEdgesRes.error.message ?? "Falha ao carregar arestas da arvore");
  }

  const cardTags = tagsRes.data;
  const profiles = profilesRes.data;
  const checklistRows = checklistRes.data;
  const treeEdgeRows = treeEdgesRes.data;

  const profilesById = buildProfilesById(profiles ?? []);

  const tagIdsByCard = new Map<string, string[]>();
  for (const ct of cardTags ?? []) {
    const list = tagIdsByCard.get(ct.card_id) ?? [];
    list.push(ct.tag_id);
    tagIdsByCard.set(ct.card_id, list);
  }

  const checklistByCard = groupChecklistItemsByCard(checklistRows ?? []);
  const treeParentsByChild = groupTreeParentsByChild(treeEdgeRows ?? []);

  const cards: BoardCard[] = cardsUnique.map((c) => ({
    id: c.id,
    column_id: c.column_id,
    position: c.position,
    parent_id: c.parent_id ?? null,
    tree_x: "tree_x" in c && c.tree_x != null ? Number(c.tree_x) : null,
    tree_y: "tree_y" in c && c.tree_y != null ? Number(c.tree_y) : null,
    title: c.title,
    description: c.description,
    priority: c.priority,
    due_date: c.due_date,
    start_date: c.start_date,
    target_date: c.target_date ?? null,
    estimated_hours: c.estimated_hours != null ? Number(c.estimated_hours) : null,
    story_points: c.story_points != null ? Number(c.story_points) : null,
    assignee_id: c.assignee_id,
    completed_at: c.completed_at,
    stage_id: c.stage_id ?? null,
    tagIds: tagIdsByCard.get(c.id) ?? [],
    checklistItems: checklistByCard.get(c.id) ?? [],
    treeParentIds: resolveTreeParentIds(c.id, c.parent_id ?? null, treeParentsByChild),
    tiflux_ticket_number: c.tiflux_ticket_number ?? null,
    tiflux_ticket_id: c.tiflux_ticket_id ?? null,
    tiflux_canceled_tickets: parseTifluxCanceledTickets(c.tiflux_canceled_tickets),
  }));

  const members: ProfileRow[] = sortAssigneeProfiles(
    (profiles ?? []).map((p) => ({ id: p.id, full_name: p.full_name })),
  );

  const bmList = (boardMembers ?? []).map((bm) => ({
    user_id: bm.user_id,
    role: bm.role,
    profile: profilesById[bm.user_id],
  }));

  return {
    board: {
      id: board.id,
      name: board.name,
      org_id: board.org_id,
      icon: board.icon,
      color: board.color,
      tiflux_enabled: board.tiflux_enabled ?? false,
    },
    orgName: org?.name ?? "Organizacao",
    orgLogoUrl: org?.logo_url ?? null,
    columns: columns ?? [],
    cards,
    stages: stages ?? [],
    tags: tags ?? [],
    members,
    boardMembers: bmList,
    profilesById,
    isOrgAdmin,
  };
}

/** Cross-request cache do board snapshot — chave userId+boardId; invalidar via revalidateBoard(). */
export async function loadBoardSnapshotCached(boardId: string, userId: string): Promise<BoardSnapshot> {
  const accessToken = await getAccessTokenForCache();
  if (!accessToken) {
    const supabase = await createClient();
    return fetchBoardSnapshot(supabase, boardId, userId);
  }
  return unstable_cache(
    () => fetchBoardSnapshot(createCachedSupabaseClient(accessToken), boardId, userId),
    [`board-snapshot-${userId}-${boardId}`],
    { tags: [CACHE_TAGS.board(boardId)] },
  )();
}
