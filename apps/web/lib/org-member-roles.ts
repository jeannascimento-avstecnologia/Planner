export const ORG_ROLE_LABELS: Record<string, string> = {
  owner: "Proprietario",
  admin: "Administrador",
  viewer: "Visualizador",
  manager: "Gerente",
};

export function orgRoleLabel(role: string): string {
  return ORG_ROLE_LABELS[role] ?? role;
}

export function isOrgAdminRole(role?: string | null): boolean {
  return role === "admin" || role === "owner";
}

export function isOrgOwnerRole(role?: string | null): boolean {
  return role === "owner";
}

export function canManageOrg(role?: string | null): boolean {
  return isOrgAdminRole(role);
}
