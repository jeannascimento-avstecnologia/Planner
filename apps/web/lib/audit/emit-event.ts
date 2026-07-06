import "server-only";

import { createClient } from "@/lib/supabase/server";
import { emitAuditEventInput, type EmitAuditEventInput, type Json } from "@nextgen/contracts";
import { redactAuditPayload } from "@/lib/audit/audit-labels";

export async function emitAuditEvent(input: EmitAuditEventInput): Promise<{ ok: true; id: number } | { ok: false; error: string }> {
  const parsed = emitAuditEventInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Payload invalido." };

  const supabase = await createClient();
  const payload = redactAuditPayload(parsed.data.payload);

  const { data, error } = await supabase.rpc("emit_audit_event", {
    p_org_id: parsed.data.orgId,
    p_event_scope: parsed.data.eventScope,
    p_event_type: parsed.data.eventType,
    p_payload: payload as Json,
    p_board_id: parsed.data.boardId ?? undefined,
    p_card_id: parsed.data.cardId ?? undefined,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true, id: Number(data) };
}
