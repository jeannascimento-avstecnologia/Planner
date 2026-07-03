import { orgRoleLabel } from "@/lib/org-member-roles";

export type DepartmentMemberRole = "admin" | "viewer" | "manager";

export const DEPARTMENT_ROLE_LABELS: Record<DepartmentMemberRole, string> = {
  admin: "Administrador",
  viewer: "Visualizador",
  manager: "Gerente",
};

export function departmentRoleLabel(role: string): string {
  return DEPARTMENT_ROLE_LABELS[role as DepartmentMemberRole] ?? orgRoleLabel(role);
}

export function isDepartmentManagerRole(role?: string | null): boolean {
  return role === "manager" || role === "admin";
}

export function canManageDepartmentMembers(role?: string | null, isOrgOwner?: boolean): boolean {
  return Boolean(isOrgOwner) || role === "manager";
}

export function canCreateInDepartment(
  orgRole?: string | null,
  deptRole?: string | null,
  isOrgOwner?: boolean,
): boolean {
  if (isOrgOwner || orgRole === "admin" || orgRole === "owner") return true;
  return isDepartmentManagerRole(deptRole);
}

export function canMoveBoardDepartment(
  isOrgOwner: boolean,
  canWriteBoard: boolean,
  sourceDeptRole?: string | null,
  targetDeptRole?: string | null,
  sourceDeptId?: string | null,
  targetDeptId?: string | null,
): boolean {
  if (isOrgOwner) return true;
  const involvesGeneral = !sourceDeptId || !targetDeptId;
  if (involvesGeneral) return canWriteBoard;
  if (!sourceDeptId || !targetDeptId) return false;
  return isDepartmentManagerRole(sourceDeptRole) && isDepartmentManagerRole(targetDeptRole);
}
