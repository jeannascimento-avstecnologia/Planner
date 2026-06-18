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
