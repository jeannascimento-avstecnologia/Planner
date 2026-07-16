import type {
  CreateChecklistItemInput,
  DeleteChecklistItemInput,
  Json,
  ReorderChecklistItemInput,
  ToggleChecklistItemInput,
  UpdateCardFieldsInput,
  UpdateCardInput,
} from "@nextgen/contracts";
import type { createClient } from "@/lib/supabase/server";
import { lexoPosition } from "@/lib/fractional";
import { normalizeBoardItemName } from "@/lib/board-item-names";
import { resolveCardDateRange } from "@/lib/parse-date-br";
import { sanitizeName } from "@/lib/sanitize";
import { revalidateBoard, revalidatePlanViews } from "@/lib/revalidation";
import { patchAffectsWorkloadViews } from "@/lib/workload/patch-affects-workload";
import { buildUpdateCardPatch } from "./build-update-patch";
import type {
  CardDeleteImpact,
  CardResult,
  CreateCardInput,
  CreateCardResult,
  CreateChecklistItemResult,
  DeleteCardInput,
  DeleteCardResult,
  MoveCardInput,
  MoveCardResult,
  UpdateCardFieldsResult,
} from "./types";

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

const DUPLICATE_CARD_MSG = "Ja existe um card com este nome neste projeto.";

function isUniqueViolation(error: { code?: string } | null): boolean {
  return error?.code === "23505";
}

async function boardHasCardTitle(
  supabase: SupabaseServer,
  boardId: string,
  title: string,
): Promise<boolean> {
  const target = normalizeBoardItemName(title);
  const { data } = await supabase.from("cards").select("title").eq("board_id", boardId);
  return (data ?? []).some((row) => normalizeBoardItemName(row.title) === target);
}

async function revalidateAfterFieldsPatch(
  supabase: SupabaseServer,
  boardId: string,
  patch: Record<string, unknown>,
  opts?: { calendar?: boolean },
): Promise<void> {
  // Tree canvas: client TanStack Query is SoT — avoid RSC/calendar storm on connect/drag.
  const keys = Object.keys(patch);
  const treeOnly =
    keys.length > 0 &&
    keys.every((k) => k === "tree_x" || k === "tree_y" || k === "parent_id");
  if (treeOnly) return;

  revalidateBoard(boardId, { calendar: opts?.calendar ?? true });
  if (patchAffectsWorkloadViews(patch)) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    revalidatePlanViews(user?.id);
  }
}

/** Write path canônica: RPC `update_card_fields` + revalidação compartilhada. */
export async function updateCardFieldsMutation(
  supabase: SupabaseServer,
  input: UpdateCardFieldsInput,
): Promise<UpdateCardFieldsResult> {
  const { error } = await supabase.rpc("update_card_fields", {
    p_card_id: input.cardId,
    p_patch: input.patch as Json,
  });
  if (error) {
    return {
      ok: false,
      error: error.message.includes("field_forbidden")
        ? "Campo nao permitido."
        : error.message.includes("card_parent_depth")
          ? "Profundidade maxima de subtarefas (8) excedida."
          : error.message.includes("card_parent_cycle")
            ? "Hierarquia invalida (ciclo)."
            : error.message.includes("card_parent_cross_board")
              ? "Pai deve ser do mesmo board."
              : error.message,
    };
  }

  const { data: card } = await supabase.from("cards").select("board_id").eq("id", input.cardId).single();
  if (card?.board_id) {
    await revalidateAfterFieldsPatch(supabase, card.board_id, input.patch as Record<string, unknown>);
  }
  return { ok: true };
}

/** Drawer/Form update → patch canônico → mesma RPC que a Tabela. */
export async function updateCardMutation(
  supabase: SupabaseServer,
  input: UpdateCardInput,
): Promise<UpdateCardFieldsResult> {
  const { data: existing } = await supabase
    .from("cards")
    .select("start_date, due_date")
    .eq("id", input.cardId)
    .single();
  if (!existing) return { ok: false, error: "Card nao encontrado." };

  const patch = buildUpdateCardPatch(input, existing);
  if (Object.keys(patch).length === 0) return { ok: true };

  const { error } = await supabase.rpc("update_card_fields", {
    p_card_id: input.cardId,
    p_patch: patch as Json,
  });
  if (error) {
    return {
      ok: false,
      error: error.message.includes("field_forbidden") ? "Campo nao permitido." : error.message,
    };
  }

  await revalidateAfterFieldsPatch(supabase, input.boardId, patch);
  return { ok: true };
}

