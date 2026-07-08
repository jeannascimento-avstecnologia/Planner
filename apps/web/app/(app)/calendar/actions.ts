"use server";

import { createClient } from "@/lib/supabase/server";
import { createCardInput } from "@nextgen/contracts";
import { lexoPosition } from "@/lib/fractional";
import { revalidateBoard, revalidatePlanViews } from "@/lib/revalidation";

export type OrgCardHit = {
  id: string;
  title: string;
  board_id: string;
  board_name: string;
  column_id: string;
};

export type BoardOption = { id: string; name: string };
export type ColumnOption = { id: string; board_id: string; name: string };

export async function searchOrgCards(orgId: string, query: string): Promise<OrgCardHit[]> {
  const q = query.trim();
  if (!q) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("cards")
    .select("id, title, board_id, column_id, boards(name)")
    .eq("org_id", orgId)
    .is("completed_at", null)
    .ilike("title", `%${q}%`)
    .order("updated_at", { ascending: false })
    .limit(20);

  return (data ?? []).map((c) => ({
    id: c.id,
    title: c.title,
    board_id: c.board_id,
    column_id: c.column_id,
    board_name:
      c.boards && typeof c.boards === "object" && "name" in c.boards
        ? String((c.boards as { name: string }).name)
        : "",
  }));
}

export async function assignDueDate(
  cardId: string,
  boardId: string,
  dueDate: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nao autenticado." };

  const iso = `${dueDate}T12:00:00.000Z`;
  const { error } = await supabase.rpc("update_card_fields", {
    p_card_id: cardId,
    p_patch: { due_date: iso },
  });
  if (error) return { ok: false, error: error.message };

  revalidateBoard(boardId, { calendar: true, userId: user.id });
  revalidatePlanViews(user.id);
  return { ok: true };
}

export async function createDeadlineCard(
  boardId: string,
  columnId: string,
  title: string,
  dueDate: string,
): Promise<{ ok: boolean; error?: string }> {
  const parsed = createCardInput.safeParse({
    boardId,
    columnId,
    title,
    dueDate: `${dueDate}T12:00:00.000Z`,
  });
  if (!parsed.success) return { ok: false, error: "Dados invalidos." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: board } = await supabase.from("boards").select("org_id").eq("id", boardId).single();
  if (!board) return { ok: false, error: "Projeto nao encontrado." };

  const { data: card, error } = await supabase
    .from("cards")
    .insert({
      board_id: boardId,
      column_id: columnId,
      org_id: board.org_id,
      title: parsed.data.title,
      priority: "medium",
      due_date: parsed.data.dueDate,
      position: lexoPosition(),
      created_by: user?.id ?? null,
    })
    .select("id")
    .single();

  if (error || !card) return { ok: false, error: error?.message ?? "Falha ao criar." };

  revalidateBoard(boardId, { calendar: true, userId: user?.id, orgId: board.org_id });
  revalidatePlanViews(user?.id);
  return { ok: true };
}
