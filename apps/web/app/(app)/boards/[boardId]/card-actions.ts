"use server";

import {
  createCardAttachmentInput,
  createCardCommentInput,
  createCardInput,
  createChecklistItemInput,
  deleteCardAttachmentInput,
  deleteCardCommentInput,
  deleteCardInput,
  deleteChecklistItemInput,
  linkTreeEdgeInput,
  moveCardInput,
  reorderChecklistItemInput,
  toggleChecklistItemInput,
  unlinkTreeEdgeInput,
  updateCardCommentInput,
  updateCardFieldsInput,
} from "@nextgen/contracts";
import { parseUpdateCardFormData } from "@/lib/parse-update-card-form";
import { fireTaskAssignedIfChanged } from "@/lib/email/notify-events";
import { createClient } from "@/lib/supabase/server";
import {
  createCardAttachmentMutation,
  createCardCommentMutation,
  createCardMutation,
  createChecklistItemMutation,
  deleteCardAttachmentMutation,
  deleteCardCommentMutation,
  deleteCardMutation,
  deleteChecklistItemMutation,
  getCardDeleteImpactMutation,
  linkTreeEdgeMutation,
  moveCardMutation,
  reorderChecklistItemMutation,
  toggleChecklistItemMutation,
  unlinkTreeEdgeMutation,
  updateCardCommentMutation,
  updateCardFieldsMutation,
  updateCardMutation,
  type CardDeleteImpact,
  type CardResult,
  type CreateCardAttachmentResult,
  type CreateCardCommentResult,
  type CreateCardResult,
  type CreateChecklistItemResult,
  type DeleteCardResult,
  type MoveCardResult,
  type UpdateCardFieldsResult,
} from "@/lib/card-kernel";

export type {
  CardDeleteImpact,
  CreateCardResult,
  CreateChecklistItemResult,
  DeleteCardResult,
  MoveCardResult,
  UpdateCardFieldsResult,
};

function formDateOrUndefined(raw: FormDataEntryValue | null): string | undefined {
  if (raw == null || String(raw) === "") return undefined;
  return `${raw}T12:00:00.000Z`;
}

