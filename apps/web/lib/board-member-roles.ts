import { isOrgAdminRole } from "@/lib/org-member-roles";
import {
  canEditBoardUI as canEditBoardUIAuthz,
  canManageBoardMembers as canManageBoardMembersAuthz,
  canWriteBoard as canWriteBoardAuthz,
  computeCanWriteBoard,
  isBoardViewer as isBoardViewerAuthz,
  type BoardWriteAuthzInput,
} from "@/lib/board-authz";

export const BOARD_ROLE_LABELS: Record<string, string> = {
  viewer: "Visualizar",
  admin: "Editor",
  manager: "Gerente",
};

export function boardRoleLabel(role: string): string {
  return BOARD_ROLE_LABELS[role] ?? role;
}

export function canManageBoardMembers(isOrgAdmin: boolean, userBoardRole?: string | null): boolean {
  return canManageBoardMembersAuthz(isOrgAdmin, userBoardRole);
}

/** Espelha RLS `app.can_write_board` (legado sem dept). */
export function canWriteBoard(isOrgAdmin: boolean, userBoardRole?: string | null): boolean {
  return canWriteBoardAuthz(isOrgAdmin, userBoardRole);
}

export function isBoardViewer(
  isOrgAdmin: boolean,
  userBoardRole?: string | null,
  opts?: Omit<BoardWriteAuthzInput, "boardRole"> & { boardRole?: string | null },
): boolean {
  return isBoardViewerAuthz(isOrgAdmin, userBoardRole, opts);
}

export function canEditBoardUI(
  isOrgAdmin: boolean,
  userBoardRole?: string | null,
  opts?: Omit<BoardWriteAuthzInput, "boardRole"> & { boardRole?: string | null },
): boolean {
  return canEditBoardUIAuthz(isOrgAdmin, userBoardRole, opts);
}

export { computeCanWriteBoard, isOrgAdminRole };
export type { BoardWriteAuthzInput };
