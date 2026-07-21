import type { SupabaseClient } from "@supabase/supabase-js";
import { setCardStageInput } from "@nextgen/contracts";
import type { Database } from "@nextgen/contracts";
import { revalidateBoard, revalidatePlanViews } from "@/lib/revalidation";

export type SetCardStageResult = { ok: true } | { error: string };

export async function setCardStageMutation(
  supabase: SupabaseClient<Database>,
  input: { cardId: string; boardId: string; stageId: string | null },
  opts?: { userId?: string | null },
): Promise<SetCardStageResult> {
  const parsed = setCardStageInput.safeParse(input);
  if (!parsed.success) return { error: "Dados invalidos." };

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
  revalidatePlanViews(opts?.userId ?? undefined);
  return { ok: true };
}