/** API canônica — Kanban / Tabela / Drawer / create form. */
export async function createCard(formData: FormData): Promise<CreateCardResult> {
  const parsed = createCardInput.safeParse({
    boardId: formData.get("boardId"),
    columnId: formData.get("columnId"),
    title: formData.get("title"),
    priority: formData.get("priority") || undefined,
    dueDate: formDateOrUndefined(formData.get("dueDate")),
    startDate: formDateOrUndefined(formData.get("startDate")),
    assigneeId: formData.get("assigneeId") || undefined,
    parentId: formData.get("parentId") || undefined,
  });
  if (!parsed.success) return { error: "Dados invalidos." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const result = await createCardMutation(supabase, parsed.data);
  if ("cardId" in result && result.cardId && parsed.data.assigneeId && user?.id) {
    void fireTaskAssignedIfChanged(supabase, {
      cardId: result.cardId,
      boardId: parsed.data.boardId,
      assigneeId: parsed.data.assigneeId,
      previousAssigneeId: null,
      actorId: user.id,
    });
  }
  return result;
}

export async function updateCard(formData: FormData): Promise<UpdateCardFieldsResult> {
  const parsed = parseUpdateCardFormData(formData);
  if (!parsed.ok) return { ok: false, error: parsed.error };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let previousAssigneeId: string | null = null;
  if (parsed.data.assigneeId !== undefined) {
    const { data: before } = await supabase
      .from("cards")
      .select("assignee_id")
      .eq("id", parsed.data.cardId)
      .maybeSingle();
    previousAssigneeId = before?.assignee_id ?? null;
  }

  const result = await updateCardMutation(supabase, parsed.data);
  if (result.ok && parsed.data.assigneeId !== undefined && user?.id) {
    void fireTaskAssignedIfChanged(supabase, {
      cardId: parsed.data.cardId,
      boardId: parsed.data.boardId,
      assigneeId: parsed.data.assigneeId,
      previousAssigneeId,
      actorId: user.id,
    });
  }
  return result;
}

export async function updateCardFieldsAction(
  input: unknown,
): Promise<UpdateCardFieldsResult> {
  const parsed = updateCardFieldsInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados invalidos." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let previousAssigneeId: string | null = null;
  let boardId: string | null = null;
  if (parsed.data.patch.assignee_id !== undefined) {
    const { data: before } = await supabase
      .from("cards")
      .select("assignee_id, board_id")
      .eq("id", parsed.data.cardId)
      .maybeSingle();
    previousAssigneeId = before?.assignee_id ?? null;
    boardId = before?.board_id ?? null;
  }

  const result = await updateCardFieldsMutation(supabase, parsed.data);
  if (
    result.ok &&
    parsed.data.patch.assignee_id !== undefined &&
    boardId &&
    user?.id
  ) {
    void fireTaskAssignedIfChanged(supabase, {
      cardId: parsed.data.cardId,
      boardId,
      assigneeId: parsed.data.patch.assignee_id,
      previousAssigneeId,
      actorId: user.id,
    });
  }
  return result;
}

export async function moveCard(formData: FormData): Promise<MoveCardResult> {
  const parsed = moveCardInput.safeParse({
    cardId: formData.get("cardId"),
    boardId: formData.get("boardId"),
    columnId: formData.get("columnId"),
    position: formData.get("position"),
  });
  if (!parsed.success) return { error: "Dados invalidos." };

  const supabase = await createClient();
  return moveCardMutation(supabase, parsed.data);
}

/** Variante tipada (views object-based / futuros consumidores). */
export async function moveCardAction(input: unknown): Promise<MoveCardResult> {
  const parsed = moveCardInput.safeParse(input);
  if (!parsed.success) return { error: "Dados invalidos." };

  const supabase = await createClient();
  return moveCardMutation(supabase, parsed.data);
}

export async function getCardDeleteImpact(cardId: string, boardId: string): Promise<CardDeleteImpact> {
  const supabase = await createClient();
  return getCardDeleteImpactMutation(supabase, cardId, boardId);
}

export async function deleteCard(formData: FormData): Promise<DeleteCardResult> {
  const parsed = deleteCardInput.safeParse({
    cardId: formData.get("cardId"),
    boardId: formData.get("boardId"),
  });
  if (!parsed.success) return { error: "Dados invalidos." };

  const supabase = await createClient();
  return deleteCardMutation(supabase, parsed.data);
}

export async function createChecklistItemAction(
  input: unknown,
): Promise<CreateChecklistItemResult> {
  const parsed = createChecklistItemInput.safeParse(input);
  if (!parsed.success) return { error: "Dados invalidos." };

  const supabase = await createClient();
  return createChecklistItemMutation(supabase, parsed.data);
}

export async function toggleChecklistItemAction(input: unknown): Promise<CardResult> {
  const parsed = toggleChecklistItemInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados invalidos." };

  const supabase = await createClient();
  return toggleChecklistItemMutation(supabase, parsed.data);
}

export async function reorderChecklistItemAction(input: unknown): Promise<CardResult> {
  const parsed = reorderChecklistItemInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados invalidos." };

  const supabase = await createClient();
  return reorderChecklistItemMutation(supabase, parsed.data);
}

export async function deleteChecklistItemAction(input: unknown): Promise<CardResult> {
  const parsed = deleteChecklistItemInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados invalidos." };

  const supabase = await createClient();
  return deleteChecklistItemMutation(supabase, parsed.data);
}

export async function linkTreeEdgeAction(input: unknown): Promise<CardResult> {
  const parsed = linkTreeEdgeInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados invalidos." };
  const supabase = await createClient();
  return linkTreeEdgeMutation(supabase, parsed.data);
}

export async function unlinkTreeEdgeAction(input: unknown): Promise<CardResult> {
  const parsed = unlinkTreeEdgeInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados invalidos." };
  const supabase = await createClient();
  return unlinkTreeEdgeMutation(supabase, parsed.data);
}

export async function createCardCommentAction(input: unknown): Promise<CreateCardCommentResult> {
  const parsed = createCardCommentInput.safeParse(input);
  if (!parsed.success) return { error: "Dados invalidos." };
  const supabase = await createClient();
  return createCardCommentMutation(supabase, parsed.data);
}

export async function updateCardCommentAction(input: unknown): Promise<CardResult> {
  const parsed = updateCardCommentInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados invalidos." };
  const supabase = await createClient();
  return updateCardCommentMutation(supabase, parsed.data);
}

export async function deleteCardCommentAction(input: unknown): Promise<CardResult> {
  const parsed = deleteCardCommentInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados invalidos." };
  const supabase = await createClient();
  return deleteCardCommentMutation(supabase, parsed.data);
}

export async function createCardAttachmentAction(
  input: unknown,
): Promise<CreateCardAttachmentResult> {
  const parsed = createCardAttachmentInput.safeParse(input);
  if (!parsed.success) return { error: "Dados invalidos." };
  const supabase = await createClient();
  return createCardAttachmentMutation(supabase, parsed.data);
}

export async function deleteCardAttachmentAction(input: unknown): Promise<CardResult> {
  const parsed = deleteCardAttachmentInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados invalidos." };
  const supabase = await createClient();
  return deleteCardAttachmentMutation(supabase, parsed.data);
}
