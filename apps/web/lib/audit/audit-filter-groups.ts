import type { AuditEventType } from "@nextgen/contracts";

export type AuditFilterGroup = {
  id: string;
  label: string;
  types: AuditEventType[];
};

export const AUDIT_FILTER_GROUPS: AuditFilterGroup[] = [
  {
    id: "organization",
    label: "Organizacao",
    types: ["org_renamed", "org_logo_updated", "role_changed", "member_invited", "member_removed", "department_moved"],
  },
  {
    id: "access",
    label: "Acesso e presets",
    types: ["preset_created", "preset_updated", "preset_deleted", "preset_assigned"],
  },
  {
    id: "project",
    label: "Projetos e colunas",
    types: [
      "board_created",
      "board_deleted",
      "board_renamed",
      "board_member_added",
      "board_member_removed",
      "column_created",
      "column_renamed",
      "column_deleted",
    ],
  },
  {
    id: "cards",
    label: "Cards e tarefas",
    types: [
      "card_created",
      "card_updated",
      "card_deleted",
      "card_moved",
      "card_assigned",
      "card_comment_added",
      "card_attachment_added",
      "stage_changed",
      "card_completed",
      "card_reopened",
    ],
  },
  {
    id: "integrations",
    label: "Integracoes",
    types: ["card_tiflux_linked", "tiflux_configured", "tiflux_cleared"],
  },
];

export const ALL_AUDIT_FILTER_TYPES = AUDIT_FILTER_GROUPS.flatMap((g) => g.types);
