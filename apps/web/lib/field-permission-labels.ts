import type { CardPermissionField } from "@nextgen/contracts";
import type { FieldAccess } from "@nextgen/contracts";
import { orgRoleLabel } from "@/lib/org-member-roles";

export const CARD_FIELD_LABELS: Record<CardPermissionField, string> = {
  title: "Titulo",
  description: "Descricao",
  due_date: "Prazo final",
  start_date: "Data de inicio",
  target_date: "Meta de entrega",
  priority: "Prioridade",
  assignee_id: "Responsavel",
  column_id: "Coluna",
  estimated_hours: "Horas estimadas",
};

export function cardFieldLabel(field: string): string {
  return CARD_FIELD_LABELS[field as CardPermissionField] ?? field;
}

export const FIELD_ACCESS_LABELS: Record<FieldAccess, string> = {
  read: "Leitura",
  write: "Edicao",
  hidden: "Oculto",
};

export function fieldAccessLabel(access: string): string {
  return FIELD_ACCESS_LABELS[access as FieldAccess] ?? access;
}

export const FIELD_ACCESS_OPTION_LABELS: Record<"default" | FieldAccess, string> = {
  default: "Padrao do papel",
  read: "Leitura",
  write: "Edicao",
  hidden: "Oculto",
};

export function fieldAccessOptionLabel(access: "default" | FieldAccess): string {
  return FIELD_ACCESS_OPTION_LABELS[access];
}

export function membershipRoleLabel(role: string): string {
  return orgRoleLabel(role);
}
