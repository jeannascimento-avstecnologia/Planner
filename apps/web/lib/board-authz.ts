import { isOrgAdminRole } from "@/lib/org-member-roles";

/**
 * Espelha `app.can_write_board` (migration departments):
 * owner OR board_members.admin OR (sem dept + org admin) OR (com dept + dept admin|manager).
 */
export type BoardWriteAuthzInput = {
  orgRole: string | null;
  boardRole: string | null;
  deptRole: string | null;
  hasDepartment: boolean;
};

export function computeCanWriteBoard(input: BoardWriteAuthzInput): boolean {
  const { orgRole, boardRole, deptRole, hasDepartment } = input;
  if (orgRole === "owner") return true;
  if (boardRole === "admin") return true;
  if (!hasDepartment && orgRole === "admin") return true;
  if (hasDepartment && (deptRole === "admin" || deptRole === "manager")) return true;
  return false;
}

/** UI de edicao (form Adicionar, DnD write, etc.) = mesmo criterio do RLS de write. */
export function canEditBoardUI(
  isOrgAdmin: boolean,
  userBoardRole?: string | null,
  opts?: { orgRole?: string | null; deptRole?: string | null; hasDepartment?: boolean },
): boolean {
  if (opts) {
    return computeCanWriteBoard({
      orgRole: opts.orgRole ?? null,
      boardRole: userBoardRole ?? null,
      deptRole: opts.deptRole ?? null,
      hasDepartment: Boolean(opts.hasDepartment),
    });
  }
  // Legado: so org admin/owner ou board admin (manager de board NAO escreve no RLS).
  return isOrgAdmin || userBoardRole === "admin";
}

export function canManageBoardMembers(isOrgAdmin: boolean, userBoardRole?: string | null): boolean {
  return isOrgAdmin || userBoardRole === "manager";
}

/** @deprecated Prefer computeCanWriteBoard / canEditBoardUI com opts. */
export function canWriteBoard(isOrgAdmin: boolean, userBoardRole?: string | null): boolean {
  return isOrgAdmin || userBoardRole === "admin";
}

export function isBoardViewer(
  isOrgAdmin: boolean,
  userBoardRole?: string | null,
  opts?: { orgRole?: string | null; deptRole?: string | null; hasDepartment?: boolean },
): boolean {
  return !canEditBoardUI(isOrgAdmin, userBoardRole, opts);
}

export { isOrgAdminRole };
