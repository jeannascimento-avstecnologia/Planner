export const BOARD_ROLE_LABELS: Record<string, string> = {
  viewer: "Visualizar",
  admin: "Editor",
  manager: "Gerente",
};

export function boardRoleLabel(role: string): string {
  return BOARD_ROLE_LABELS[role] ?? role;
}

export function canManageBoardMembers(isOrgAdmin: boolean, userBoardRole?: string | null): boolean {
  return isOrgAdmin || userBoardRole === "manager";
}

/** Espelha RLS `app.can_write_board`: org admin ou board_member com role admin. */
export function canWriteBoard(isOrgAdmin: boolean, userBoardRole?: string | null): boolean {
  return isOrgAdmin || userBoardRole === "admin";
}

/** Modo leitura na UI: viewer ou membro da org sem papel editor/gerente no board. */
export function isBoardViewer(isOrgAdmin: boolean, userBoardRole?: string | null): boolean {
  if (isOrgAdmin) return false;
  if (userBoardRole === "admin" || userBoardRole === "manager") return false;
  if (userBoardRole === "viewer") return true;
  return true;
}

export function canEditBoardUI(isOrgAdmin: boolean, userBoardRole?: string | null): boolean {
  return !isBoardViewer(isOrgAdmin, userBoardRole);
}