export async function createCardMutation(
  supabase: SupabaseServer,
  input: CreateCardInput,
): Promise<CreateCardResult> {
  let startDate = input.startDate ?? null;
  const dueDate = input.dueDate ?? null;
  const resolved = resolveCardDateRange(startDate, dueDate);
  startDate = resolved.start;
  if (input.startDate && dueDate && startDate && new Date(input.startDate) > new Date(dueDate)) {
    return { error: "Inicio nao pode ser depois do prazo." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: board } = await supabase.from("boards").select("org_id").eq("id", input.boardId).single();
  if (!board) return { error: "Projeto nao encontrado." };

  let columnId = input.columnId;
  let parentId: string | null = input.parentId ?? null;
  if (parentId) {
    const { data: parent } = await supabase
      .from("cards")
      .select("id, board_id, column_id, parent_id")
      .eq("id", parentId)
      .single();
    if (!parent || parent.board_id !== input.boardId) {
      return { error: "Pai invalido." };
    }
    columnId = parent.column_id;

    // Client depth guard (DB enforces too)
    let depth = 2;
    let walkParent: string | null = parent.parent_id;
    const seen = new Set<string>([parent.id]);
    while (walkParent) {
      if (seen.has(walkParent)) break;
      seen.add(walkParent);
      depth += 1;
      if (depth > 8) return { error: "Profundidade maxima de subtarefas (8) excedida." };
      const { data: anc } = await supabase
        .from("cards")
        .select("parent_id")
        .eq("id", walkParent)
        .maybeSingle();
      walkParent = anc?.parent_id ?? null;
    }
  }

  const assigneeId = input.assigneeId ?? user?.id ?? null;
  const sanitizedTitle = sanitizeName(input.title, 500);
  if (await boardHasCardTitle(supabase, input.boardId, sanitizedTitle)) {
    return { error: DUPLICATE_CARD_MSG };
  }

  const { data: card, error } = await supabase
    .from("cards")
    .insert({
      board_id: input.boardId,
      column_id: columnId,
      org_id: board.org_id,
      title: sanitizedTitle,
      priority: input.priority,
      due_date: dueDate,
      start_date: startDate,
      assignee_id: assigneeId,
      parent_id: parentId,
      position: lexoPosition(),
      created_by: user?.id ?? null,
    })
    .select("id, assignee_id")
    .single();

  if (isUniqueViolation(error)) return { error: DUPLICATE_CARD_MSG };
  if (error?.message?.includes("card_parent_depth")) {
    return { error: "Profundidade maxima de subtarefas (8) excedida." };
  }
  if (error?.message?.includes("card_parent_cycle")) {
    return { error: "Hierarquia invalida (ciclo)." };
  }
  if (error?.message?.includes("card_parent_cross_board")) {
    return { error: "Pai deve ser do mesmo board." };
  }
  if (error || !card) return { error: "Nao foi possivel criar o card." };

  await supabase.rpc("notify_board", {
    p_board: input.boardId,
    p_type: "card_created",
    p_title: "Nova entrega criada",
    p_body: input.title,
    p_entity_type: "board",
    p_entity_id: input.boardId,
  });
  revalidateBoard(input.boardId, { calendar: Boolean(dueDate) });
  if (card.assignee_id) {
    revalidatePlanViews(user?.id);
  }
  return { ok: true, cardId: card.id };
}

export async function moveCardMutation(
  supabase: SupabaseServer,
  input: MoveCardInput,
): Promise<MoveCardResult> {
  const { data: existing } = await supabase
    .from("cards")
    .select("id, org_id, column_id")
    .eq("id", input.cardId)
    .eq("board_id", input.boardId)
    .single();
  if (!existing) return { error: "Card nao encontrado." };

  const { data: column } = await supabase
    .from("columns")
    .select("id")
    .eq("id", input.columnId)
    .eq("board_id", input.boardId)
    .single();
  if (!column) return { error: "Coluna invalida." };

  const { error } = await supabase
    .from("cards")
    .update({ column_id: input.columnId, position: input.position })
    .eq("id", input.cardId)
    .eq("board_id", input.boardId);
  if (error) return { error: "Nao foi possivel mover o card." };

  if (!input.skipRevalidate) {
    revalidateBoard(input.boardId, { calendar: true });
  }
  return { ok: true };
}

export async function deleteCardMutation(
  supabase: SupabaseServer,
  input: DeleteCardInput,
): Promise<DeleteCardResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: card } = await supabase
    .from("cards")
    .select("id, assignee_id")
    .eq("id", input.cardId)
    .eq("board_id", input.boardId)
    .single();
  if (!card) return { error: "Card nao encontrado." };

  const { error } = await supabase.from("cards").delete().eq("id", input.cardId);
  if (error) return { error: "Nao foi possivel excluir o card." };

  revalidateBoard(input.boardId, { calendar: true });
  if (card.assignee_id) {
    revalidatePlanViews(user?.id);
  }
  return { ok: true };
}

