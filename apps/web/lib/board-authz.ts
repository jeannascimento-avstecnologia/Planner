import { isOrgAdminRole, isOrgOwnerRole } from "@/lib/org-member-roles";
import {
  expandPermissionAliases,
  hasAnyContentPermission,
  hasAnyMembersPermission,
  legacyRoleToPermissionCodes,
  MANAGE_MEMBERS_CHILD_CODES,
} from "@/lib/access-presets";
import { BOARD_CEILING_PERMISSION_CODES, type BoardPermissionCode } from "@nextgen/contracts";

/**
 * Espelha `app.has_board_permission` / `can_write_board`:
 * - owner: todos board.*
 * - org admin: board.* sem members.* / manage_members
 * - board membership / preset / dept write
 */
export type BoardWriteAuthzInput = {
  orgRole: string | null;
  boardRole: string | null;
  deptRole: string | null;
  hasDepartment: boolean;
  /** Codes do preset atribuido; se null, usa mapeamento legado do role. */
  permissionCodes?: readonly BoardPermissionCode[] | null;
};

function isMembersAclCode(code: string): boolean {
  return code === "board.manage_members" || code.startsWith("board.members.");
}

export function computeBoardPermissions(input: BoardWriteAuthzInput): Set<BoardPermissionCode> {
  const { orgRole, boardRole, deptRole, hasDepartment, permissionCodes } = input;
  const perms = new Set<BoardPermissionCode>();

  if (orgRole === "owner") {
    for (const c of BOARD_CEILING_PERMISSION_CODES) perms.add(c);
    return perms;
  }

  if (orgRole === "admin") {
    for (const c of BOARD_CEILING_PERMISSION_CODES) {
      if (!isMembersAclCode(c)) perms.add(c);
    }
    // nao adiciona members; membership do board pode completar abaixo
  }

  if (permissionCodes && permissionCodes.length > 0) {
    for (const c of expandPermissionAliases(permissionCodes)) perms.add(c);
  } else if (boardRole) {
    for (const c of legacyRoleToPermissionCodes(boardRole)) perms.add(c);
  }

  if (hasDepartment && (deptRole === "admin" || deptRole === "manager")) {
    perms.add("board.view");
    for (const c of expandPermissionAliases(["board.edit_content"])) perms.add(c);
  }

  return perms;
}

export function hasBoardPermission(
  input: BoardWriteAuthzInput,
  code: BoardPermissionCode | string,
): boolean {
  const perms = computeBoardPermissions(input);
  if (perms.has(code as BoardPermissionCode)) return true;
  if (code === "board.edit_content") return hasAnyContentPermission(perms);
  if (code === "board.manage_members") return hasAnyMembersPermission(perms);
  return false;
}

export function computeCanWriteBoard(input: BoardWriteAuthzInput): boolean {
  return hasAnyContentPermission(computeBoardPermissions(input));
}

/** UI de edicao (form Adicionar, DnD write, etc.) = mesmo criterio do RLS de write. */
export function canEditBoardUI(
  isOrgAdmin: boolean,
  userBoardRole?: string | null,
  opts?: {
    orgRole?: string | null;
    deptRole?: string | null;
    hasDepartment?: boolean;
    permissionCodes?: readonly BoardPermissionCode[] | null;
  },
): boolean {
  if (opts) {
    return computeCanWriteBoard({
      orgRole: opts.orgRole ?? (isOrgAdmin ? "admin" : null),
      boardRole: userBoardRole ?? null,
      deptRole: opts.deptRole ?? null,
      hasDepartment: Boolean(opts.hasDepartment),
      permissionCodes: opts.permissionCodes,
    });
  }
  return isOrgAdmin || userBoardRole === "admin" || userBoardRole === "manager";
}

/**
 * ACL do board: Proprietario org OU Administrador do board (`manager`).
 * Org admin (sem ser owner) NAO gerencia acessos — espelha `app.can_manage_board_members`.
 * @param isOrgOwner - true so para role owner (nao admin)
 */
export function canManageBoardMembers(isOrgOwner: boolean, userBoardRole?: string | null): boolean {
  return isOrgOwner || userBoardRole === "manager";
}

/** Espelha write de cards/colunas (legado sem dept). */
export function canWriteBoard(isOrgAdmin: boolean, userBoardRole?: string | null): boolean {
  return isOrgAdmin || userBoardRole === "admin" || userBoardRole === "manager";
}

/**
 * Quem gerencia ACL do board (convites / papeis), alinhado a `app.can_manage_board_members`.
 */
export function computeCanManageBoardMembers(
  input: BoardWriteAuthzInput & { isOrgOwner?: boolean; isOrgAdmin?: boolean },
): boolean {
  if (input.isOrgOwner || input.orgRole === "owner") return true;
  // isOrgAdmin legado: so conta se for owner (nao admin)
  if (input.isOrgAdmin && input.orgRole === "owner") return true;
  return hasAnyMembersPermission(computeBoardPermissions(input));
}

export function isBoardViewer(
  isOrgAdmin: boolean,
  userBoardRole?: string | null,
  opts?: {
    orgRole?: string | null;
    deptRole?: string | null;
    hasDepartment?: boolean;
    permissionCodes?: readonly BoardPermissionCode[] | null;
  },
): boolean {
  return !canEditBoardUI(isOrgAdmin, userBoardRole, opts);
}

export { isOrgAdminRole, isOrgOwnerRole, MANAGE_MEMBERS_CHILD_CODES };
