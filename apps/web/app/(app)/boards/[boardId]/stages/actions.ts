"use server";

import {
  createStageInput,
  deleteStageInput,
  setCardStageInput,
  setColumnDefaultStageInput,
  updateStageInput,
} from "@nextgen/contracts";
import { createClient } from "@/lib/supabase/server";
import { revalidateBoard, revalidatePlanViews } from "@/lib/revalidation";

export type StageActionResult = { ok: true; stageId?: string } | { error: string; code?: string };

export async function createStage(formData: FormData): Promise<StageActionResult> {
  const parsed = createStageInput.safeParse({
    boardId: formData.get("boardId"),
    name: formData.get("name"),
    color: formData.get("color"),
  });
  if (!parsed.success) return { error: "Dados invalidos." };

  const supabase = await createClient();
  const { data: board } = await supabase
    .from("boards")
    .select("org_id")
    .eq("id", parsed.data.boardId)
    .single();
  if (!board) return { error: "Projeto nao encontrado." };

  const { data: maxPos } = await supabase
    .from("stages")
    .select("position")
    .eq("board_id", parsed.data.boardId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: inserted, error } = await supabase
    .from("stages")
    .insert({
      org_id: board.org_id,
      board_id: parsed.data.boardId,
      name: parsed.data.name,
      color: parsed.data.color,
      position: (maxPos?.position ?? -1) + 1,
      is_system: false,
    })
    .select("id")
    .single();
  if (error) return { error: "Falha ao criar estagio." };

  revalidateBoard(parsed.data.boardId);
  return { ok: true, stageId: inserted.id };
}

export async function updateStage(formData: FormData): Promise<StageActionResult> {
  const parsed = updateStageInput.safeParse({
    stageId: formData.get("stageId"),
    boardId: formData.get("boardId"),
    name: formData.get("name") || undefined,
    color: formData.get("color") || undefined,
    position: formData.get("position") ?? undefined,
  });
  if (!parsed.success) return { error: "Dados invalidos." };

  const patch: { name?: string; color?: string; position?: number } = {};
  if (parsed.data.name) patch.name = parsed.data.name;
  if (parsed.data.color) patch.color = parsed.data.color;
  if (parsed.data.position !== undefined) patch.position = parsed.data.position;

  const supabase = await createClient();
  const { error } = await supabase
    .from("stages")
    .update(patch)
    .eq("id", parsed.data.stageId)
    .eq("board_id", parsed.data.boardId);
  if (error) return { error: "Falha ao atualizar estagio." };

  revalidateBoard(parsed.data.boardId);
  return { ok: true };
}

export async function deleteStage(formData: FormData): Promise<StageActionResult> {
  const parsed = deleteStageInput.safeParse({
    stageId: formData.get("stageId"),
    boardId: formData.get("boardId"),
  });
  if (!parsed.success) return { error: "Dados invalidos." };

  const supabase = await createClient();
  const { data: stage } = await supabase
    .from("stages")
    .select("is_system")
    .eq("id", parsed.data.stageId)
    .eq("board_id", parsed.data.boardId)
    .single();
  if (!stage) return { error: "Estagio nao encontrado." };
  if (stage.is_system) return { error: "Estagios padrao nao podem ser excluidos." };

  const { error } = await supabase
    .from("stages")
    .delete()
    .eq("id", parsed.data.stageId)
    .eq("board_id", parsed.data.boardId);
  if (error) return { error: "Falha ao excluir estagio." };

  revalidateBoard(parsed.data.boardId);
  return { ok: true };
}

export async function setCardStage(input: {
  cardId: string;
  boardId: string;
  stageId: string | null;
}): Promise<StageActionResult> {
  const parsed = setCardStageInput.safeParse(input);
  if (!parsed.success) return { error: "Dados invalidos." };

  const supabase = await createClient();

  if (parsed.data.stageId) {
    const { data: stage } = await supabase
      .from("stages")
      .select("id")
      .eq("id", parsed.data.stageId)
      .eq("board_id", parsed.data.boardId)
      .single();
    if (!stage) return { error: "Estagio nao encontrado." };
  }

  const { error } = await supabase
    .from("cards")
    .update({ stage_id: parsed.data.stageId })
    .eq("id", parsed.data.cardId)
    .eq("board_id", parsed.data.boardId);
  if (error) return { error: "Falha ao atualizar estagio do card." };

  revalidateBoard(parsed.data.boardId);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  revalidatePlanViews(user?.id);
  return { ok: true };
}

export async function setColumnDefaultStage(input: {
  columnId: string;
  boardId: string;
  stageId: string | null;
}): Promise<StageActionResult> {
  const parsed = setColumnDefaultStageInput.safeParse(input);
  if (!parsed.success) return { error: "Dados invalidos." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("columns")
    .update({ default_stage_id: parsed.data.stageId })
    .eq("id", parsed.data.columnId)
    .eq("board_id", parsed.data.boardId);
  if (error) return { error: "Falha ao atualizar estagio padrao da coluna." };

  revalidateBoard(parsed.data.boardId);
  return { ok: true };
}
