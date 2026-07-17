import type { AuditEventType } from "@nextgen/contracts";
import { cardFieldLabel } from "@/lib/field-permission-labels";
import { orgRoleLabel } from "@/lib/org-member-roles";
import { boardRoleLabel } from "@/lib/board-member-roles";

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
  preset_created: "Preset criado",
  preset_updated: "Preset atualizado",
  preset_deleted: "Preset excluido",
  preset_assigned: "Preset atribuido",
};

export function auditEventLabel(type: string): string {
  return AUDIT_EVENT_LABELS[type as AuditEventType] ?? type;
}

function orgRole(role: unknown): string {
  return orgRoleLabel(String(role ?? "?"));
}

function boardRole(role: unknown): string {
  return boardRoleLabel(String(role ?? "?"));
}

function quoted(value: unknown, fallback = "sem nome"): string {
  const t = String(value ?? "").trim();
  return t ? `"${t}"` : fallback;
}

function personName(name: unknown, fallback = "pessoa desconhecida"): string {
  const t = String(name ?? "").trim();
  return t || fallback;
}

function presetName(payload: Record<string, unknown>): string {
  return quoted(payload.preset_name ?? payload.name, "preset sem nome");
}

function cardName(payload: Record<string, unknown>): string {
  return quoted(payload.title ?? payload.card_title, "sem titulo");
}

function boardContext(payload: Record<string, unknown>): string {
  const name = String(payload.board_name ?? "").trim();
  return name ? ` no projeto "${name}"` : "";
}

function formatChangedFields(payload: Record<string, unknown>): string {
  const raw = payload.changed_fields;
  if (!Array.isArray(raw) || raw.length === 0) return "Dados do card alterados";
  const labels = raw.map((f) => cardFieldLabel(String(f)));
  return `Campos: ${labels.join(", ")}`;
}

function accessGrantedLabel(payload: Record<string, unknown>): string {
  const preset = String(payload.preset_name ?? payload.name ?? "").trim();
  if (preset) return `acesso "${preset}"`;
  const role = String(payload.role ?? "").trim();
  if (role) return `acesso ${boardRole(role)}`;
  return "acesso";
}

export function auditPayloadSummary(type: string, payload: Record<string, unknown>): string {
  switch (type) {
    case "org_logo_updated":
      return payload.has_logo === true ? "Logo adicionada" : "Logo removida";
    case "org_renamed":
      return `${String(payload.old_name ?? "?")} → ${String(payload.new_name ?? "?")}`;
    case "role_changed":
      return `${personName(payload.user_name)}: ${orgRole(payload.old_role)} → ${orgRole(payload.new_role)}`;
    case "member_invited":
      return `Adicionou ${personName(payload.user_name)} com papel ${orgRole(payload.role)}`;
    case "member_removed":
      return `Removeu ${personName(payload.user_name)} (papel ${orgRole(payload.role)})`;
    case "department_moved":
      return "Departamento reposicionado na hierarquia";
    case "board_created":
      return `Projeto ${quoted(payload.name)}`;
    case "board_deleted":
      return `Projeto ${quoted(payload.name)} excluido`;
    case "board_renamed":
      return `${String(payload.old_name ?? "")} → ${String(payload.new_name ?? "")}`;
    case "board_member_added":
      return `Adicionou ${personName(payload.user_name)} com ${accessGrantedLabel(payload)}${boardContext(payload)}`;
    case "board_member_removed":
      return `Removeu ${personName(payload.user_name)} (${accessGrantedLabel(payload)})${boardContext(payload)}`;
    case "column_created":
      return `Coluna ${quoted(payload.name ?? payload.column_name, "Nova")} criada${boardContext(payload)}`;
    case "column_renamed":
      return `${String(payload.old_name ?? "")} → ${String(payload.new_name ?? "")}`;
    case "column_deleted":
      return `Coluna ${quoted(payload.name ?? payload.column_name, "—")} excluida`;
    case "tiflux_configured":
      return "Integracao Tiflux configurada";
    case "tiflux_cleared":
      return "Integracao Tiflux removida";
    case "card_created":
      return `Card ${cardName(payload)}`;
    case "card_deleted":
      return `Card ${cardName(payload)} excluido`;
    case "card_moved": {
      const from = quoted(payload.from_column_name, "coluna origem");
      const to = quoted(payload.to_column_name, "coluna destino");
      return `Card ${cardName(payload)} de ${from} para ${to}`;
    }
    case "card_assigned": {
      const who = payload.new_assignee_id
        ? personName(payload.new_assignee_name, "responsavel definido")
        : "responsavel removido";
      if (!payload.new_assignee_id) return `Card ${cardName(payload)}: ${who}`;
      const prev = payload.old_assignee_id
        ? personName(payload.old_assignee_name, "sem responsavel")
        : "sem responsavel";
      return `Card ${cardName(payload)}: ${prev} → ${who}`;
    }
    case "card_updated":
      return `Card ${cardName(payload)} — ${formatChangedFields(payload)}`;
    case "card_comment_added":
      return `Comentario no card ${cardName(payload)}`;
    case "card_attachment_added":
      return `Arquivo anexado ao card ${cardName(payload)}`;
    case "card_tiflux_linked":
      return `Ticket Tiflux vinculado ao card ${cardName(payload)}`;
    case "stage_changed":
      return `Estagio do card ${cardName(payload)} alterado`;
    case "card_completed":
      return `Card ${cardName(payload)} marcado como concluido`;
    case "card_reopened":
      return `Card ${cardName(payload)} reaberto apos conclusao`;
    case "preset_created":
      return `Criou preset ${presetName(payload)}`;
    case "preset_updated":
      return `Atualizou preset ${presetName(payload)}`;
    case "preset_deleted":
      return `Excluiu preset ${presetName(payload)}`;
    case "preset_assigned":
      return `Concedeu ${accessGrantedLabel(payload)} a ${personName(payload.user_name)}${boardContext(payload)}`;
    default:
      return "—";
  }
}

/** Remove chaves sensiveis antes de persistir/exibir */
export function redactAuditPayload(payload: Record<string, unknown>): Record<string, unknown> {
  const blockedExact = new Set([
    "tiflux_api_token",
    "token",
    "password",
    "secret",
    "email",
    "phone",
    "invite_url",
    "inviteurl",
  ]);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(payload)) {
    const lower = k.toLowerCase();
    if (
      blockedExact.has(lower) ||
      lower.includes("token") ||
      lower.includes("password") ||
      lower.includes("secret") ||
      lower.includes("email")
    ) {
      continue;
    }
    out[k] = v;
  }
  return out;
}
