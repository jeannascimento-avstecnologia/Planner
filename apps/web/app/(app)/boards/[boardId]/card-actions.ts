"use server";

import {
  createCardInput,
  createChecklistItemInput,
  deleteCardInput,
  deleteChecklistItemInput,
  linkTreeEdgeInput,
  moveCardInput,
  reorderChecklistItemInput,
  toggleChecklistItemInput,
  unlinkTreeEdgeInput,
  updateCardFieldsInput,
  updateCardInput,
} from "@nextgen/contracts";
import { createClient } from "@/lib/supabase/server";
import {
  createCardMutation,
  createChecklistItemMutation,
  deleteCardMutation,
  deleteChecklistItemMutation,
  getCardDeleteImpactMutation,
  linkTreeEdgeMutation,
  moveCardMutation,
  reorderChecklistItemMutation,
  toggleChecklistItemMutation,
  unlinkTreeEdgeMutation,
  updateCardFieldsMutation,
  updateCardMutation,
  type CardDeleteImpact,
  type CardResult,
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

function formDateOrNull(raw: FormDataEntryValue | null): string | null | undefined {
  if (raw === null) return undefined;
  if (raw === "") return null;
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
  return createCardMutation(supabase, parsed.data);
}

export async function updateCard(formData: FormData): Promise<void> {
  const assigneeRaw = formData.get("assigneeId");
  const estRaw = formData.get("estimatedHours");
  const parsed = updateCardInput.safeParse({
    cardId: formData.get("cardId"),
    boardId: formData.get("boardId"),
    title: formData.get("title") || undefined,
    description: formData.has("description") ? formData.get("description") || null : undefined,
    priority: formData.get("priority") || undefined,
    dueDate: formDateOrNull(formData.get("dueDate")),
    startDate: formDateOrNull(formData.get("startDate")),
    targetDate: formDateOrNull(formData.get("targetDate")),
    assigneeId: assigneeRaw === "" ? null : assigneeRaw || undefined,
    estimatedHours: estRaw === "" ? null : estRaw ?? undefined,
  });
  if (!parsed.success) return;

  const supabase = await createClient();
  await updateCardMutation(supabase, parsed.data);
}

export async function updateCardFieldsAction(
  input: unknown,
): Promise<UpdateCardFieldsResult> {
  const parsed = updateCardFieldsInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados invalidos." };

  const supabase = await createClient();
  return updateCardFieldsMutation(supabase, parsed.data);
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
