"use server";

import { createClient } from "@/lib/supabase/server";
import { updateCardFieldsInput, type Json } from "@nextgen/contracts";
import { revalidateBoard } from "@/lib/revalidation";

export async function updateCardFieldsAction(input: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = updateCardFieldsInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados invalidos." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_card_fields", {
    p_card_id: parsed.data.cardId,
    p_patch: parsed.data.patch as Json,
  });
  if (error) return { ok: false, error: error.message.includes("field_forbidden") ? "Campo nao permitido." : error.message };

  const { data: card } = await supabase.from("cards").select("board_id").eq("id", parsed.data.cardId).single();
  if (card?.board_id) revalidateBoard(card.board_id, { calendar: true });
  return { ok: true };
}