export async function getCardDeleteImpactMutation(
  supabase: SupabaseServer,
  cardId: string,
  boardId: string,
): Promise<CardDeleteImpact> {
  const [{ count: subtasks }, { count: depsAsBlocker }, { count: depsAsBlocked }] = await Promise.all([
    supabase
      .from("cards")
      .select("id", { count: "exact", head: true })
      .eq("parent_id", cardId)
      .eq("board_id", boardId),
    supabase
      .from("card_dependencies")
      .select("blocker_card_id", { count: "exact", head: true })
      .eq("blocker_card_id", cardId),
    supabase
      .from("card_dependencies")
      .select("blocked_card_id", { count: "exact", head: true })
      .eq("blocked_card_id", cardId),
  ]);
  return {
    subtasks: subtasks ?? 0,
    dependencies: (depsAsBlocker ?? 0) + (depsAsBlocked ?? 0),
  };
}

export async function createChecklistItemMutation(
  supabase: SupabaseServer,
  input: CreateChecklistItemInput,
): Promise<CreateChecklistItemResult> {
  const title = sanitizeName(input.title, 200);
  if (!title) return { error: "Titulo invalido." };

  const { data: card } = await supabase
    .from("cards")
    .select("id, org_id, board_id")
    .eq("id", input.cardId)
    .single();
  if (!card) return { error: "Card nao encontrado." };

  const { data: last } = await supabase
    .from("card_checklist_items")
    .select("position")
    .eq("card_id", input.cardId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const position = lexoPosition(last?.position ?? null);

  const { data: row, error } = await supabase
    .from("card_checklist_items")
    .insert({
      org_id: card.org_id,
      board_id: card.board_id,
      card_id: card.id,
      title,
      position,
    })
    .select("id")
    .single();

  if (error) {
    return {
      error: error.code === "42501" ? "Sem permissao." : "Nao foi possivel criar o to-do.",
    };
  }

  // Checklist: client Query + optimistic e SoT — sem revalidateBoard (storm RSC).
  return { ok: true, itemId: row.id };
}

export async function toggleChecklistItemMutation(
  supabase: SupabaseServer,
  input: ToggleChecklistItemInput,
): Promise<CardResult> {
  const { error } = await supabase
    .from("card_checklist_items")
    .update({ done: input.done })
    .eq("id", input.itemId);

  if (error) {
    return {
      ok: false,
      error: error.code === "42501" ? "Sem permissao." : "Nao foi possivel atualizar o to-do.",
    };
  }

  return { ok: true };
}

export async function reorderChecklistItemMutation(
  supabase: SupabaseServer,
  input: ReorderChecklistItemInput,
): Promise<CardResult> {
  const { error } = await supabase
    .from("card_checklist_items")
    .update({ position: input.position })
    .eq("id", input.itemId);

  if (error) {
    return {
      ok: false,
      error: error.code === "42501" ? "Sem permissao." : "Nao foi possivel reordenar o to-do.",
    };
  }

  return { ok: true };
}

export async function deleteChecklistItemMutation(
  supabase: SupabaseServer,
  input: DeleteChecklistItemInput,
): Promise<CardResult> {
  const { error } = await supabase.from("card_checklist_items").delete().eq("id", input.itemId);

  if (error) {
    return {
      ok: false,
      error: error.code === "42501" ? "Sem permissao." : "Nao foi possivel excluir o to-do.",
    };
  }

  return { ok: true };
}

export async function linkTreeEdgeMutation(
  supabase: SupabaseServer,
  input: { boardId: string; parentCardId: string; childCardId: string },
): Promise<CardResult> {
  if (input.parentCardId === input.childCardId) {
    return { ok: false, error: "Nao e possivel conectar um card a si mesmo." };
  }

  const { data: cards, error: loadErr } = await supabase
    .from("cards")
    .select("id, org_id, board_id, parent_id")
    .in("id", [input.parentCardId, input.childCardId]);
  if (loadErr || !cards || cards.length !== 2) {
    return { ok: false, error: "Cards nao encontrados." };
  }
  const parent = cards.find((c) => c.id === input.parentCardId);
  const child = cards.find((c) => c.id === input.childCardId);
  if (!parent || !child) return { ok: false, error: "Cards nao encontrados." };
  if (parent.board_id !== input.boardId || child.board_id !== input.boardId) {
    return { ok: false, error: "Pai e filho devem ser do mesmo board." };
  }

  const { error } = await supabase.from("card_tree_edges").insert({
    org_id: parent.org_id,
    board_id: input.boardId,
    parent_card_id: input.parentCardId,
    child_card_id: input.childCardId,
  });
  if (error) {
    if (error.code === "23505") return { ok: true }; // already linked
    const msg = error.message ?? "";
    return {
      ok: false,
      error: msg.includes("card_tree_edge_cycle")
        ? "Hierarquia invalida (ciclo)."
        : msg.includes("card_tree_edge_depth")
          ? "Profundidade maxima (8) excedida."
          : error.code === "42501"
            ? "Sem permissao."
            : "Nao foi possivel conectar.",
    };
  }

  // Materializa parent_id legado como edge — 2º pai não fica só seed (multi-pai estável no refetch).
  if (child.parent_id && child.parent_id !== input.parentCardId) {
    const { error: seedErr } = await supabase.from("card_tree_edges").insert({
      org_id: parent.org_id,
      board_id: input.boardId,
      parent_card_id: child.parent_id,
      child_card_id: input.childCardId,
    });
    if (seedErr && seedErr.code !== "23505") {
      // best-effort: aresta nova já existe
    }
  }

  // Primary Kanban parent (subtarefa) is NOT auto-set here.
  // Tree edges are organogram associations; parent_id stays explicit subtarefa only (ADR-0014 sync).
  return { ok: true };
}

export async function unlinkTreeEdgeMutation(
  supabase: SupabaseServer,
  input: { boardId: string; parentCardId: string; childCardId: string },
): Promise<CardResult> {
  const { error } = await supabase
    .from("card_tree_edges")
    .delete()
    .eq("board_id", input.boardId)
    .eq("parent_card_id", input.parentCardId)
    .eq("child_card_id", input.childCardId);
  if (error) {
    return {
      ok: false,
      error: error.code === "42501" ? "Sem permissao." : "Nao foi possivel remover conexao.",
    };
  }

  const { data: child } = await supabase
    .from("cards")
    .select("parent_id")
    .eq("id", input.childCardId)
    .maybeSingle();

  // Limpa parent_id legado se era este pai (edge pode já ter sido só parent_id).
  if (child?.parent_id === input.parentCardId) {
    const { data: remaining } = await supabase
      .from("card_tree_edges")
      .select("parent_card_id")
      .eq("child_card_id", input.childCardId)
      .eq("board_id", input.boardId)
      .limit(1)
      .maybeSingle();
    const { error: parentErr } = await supabase
      .from("cards")
      .update({ parent_id: remaining?.parent_card_id ?? null })
      .eq("id", input.childCardId)
      .eq("board_id", input.boardId);
    if (parentErr) {
      return { ok: false, error: "Conexao removida, mas falhou limpar parent_id." };
    }
  }

  return { ok: true };
}
