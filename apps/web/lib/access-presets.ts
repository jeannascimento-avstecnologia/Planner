import {
  BOARD_CEILING_PERMISSION_CODES,
  SYSTEM_ACCESS_PRESET_IDS,
  type BoardCeilingPermissionCode,
  type BoardMemberRole,
  type BoardPermissionCode,
} from "@nextgen/contracts";

export type AccessPresetRow = {
  id: string;
  orgId: string | null;
  name: string;
  description: string | null;
  isSystem: boolean;
  systemKey: string | null;
  baseRole: BoardMemberRole;
  permissionCodes: BoardPermissionCode[];
  usersUsing: number;
};

export type PermissionGroupId =
  | "view"
  | "cards"
  | "columns"
  | "metadata"
  | "collab"
  | "config"
  | "members";

export type PermissionGroup = {
  id: PermissionGroupId;
  label: string;
  codes: readonly BoardCeilingPermissionCode[];
};

/** Conteúdo = edit_content alias (sem manage_settings / members / tiflux.configure). */
export const EDIT_CONTENT_CHILD_CODES: readonly BoardCeilingPermissionCode[] = [
  "board.cards.create",
  "board.cards.edit",
  "board.cards.move",
  "board.cards.delete",
  "board.cards.change_stage",
  "board.cards.plan_work",
  "board.columns.create",
  "board.columns.rename",
  "board.columns.delete",
  "board.stages.manage",
  "board.tags.create",
  "board.tags.assign",
  "board.checklist.edit",
  "board.tree.edit",
  "board.whiteboard.edit",
  "board.appearance.edit",
  "board.tiflux.use",
  "board.automations.manage",
] as const;

export const MANAGE_MEMBERS_CHILD_CODES: readonly BoardCeilingPermissionCode[] = [
  "board.members.invite",
  "board.members.update",
  "board.members.remove",
] as const;

export const EDITOR_SYSTEM_CODES: readonly BoardCeilingPermissionCode[] = [
  "board.view",
  ...EDIT_CONTENT_CHILD_CODES,
] as const;

export const ADMIN_SYSTEM_CODES: readonly BoardCeilingPermissionCode[] = [
  ...BOARD_CEILING_PERMISSION_CODES,
] as const;

export const VIEWER_SYSTEM_CODES: readonly BoardCeilingPermissionCode[] = ["board.view"] as const;

export const PERMISSION_GROUPS: readonly PermissionGroup[] = [
  {
    id: "view",
    label: "Visualizacao",
    codes: ["board.view"],
  },
  {
    id: "cards",
    label: "Cards",
    codes: [
      "board.cards.create",
      "board.cards.edit",
      "board.cards.move",
      "board.cards.delete",
      "board.cards.change_stage",
      "board.cards.plan_work",
    ],
  },
  {
    id: "columns",
    label: "Colunas",
    codes: ["board.columns.create", "board.columns.rename", "board.columns.delete"],
  },
  {
    id: "metadata",
    label: "Metadados",
    codes: [
      "board.stages.manage",
      "board.tags.create",
      "board.tags.assign",
      "board.tags.delete",
      "board.checklist.edit",
      "board.tree.edit",
    ],
  },
  {
    id: "collab",
    label: "Colaboracao",
    codes: ["board.whiteboard.edit"],
  },
  {
    id: "config",
    label: "Config",
    codes: [
      "board.appearance.edit",
      "board.manage_settings",
      "board.automations.manage",
      "board.tiflux.use",
      "board.tiflux.configure",
    ],
  },
  {
    id: "members",
    label: "Membros",
    codes: ["board.members.invite", "board.members.update", "board.members.remove"],
  },
] as const;

export const BOARD_PERMISSION_LABELS: Record<BoardCeilingPermissionCode, string> = {
  "board.view": "Ver projeto, cards e views",
  "board.cards.create": "Criar cards",
  "board.cards.edit": "Editar campos do card",
  "board.cards.move": "Mover cards (Kanban/DnD)",
  "board.cards.delete": "Excluir cards",
  "board.cards.change_stage": "Alterar etapa",
  "board.cards.plan_work": "Planejar horas / workload no card",
  "board.columns.create": "Criar colunas",
  "board.columns.rename": "Renomear colunas",
  "board.columns.delete": "Excluir colunas",
  "board.stages.manage": "Gerenciar etapas",
  "board.tags.create": "Criar tags",
  "board.tags.assign": "Associar tags a cards",
  "board.tags.delete": "Excluir tags",
  "board.checklist.edit": "Editar checklist",
  "board.tree.edit": "Editar arvore (ligacoes/nos)",
  "board.whiteboard.edit": "Editar whiteboard",
  "board.appearance.edit": "Aparencia (icone/cor)",
  "board.manage_settings": "Configuracoes do projeto (nome, arquivo, dept)",
  "board.automations.manage": "Automacoes",
  "board.tiflux.use": "Usar Tiflux (criar/vincular)",
  "board.tiflux.configure": "Configurar token Tiflux",
  "board.members.invite": "Convidar integrantes",
  "board.members.update": "Alterar nivel de membros",
  "board.members.remove": "Remover membros",
};

