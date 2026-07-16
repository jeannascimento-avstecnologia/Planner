import { parseTifluxCanceledTickets } from "@/lib/tiflux-canceled-tickets";
import { dedupeCardsById } from "@/lib/dedupe-cards";
import { createClient } from "@/lib/supabase/client";
import { groupChecklistItemsByCard } from "@/lib/card-kernel/checklist-group";
import {
  CARD_SELECT_CORE,
  CARD_SELECT_WITH_TREE,
  isMissingTreeCoordColumnError,
} from "@/lib/card-select";
import { groupTreeParentsByChild, resolveTreeParentIds } from "@/lib/card-tree/tree-parents";
import type { BoardCard } from "@/components/board/types";
import type { CardPriority } from "@nextgen/contracts";

/** Refetch client-side (RLS). Source of truth pós-invalidate — não o payload Realtime. */
export async function fetchBoardCards(boardId: string): Promise<BoardCard[]> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(boardId)) {
    return [];
  }

  const supabase = createClient();
  let cardsRaw: unknown[] | null = null;
  let error: { message?: string; code?: string } | null = null;

  {
    const first = await supabase
      .from("cards")
      .select(CARD_SELECT_WITH_TREE)
      .eq("board_id", boardId)
      .order("position");
    cardsRaw = first.data as unknown[] | null;
    error = first.error;
  }

  if (isMissingTreeCoordColumnError(error)) {
    const fallback = await supabase
      .from("cards")
      .select(CARD_SELECT_CORE)
      .eq("board_id", boardId)
      .order("position");
    cardsRaw = fallback.data as unknown[] | null;
    error = fallback.error;
  }

  if (error) throw new Error(error.message ?? "Falha ao carregar cards");

  type CardRow = {
    id: string;
    column_id: string;
    position: string;
    parent_id: string | null;
    title: string;
    description: string | null;
    priority: string;
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

  const [tagsRes, checklistRes, treeEdgesRes] = await Promise.all([
    cardIds.length
      ? supabase.from("card_tags").select("card_id, tag_id").in("card_id", cardIds)
      : Promise.resolve({ data: [] as { card_id: string; tag_id: string }[], error: null }),
    cardIds.length
      ? supabase
          .from("card_checklist_items")
          .select("id, card_id, title, done, position")
          .in("card_id", cardIds)
          .order("position")
      : Promise.resolve({
          data: [] as { id: string; card_id: string; title: string; done: boolean; position: string }[],
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
  const checklistRows = checklistRes.data;
  const treeEdgeRows = treeEdgesRes.data;

  const tagIdsByCard = new Map<string, string[]>();
  for (const ct of cardTags ?? []) {
    const list = tagIdsByCard.get(ct.card_id) ?? [];
    list.push(ct.tag_id);
    tagIdsByCard.set(ct.card_id, list);
  }

  const checklistByCard = groupChecklistItemsByCard(checklistRows ?? []);
  const treeParentsByChild = groupTreeParentsByChild(treeEdgeRows ?? []);

  return cardsUnique.map((c) => ({
    id: c.id,
    column_id: c.column_id,
    position: c.position,
    parent_id: c.parent_id ?? null,
    tree_x: c.tree_x != null ? Number(c.tree_x) : null,
    tree_y: c.tree_y != null ? Number(c.tree_y) : null,
    title: c.title,
    description: c.description,
    priority: c.priority as CardPriority,
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
}
