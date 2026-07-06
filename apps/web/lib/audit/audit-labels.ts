import type { AuditEventType } from "@nextgen/contracts";

export const AUDIT_EVENT_LABELS: Record<AuditEventType, string> = {
  card_created: "Card criado",
  card_updated: "Card atualizado",
  card_deleted: "Card excluido",
  card_moved: "Card movido",
  card_assigned: "Responsavel alterado",
  card_comment_added: "Comentario adicionado",
  card_attachment_added: "Anexo adicionado",
  card_tiflux_linked: "Ticket Tiflux vinculado",
  board_created: "Projeto criado",
  board_deleted: "Projeto excluido",
  board_renamed: "Projeto renomeado",
  board_member_added: "Membro adicionado ao projeto",
  board_member_removed: "Membro removido do projeto",
  column_created: "Coluna criada",
  column_renamed: "Coluna renomeada",
  column_deleted: "Coluna excluida",
  tiflux_configured: "Tiflux configurado",
  tiflux_cleared: "Tiflux removido",
  member_invited: "Membro adicionado",
  member_removed: "Membro removido",
  role_changed: "Papel alterado",
  department_moved: "Departamento movido",
  org_renamed: "Organizacao renomeada",
  org_logo_updated: "Logo atualizado",
};

export function auditEventLabel(type: string): string {
  return AUDIT_EVENT_LABELS[type as AuditEventType] ?? type;
}

export function auditPayloadSummary(type: string, payload: Record<string, unknown>): string {
  switch (type) {
    case "role_changed":
      return `${String(payload.old_role ?? "?")} → ${String(payload.new_role ?? "?")}`;
    case "board_renamed":
      return `${String(payload.old_name ?? "")} → ${String(payload.new_name ?? "")}`;
    case "card_moved":
      return "Coluna alterada";
    case "card_assigned":
      return payload.new_assignee_id ? "Novo responsavel" : "Sem responsavel";
    default:
      return Object.keys(payload).length ? JSON.stringify(payload).slice(0, 80) : "—";
  }
}

/** Remove chaves sensiveis antes de persistir/exibir */
export function redactAuditPayload(payload: Record<string, unknown>): Record<string, unknown> {
  const blocked = new Set(["tiflux_api_token", "token", "password", "secret"]);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(payload)) {
    if (blocked.has(k.toLowerCase()) || k.toLowerCase().includes("token")) continue;
    out[k] = v;
  }
  return out;
}