export const SYSTEM_PRESET_BY_ROLE: Record<BoardMemberRole, string> = {
  manager: SYSTEM_ACCESS_PRESET_IDS.board_admin,
  admin: SYSTEM_ACCESS_PRESET_IDS.board_editor,
  viewer: SYSTEM_ACCESS_PRESET_IDS.board_viewer,
};

const ALIAS_EXPAND: Record<string, readonly BoardCeilingPermissionCode[]> = {
  "board.edit_content": EDIT_CONTENT_CHILD_CODES,
  "board.manage_members": MANAGE_MEMBERS_CHILD_CODES,
};

/** Expande aliases legados; dedupe; nao remove view. */
export function expandPermissionAliases(codes: readonly string[]): Set<BoardPermissionCode> {
  const out = new Set<BoardPermissionCode>();
  for (const code of codes) {
    const children = ALIAS_EXPAND[code];
    if (children) {
      for (const c of children) out.add(c);
      continue;
    }
    if ((BOARD_CEILING_PERMISSION_CODES as readonly string[]).includes(code)) {
      out.add(code as BoardCeilingPermissionCode);
    } else if (code === "org.manage_members" || code === "org.manage_identity") {
      out.add(code);
    }
  }
  return out;
}

/**
 * Implies: qualquer code de escrita implica board.view.
 * Members.* ja implica view via applyImplies ao toggle.
 */
export function applyPermissionImplies(codes: ReadonlySet<string>): Set<BoardPermissionCode> {
  const out = expandPermissionAliases([...codes]);
  if (out.size > 0 && ![...out].every((c) => c === "board.view")) {
    out.add("board.view");
  }
  if ([...out].some((c) => c.startsWith("board.members."))) {
    out.add("board.view");
  }
  return out;
}

export function codesEqualSet(a: ReadonlySet<string>, b: readonly string[]): boolean {
  if (a.size !== b.length) return false;
  return b.every((c) => a.has(c));
}

export function systemShortcutCodes(role: BoardMemberRole): readonly BoardCeilingPermissionCode[] {
  switch (role) {
    case "manager":
      return ADMIN_SYSTEM_CODES;
    case "admin":
      return EDITOR_SYSTEM_CODES;
    default:
      return VIEWER_SYSTEM_CODES;
  }
}

export function selectAllGroupCodes(
  current: readonly string[],
  groupCodes: readonly BoardCeilingPermissionCode[],
): BoardPermissionCode[] {
  const next = new Set(current);
  for (const c of groupCodes) next.add(c);
  return [...applyPermissionImplies(next)];
}

export function clearGroupCodes(
  current: readonly string[],
  groupCodes: readonly BoardCeilingPermissionCode[],
): BoardPermissionCode[] {
  const groupSet = new Set<string>(groupCodes);
  const remaining = current.filter((c) => !groupSet.has(c));
  return [...applyPermissionImplies(new Set(remaining))];
}

export function legacyRoleToPermissionCodes(role: string | null | undefined): Set<BoardPermissionCode> {
  switch (role) {
    case "manager":
      return new Set(ADMIN_SYSTEM_CODES);
    case "admin":
      return new Set(EDITOR_SYSTEM_CODES);
    case "viewer":
      return new Set(VIEWER_SYSTEM_CODES);
    default:
      return new Set();
  }
}

export function deriveBaseRoleFromCodes(codes: readonly string[]): BoardMemberRole {
  const expanded = expandPermissionAliases(codes);
  if (
    [...expanded].some((c) => c.startsWith("board.members.")) ||
    expanded.has("board.manage_settings") ||
    expanded.has("board.tiflux.configure") ||
    codes.includes("board.manage_members")
  ) {
    return "manager";
  }
  if (
    [...expanded].some(
      (c) =>
        c.startsWith("board.cards.") ||
        c.startsWith("board.columns.") ||
        c === "board.stages.manage" ||
        c.startsWith("board.tags.") ||
        c === "board.checklist.edit" ||
        c === "board.tree.edit" ||
        c === "board.whiteboard.edit" ||
        c === "board.appearance.edit" ||
        c === "board.automations.manage" ||
        c === "board.tiflux.use",
    ) ||
    codes.includes("board.edit_content")
  ) {
    return "admin";
  }
  return "viewer";
}

export function presetHelperText(codes: readonly string[]): string {
  const expanded = expandPermissionAliases(codes);
  if ([...expanded].some((c) => c.startsWith("board.members."))) {
    return "Edita o projeto e gerencia membros.";
  }
  if (
    [...expanded].some(
      (c) =>
        c.startsWith("board.cards.") ||
        c.startsWith("board.columns.") ||
        c === "board.edit_content",
    ) ||
    codes.includes("board.edit_content")
  ) {
    return "Edita cards e colunas (sem ACL).";
  }
  return "Somente leitura.";
}

export function isBoardCeilingCode(code: string): code is BoardCeilingPermissionCode {
  return (BOARD_CEILING_PERMISSION_CODES as readonly string[]).includes(code);
}

export function hasAnyContentPermission(perms: ReadonlySet<string>): boolean {
  if (perms.has("board.edit_content")) return true;
  return EDIT_CONTENT_CHILD_CODES.some((c) => perms.has(c));
}

export function hasAnyMembersPermission(perms: ReadonlySet<string>): boolean {
  if (perms.has("board.manage_members")) return true;
  return MANAGE_MEMBERS_CHILD_CODES.some((c) => perms.has(c));
}
