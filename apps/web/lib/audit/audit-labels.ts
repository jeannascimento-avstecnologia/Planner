import type { AuditEventType } from "@nextgen/contracts";
import { cardFieldLabel } from "@/lib/field-permission-labels";
import { orgRoleLabel } from "@/lib/org-member-roles";

export const AUDIT_EVENT_LABELS: Record<AuditEventType, string> = {
  card_created: "Card criado",
  card_updated: "Card atualizado",
  card_deleted: "Card excluido",
  card_moved: "Card movido",
  card_assigned: "Responsavel alterado",
  card_comment_added: "Comentario adicionado",
  card_attachment_added: "Anexo adicionado",
  card_tiflux_linked: "Ticket Tiflux vinculado",
  stage_changed: "Estagio alterado",
  card_completed: "Card concluido",
  card_reopened: "Card reaberto",
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

function roleLabel(role: unknown): string {
  return orgRoleLabel(String(role ?? "?"));
}

function cardTitleLabel(title: unknown): string {
  const t = String(title ?? "").trim();
  return t ? `"${t}"` : "sem titulo";
}

function formatChangedFields(payload: Record<string, unknown>): string {
  const raw = payload.changed_fields;
  if (!Array.isArray(raw) || raw.length === 0) return "Dados do card alterados";
  const labels = raw.map((f) => cardFieldLabel(String(f)));
  return `Campos: ${labels.join(", ")}`;
}

export function auditPayloadSummary(type: string, payload: Record<string, unknown>): string {
  switch (type) {
    case "org_logo_updated":
      return payload.has_logo === true ? "Logo adicionada" : "Logo removida";
    case "org_renamed":
      return `${String(payload.old_name ?? "?")} → ${String(payload.new_name ?? "?")}`;
    case "role_changed":
      return `${roleLabel(payload.old_role)} → ${roleLabel(payload.new_role)}`;
    case "member_invited":
      return `Convite com papel ${roleLabel(payload.role)}`;
    case "member_removed":
      return `Membro removido (papel ${roleLabel(payload.role)})`;
    case "department_moved":
      return "Departamento reposicionado na hierarquia";
    case "board_created":
      return `Projeto ${cardTitleLabel(payload.name)}`;
    case "board_deleted":
      return `Projeto ${cardTitleLabel(payload.name)} excluido`;
    case "board_renamed":
      return `${String(payload.old_name ?? "")} → ${String(payload.new_name ?? "")}`;
    case "board_member_added":
      return `Entrada no projeto (${roleLabel(payload.role)})`;
    case "board_member_removed":
      return `Saida do projeto (${roleLabel(payload.role)})`;
    case "column_created":
      return `Coluna "${String(payload.name ?? "Nova")}" criada`;
    case "column_renamed":
      return `${String(payload.old_name ?? "")} → ${String(payload.new_name ?? "")}`;
    case "column_deleted":
      return `Coluna "${String(payload.name ?? "—")}" excluida`;
    case "tiflux_configured":
      return "Integracao Tiflux configurada";
    case "tiflux_cleared":
      return "Integracao Tiflux removida";
    case "card_created":
      return `Card ${cardTitleLabel(payload.title)}`;
    case "card_deleted":
      return `Card ${cardTitleLabel(payload.title)} excluido`;
    case "card_moved":
      return "Movido entre colunas";
    case "card_assigned":
      return payload.new_assignee_id ? "Responsavel definido" : "Responsavel removido";
    case "card_updated":
      return formatChangedFields(payload);
    case "card_comment_added":
      return "Comentario registrado no card";
    case "card_attachment_added":
      return "Arquivo anexado ao card";
    case "card_tiflux_linked":
      return "Ticket Tiflux vinculado ao card";
    case "stage_changed":
      return "Estagio do card alterado";
    case "card_completed":
      return "Card marcado como concluido";
    case "card_reopened":
      return "Card reaberto apos conclusao";
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
